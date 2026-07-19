<?php

declare(strict_types=1);

function iniciarApi(): void
{
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_start();

    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
}

function responder(
    int $codigo,
    string $estado,
    string $mensaje,
    mixed $datos = null,
    array $errores = []
): never {
    http_response_code($codigo);

    echo json_encode(
        [
            'status' => $estado,
            'message' => $mensaje,
            'data' => $datos,
            'errors' => $errores,
        ],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    exit;
}

function responderError(int $codigo, string $mensaje, array $errores = []): never
{
    responder($codigo, 'error', $mensaje, null, $errores);
}

function responderMetodoNoPermitido(array $metodosPermitidos): never
{
    header('Allow: ' . implode(', ', $metodosPermitidos));
    responderError(405, 'Método HTTP no permitido');
}

function leerJsonSolicitud(): array
{
    $contenido = file_get_contents('php://input');

    if ($contenido === false || trim($contenido) === '') {
        return [];
    }

    try {
        $datos = json_decode($contenido, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        responderError(400, 'El cuerpo de la solicitud debe contener JSON válido');
    }

    if (!is_array($datos)) {
        responderError(400, 'El cuerpo debe contener un objeto JSON');
    }

    return $datos;
}

function obtenerRutaApi(): string
{
    if (!empty($_SERVER['PATH_INFO'])) {
        return $_SERVER['PATH_INFO'];
    }

    $rutaSolicitada = (string) parse_url(
        $_SERVER['REQUEST_URI'] ?? '/',
        PHP_URL_PATH
    );
    $nombreScript = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');

    if ($nombreScript !== '' && str_starts_with($rutaSolicitada, $nombreScript)) {
        return substr($rutaSolicitada, strlen($nombreScript)) ?: '/';
    }

    $rutaBaseApi = rtrim(str_replace('\\', '/', dirname($nombreScript)), '/') . '/';

    if ($rutaBaseApi !== '/' && str_starts_with($rutaSolicitada, $rutaBaseApi)) {
        return '/' . ltrim(substr($rutaSolicitada, strlen($rutaBaseApi)), '/');
    }

    return '/';
}

/** @return string[] */
function obtenerSegmentosRuta(): array
{
    return array_values(array_filter(
        explode('/', trim(obtenerRutaApi(), '/')),
        static fn (string $segmento): bool => $segmento !== ''
    ));
}
