<?php

declare(strict_types=1);

/** Atiende las peticiones de historial y devuelve una respuesta JSON. */
function atenderRutaHistorial(string $metodo, array $segmentos): never
{
    exigirRol(['administrador']);
    if ($metodo !== 'GET') {
        responderMetodoNoPermitido(['GET']);
    }
    $conexion = conectarBaseDatos();
    responder(200, 'success', 'Historial obtenido', (new ServicioAuditoria($conexion))->listar($_GET));
}
