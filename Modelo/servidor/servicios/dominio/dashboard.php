<?php

declare(strict_types=1);

/** Reglas del módulo dashboard. */
final class ServicioDashboard
{
    /**
     * Guarda la conexión a la base de datos que usará este servicio.
     * Entradas: $conexion. Salida: sin valor.
     */
    public function __construct(private PDO $conexion)
    {
    }

    // Selector: elige las métricas según el rol.
    /**
     * Obtiene los datos solicitados desde la base de datos.
     * Entradas: $rol, $idUsuario, $rolesDisponibles. Salida: array.
     */
    public function obtener(string $rol, int $idUsuario, array $rolesDisponibles): array
    {
        $metricas = match ($rol) {
            'administrador' => $this->administrador(),
            'tecnico' => $this->tecnico($idUsuario),
            'solicitante' => $this->solicitante($idUsuario),
            default => [],
        };

        if ($rol !== 'solicitante' && in_array('solicitante', $rolesDisponibles, true)) {
            $metricas = array_merge($metricas, $this->solicitante($idUsuario));
        }

        if (in_array($rol, ['administrador', 'tecnico'], true)) {
            $metricas['analitica'] = $this->analitica();
        }

        return $metricas;
    }

    /**
     * Calcula los indicadores generales del sistema.
     * Entradas: ninguna. Salida: array.
     */
    private function analitica(): array
    {
        $equipos = $this->conexion->query(
            "SELECT e.id_equipo, e.codigo_inventario, e.nombre, COUNT(t.id_ticket) AS fallas
             FROM equipos e
             INNER JOIN tickets_incidencia t ON t.id_equipo = e.id_equipo
             GROUP BY e.id_equipo, e.codigo_inventario, e.nombre
             ORDER BY fallas DESC, e.nombre LIMIT 5"
        )->fetchAll();
        $promedio = $this->conexion->query(
            "SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, fecha_creacion, fecha_cierre)) / 60, 1)
             FROM tickets_incidencia WHERE estado = 'resuelta' AND fecha_cierre IS NOT NULL"
        )->fetchColumn();
        return [
            'periodo_dias' => 30,
            'equipos_mas_fallados' => $equipos,
            'promedio_resolucion_horas' => $promedio === null ? 0 : (float) $promedio,
            'solicitudes_periodo' => $this->contar("SELECT COUNT(*) FROM solicitudes_servicio WHERE fecha_creacion >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"),
            'usos_laboratorio_periodo' => $this->contar(
                "SELECT COUNT(*) FROM registros_uso_sala r INNER JOIN espacios e ON e.id_espacio = r.id_espacio
                 WHERE e.tipo = 'laboratorio' AND r.fecha >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"
            ),
        ];
    }

    // Admin: visión general del sistema.
    /**
     * Calcula los indicadores del panel administrador.
     * Entradas: ninguna. Salida: array.
     */
    private function administrador(): array
    {
        return [
            'usuarios_activos' => $this->contar("SELECT COUNT(*) FROM usuarios WHERE estado = 'activo'"),
            'usuarios_pendientes' => $this->contar("SELECT COUNT(*) FROM usuarios WHERE estado = 'pendiente'"),
            'incidencias_abiertas' => $this->contar("SELECT COUNT(*) FROM tickets_incidencia WHERE estado IN ('pendiente', 'en_proceso')"),
            'incidencias_resueltas' => $this->contar("SELECT COUNT(*) FROM tickets_incidencia WHERE estado = 'resuelta'"),
            'prestamos_activos' => $this->contar("SELECT COUNT(*) FROM prestamos WHERE estado IN ('solicitado', 'aprobado', 'entregado', 'atrasado')"),
            'prestamos_atrasados' => $this->contar("SELECT COUNT(*) FROM prestamos WHERE estado = 'atrasado'"),
            'blacklist_activos' => $this->contar("SELECT COUNT(*) FROM blacklist_estudiantes WHERE estado = 'activo'"),
            'equipos_disponibles' => $this->contar("SELECT COUNT(*) FROM equipos WHERE estado = 'disponible'"),
            'laboratorios_disponibles' => $this->contar("SELECT COUNT(*) FROM espacios WHERE tipo = 'laboratorio' AND estado = 'disponible'"),
        ];
    }

