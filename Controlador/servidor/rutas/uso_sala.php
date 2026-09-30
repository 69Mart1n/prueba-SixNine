<?php

declare(strict_types=1);

/** Atiende las peticiones de uso-sala y devuelve una respuesta JSON. */
function atenderRutaUsoSala(string $metodo, array $segmentos): never
{
    $usuario = exigirRol(['solicitante']);

    if ($metodo !== 'POST') {
        responderMetodoNoPermitido(['POST']);
    }

    $conexion = conectarBaseDatos();
    responder(
        201,
        'success',
        'Uso de sala registrado',
        (new ServicioUsoSala($conexion))->registrar($usuario, leerDatosSolicitud())
    );
}
