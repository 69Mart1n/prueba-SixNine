<?php

declare(strict_types=1);

const RAIZ_APLICACION = __DIR__ . '/..';

/**
 * Carga variables desde .env cuando el archivo exista en el servidor de despliegue.
 * El repositorio solo incluye .env.example; .env debe permanecer fuera de Git.
 */
function cargarVariablesEntorno(string $ruta): void
{
    if (!is_file($ruta) || !is_readable($ruta)) {
        return;
    }

    $lineas = file($ruta, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    if ($lineas === false) {
        return;
    }

    foreach ($lineas as $linea) {
        $linea = trim($linea);

        if ($linea === '' || str_starts_with($linea, '#')) {
            continue;
        }

        [$clave, $valor] = array_pad(explode('=', $linea, 2), 2, '');
        $clave = trim($clave);
        $valor = trim($valor, " \t\n\r\0\x0B\"'");

        if ($clave === '' || array_key_exists($clave, $_ENV)) {
            continue;
        }

        // Mantener la configuración en el contexto de la petición evita
        // condiciones de carrera entre las solicitudes paralelas de Apache.
        $_ENV[$clave] = $valor;
    }
}

function obtenerVariableEntorno(string $clave, string $valorInicial = ''): string
{
    if (array_key_exists($clave, $_ENV)) {
        return (string) $_ENV[$clave];
    }

    $valor = getenv($clave);

    return $valor === false ? $valorInicial : $valor;
}

cargarVariablesEntorno(RAIZ_APLICACION . '/.env');
