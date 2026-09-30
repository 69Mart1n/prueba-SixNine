<?php

declare(strict_types=1);

/** Reglas del módulo blacklist. */
final class ServicioBlacklist
{
    /**
     * Guarda la conexión a la base de datos que usará este servicio.
     * Entradas: $conexion. Salida: sin valor.
     */
    public function __construct(private PDO $conexion)
    {
    }

    // Consulta: muestra estudiante, docente asociado y estado.
    /**
     * Consulta los registros visibles de este módulo.
     * Entradas: ninguna. Salida: array.
     */
    public function listar(): array
    {
        $consulta = $this->conexion->query(
            "SELECT id_blacklist, nombre_estudiante, cedula_estudiante, grupo, docente_asociado,
                    motivo, dias_atraso, estado, fecha_ingreso, fecha_salida
             FROM blacklist_estudiantes
             ORDER BY estado ASC, fecha_ingreso DESC"
        );

        return $consulta->fetchAll();
    }
}

/**
 * Reportes operativos construidos desde los registros reales del sistema.
 */
