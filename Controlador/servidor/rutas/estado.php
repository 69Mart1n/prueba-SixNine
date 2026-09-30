<?php

declare(strict_types=1);

/** Atiende las peticiones de health y devuelve una respuesta JSON. */
function atenderRutaEstado(string $metodo, array $segmentos): never
{
    if ($metodo !== 'GET') {
        responderMetodoNoPermitido(['GET']);
    }

    $resultado = verificarEstadoApi();
    responder(
        $resultado['codigo'],
        $resultado['estado'],
        $resultado['mensaje'],
        $resultado['datos']
    );
}
