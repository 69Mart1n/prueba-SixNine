<?php

declare(strict_types=1);

/** Atiende las peticiones de blacklist y devuelve una respuesta JSON. */
function atenderRutaBlacklist(string $metodo, array $segmentos): never
{
    exigirRol(['administrador', 'tecnico']);

    if ($metodo !== 'GET') {
        responderMetodoNoPermitido(['GET']);
    }

    $conexion = conectarBaseDatos();
    responder(
        200,
        'success',
        'Black list obtenida',
        (new ServicioBlacklist($conexion))->listar()
    );
}
