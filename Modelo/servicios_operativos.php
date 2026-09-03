<?php

declare(strict_types=1);

final class ServicioAuditoria
{
    public function __construct(private PDO $conexion)
    {
    }

    public function registrar(
        ?int $idUsuario,
        string $modulo,
        string $accion,
        string $entidad,
        ?int $idEntidad,
        ?array $anteriores = null,
        ?array $nuevos = null
    ): void {
        $consulta = $this->conexion->prepare(
            "INSERT INTO auditoria
               (id_usuario, modulo, accion, entidad, id_entidad, datos_anteriores, datos_nuevos)
             VALUES
               (:id_usuario, :modulo, :accion, :entidad, :id_entidad, :anteriores, :nuevos)"
        );
        $consulta->execute([
            'id_usuario' => $idUsuario,
            'modulo' => $modulo,
            'accion' => $accion,
            'entidad' => $entidad,
            'id_entidad' => $idEntidad,
            'anteriores' => $anteriores === null ? null : json_encode($anteriores, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'nuevos' => $nuevos === null ? null : json_encode($nuevos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }

    public function listar(array $filtros): array
    {
        // La autoria se conserva en auditoria.id_usuario, pero no se expone al frontend.
        $sql = "SELECT a.id_auditoria, a.modulo, a.accion, a.entidad, a.id_entidad,
                       a.datos_anteriores, a.datos_nuevos, a.fecha
                FROM auditoria a
                WHERE 1 = 1";
        $parametros = [];

        if (($filtros['modulo'] ?? '') !== '') {
            $sql .= " AND a.modulo = :modulo";
            $parametros['modulo'] = trim((string) $filtros['modulo']);
        }
        if (($filtros['desde'] ?? '') !== '') {
            $sql .= " AND DATE(a.fecha) >= :desde";
            $parametros['desde'] = (string) $filtros['desde'];
        }
        if (($filtros['hasta'] ?? '') !== '') {
            $sql .= " AND DATE(a.fecha) <= :hasta";
            $parametros['hasta'] = (string) $filtros['hasta'];
        }

        $sql .= " ORDER BY a.fecha DESC, a.id_auditoria DESC LIMIT 500";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute($parametros);

        return array_map(static function (array $fila): array {
            $fila['datos_anteriores'] = $fila['datos_anteriores'] ? json_decode((string) $fila['datos_anteriores'], true) : null;
            $fila['datos_nuevos'] = $fila['datos_nuevos'] ? json_decode((string) $fila['datos_nuevos'], true) : null;
            return $fila;
        }, $consulta->fetchAll());
    }
}

final class ServicioInventario
{
    private const ESTADOS = ['disponible', 'prestado', 'en_reparacion', 'fuera_de_servicio', 'baja'];

    public function __construct(private PDO $conexion)
    {
    }

    public function listar(array $filtros = []): array
    {
        $sql = "SELECT e.id_equipo, e.codigo_inventario, e.nombre, e.tipo, e.estado,
                       e.ubicacion_detalle, e.fecha_alta, e.fecha_actualizacion,
                       e.id_espacio_actual, ep.nombre AS espacio,
                       (SELECT MAX(h.fecha) FROM historial_equipos h WHERE h.id_equipo = e.id_equipo) AS ultima_revision
                FROM equipos e
                LEFT JOIN espacios ep ON ep.id_espacio = e.id_espacio_actual
                WHERE 1 = 1";
        $parametros = [];

        if (($filtros['estado'] ?? '') !== '') {
            $sql .= " AND e.estado = :estado";
            $parametros['estado'] = (string) $filtros['estado'];
        }
        if (($filtros['id_espacio'] ?? '') !== '') {
            $sql .= " AND e.id_espacio_actual = :id_espacio";
            $parametros['id_espacio'] = (int) $filtros['id_espacio'];
        }
        if (($filtros['disponibles'] ?? '') === '1') {
            $sql .= " AND e.estado = 'disponible'
                      AND NOT EXISTS (
                        SELECT 1 FROM prestamos p
                        WHERE p.id_equipo = e.id_equipo
                          AND p.estado IN ('solicitado', 'aprobado', 'entregado', 'atrasado')
                      )";
        }
        if (($filtros['q'] ?? '') !== '') {
            $sql .= " AND (e.codigo_inventario LIKE :q_codigo OR e.nombre LIKE :q_nombre OR e.tipo LIKE :q_tipo)";
            $texto = '%' . trim((string) $filtros['q']) . '%';
            $parametros['q_codigo'] = $texto;
            $parametros['q_nombre'] = $texto;
            $parametros['q_tipo'] = $texto;
        }

        $sql .= " ORDER BY FIELD(e.estado, 'disponible', 'en_reparacion', 'prestado', 'fuera_de_servicio', 'baja'), e.nombre";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute($parametros);
        return $consulta->fetchAll();
    }

    public function crear(array $usuario, array $datos): array
    {
        $valores = $this->validar($datos);
        $this->conexion->beginTransaction();
        try {
            $consulta = $this->conexion->prepare(
                "INSERT INTO equipos
                   (id_espacio_actual, codigo_inventario, nombre, tipo, estado, ubicacion_detalle, fecha_alta)
                 VALUES
                   (:id_espacio, :codigo, :nombre, :tipo, :estado, :ubicacion, :fecha_alta)"
            );
            $consulta->execute($valores);
            $id = (int) $this->conexion->lastInsertId();
            $this->historial($id, (int) $usuario['id_usuario'], 'alta', 'Equipo registrado en inventario');
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'inventario', 'alta', 'equipo', $id, null, $valores);
            $this->conexion->commit();
            return ['id_equipo' => $id, 'estado' => $valores['estado']];
        } catch (PDOException $error) {
            $this->conexion->rollBack();
            if ((string) $error->getCode() === '23000') {
                responderError(409, 'Ya existe un equipo con ese codigo de inventario');
            }
            throw $error;
        }
    }

    public function actualizar(int $id, array $usuario, array $datos): array
    {
        $valores = $this->validar($datos);
        $this->conexion->beginTransaction();
        try {
            $anterior = $this->obtenerBloqueado($id);
            if ($anterior['estado'] === 'prestado' && $valores['estado'] !== 'prestado') {
                responderError(409, 'El estado de un equipo prestado se actualiza desde el prestamo');
            }
            $consulta = $this->conexion->prepare(
                "UPDATE equipos SET
                   id_espacio_actual = :id_espacio, codigo_inventario = :codigo, nombre = :nombre,
                   tipo = :tipo, estado = :estado, ubicacion_detalle = :ubicacion, fecha_alta = :fecha_alta
                 WHERE id_equipo = :id"
            );
            $consulta->execute($valores + ['id' => $id]);
            $this->historial($id, (int) $usuario['id_usuario'], 'cambio_estado', 'Datos de inventario actualizados');
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'inventario', 'modificar', 'equipo', $id, $anterior, $valores);
            $this->conexion->commit();
            return ['id_equipo' => $id, 'estado' => $valores['estado']];
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
    }

    public function darBaja(int $id, array $usuario): array
    {
        $this->conexion->beginTransaction();
        try {
            $anterior = $this->obtenerBloqueado($id);
            if ($anterior['estado'] === 'prestado') {
                responderError(409, 'No se puede dar de baja un equipo prestado');
            }
            $consulta = $this->conexion->prepare("UPDATE equipos SET estado = 'baja' WHERE id_equipo = :id");
            $consulta->execute(['id' => $id]);
            $this->historial($id, (int) $usuario['id_usuario'], 'baja', 'Baja logica de inventario');
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'inventario', 'baja', 'equipo', $id, $anterior, ['estado' => 'baja']);
            $this->conexion->commit();
            return ['id_equipo' => $id, 'estado' => 'baja'];
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
    }

    private function validar(array $datos): array
    {
        $codigo = trim((string) ($datos['codigo_inventario'] ?? ''));
        $nombre = trim((string) ($datos['nombre'] ?? ''));
        $tipo = trim((string) ($datos['tipo'] ?? ''));
        $estado = trim((string) ($datos['estado'] ?? 'disponible'));
        $fecha = trim((string) ($datos['fecha_alta'] ?? date('Y-m-d')));
        $idEspacio = ($datos['id_espacio'] ?? '') === '' ? null : (int) $datos['id_espacio'];
        if ($codigo === '' || $nombre === '' || $tipo === '' || !in_array($estado, self::ESTADOS, true)) {
            responderError(422, 'Codigo, nombre, tipo y estado valido son obligatorios');
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
            responderError(422, 'Fecha de alta no valida');
        }
        return [
            'id_espacio' => $idEspacio,
            'codigo' => $codigo,
            'nombre' => $nombre,
            'tipo' => $tipo,
            'estado' => $estado,
            'ubicacion' => trim((string) ($datos['ubicacion_detalle'] ?? '')) ?: null,
            'fecha_alta' => $fecha,
        ];
    }

    private function obtenerBloqueado(int $id): array
    {
        $consulta = $this->conexion->prepare("SELECT * FROM equipos WHERE id_equipo = :id FOR UPDATE");
        $consulta->execute(['id' => $id]);
        $fila = $consulta->fetch();
        if (!$fila) {
            responderError(404, 'Equipo no encontrado');
        }
        return $fila;
    }

    private function historial(int $idEquipo, int $idUsuario, string $tipo, string $descripcion): void
    {
        $consulta = $this->conexion->prepare(
            "INSERT INTO historial_equipos (id_equipo, id_usuario_responsable, tipo_movimiento, descripcion)
             VALUES (:equipo, :usuario, :tipo, :descripcion)"
        );
        $consulta->execute(['equipo' => $idEquipo, 'usuario' => $idUsuario, 'tipo' => $tipo, 'descripcion' => $descripcion]);
    }
}

final class ServicioEspacios
{
    public function __construct(private PDO $conexion)
    {
    }

    public function listar(): array
    {
        return $this->conexion->query(
            "SELECT id_espacio, tipo, nombre, ubicacion, capacidad, estado
             FROM espacios WHERE estado <> 'inactivo' ORDER BY tipo, nombre"
        )->fetchAll();
    }
}

final class ServicioCategoriasIncidencia
{
    public function __construct(private PDO $conexion)
    {
    }

    public function listar(bool $incluirInactivas = false): array
    {
        $sql = "SELECT id_categoria, nombre, descripcion, estado FROM categorias_incidencia";
        if (!$incluirInactivas) {
            $sql .= " WHERE estado = 'activa'";
        }
        $sql .= " ORDER BY nombre";
        return $this->conexion->query($sql)->fetchAll();
    }

    public function crear(array $usuario, array $datos): array
    {
        $nombre = trim((string) ($datos['nombre'] ?? ''));
        if ($nombre === '') {
            responderError(422, 'El nombre de la categoria es obligatorio');
        }
        $consulta = $this->conexion->prepare(
            "INSERT INTO categorias_incidencia (nombre, descripcion, estado)
             VALUES (:nombre, :descripcion, 'activa')"
        );
        try {
            $consulta->execute(['nombre' => $nombre, 'descripcion' => trim((string) ($datos['descripcion'] ?? '')) ?: null]);
        } catch (PDOException $error) {
            if ((string) $error->getCode() === '23000') {
                responderError(409, 'Ya existe esa categoria');
            }
            throw $error;
        }
        $id = (int) $this->conexion->lastInsertId();
        (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'incidencias', 'alta_categoria', 'categoria', $id, null, ['nombre' => $nombre]);
        return ['id_categoria' => $id, 'estado' => 'activa'];
    }

    public function actualizar(int $id, array $usuario, array $datos): array
    {
        $nombre = trim((string) ($datos['nombre'] ?? ''));
        $estado = trim((string) ($datos['estado'] ?? 'activa'));
        if ($nombre === '' || !in_array($estado, ['activa', 'inactiva'], true)) {
            responderError(422, 'Datos de categoria no validos');
        }
        $consulta = $this->conexion->prepare(
            "UPDATE categorias_incidencia SET nombre = :nombre, descripcion = :descripcion, estado = :estado
             WHERE id_categoria = :id"
        );
        $consulta->execute([
            'nombre' => $nombre,
            'descripcion' => trim((string) ($datos['descripcion'] ?? '')) ?: null,
            'estado' => $estado,
            'id' => $id,
        ]);
        if ($consulta->rowCount() === 0) {
            responderError(404, 'Categoria no encontrada');
        }
        (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'incidencias', 'modificar_categoria', 'categoria', $id, null, ['nombre' => $nombre, 'estado' => $estado]);
        return ['id_categoria' => $id, 'estado' => $estado];
    }
}

final class ServicioConocimiento
{
    public function __construct(private PDO $conexion)
    {
    }

    public function buscar(array $filtros): array
    {
        $sql = "SELECT t.id_ticket, t.titulo, t.descripcion, t.fecha_cierre,
                       e.id_equipo, e.codigo_inventario, e.nombre AS equipo,
                       c.id_categoria, c.nombre AS categoria,
                       r.diagnostico, r.solucion_aplicada
                FROM resoluciones_incidencia r
                INNER JOIN tickets_incidencia t ON t.id_ticket = r.id_ticket
                LEFT JOIN equipos e ON e.id_equipo = t.id_equipo
                LEFT JOIN categorias_incidencia c ON c.id_categoria = t.id_categoria
                WHERE t.estado = 'resuelta' AND COALESCE(r.solucion_aplicada, '') <> ''";
        $parametros = [];
        if (($filtros['q'] ?? '') !== '') {
            $sql .= " AND (t.titulo LIKE :q_titulo OR t.descripcion LIKE :q_descripcion OR r.diagnostico LIKE :q_diagnostico OR r.solucion_aplicada LIKE :q_solucion)";
            $texto = '%' . trim((string) $filtros['q']) . '%';
            $parametros['q_titulo'] = $texto;
            $parametros['q_descripcion'] = $texto;
            $parametros['q_diagnostico'] = $texto;
            $parametros['q_solucion'] = $texto;
        }
        if (($filtros['id_equipo'] ?? '') !== '') {
            $sql .= " AND t.id_equipo = :equipo";
            $parametros['equipo'] = (int) $filtros['id_equipo'];
        }
        if (($filtros['id_categoria'] ?? '') !== '') {
            $sql .= " AND t.id_categoria = :categoria";
            $parametros['categoria'] = (int) $filtros['id_categoria'];
        }
        $sql .= " ORDER BY t.fecha_cierre DESC LIMIT 200";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute($parametros);
        return $consulta->fetchAll();
    }
}

final class ServicioTareas
{
    private const TRANSICIONES = [
        'pendiente' => ['en_proceso', 'cancelada'],
        'en_proceso' => ['completada', 'cancelada'],
        'completada' => [],
        'cancelada' => [],
    ];

    public function __construct(private PDO $conexion)
    {
    }

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
                   id_tecnico_asignado = COALESCE(id_tecnico_asignado, :tecnico),
                   resultado = CASE WHEN :estado_resultado = 'completada' THEN :resultado ELSE resultado END,
                   fecha_inicio = CASE WHEN :estado_inicio = 'en_proceso' THEN CURRENT_TIMESTAMP ELSE fecha_inicio END,
                   fecha_finalizacion = CASE WHEN :estado_fin IN ('completada', 'cancelada') THEN CURRENT_TIMESTAMP ELSE fecha_finalizacion END
                 WHERE id_tarea = :id"
            );
            $actualizar->execute([
                'estado' => $estado,
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
}
