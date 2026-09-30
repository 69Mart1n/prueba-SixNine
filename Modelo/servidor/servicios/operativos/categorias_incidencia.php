<?php

declare(strict_types=1);

/** Reglas del módulo categorias_incidencia. */
final class ServicioCategoriasIncidencia
{
    /**
     * Guarda la conexión a la base de datos que usará este servicio.
     * Entradas: $conexion. Salida: sin valor.
     */
    public function __construct(private PDO $conexion)
    {
    }

    /**
     * Consulta los registros visibles de este módulo.
     * Entradas: $incluirInactivas. Salida: array.
     */
    public function listar(bool $incluirInactivas = false): array
    {
        $sql = "SELECT id_categoria, nombre, descripcion, estado FROM categorias_incidencia";
        if (!$incluirInactivas) {
            $sql .= " WHERE estado = 'activa'";
        }
        $sql .= " ORDER BY nombre";
        return $this->conexion->query($sql)->fetchAll();
    }

    /**
     * Valida los datos y crea un registro de este módulo.
     * Entradas: $usuario, $datos. Salida: array.
     */
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

    /**
     * Valida los datos y modifica un registro existente.
     * Entradas: $id, $usuario, $datos. Salida: array.
     */
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

    /** DELETE logico: la categoria queda inactiva pero se conserva el historial. */
    public function desactivar(int $id, array $usuario): array
    {
        $consulta = $this->conexion->prepare(
            "UPDATE categorias_incidencia SET estado = 'inactiva'
             WHERE id_categoria = :id AND estado = 'activa'"
        );
        $consulta->execute(['id' => $id]);

        if ($consulta->rowCount() === 0) {
            responderError(404, 'Categoria no encontrada o ya inactiva');
        }

        (new ServicioAuditoria($this->conexion))->registrar(
            (int) $usuario['id_usuario'],
            'incidencias',
            'desactivar_categoria',
            'categoria',
            $id,
            null,
            ['estado' => 'inactiva']
        );

        return ['id_categoria' => $id, 'estado' => 'inactiva'];
    }
}
