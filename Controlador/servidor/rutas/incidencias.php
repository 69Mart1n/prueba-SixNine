<?php

declare(strict_types=1);

/** Atiende las peticiones de incidencias y devuelve una respuesta JSON. */
function atenderRutaIncidencias(string $metodo, array $segmentos): never
{
    $usuario = exigirPerfilActivo();
    $conexion = conectarBaseDatos();
    $servicio = new ServicioIncidencias($conexion);
    $soloPropias = ($_GET['scope'] ?? '') === 'mine';

    if ($metodo === 'GET' && count($segmentos) === 1) {
        if ($soloPropias) {
            exigirRol(['solicitante']);
        }
        responder(200, 'success', 'Incidencias obtenidas', $servicio->listar($usuario, $soloPropias));
    }

    if ($metodo === 'POST' && count($segmentos) === 1) {
        exigirRol(['solicitante']);
        responder(201, 'success', 'Incidencia creada', $servicio->crear($usuario, leerDatosSolicitud()));
    }

    $idTicket = obtenerEnteroRuta($segmentos, 1, 'id_ticket');
    $accion = $segmentos[2] ?? '';

    if ($metodo === 'GET' && $accion === 'foto-resolucion') {
        $foto = $servicio->obtenerFotoResolucion($idTicket, $usuario);
        $extension = match ($foto['tipo_mime']) {
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'jpg',
        };
        header('Content-Type: ' . $foto['tipo_mime']);
        header('Content-Length: ' . (string) $foto['tamano']);
        header('Content-Disposition: inline; filename="evidencia-resolucion.' . $extension . '"');
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: private, no-store');
        readfile($foto['ruta']);
        exit;
    }

    exigirRol(['tecnico']);

    if ($metodo === 'POST' && $accion === 'codigo-colaboracion') {
        responder(
            201,
            'success',
            'Código temporal generado',
            $servicio->generarCodigoColaboracion($idTicket, $usuario)
        );
    }

    if ($metodo === 'POST' && $accion === 'unirse-colaboracion') {
        $datos = leerDatosSolicitud();
        responder(
            200,
            'success',
            'Se unió al equipo del ticket',
            $servicio->unirseConCodigo($idTicket, $usuario, (string) ($datos['codigo'] ?? ''))
        );
    }

    if ($metodo === 'PUT' && $accion === 'estado') {
        $datos = leerDatosSolicitud();
        responder(
            200,
            'success',
            'Estado de incidencia actualizado',
            $servicio->cambiarEstado(
                $idTicket,
                $usuario,
                (string) ($datos['estado'] ?? ''),
                isset($datos['prioridad']) ? (string) $datos['prioridad'] : null,
                isset($datos['nota_seguimiento']) ? (string) $datos['nota_seguimiento'] : null
            )
        );
    }

    if ($metodo === 'POST' && $accion === 'resolver') {
        responder(
            200,
            'success',
            'Incidencia resuelta correctamente',
            $servicio->resolver($idTicket, $usuario, leerDatosSolicitud(), $_FILES['foto'] ?? null)
        );
    }

    // DELETE cancela el ticket sin borrarlo fisicamente para mantener trazabilidad.
    if ($metodo === 'DELETE' && count($segmentos) === 2) {
        responder(
            200,
            'success',
            'Incidencia cancelada',
            $servicio->cambiarEstado($idTicket, $usuario, 'cancelada')
        );
    }

    responderMetodoNoPermitido(['GET', 'POST', 'PUT', 'DELETE']);
}
