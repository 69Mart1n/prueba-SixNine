<?php

declare(strict_types=1);

/** Reglas del módulo prestamos. */
final class ServicioPrestamos
{
    private const TRANSICIONES = [
        'solicitado' => ['aprobado', 'rechazado', 'cancelado'],
        'aprobado' => ['entregado', 'cancelado'],
        'entregado' => ['atrasado', 'devuelto'],
        'atrasado' => ['devuelto'],
        'devuelto' => [],
        'rechazado' => [],
        'cancelado' => [],
    ];

    /**
     * Guarda la conexión a la base de datos que usará este servicio.
     * Entradas: $conexion. Salida: sin valor.
     */
    public function __construct(private PDO $conexion)
    {
    }

    // GET es de solo lectura; la actualización real usa el POST protegido.
    /**
     * Consulta los registros visibles de este módulo.
     * Entradas: $usuario, $soloPropias. Salida: array.
     */
    public function listar(array $usuario, bool $soloPropias = false): array
    {
        $sql = "SELECT
                  p.id_prestamo,
                  p.recurso_solicitado,
                  p.nombre_estudiante,
                  p.cedula_estudiante,
                  p.grupo,
                  p.motivo,
                  p.fecha_prestamo,
                  p.fecha_devolucion_prevista,
                  p.fecha_entrega_real,
                  p.fecha_devolucion_real,
                  p.condicion_devolucion,
                  p.observaciones_devolucion,
                  CASE WHEN p.estado = 'entregado'
                         AND p.fecha_devolucion_prevista < CURRENT_DATE
                         AND p.fecha_devolucion_real IS NULL
                       THEN 'atrasado' ELSE p.estado END AS estado,
                  e.codigo_inventario,
                  e.nombre AS equipo,
                  CONCAT(u.nombre, ' ', u.apellido) AS docente_asociado
                FROM prestamos p
                INNER JOIN usuarios u ON u.id_usuario = p.id_solicitante
                LEFT JOIN equipos e ON e.id_equipo = p.id_equipo";

        $parametros = [];

        if ($soloPropias || $usuario['rol'] === 'solicitante') {
            $sql .= " WHERE p.id_solicitante = :id_usuario";
            $parametros['id_usuario'] = $usuario['id_usuario'];
        }

        $sql .= " ORDER BY p.fecha_creacion DESC";

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
        $idEquipo = (int) ($datos['id_equipo'] ?? 0);
        $estudiante = trim((string) ($datos['estudiante'] ?? $datos['nombre_estudiante'] ?? ''));
        $cedula = preg_replace('/\D+/', '', (string) ($datos['cedulaEstudiante'] ?? $datos['cedula_estudiante'] ?? ''));
        $grupo = trim((string) ($datos['grupo'] ?? $datos['actividad'] ?? ''));
        $motivo = trim((string) ($datos['motivo'] ?? ''));
        $fechaPrestamo = $this->normalizarFecha((string) ($datos['fechaPrestamo'] ?? $datos['fecha_prestamo'] ?? ''));
        $fechaDevolucion = $this->normalizarFecha((string) ($datos['fechaDevolucion'] ?? $datos['fecha_devolucion_prevista'] ?? ''));

        if ($idEquipo <= 0 || $estudiante === '' || $cedula === '' || $grupo === '' || $motivo === '' || $fechaPrestamo === null || $fechaDevolucion === null) {
            responderError(422, 'Datos de préstamo incompletos');
        }

        if ($fechaDevolucion < $fechaPrestamo) {
            responderError(422, 'La fecha de devolución no puede ser anterior al préstamo');
        }

        $this->conexion->beginTransaction();
        try {
            $equipo = $this->conexion->prepare(
                "SELECT id_equipo, codigo_inventario, nombre, tipo, es_prestable, estado FROM equipos WHERE id_equipo = :id FOR UPDATE"
            );
            $equipo->execute(['id' => $idEquipo]);
            $filaEquipo = $equipo->fetch();
            if (!$filaEquipo) {
                responderError(404, 'Equipo no encontrado');
            }
            if (!EquipoPrestable::puedePrestarse($filaEquipo)) {
                responderError(409, 'Este equipo es fijo y no se puede prestar');
            }
            if ((string) $filaEquipo['estado'] !== 'disponible') {
                responderError(409, 'El equipo no está disponible');
            }
            $ocupado = $this->conexion->prepare(
                "SELECT COUNT(*) FROM prestamos WHERE id_equipo = :id AND estado IN ('solicitado', 'aprobado', 'entregado', 'atrasado')"
            );
            $ocupado->execute(['id' => $idEquipo]);
            if ((int) $ocupado->fetchColumn() > 0) {
                responderError(409, 'El equipo ya tiene una solicitud o préstamo activo');
            }
            $recurso = $filaEquipo['codigo_inventario'] . ' - ' . $filaEquipo['nombre'];
            $consulta = $this->conexion->prepare(
                "INSERT INTO prestamos
                   (id_solicitante, id_equipo, recurso_solicitado, nombre_estudiante, cedula_estudiante, grupo, motivo, fecha_prestamo, fecha_devolucion_prevista, estado)
                 VALUES
                   (:id_solicitante, :id_equipo, :recurso, :estudiante, :cedula, :grupo, :motivo, :fecha_prestamo, :fecha_devolucion, 'solicitado')"
            );
            $consulta->execute([
                'id_solicitante' => $usuario['id_usuario'],
                'id_equipo' => $idEquipo,
                'recurso' => $recurso,
                'estudiante' => $estudiante,
                'cedula' => $cedula,
                'grupo' => $grupo,
                'motivo' => $motivo,
                'fecha_prestamo' => $fechaPrestamo,
                'fecha_devolucion' => $fechaDevolucion,
            ]);
            $id = (int) $this->conexion->lastInsertId();
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'prestamos', 'solicitar', 'prestamo', $id, null, ['id_equipo' => $idEquipo]);
            $this->conexion->commit();
            return ['id_prestamo' => $id, 'estado' => 'solicitado'];
        } catch (PDOException $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            if ((string) $error->getCode() === '23000') {
                responderError(409, 'Ya existe una solicitud equivalente');
            }
            throw $error;
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
    }

