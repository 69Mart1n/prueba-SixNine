<?php

declare(strict_types=1);

/** Atiende las peticiones de espacios y devuelve una respuesta JSON. */
function atenderRutaEspacios(string $metodo, array $segmentos): never
{
    $usuario = exigirPerfilActivo();
    $conexion = conectarBaseDatos();
    $servicio = new ServicioEspacios($conexion);

    if ($metodo === 'GET') {
        $incluirInactivos = usuarioTieneAlgunRol($usuario, ['administrador'])
            && ($_GET['all'] ?? '') === '1';
        responder(200, 'success', 'Espacios obtenidos', $servicio->listar($incluirInactivos));
    }

    $usuario = exigirRol(['administrador']);
    if ($metodo === 'POST' && count($segmentos) === 1) {
        responder(201, 'success', 'Espacio registrado', $servicio->crear($usuario, leerDatosSolicitud()));
    }

    $idEspacio = obtenerEnteroRuta($segmentos, 1, 'id_espacio');
    if ($metodo === 'PUT' && count($segmentos) === 2) {
        responder(200, 'success', 'Espacio actualizado', $servicio->actualizar($idEspacio, $usuario, leerDatosSolicitud()));
    }
    if ($metodo === 'DELETE' && count($segmentos) === 2) {
        responder(200, 'success', 'Espacio desactivado', $servicio->desactivar($idEspacio, $usuario));
    }

    responderMetodoNoPermitido(['GET', 'POST', 'PUT', 'DELETE']);
}
