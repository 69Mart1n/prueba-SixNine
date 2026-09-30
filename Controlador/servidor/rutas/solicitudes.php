<?php

declare(strict_types=1);

/** Atiende las peticiones de solicitudes y devuelve una respuesta JSON. */
function atenderRutaSolicitudes(string $metodo, array $segmentos): never
{
    $usuario = exigirPerfilActivo();
    $conexion = conectarBaseDatos();
    $servicio = new ServicioSolicitudes($conexion);
    $soloPropias = ($_GET['scope'] ?? '') === 'mine';

    if ($metodo === 'GET') {
        if ($soloPropias) {
            exigirRol(['solicitante']);
        }
        responder(200, 'success', 'Solicitudes obtenidas', $servicio->listar($usuario, $soloPropias));
    }

    if ($metodo === 'POST' && count($segmentos) === 1) {
        exigirRol(['solicitante']);
        responder(201, 'success', 'Solicitud creada', $servicio->crear($usuario, leerDatosSolicitud()));
    }

    $idSolicitud = obtenerEnteroRuta($segmentos, 1, 'id_solicitud');
    $accion = $segmentos[2] ?? '';
    exigirRol(['administrador', 'tecnico']);

    if ($metodo === 'PUT' && $accion === 'estado') {
        $datos = leerDatosSolicitud();
        $estado = (string) ($datos['estado'] ?? '');
        if (in_array($estado, ['aprobada', 'rechazada'], true)) {
            exigirRol(['administrador']);
        } else {
            exigirRol(['tecnico']);
        }
        responder(
            200,
            'success',
            'Estado de solicitud actualizado',
            $servicio->cambiarEstado($idSolicitud, $usuario, $estado)
        );
    }

    if ($metodo === 'DELETE' && count($segmentos) === 2) {
        $usuario = exigirRol(['administrador']);
        responder(
            200,
            'success',
            'Solicitud cancelada',
            $servicio->cambiarEstado($idSolicitud, $usuario, 'cancelada')
        );
    }

    responderMetodoNoPermitido(['GET', 'POST', 'PUT', 'DELETE']);
}
