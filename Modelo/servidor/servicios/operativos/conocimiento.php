<?php

declare(strict_types=1);

/** Reglas del módulo conocimiento. */
final class ServicioConocimiento
{
    /**
     * Guarda la conexión a la base de datos que usará este servicio.
     * Entradas: $conexion. Salida: sin valor.
     */
    public function __construct(private PDO $conexion)
    {
    }

    /**
     * Busca registros que coinciden con los filtros recibidos.
     * Entradas: $filtros. Salida: array.
     */
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
