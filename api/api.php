<?php

declare(strict_types=1);

require_once __DIR__ . '/../servidor/configuracion.php';
require_once __DIR__ . '/../servidor/base_datos.php';
require_once __DIR__ . '/../servidor/funciones_api.php';
require_once __DIR__ . '/../servidor/estado_api.php';

iniciarApi();

$metodo = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$segmentos = obtenerSegmentosRuta();
$recurso = $segmentos[0] ?? '';

try {
    switch ($recurso) {
        case 'health':
            if ($metodo !== 'GET') {
                responderMetodoNoPermitido(['GET']);
            }

            $resultado = verificarEstadoApi(obtenerFuenteDatos());
            responder(
                $resultado['codigo'],
                $resultado['estado'],
                $resultado['mensaje'],
                $resultado['datos']
            );

        default:
            responderError(404, 'Endpoint no encontrado');
    }
} catch (Throwable $error) {
    error_log('Error no controlado en API: ' . $error->getMessage());
    responderError(500, 'Error interno del servidor');
}
