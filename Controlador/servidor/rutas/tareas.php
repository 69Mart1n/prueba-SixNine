<?php

declare(strict_types=1);

/** Atiende las peticiones de tareas y devuelve una respuesta JSON. */
function atenderRutaTareas(string $metodo, array $segmentos): never
{
    $usuario = exigirRol(['administrador', 'tecnico']);
    $conexion = conectarBaseDatos();
    $servicio = new ServicioTareas($conexion);
    if ($metodo === 'GET') {
        responder(200, 'success', 'Tareas obtenidas', $servicio->listar());
    }
    if ($metodo === 'POST' && count($segmentos) === 1) {
        exigirRol(['administrador']);
        responder(201, 'success', 'Tarea programada', $servicio->crear($usuario, leerDatosSolicitud()));
    }
    $idTarea = obtenerEnteroRuta($segmentos, 1, 'id_tarea');
    if ($metodo === 'PUT' && ($segmentos[2] ?? '') === 'estado') {
        exigirRol(['tecnico']);
        responder(200, 'success', 'Estado de tarea actualizado', $servicio->cambiarEstado($idTarea, $usuario, leerDatosSolicitud()));
    }
    if ($metodo === 'DELETE' && count($segmentos) === 2) {
        $usuario = exigirRol(['administrador']);
        responder(200, 'success', 'Tarea cancelada', $servicio->cancelar($idTarea, $usuario));
    }
    responderMetodoNoPermitido(['GET', 'POST', 'PUT', 'DELETE']);
}
