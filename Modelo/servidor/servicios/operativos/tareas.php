<?php

declare(strict_types=1);

/** Reglas del módulo tareas. */
final class ServicioTareas
{
    private const TRANSICIONES = [
        'pendiente' => ['en_proceso', 'cancelada'],
        'en_proceso' => ['completada', 'cancelada'],
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
     * Entradas: ninguna. Salida: array.
     */
    public function listar(): array
    {
        return $this->conexion->query(
            "SELECT t.id_tarea, t.id_equipo, t.id_espacio, t.tipo, t.titulo,
                    t.descripcion, t.fecha_programada, t.estado, t.resultado,
                    t.fecha_inicio, t.fecha_finalizacion, t.fecha_creacion,
                    t.fecha_actualizacion, e.nombre AS equipo, ep.nombre AS espacio
             FROM tareas_soporte t
             LEFT JOIN equipos e ON e.id_equipo = t.id_equipo
             LEFT JOIN espacios ep ON ep.id_espacio = t.id_espacio
             ORDER BY FIELD(t.estado, 'en_proceso', 'pendiente', 'completada', 'cancelada'), t.fecha_programada"
        )->fetchAll();
    }

    /**
     * Valida los datos y crea un registro de este módulo.
     * Entradas: $usuario, $datos. Salida: array.
     */
    public function crear(array $usuario, array $datos): array
    {
        $tipo = trim((string) ($datos['tipo'] ?? ''));
        $titulo = trim((string) ($datos['titulo'] ?? ''));
        $descripcion = trim((string) ($datos['descripcion'] ?? ''));
        $fecha = trim((string) ($datos['fecha_programada'] ?? ''));
        if (!in_array($tipo, ['preventiva', 'reactiva'], true) || $titulo === '' || $descripcion === '' || strtotime($fecha) === false) {
            responderError(422, 'Datos de tarea incompletos o no validos');
        }
        $consulta = $this->conexion->prepare(
            "INSERT INTO tareas_soporte
               (id_creador, id_tecnico_asignado, id_equipo, id_espacio, tipo, titulo, descripcion, fecha_programada)
             VALUES (:creador, :tecnico, :equipo, :espacio, :tipo, :titulo, :descripcion, :fecha)"
        );
        $consulta->execute([
            'creador' => $usuario['id_usuario'],
            'tecnico' => ($datos['id_tecnico'] ?? '') === '' ? null : (int) $datos['id_tecnico'],
            'equipo' => ($datos['id_equipo'] ?? '') === '' ? null : (int) $datos['id_equipo'],
            'espacio' => ($datos['id_espacio'] ?? '') === '' ? null : (int) $datos['id_espacio'],
            'tipo' => $tipo,
            'titulo' => $titulo,
            'descripcion' => $descripcion,
            'fecha' => date('Y-m-d H:i:s', strtotime($fecha)),
        ]);
        $id = (int) $this->conexion->lastInsertId();
        (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'tareas', 'crear', 'tarea', $id, null, ['tipo' => $tipo, 'titulo' => $titulo]);
        return ['id_tarea' => $id, 'estado' => 'pendiente'];
    }

    /**
     * Comprueba permisos y aplica una transición de estado permitida.
     * Entradas: $id, $usuario, $datos. Salida: array.
     */
    public function cambiarEstado(int $id, array $usuario, array $datos): array
    {
        $estado = trim((string) ($datos['estado'] ?? ''));
        $this->conexion->beginTransaction();
        try {
            $consulta = $this->conexion->prepare("SELECT estado FROM tareas_soporte WHERE id_tarea = :id FOR UPDATE");
            $consulta->execute(['id' => $id]);
            $actual = $consulta->fetchColumn();
            if ($actual === false) {
                responderError(404, 'Tarea no encontrada');
            }
            if (!in_array($estado, self::TRANSICIONES[(string) $actual] ?? [], true)) {
                responderError(409, 'Transicion de tarea no permitida');
            }
            if ($estado === 'completada' && trim((string) ($datos['resultado'] ?? '')) === '') {
                responderError(422, 'El resultado es obligatorio al completar una tarea');
            }
            $actualizar = $this->conexion->prepare(
                "UPDATE tareas_soporte SET estado = :estado,
                   id_tecnico_asignado = CASE
                     WHEN :estado_asignacion = 'en_proceso' THEN COALESCE(id_tecnico_asignado, :tecnico)
                     ELSE id_tecnico_asignado
                   END,
                   resultado = CASE WHEN :estado_resultado = 'completada' THEN :resultado ELSE resultado END,
                   fecha_inicio = CASE WHEN :estado_inicio = 'en_proceso' THEN CURRENT_TIMESTAMP ELSE fecha_inicio END,
                   fecha_finalizacion = CASE WHEN :estado_fin IN ('completada', 'cancelada') THEN CURRENT_TIMESTAMP ELSE fecha_finalizacion END
                 WHERE id_tarea = :id"
            );
            $actualizar->execute([
                'estado' => $estado,
                'estado_asignacion' => $estado,
                'tecnico' => $usuario['id_usuario'],
                'estado_resultado' => $estado,
                'resultado' => trim((string) ($datos['resultado'] ?? '')) ?: null,
                'estado_inicio' => $estado,
                'estado_fin' => $estado,
                'id' => $id,
            ]);
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'tareas', 'cambiar_estado', 'tarea', $id, ['estado' => $actual], ['estado' => $estado]);
            $this->conexion->commit();
            return ['id_tarea' => $id, 'estado' => $estado];
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
    }

    /** DELETE logico: cancelar conserva la tarea para auditoria y reportes. */
    public function cancelar(int $id, array $usuario): array
    {
        return $this->cambiarEstado($id, $usuario, ['estado' => 'cancelada']);
    }
}