    // Estado: administra el ciclo solicitado, aprobado, entregado, devuelto, etc.
    /**
     * Comprueba permisos y aplica una transición de estado permitida.
     * Entradas: $idPrestamo, $usuario, $estado. Salida: array.
     */
    public function cambiarEstado(int $idPrestamo, array $usuario, string $estado): array
    {
        $estados = ['solicitado', 'aprobado', 'entregado', 'devuelto', 'atrasado', 'rechazado', 'cancelado'];

        if (!in_array($estado, $estados, true)) {
            responderError(422, 'Estado de préstamo no válido');
        }

        if (!in_array($estado, ['aprobado', 'rechazado', 'cancelado'], true)) {
            responderError(409, 'Use la acción específica para entregar o devolver');
        }
        $this->conexion->beginTransaction();
        try {
            $prestamo = $this->obtenerBloqueado($idPrestamo);
            if (!in_array($estado, self::TRANSICIONES[(string) $prestamo['estado']] ?? [], true)) {
                responderError(409, 'Transición de préstamo no permitida');
            }
            if ($estado === 'aprobado' && $this->estudianteEstaEnBlacklist($idPrestamo)) {
                responderError(409, 'El estudiante posee una restricción activa en Black list');
            }
            $consulta = $this->conexion->prepare("UPDATE prestamos SET estado = :estado WHERE id_prestamo = :id");
            $consulta->execute(['estado' => $estado, 'id' => $idPrestamo]);
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'prestamos', 'cambiar_estado', 'prestamo', $idPrestamo, ['estado' => $prestamo['estado']], ['estado' => $estado]);
            $this->conexion->commit();
            return ['id_prestamo' => $idPrestamo, 'estado' => $estado];
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
    }