    // Técnico: trabajo operativo pendiente.
    /**
     * Calcula los indicadores del panel técnico.
     * Entradas: $idUsuario. Salida: array.
     */
    private function tecnico(int $idUsuario): array
    {
        return [
            'incidencias_abiertas' => $this->contar("SELECT COUNT(*) FROM tickets_incidencia WHERE estado IN ('pendiente', 'en_proceso')"),
            'incidencias_asignadas' => $this->contarPreparado("SELECT COUNT(*) FROM tickets_incidencia WHERE id_tecnico_asignado = :id AND estado = 'en_proceso'", $idUsuario),
            'prestamos_pendientes' => $this->contar("SELECT COUNT(*) FROM prestamos WHERE estado IN ('solicitado', 'aprobado', 'entregado')"),
            'equipos_revision' => $this->contar("SELECT COUNT(*) FROM equipos WHERE estado = 'en_reparacion'"),
            'solicitudes_pendientes' => $this->contar("SELECT COUNT(*) FROM solicitudes_servicio WHERE estado IN ('aprobada', 'en_proceso')"),
            'laboratorios_disponibles' => $this->contar("SELECT COUNT(*) FROM espacios WHERE tipo = 'laboratorio' AND estado = 'disponible'"),
        ];
    }

    // Solicitante: resumen de sus propios registros.
    /**
     * Calcula los indicadores del panel solicitante.
     * Entradas: $idUsuario. Salida: array.
     */
    private function solicitante(int $idUsuario): array
    {
        return [
            'mis_incidencias' => $this->contarPreparado("SELECT COUNT(*) FROM tickets_incidencia WHERE id_solicitante = :id", $idUsuario),
            'mis_incidencias_abiertas' => $this->contarPreparado("SELECT COUNT(*) FROM tickets_incidencia WHERE id_solicitante = :id AND estado IN ('pendiente', 'en_proceso')", $idUsuario),
            'mis_prestamos' => $this->contarPreparado("SELECT COUNT(*) FROM prestamos WHERE id_solicitante = :id", $idUsuario),
            'mis_prestamos_activos' => $this->contarPreparado("SELECT COUNT(*) FROM prestamos WHERE id_solicitante = :id AND estado IN ('solicitado', 'aprobado', 'entregado', 'atrasado')", $idUsuario),
            'mis_solicitudes' => $this->contarPreparado("SELECT COUNT(*) FROM solicitudes_servicio WHERE id_solicitante = :id", $idUsuario),
            'mis_solicitudes_abiertas' => $this->contarPreparado("SELECT COUNT(*) FROM solicitudes_servicio WHERE id_solicitante = :id AND estado IN ('pendiente', 'aprobada', 'en_proceso')", $idUsuario),
            'usos_sala' => $this->contarPreparado("SELECT COUNT(*) FROM registros_uso_sala WHERE id_solicitante = :id", $idUsuario),
        ];
    }

    // Cuenta simple sin parámetros.
    /**
     * Cuenta filas mediante una consulta fija, sin datos externos.
     * Entradas: $sql. Salida: int.
     */
    private function contar(string $sql): int
    {
        return (int) $this->conexion->query($sql)->fetchColumn();
    }

    // Cuenta usando consulta preparada.
    /**
     * Cuenta filas con una consulta preparada y un usuario concreto.
     * Entradas: $sql, $idUsuario. Salida: int.
     */
    private function contarPreparado(string $sql, int $idUsuario): int
    {
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute(['id' => $idUsuario]);

        return (int) $consulta->fetchColumn();
    }
}
