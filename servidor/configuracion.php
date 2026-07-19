<?php

declare(strict_types=1);

const RAIZ_APLICACION = __DIR__ . '/..';

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

        if ($clave === '' || getenv($clave) !== false) {
            continue;
        }

        putenv($clave . '=' . $valor);
        $_ENV[$clave] = $valor;
    }
}

function obtenerVariableEntorno(string $clave, string $valorInicial = ''): string
{
    $valor = getenv($clave);

    return $valor === false ? $valorInicial : $valor;
}

function obtenerFuenteDatos(): string
{
    $fuente = strtolower(obtenerVariableEntorno('APP_DATA_SOURCE', 'mock'));

    if (!in_array($fuente, ['mock', 'mysql'], true)) {
        throw new RuntimeException('APP_DATA_SOURCE debe ser mock o mysql');
    }

    return $fuente;
}

cargarVariablesEntorno(RAIZ_APLICACION . '/.env');
