<?php

declare(strict_types=1);

/** Reglas del módulo espacios. */
final class ServicioEspacios
{
    /**
     * Guarda la conexión a la base de datos que usará este servicio.
     * Entradas: $conexion. Salida: sin valor.
     */
    public function __construct(private PDO $conexion)
    {
    }

    /**
     * READ del CRUD de espacios.
     * Por defecto solo devuelve espacios activos; el administrador puede pedir todos.
     */
    public function listar(bool $incluirInactivos = false): array
    {
        $sql = "SELECT id_espacio, tipo, nombre, ubicacion, capacidad, estado
                FROM espacios";

        if (!$incluirInactivos) {
            $sql .= " WHERE estado <> 'inactivo'";
        }

        $sql .= " ORDER BY tipo, nombre";
        return $this->conexion->query($sql)->fetchAll();
    }

    /** CREATE del CRUD de espacios. */
    public function crear(array $usuario, array $datos): array
    {
        $datos = $this->validar($datos);
        $consulta = $this->conexion->prepare(
            "INSERT INTO espacios (tipo, nombre, ubicacion, capacidad, estado)
             VALUES (:tipo, :nombre, :ubicacion, :capacidad, :estado)"
        );

        try {
            $consulta->execute($datos);
        } catch (PDOException $error) {
            if ((string) $error->getCode() === '23000') {
                responderError(409, 'Ya existe un espacio con ese tipo y nombre');
            }
            throw $error;
        }

        $id = (int) $this->conexion->lastInsertId();
        (new ServicioAuditoria($this->conexion))->registrar(
            (int) $usuario['id_usuario'],
            'espacios',
            'crear',
            'espacio',
            $id,
            null,
            $datos
        );

        return ['id_espacio' => $id, 'estado' => $datos['estado']];
    }

    /** UPDATE del CRUD de espacios. */
    public function actualizar(int $id, array $usuario, array $datos): array
    {
        $datos = $this->validar($datos);

        $actual = $this->conexion->prepare("SELECT estado FROM espacios WHERE id_espacio = :id");
        $actual->execute(['id' => $id]);
        $estadoActual = $actual->fetchColumn();
        if ($estadoActual === false) {
            responderError(404, 'Espacio no encontrado');
        }
        if ($datos['estado'] === 'inactivo' && $estadoActual !== 'inactivo') {
            responderError(409, 'Use la accion desactivar para dar de baja un espacio');
        }

        $datos['id'] = $id;

        $consulta = $this->conexion->prepare(
            "UPDATE espacios
             SET tipo = :tipo, nombre = :nombre, ubicacion = :ubicacion,
                 capacidad = :capacidad, estado = :estado
             WHERE id_espacio = :id"
        );

        try {
            $consulta->execute($datos);
        } catch (PDOException $error) {
            if ((string) $error->getCode() === '23000') {
                responderError(409, 'Ya existe un espacio con ese tipo y nombre');
            }
            throw $error;
        }

        if ($consulta->rowCount() === 0) {
            $existe = $this->conexion->prepare("SELECT COUNT(*) FROM espacios WHERE id_espacio = :id");
            $existe->execute(['id' => $id]);
            if ((int) $existe->fetchColumn() === 0) {
                responderError(404, 'Espacio no encontrado');
            }
        }

        (new ServicioAuditoria($this->conexion))->registrar(
            (int) $usuario['id_usuario'],
            'espacios',
            'actualizar',
            'espacio',
            $id,
            null,
            $datos
        );

        return ['id_espacio' => $id, 'estado' => $datos['estado']];
    }

    /**
     * DELETE logico del CRUD de espacios.
     * No se borra fisicamente porque prestamos, incidencias e historiales pueden referenciarlo.
     */
    public function desactivar(int $id, array $usuario): array
    {
        $equipos = $this->conexion->prepare(
            "SELECT COUNT(*) FROM equipos
             WHERE id_espacio_actual = :id AND estado <> 'baja' AND es_archivado = 0"
        );
        $equipos->execute(['id' => $id]);
        if ((int) $equipos->fetchColumn() > 0) {
            responderError(409, 'No se puede desactivar un espacio que todavia tiene equipos activos');
        }

        $consulta = $this->conexion->prepare(
            "UPDATE espacios SET estado = 'inactivo'
             WHERE id_espacio = :id AND estado <> 'inactivo'"
        );
        $consulta->execute(['id' => $id]);

        if ($consulta->rowCount() === 0) {
            responderError(404, 'Espacio no encontrado o ya inactivo');
        }

        (new ServicioAuditoria($this->conexion))->registrar(
            (int) $usuario['id_usuario'],
            'espacios',
            'desactivar',
            'espacio',
            $id,
            null,
            ['estado' => 'inactivo']
        );

        return ['id_espacio' => $id, 'estado' => 'inactivo'];
    }

    /** Validacion PHP: segunda barrera luego de la validacion HTML/JavaScript. */
    private function validar(array $datos): array
    {
        $tipo = trim((string) ($datos['tipo'] ?? ''));
        $nombre = trim((string) ($datos['nombre'] ?? ''));
        $ubicacion = trim((string) ($datos['ubicacion'] ?? ''));
        $estado = trim((string) ($datos['estado'] ?? 'disponible'));
        $capacidadTexto = trim((string) ($datos['capacidad'] ?? ''));
        $capacidad = $capacidadTexto === '' ? null : (int) $capacidadTexto;

        if (!in_array($tipo, ['salon', 'taller', 'laboratorio'], true)) {
            responderError(422, 'Tipo de espacio no valido');
        }
        if ($nombre === '' || $ubicacion === '') {
            responderError(422, 'Nombre y ubicacion son obligatorios');
        }
        if (!in_array($estado, ['disponible', 'ocupado', 'mantenimiento', 'inactivo'], true)) {
            responderError(422, 'Estado de espacio no valido');
        }
        if ($capacidad !== null && $capacidad < 1) {
            responderError(422, 'La capacidad debe ser mayor a cero');
        }

        return [
            'tipo' => $tipo,
            'nombre' => $nombre,
            'ubicacion' => $ubicacion,
            'capacidad' => $capacidad,
            'estado' => $estado,
        ];
    }
}
