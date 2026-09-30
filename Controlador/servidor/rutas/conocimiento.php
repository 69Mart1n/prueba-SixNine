<?php

declare(strict_types=1);

/** Atiende las peticiones de conocimiento y devuelve una respuesta JSON. */
function atenderRutaConocimiento(string $metodo, array $segmentos): never
{
    exigirRol(['administrador', 'tecnico']);
    if ($metodo !== 'GET') {
        responderMetodoNoPermitido(['GET']);
    }
    $conexion = conectarBaseDatos();
    responder(200, 'success', 'Base de conocimiento obtenida', (new ServicioConocimiento($conexion))->buscar($_GET));
}