    /**
     * Confirma la entrega y marca el equipo como prestado.
     * Entradas: $idPrestamo, $usuario. Salida: array.
     */
    public function marcarEntregado(int $idPrestamo, array $usuario): array
    {
        $this->conexion->beginTransaction();
        try {
            $prestamo = $this->obtenerBloqueado($idPrestamo);
            if (!in_array('entregado', self::TRANSICIONES[(string) $prestamo['estado']] ?? [], true)) {
                responderError(409, 'El préstamo debe estar aprobado antes de entregarse');
            }
            if ((string) $prestamo['fecha_prestamo'] > date('Y-m-d')) {
                responderError(409, 'El préstamo no puede entregarse antes de la fecha solicitada');
            }
            $equipo = $this->conexion->prepare("SELECT tipo, es_prestable, estado FROM equipos WHERE id_equipo = :id FOR UPDATE");
            $equipo->execute(['id' => $prestamo['id_equipo']]);
            $filaEquipo = $equipo->fetch();
            if (!$filaEquipo || !EquipoPrestable::puedePrestarse($filaEquipo)) {
                responderError(409, 'Este equipo es fijo y no se puede prestar');
            }
            if ((string) $filaEquipo['estado'] !== 'disponible') {
                responderError(409, 'El equipo dejó de estar disponible');
            }
            $this->conexion->prepare(
                "UPDATE prestamos SET estado = 'entregado', fecha_entrega_real = CURRENT_TIMESTAMP, id_tecnico_entrega = :tecnico WHERE id_prestamo = :id"
            )->execute(['tecnico' => $usuario['id_usuario'], 'id' => $idPrestamo]);
            $this->conexion->prepare("UPDATE equipos SET estado = 'prestado' WHERE id_equipo = :id")
                ->execute(['id' => $prestamo['id_equipo']]);
            $this->registrarMovimientoEquipo((int) $prestamo['id_equipo'], (int) $usuario['id_usuario'], 'prestamo', 'Equipo entregado en préstamo');
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'prestamos', 'entregar', 'prestamo', $idPrestamo, ['estado' => $prestamo['estado']], ['estado' => 'entregado']);
            $this->conexion->commit();
            return ['id_prestamo' => $idPrestamo, 'estado' => 'entregado'];
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
    }

    /**
     * Registra la devolución y actualiza la disponibilidad del equipo.
     * Entradas: $idPrestamo, $usuario, $datos. Salida: array.
     */
    public function marcarDevuelto(int $idPrestamo, array $usuario, array $datos): array
    {
        $condicion = trim((string) ($datos['condicion'] ?? ''));
        $observaciones = trim((string) ($datos['observaciones'] ?? ''));
        $estadosEquipo = ['bueno' => 'disponible', 'observado' => 'en_reparacion', 'dañado' => 'fuera_de_servicio', 'danado' => 'fuera_de_servicio'];
        if (!isset($estadosEquipo[$condicion])) {
            responderError(422, 'La condición debe ser bueno, observado o dañado');
        }
        if ($condicion !== 'bueno' && $observaciones === '') {
            responderError(422, 'Las observaciones son obligatorias si el equipo no vuelve en buen estado');
        }
        $this->conexion->beginTransaction();
        try {
            $prestamo = $this->obtenerBloqueado($idPrestamo);
            if (!in_array('devuelto', self::TRANSICIONES[(string) $prestamo['estado']] ?? [], true)) {
                responderError(409, 'Solo un préstamo entregado o atrasado puede devolverse');
            }
            $estadoEquipo = $estadosEquipo[$condicion];
            $this->conexion->prepare(
                "UPDATE prestamos SET estado = 'devuelto', fecha_devolucion_real = CURRENT_DATE,
                   id_tecnico_devolucion = :tecnico, condicion_devolucion = :condicion,
                   observaciones_devolucion = :observaciones WHERE id_prestamo = :id"
            )->execute([
                'tecnico' => $usuario['id_usuario'],
                'condicion' => $condicion === 'danado' ? 'dañado' : $condicion,
                'observaciones' => $observaciones !== '' ? $observaciones : null,
                'id' => $idPrestamo,
            ]);
            $this->conexion->prepare("UPDATE equipos SET estado = :estado WHERE id_equipo = :id")
                ->execute(['estado' => $estadoEquipo, 'id' => $prestamo['id_equipo']]);
            $this->conexion->prepare("UPDATE blacklist_estudiantes SET estado = 'regularizado', fecha_salida = CURRENT_TIMESTAMP WHERE id_prestamo = :id AND estado = 'activo'")
                ->execute(['id' => $idPrestamo]);
            $this->registrarMovimientoEquipo((int) $prestamo['id_equipo'], (int) $usuario['id_usuario'], 'devolucion', 'Equipo devuelto. Condición: ' . $condicion);
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'prestamos', 'devolver', 'prestamo', $idPrestamo, ['estado' => $prestamo['estado']], ['estado' => 'devuelto', 'condicion' => $condicion]);
            $this->conexion->commit();
            return ['id_prestamo' => $idPrestamo, 'estado' => 'devuelto', 'estado_equipo' => $estadoEquipo];
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
    }

