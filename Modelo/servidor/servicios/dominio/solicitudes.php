<?php

declare(strict_types=1);

/** Reglas del módulo solicitudes. */
final class ServicioSolicitudes
{
    private const TRANSICIONES = [
        'pendiente' => ['aprobada', 'rechazada', 'cancelada'],
        'aprobada' => ['en_proceso', 'cancelada'],
        'en_proceso' => ['completada', 'cancelada'],
        'rechazada' => [],
        'completada' => [],
        'cancelada' => [],
    ];

    /**
     * Guarda la conexión a la base de datos que usará este servicio.
     * Entradas: $conexion. Salida: sin valor.
     */
    public function __construct(private PDO $conexion)
    {
    }

    /**
     * Consulta los registros visibles de este módulo.
     * Entradas: $usuario, $soloPropias. Salida: array.
     */
    public function listar(array $usuario, bool $soloPropias = false): array
    {
        // La identidad de quienes procesan una solicitud es trazabilidad interna:
        // no debe exponerse en la API ni en el frontend.
        $sql = "SELECT s.id_solicitud, s.tipo_solicitud, s.descripcion, s.fecha_solicitada,
                       s.turno, s.grupo, s.asignatura, s.software_requerido, s.estado,
                       s.fecha_decision,
                       e.nombre AS sala_solicitada, e.tipo AS tipo_sala,
                       CONCAT(us.nombre, ' ', us.apellido) AS solicitante
                FROM solicitudes_servicio s
                INNER JOIN espacios e ON e.id_espacio = s.id_espacio
                INNER JOIN usuarios us ON us.id_usuario = s.id_solicitante";
        $parametros = [];

        if ($soloPropias || $usuario['rol'] === 'solicitante') {
            $sql .= " WHERE s.id_solicitante = :id_usuario";
            $parametros['id_usuario'] = $usuario['id_usuario'];
        }

        $sql .= " ORDER BY s.fecha_creacion DESC";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute($parametros);

        return $consulta->fetchAll();
    }

    /**
     * Valida los datos y crea un registro de este módulo.
     * Entradas: $usuario, $datos. Salida: array.
     */
    public function crear(array $usuario, array $datos): array
    {
        $tipoSolicitud = $this->normalizarTipoSolicitud((string) ($datos['tipoSolicitud'] ?? ''));
        $tipoSala = $this->normalizarTipoSala((string) ($datos['tipoSala'] ?? ''));
        $sala = trim((string) ($datos['salaSolicitada'] ?? ''));
        $fecha = $this->normalizarFecha((string) ($datos['fechaSolicitada'] ?? ''));
        $turno = $this->normalizarTexto((string) ($datos['turno'] ?? ''));
        $grupo = trim((string) ($datos['grupo'] ?? ''));
        $asignatura = trim((string) ($datos['asignatura'] ?? ''));
        $descripcion = trim((string) ($datos['descripcion'] ?? ''));
        $software = trim((string) ($datos['software'] ?? ''));

        if ($tipoSolicitud === null || $tipoSala === null || $sala === '' || $fecha === null || $turno === '' || $grupo === '' || $asignatura === '' || $descripcion === '') {
            responderError(422, 'Datos de solicitud incompletos');
        }

        if ($tipoSolicitud === 'instalacion_software' && $software === '') {
            responderError(422, 'Software requerido es obligatorio');
        }

        $idEspacio = $this->obtenerOCrearEspacio($tipoSala, $sala);
        $consulta = $this->conexion->prepare(
            "INSERT INTO solicitudes_servicio
               (id_solicitante, id_espacio, tipo_solicitud, descripcion, fecha_solicitada, turno, grupo, asignatura, software_requerido, estado)
             VALUES
               (:id_solicitante, :id_espacio, :tipo_solicitud, :descripcion, :fecha_solicitada, :turno, :grupo, :asignatura, :software, 'pendiente')"
        );
        $consulta->execute([
            'id_solicitante' => $usuario['id_usuario'],
            'id_espacio' => $idEspacio,
            'tipo_solicitud' => $tipoSolicitud,
            'descripcion' => $descripcion,
            'fecha_solicitada' => $fecha,
            'turno' => $turno,
            'grupo' => $grupo,
            'asignatura' => $asignatura,
            'software' => $software !== '' ? $software : null,
        ]);

        return ['id_solicitud' => (int) $this->conexion->lastInsertId(), 'estado' => 'pendiente'];
    }

