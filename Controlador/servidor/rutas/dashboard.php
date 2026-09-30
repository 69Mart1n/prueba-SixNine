<?php

declare(strict_types=1);

/** Atiende las peticiones de dashboard y devuelve una respuesta JSON. */
function atenderRutaDashboard(string $metodo, array $segmentos): never
{
    $usuario = exigirPerfilActivo();

    if ($metodo !== 'GET') {
        responderMetodoNoPermitido(['GET']);
    }

    $conexion = conectarBaseDatos();
    responder(
        200,
        'success',
        'Métricas del dashboard obtenidas',
        (new ServicioDashboard($conexion))->obtener(
            $usuario['rol'],
            $usuario['id_usuario'],
            $usuario['roles_disponibles']
        )
    );
}