    // El atraso comienza al vencer la fecha; Black list se activa a los siete días.
    /**
     * Marca préstamos vencidos y actualiza las restricciones relacionadas.
     * Entradas: ninguna. Salida: int.
     */
    public function actualizarAtrasos(): int
    {
        $consulta = $this->conexion->prepare(
            "UPDATE prestamos
             SET estado = 'atrasado'
             WHERE estado = 'entregado'
               AND fecha_devolucion_prevista < CURRENT_DATE
               AND fecha_devolucion_real IS NULL"
        );
        $consulta->execute();
        $actualizados = $consulta->rowCount();

        $this->registrarBlacklistPorAtrasos();

        return $actualizados;
    }

    // Blacklist automática: guarda estudiante y docente asociado.
    /**
     * Registra restricciones por préstamos atrasados.
     * Entradas: ninguna. Salida: void.
     */
    private function registrarBlacklistPorAtrasos(): void
    {
        $consulta = $this->conexion->prepare(
            "INSERT INTO blacklist_estudiantes
              (id_prestamo, id_solicitante, nombre_estudiante, cedula_estudiante, grupo, docente_asociado, motivo, dias_atraso, estado)
             SELECT
              p.id_prestamo,
              p.id_solicitante,
              p.nombre_estudiante,
              p.cedula_estudiante,
              p.grupo,
              CONCAT(u.nombre, ' ', u.apellido),
              'No devolvió el equipo luego de 7 días de atraso.',
              DATEDIFF(CURRENT_DATE, p.fecha_devolucion_prevista),
              'activo'
             FROM prestamos p
             INNER JOIN usuarios u ON u.id_usuario = p.id_solicitante
             WHERE p.estado = 'atrasado'
               AND DATEDIFF(CURRENT_DATE, p.fecha_devolucion_prevista) >= 7
             ON DUPLICATE KEY UPDATE
               dias_atraso = VALUES(dias_atraso),
               estado = 'activo'"
        );
        $consulta->execute();
    }

    // Bloqueo: si el estudiante esta en blacklist, el préstamo se rechaza.
    /**
     * Comprueba si el estudiante tiene una restricción activa.
     * Entradas: $idPrestamo. Salida: bool.
     */
    private function estudianteEstaEnBlacklist(int $idPrestamo): bool
    {
        $consulta = $this->conexion->prepare(
            "SELECT COUNT(*) AS total
             FROM blacklist_estudiantes b
             INNER JOIN prestamos p ON p.cedula_estudiante = b.cedula_estudiante
             WHERE p.id_prestamo = :id_prestamo
               AND b.estado = 'activo'"
        );
        $consulta->execute(['id_prestamo' => $idPrestamo]);

        return (int) $consulta->fetchColumn() > 0;
    }

    /**
     * Lee la fila con bloqueo para evitar cambios simultáneos.
     * Entradas: $idPrestamo. Salida: array.
     */
    private function obtenerBloqueado(int $idPrestamo): array
    {
        $consulta = $this->conexion->prepare("SELECT * FROM prestamos WHERE id_prestamo = :id FOR UPDATE");
        $consulta->execute(['id' => $idPrestamo]);
        $fila = $consulta->fetch();
        if (!$fila) {
            responderError(404, 'Préstamo no encontrado');
        }
        return $fila;
    }

    /**
     * Añade un movimiento al historial del equipo.
     * Entradas: $idEquipo, $idUsuario, $tipo, $descripcion. Salida: void.
     */
    private function registrarMovimientoEquipo(int $idEquipo, int $idUsuario, string $tipo, string $descripcion): void
    {
        $consulta = $this->conexion->prepare(
            "INSERT INTO historial_equipos (id_equipo, id_usuario_responsable, tipo_movimiento, descripcion)
             VALUES (:equipo, :usuario, :tipo, :descripcion)"
        );
        $consulta->execute(['equipo' => $idEquipo, 'usuario' => $idUsuario, 'tipo' => $tipo, 'descripcion' => $descripcion]);
    }

    /**
     * Convierte y valida la fecha recibida al formato de la base.
     * Entradas: $valor. Salida: ?string.
     */
    private function normalizarFecha(string $valor): ?string
    {
        $valor = trim($valor);
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $valor)) {
            return $valor;
        }

        if (!preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $valor, $partes)) {
            return null;
        }

        return checkdate((int) $partes[2], (int) $partes[1], (int) $partes[3])
            ? "{$partes[3]}-{$partes[2]}-{$partes[1]}"
            : null;
    }
}

/**
 * Solicitudes de servicio: reserva de sala, software y soporte.
 */
