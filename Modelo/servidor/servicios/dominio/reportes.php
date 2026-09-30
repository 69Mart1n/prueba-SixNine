<?php

declare(strict_types=1);

/** Reglas del módulo reportes. */
final class ServicioReportes
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
     * Entradas: ninguna. Salida: array.
     */
    public function listar(): array
    {
        $consulta = $this->conexion->query(
            "SELECT r.id_registro,
                    r.fecha,
                    r.hora_entrada,
                    r.hora_salida,
                    r.grupo,
                    r.taller_curso,
                    r.asignatura,
                    r.docente,
                    r.turno,
                    r.observaciones,
                    r.fecha_creacion,
                    CONCAT(u.nombre, ' ', u.apellido) AS registrado_por,
                    u.correo AS correo_registrante,
                    e.nombre AS sala,
                    e.tipo AS tipo_sala,
                    (SELECT COUNT(*)
                     FROM registros_uso_equipos rue
                     WHERE rue.id_registro = r.id_registro) AS cantidad_equipos
             FROM registros_uso_sala r
             INNER JOIN usuarios u ON u.id_usuario = r.id_solicitante
             INNER JOIN espacios e ON e.id_espacio = r.id_espacio
             ORDER BY r.fecha DESC, r.hora_entrada DESC, r.id_registro DESC"
        );

        $usos = [];
        foreach ($consulta->fetchAll() as $fila) {
            $idRegistro = (int) $fila['id_registro'];
            $fila['id_registro'] = $idRegistro;
            $fila['cantidad_equipos'] = (int) $fila['cantidad_equipos'];
            $fila['equipos'] = [];
            $usos[$idRegistro] = $fila;
        }

        if ($usos !== []) {
            $detalles = $this->conexion->query(
                "SELECT rue.id_registro,
                        eq.nombre AS numero_equipo,
                        eq.codigo_inventario,
                        rue.nombre_alumno,
                        rue.estado_reportado,
                        rue.observaciones
                 FROM registros_uso_equipos rue
                 INNER JOIN equipos eq ON eq.id_equipo = rue.id_equipo
                 ORDER BY rue.id_registro DESC, eq.nombre ASC"
            );

            foreach ($detalles->fetchAll() as $detalle) {
                $idRegistro = (int) $detalle['id_registro'];
                if (isset($usos[$idRegistro])) {
                    unset($detalle['id_registro']);
                    $usos[$idRegistro]['equipos'][] = $detalle;
                }
            }
        }

        return ['usos_sala' => array_values($usos)];
    }
}

/**
 * Dashboard: métricas resumidas para cada rol.
 */
