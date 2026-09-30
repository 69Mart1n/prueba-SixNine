<?php

declare(strict_types=1);

/** Reglas del módulo auditoria. */
final class ServicioAuditoria
{
    /**
     * Guarda la conexión a la base de datos que usará este servicio.
     * Entradas: $conexion. Salida: sin valor.
     */
    public function __construct(private PDO $conexion)
    {
    }

    /**
     * Valida y guarda un nuevo registro.
     * Entradas: $idUsuario, $modulo, $accion, $entidad, $idEntidad, $anteriores, $nuevos. Salida: void.
     */
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

    /**
     * Consulta los registros visibles de este módulo.
     * Entradas: $filtros. Salida: array.
     */
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
