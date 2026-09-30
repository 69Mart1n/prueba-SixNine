<?php

declare(strict_types=1);

/** Atiende las peticiones de inventario y devuelve una respuesta JSON. */
function atenderRutaInventario(string $metodo, array $segmentos): never
{
    $usuario = exigirPerfilActivo();
    $conexion = conectarBaseDatos();
    $servicio = new ServicioInventario($conexion);
    if ($metodo === 'GET') {
        responder(200, 'success', 'Inventario obtenido', $servicio->listar($_GET));
    }
    exigirRol(['administrador']);
    if ($metodo === 'POST' && count($segmentos) === 1) {
        responder(201, 'success', 'Equipo registrado', $servicio->crear($usuario, leerDatosSolicitud()));
    }
    $idEquipo = obtenerEnteroRuta($segmentos, 1, 'id_equipo');
    if ($metodo === 'PUT') {
        responder(200, 'success', 'Equipo actualizado', $servicio->actualizar($idEquipo, $usuario, leerDatosSolicitud()));
    }
    if ($metodo === 'DELETE') {
        responder(200, 'success', 'Equipo dado de baja', $servicio->darBaja($idEquipo, $usuario));
    }
    responderMetodoNoPermitido(['GET', 'POST', 'PUT', 'DELETE']);
}
