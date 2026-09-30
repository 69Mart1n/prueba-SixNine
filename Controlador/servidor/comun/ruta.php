<?php

declare(strict_types=1);

// Interpreta los segmentos de la URL pública de la API.
/** Lee un ID numérico de la ruta. Entradas: segmentos, posición y nombre. Salida: int. */
function obtenerEnteroRuta(array $segmentos, int $indice, string $nombre): int
{
    $valor = $segmentos[$indice] ?? '';

    if (!ctype_digit($valor)) {
        responderError(400, "El parámetro {$nombre} debe ser numérico");
    }

    return (int) $valor;
}

/**
 * Obtiene la parte de URL que corresponde a la API.
 * Entradas: ninguna. Salida: string.
 */
function obtenerRutaApi(): string
{
    if (!empty($_SERVER['PATH_INFO'])) {
        return (string) $_SERVER['PATH_INFO'];
    }

    $rutaSolicitada = (string) parse_url(
        $_SERVER['REQUEST_URI'] ?? '/',
        PHP_URL_PATH
    );
    $nombreScript = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');

    if ($nombreScript !== '' && str_starts_with($rutaSolicitada, $nombreScript)) {
        return substr($rutaSolicitada, strlen($nombreScript)) ?: '/';
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
