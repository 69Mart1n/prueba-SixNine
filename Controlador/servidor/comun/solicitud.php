<?php

declare(strict_types=1);

// Lee cuerpos enviados por formularios o por fetch.
/** Lee el cuerpo JSON y lo convierte en datos. Entradas: ninguna. Salida: array. */
function leerJsonSolicitud(): array
{
    $contenido = file_get_contents('php://input');

    if ($contenido === false || trim($contenido) === '') {
        return [];
    }

    try {
        $datos = json_decode($contenido, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        responderError(400, 'El cuerpo de la solicitud debe contener JSON válido');
    }

    if (!is_array($datos)) {
        responderError(400, 'El cuerpo debe contener un objeto JSON');
    }

    return $datos;
}

/**
 * Obtiene los datos enviados como JSON o formulario.
 * Entradas: ninguna. Salida: array.
 */
function leerDatosSolicitud(): array
{
    if (!empty($_POST)) {
        return $_POST;
    }

    return leerJsonSolicitud();
}

/**
 * Lee la identidad guardada en la sesión.
 * Entradas: ninguna. Salida: ?array.
 */
