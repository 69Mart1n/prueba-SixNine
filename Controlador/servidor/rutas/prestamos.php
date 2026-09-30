<?php

declare(strict_types=1);

/** Atiende las peticiones de prestamos y devuelve una respuesta JSON. */
function atenderRutaPrestamos(string $metodo, array $segmentos): never
{
    $usuario = exigirPerfilActivo();
    $conexion = conectarBaseDatos();
    $servicio = new ServicioPrestamos($conexion);
    $soloPropias = ($_GET['scope'] ?? '') === 'mine';

    if ($metodo === 'GET') {
        if ($soloPropias) {
            exigirRol(['solicitante']);
        }
        responder(200, 'success', 'Préstamos obtenidos', $servicio->listar($usuario, $soloPropias));
    }

    if ($metodo === 'POST' && count($segmentos) === 1) {
        exigirRol(['solicitante']);
        responder(201, 'success', 'Solicitud de préstamo creada', $servicio->crear($usuario, leerDatosSolicitud()));
    }

    if (($segmentos[1] ?? '') === 'actualizar-atrasos') {
        exigirRol(['administrador', 'tecnico']);

        if ($metodo !== 'POST') {
            responderMetodoNoPermitido(['POST']);
        }

        responder(
            200,
            'success',
            'Atrasos y blacklist actualizados',
            ['prestamos_actualizados' => $servicio->actualizarAtrasos()]
        );
    }

    $idPrestamo = obtenerEnteroRuta($segmentos, 1, 'id_prestamo');
    $accion = $segmentos[2] ?? '';
    exigirRol(['tecnico']);

    if ($metodo === 'PUT' && $accion === 'estado') {
        $datos = leerDatosSolicitud();
        responder(
            200,
            'success',
            'Estado de préstamo actualizado',
            $servicio->cambiarEstado($idPrestamo, $usuario, (string) ($datos['estado'] ?? ''))
        );
    }

    if ($metodo === 'POST' && $accion === 'entregar') {
        responder(
            200,
            'success',
            'Préstamo entregado correctamente',
            $servicio->marcarEntregado($idPrestamo, $usuario)
        );
    }

    if ($metodo === 'POST' && $accion === 'devolver') {
        responder(
            200,
            'success',
            'Préstamo marcado como devuelto',
            $servicio->marcarDevuelto($idPrestamo, $usuario, leerDatosSolicitud())
        );
    }

    if ($metodo === 'DELETE' && count($segmentos) === 2) {
        responder(
            200,
            'success',
            'Préstamo cancelado',
            $servicio->cambiarEstado($idPrestamo, $usuario, 'cancelado')
        );
    }

    responderMetodoNoPermitido(['GET', 'POST', 'PUT', 'DELETE']);
}
