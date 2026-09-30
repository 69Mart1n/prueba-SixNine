<?php

declare(strict_types=1);

// Mantiene el mismo contrato JSON en todas las rutas.
/** Envía código HTTP, estado, mensaje y datos como JSON. Salida: never. */
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

/**
 * Devuelve un error HTTP con el contrato JSON de la API.
 * Entradas: $codigo, $mensaje, $errores. Salida: never.
 */
function responderError(int $codigo, string $mensaje, array $errores = []): never
{
    responder($codigo, 'error', $mensaje, null, $errores);
}

/**
 * Responde 405 e indica los métodos permitidos.
 * Entradas: $metodosPermitidos. Salida: never.
 */
function responderMetodoNoPermitido(array $metodosPermitidos): never
{
    header('Allow: ' . implode(', ', $metodosPermitidos));
    responderError(405, 'Método HTTP no permitido');
}

/**
 * Decodifica el cuerpo JSON enviado por el cliente.
 * Entradas: ninguna. Salida: array.
 */
