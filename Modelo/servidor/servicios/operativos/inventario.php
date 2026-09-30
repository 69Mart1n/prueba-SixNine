<?php

declare(strict_types=1);

/** Reglas del módulo inventario. */
final class ServicioInventario
{
    private const ESTADOS = ['disponible', 'prestado', 'en_reparacion', 'fuera_de_servicio', 'baja'];

    /**
     * Guarda la conexión a la base de datos que usará este servicio.
     * Entradas: $conexion. Salida: sin valor.
     */
    public function __construct(private PDO $conexion)
    {
    }

    /**
     * Consulta los registros visibles de este módulo.
     * Entradas: $filtros. Salida: array.
     */
    public function listar(array $filtros = []): array
    {
        $sql = "SELECT e.id_equipo, e.codigo_inventario, e.nombre, e.tipo, e.es_prestable, e.estado,
                       e.ubicacion_detalle, e.fecha_alta, e.fecha_actualizacion,
                       e.id_espacio_actual, ep.nombre AS espacio, ep.tipo AS tipo_espacio,
                       (SELECT MAX(h.fecha) FROM historial_equipos h WHERE h.id_equipo = e.id_equipo) AS ultima_revision
                FROM equipos e
                LEFT JOIN espacios ep ON ep.id_espacio = e.id_espacio_actual
                WHERE e.es_archivado = 0";
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
                      AND e.es_prestable = 1
                      AND LOWER(TRIM(e.tipo)) IN ('notebook', 'laptop')
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

    /**
     * Valida los datos y crea un registro de este módulo.
     * Entradas: $usuario, $datos. Salida: array.
     */
    public function crear(array $usuario, array $datos): array
    {
        $valores = $this->validar($datos);
        $this->conexion->beginTransaction();
        try {
            $consulta = $this->conexion->prepare(
                "INSERT INTO equipos
                   (id_espacio_actual, codigo_inventario, nombre, tipo, es_prestable, estado, ubicacion_detalle, fecha_alta)
                 VALUES
                   (:id_espacio, :codigo, :nombre, :tipo, :es_prestable, :estado, :ubicacion, :fecha_alta)"
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

    /**
     * Valida los datos y modifica un registro existente.
     * Entradas: $id, $usuario, $datos. Salida: array.
     */
    public function actualizar(int $id, array $usuario, array $datos): array
    {
        $valores = $this->validar($datos, $id);
        $this->conexion->beginTransaction();
        try {
            $anterior = $this->obtenerBloqueado($id);
            if ($anterior['estado'] === 'prestado' && $valores['estado'] !== 'prestado') {
                responderError(409, 'El estado de un equipo prestado se actualiza desde el prestamo');
            }
            if ((int) $anterior['es_prestable'] === 1 && $valores['es_prestable'] === 0) {
                $ocupado = $this->conexion->prepare(
                    "SELECT COUNT(*) FROM prestamos WHERE id_equipo = :id AND estado IN ('solicitado', 'aprobado', 'entregado', 'atrasado')"
                );
                $ocupado->execute(['id' => $id]);
                if ((int) $ocupado->fetchColumn() > 0) {
                    responderError(409, 'No se puede quitar el préstamo a un equipo con una solicitud activa');
                }
            }
            $consulta = $this->conexion->prepare(
                "UPDATE equipos SET
                   id_espacio_actual = :id_espacio, codigo_inventario = :codigo, nombre = :nombre,
                   tipo = :tipo, es_prestable = :es_prestable, estado = :estado, ubicacion_detalle = :ubicacion, fecha_alta = :fecha_alta
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

    /**
     * Desactiva el registro sin eliminar su historial.
     * Entradas: $id, $usuario. Salida: array.
     */
    public function darBaja(int $id, array $usuario): array
    {
        $this->conexion->beginTransaction();
        try {
            $anterior = $this->obtenerBloqueado($id);
            if ($anterior['estado'] === 'prestado') {
                responderError(409, 'No se puede dar de baja un equipo prestado');
            }
            $consulta = $this->conexion->prepare("UPDATE equipos SET estado = 'baja', es_archivado = 1 WHERE id_equipo = :id");
            $consulta->execute(['id' => $id]);
            $this->historial($id, (int) $usuario['id_usuario'], 'baja', 'Baja logica de inventario');
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'inventario', 'baja', 'equipo', $id, $anterior, ['estado' => 'baja', 'es_archivado' => 1]);
            $this->conexion->commit();
            return ['id_equipo' => $id, 'estado' => 'baja'];
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
    }

    /**
     * Comprueba las reglas del módulo antes de guardar cambios.
     * Entradas: $datos, $idActual. Salida: array.
     */
    private function validar(array $datos, int $idActual = 0): array
    {
        $codigo = trim((string) ($datos['codigo_inventario'] ?? ''));
        $nombre = trim((string) ($datos['nombre'] ?? ''));
        $tipo = trim((string) ($datos['tipo'] ?? ''));
        $tipo = match (strtolower($tipo)) {
            'pc' => 'PC',
            'tv' => 'TV',
            'notebook' => 'Notebook',
            'laptop' => 'Laptop',
            default => $tipo,
        };
        $esPrestable = filter_var($datos['es_prestable'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        $estado = trim((string) ($datos['estado'] ?? 'disponible'));
        $fecha = trim((string) ($datos['fecha_alta'] ?? date('Y-m-d')));
        $idEspacio = ($datos['id_espacio'] ?? '') === '' ? null : (int) $datos['id_espacio'];
        if ($codigo === '' || $nombre === '' || $tipo === '' || !in_array($estado, self::ESTADOS, true)) {
            responderError(422, 'Codigo, nombre, tipo y estado valido son obligatorios');
        }
        if (!in_array($tipo, ['PC', 'TV', 'Notebook', 'Laptop'], true)) {
            responderError(422, 'El inventario solo admite PC fijas, TV y laptops de préstamo');
        }
        if ($esPrestable === 1 && !EquipoPrestable::esPortatil($tipo)) {
            responderError(422, 'Solo las laptops o notebooks pueden marcarse para préstamo');
        }
        if ($esPrestable === 1 && $idEspacio !== null) {
            responderError(422, 'Los equipos de préstamo no se asignan a salones, talleres ni laboratorios');
        }
        if (EquipoPrestable::esPortatil($tipo) && $esPrestable !== 1) {
            responderError(422, 'Las laptops o notebooks del inventario deben ser prestables');
        }
        if (in_array($tipo, ['PC', 'TV'], true)) {
            if ($idEspacio === null) {
                responderError(422, 'Las PC y TV fijas deben estar asignadas a una sala');
            }
            $consulta = $this->conexion->prepare("SELECT tipo FROM espacios WHERE id_espacio = :id AND estado <> 'inactivo'");
            $consulta->execute(['id' => $idEspacio]);
            $tipoEspacio = $consulta->fetchColumn();
            if (!in_array($tipoEspacio, ['salon', 'taller', 'laboratorio'], true)) {
                responderError(422, 'La sala seleccionada no está disponible');
            }
            $ubicacion = trim((string) ($datos['ubicacion_detalle'] ?? ''));
            if ($tipo === 'PC') {
                $esDocente = $ubicacion === 'Puesto docente';
                $esAlumno = preg_match('/^Puesto (0[1-9]|1[0-6])$/', $ubicacion) === 1;
                if (!$esDocente && !($tipoEspacio !== 'salon' && $esAlumno)) {
                    responderError(422, 'Use Puesto docente o un puesto de alumno del 01 al 16 según la sala');
                }
                $duplicado = $this->conexion->prepare(
                    "SELECT COUNT(*) FROM equipos WHERE id_espacio_actual = :espacio AND tipo = 'PC'
                     AND ubicacion_detalle = :ubicacion AND estado <> 'baja' AND es_archivado = 0 AND id_equipo <> :actual"
                );
                $duplicado->execute(['espacio' => $idEspacio, 'ubicacion' => $ubicacion, 'actual' => $idActual]);
            } else {
                $duplicado = $this->conexion->prepare(
                    "SELECT COUNT(*) FROM equipos WHERE id_espacio_actual = :espacio AND tipo = 'TV'
                     AND estado <> 'baja' AND es_archivado = 0 AND id_equipo <> :actual"
                );
                $duplicado->execute(['espacio' => $idEspacio, 'actual' => $idActual]);
            }
            if ((int) $duplicado->fetchColumn() > 0) {
                responderError(409, 'Ya existe un equipo activo en ese puesto o una TV en esa sala');
            }
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
            responderError(422, 'Fecha de alta no valida');
        }
        return [
            'id_espacio' => $idEspacio,
            'codigo' => $codigo,
            'nombre' => $nombre,
            'tipo' => $tipo,
            'es_prestable' => $esPrestable,
            'estado' => $estado,
            'ubicacion' => trim((string) ($datos['ubicacion_detalle'] ?? '')) ?: null,
            'fecha_alta' => $fecha,
        ];
    }

    /**
     * Lee la fila con bloqueo para evitar cambios simultáneos.
     * Entradas: $id. Salida: array.
     */
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

    /**
     * Añade el cambio al historial del equipo.
     * Entradas: $idEquipo, $idUsuario, $tipo, $descripcion. Salida: void.
     */
    private function historial(int $idEquipo, int $idUsuario, string $tipo, string $descripcion): void
    {
        $consulta = $this->conexion->prepare(
            "INSERT INTO historial_equipos (id_equipo, id_usuario_responsable, tipo_movimiento, descripcion)
             VALUES (:equipo, :usuario, :tipo, :descripcion)"
        );
        $consulta->execute(['equipo' => $idEquipo, 'usuario' => $idUsuario, 'tipo' => $tipo, 'descripcion' => $descripcion]);
    }
}
