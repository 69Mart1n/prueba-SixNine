<?php

declare(strict_types=1);

/** Atiende las peticiones de reportes y devuelve una respuesta JSON. */
function atenderRutaReportes(string $metodo, array $segmentos): never
{
    exigirRol(['administrador', 'tecnico']);

    if ($metodo !== 'GET') {
        responderMetodoNoPermitido(['GET']);
    }

    $conexion = conectarBaseDatos();
    responder(
        200,
        'success',
        'Reportes obtenidos',
        (new ServicioReportes($conexion))->listar()
    );
}