    /**
     * Comprueba permisos y aplica una transición de estado permitida.
     * Entradas: $idSolicitud, $usuario, $estado. Salida: array.
     */
    public function cambiarEstado(int $idSolicitud, array $usuario, string $estado): array
    {
        $estados = ['pendiente', 'aprobada', 'rechazada', 'en_proceso', 'completada', 'cancelada'];

        if (!in_array($estado, $estados, true)) {
            responderError(422, 'Estado de solicitud no válido');
        }

        $idAdministrador = in_array('administrador', $usuario['roles_disponibles'] ?? [], true)
            && in_array($estado, ['aprobada', 'rechazada'], true)
            ? (int) $usuario['id_usuario']
            : null;
        $idTecnico = (in_array('tecnico', $usuario['roles_disponibles'] ?? [], true)
                || in_array('administrador', $usuario['roles_disponibles'] ?? [], true))
            && in_array($estado, ['en_proceso', 'completada'], true)
            ? (int) $usuario['id_usuario']
            : null;

        $this->conexion->beginTransaction();
        try {
            $bloqueo = $this->conexion->prepare("SELECT estado FROM solicitudes_servicio WHERE id_solicitud = :id FOR UPDATE");
            $bloqueo->execute(['id' => $idSolicitud]);
            $actual = $bloqueo->fetchColumn();
            if ($actual === false) {
                responderError(404, 'Solicitud no encontrada');
            }
            if (!in_array($estado, self::TRANSICIONES[(string) $actual] ?? [], true)) {
                responderError(409, 'Transición de solicitud no permitida');
            }
            $consulta = $this->conexion->prepare(
                "UPDATE solicitudes_servicio
                 SET estado = :estado,
                     id_administrador_aprobador = COALESCE(:id_administrador, id_administrador_aprobador),
                     id_tecnico_asignado = COALESCE(:id_tecnico, id_tecnico_asignado),
                     fecha_decision = CASE
                       WHEN :estado_decision IN ('aprobada', 'rechazada', 'completada', 'cancelada') THEN CURRENT_TIMESTAMP
                       ELSE fecha_decision
                     END
                 WHERE id_solicitud = :id_solicitud"
            );
            $consulta->execute([
                'estado' => $estado,
                'id_administrador' => $idAdministrador,
                'id_tecnico' => $idTecnico,
                'estado_decision' => $estado,
                'id_solicitud' => $idSolicitud,
            ]);
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'solicitudes', 'cambiar_estado', 'solicitud', $idSolicitud, ['estado' => $actual], ['estado' => $estado]);
            $this->conexion->commit();
            return ['id_solicitud' => $idSolicitud, 'estado' => $estado];
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
    }

    /**
     * Busca el espacio o lo registra si aún no existe.
     * Entradas: $tipo, $nombre. Salida: int.
     */
    private function obtenerOCrearEspacio(string $tipo, string $nombre): int
    {
        $consulta = $this->conexion->prepare("SELECT id_espacio FROM espacios WHERE tipo = :tipo AND nombre = :nombre AND estado <> 'inactivo' LIMIT 1");
        $consulta->execute(['tipo' => $tipo, 'nombre' => $nombre]);
        $id = $consulta->fetchColumn();
        if ($id !== false) {
            return (int) $id;
        }

        responderError(422, 'La sala seleccionada no está registrada');
    }

    /**
     * Convierte el tipo recibido a una opción admitida.
     * Entradas: $valor. Salida: ?string.
     */
    private function normalizarTipoSolicitud(string $valor): ?string
    {
        $texto = $this->normalizarTexto($valor);
        if (str_contains($texto, 'software')) {
            return 'instalacion_software';
        }
        if (str_contains($texto, 'soporte')) {
            return 'soporte_clase';
        }
        if (str_contains($texto, 'reserva')) {
            return 'reserva_sala';
        }

        return null;
    }

    /**
     * Convierte el tipo de sala a una opción admitida.
     * Entradas: $valor. Salida: ?string.
     */
    private function normalizarTipoSala(string $valor): ?string
    {
        $texto = $this->normalizarTexto($valor);
        if (str_contains($texto, 'taller')) {
            return 'taller';
        }
        if (str_contains($texto, 'laboratorio')) {
            return 'laboratorio';
        }
        if (str_contains($texto, 'sal')) {
            return 'salon';
        }

        return null;
    }

    /**
     * Limpia espacios y normaliza el texto recibido.
     * Entradas: $valor. Salida: string.
     */
    private function normalizarTexto(string $valor): string
    {
        return strtolower(trim($valor));
    }

    /**
     * Convierte y valida la fecha recibida al formato de la base.
     * Entradas: $valor. Salida: ?string.
     */
    private function normalizarFecha(string $valor): ?string
    {
        if (!preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', trim($valor), $partes)) {
            return null;
        }

        return checkdate((int) $partes[2], (int) $partes[1], (int) $partes[3])
            ? "{$partes[3]}-{$partes[2]}-{$partes[1]}"
            : null;
    }
}

/**
 * Registro de uso de sala con cabecera y detalle de equipos.
 */
