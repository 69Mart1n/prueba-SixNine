<?php

declare(strict_types=1);

/**
 * @return array{codigo:int,estado:string,mensaje:string,datos:array<string,string>}
 */
function verificarEstadoApi(string $fuenteDatos): array
{
    $datos = [
        'php_version' => PHP_VERSION,
        'data_source' => $fuenteDatos,
        'database' => 'not_required',
        'session' => session_status() === PHP_SESSION_ACTIVE
            ? 'available'
            : 'unavailable',
    ];

    if ($fuenteDatos === 'mock') {
        return [
            'codigo' => 200,
            'estado' => 'success',
            'mensaje' => 'API funcionando correctamente',
            'datos' => $datos,
        ];
    }

    try {
        conectarBaseDatos()->query('SELECT 1');
        $datos['database'] = 'connected';

        return [
            'codigo' => 200,
            'estado' => 'success',
            'mensaje' => 'API y base de datos funcionando correctamente',
            'datos' => $datos,
        ];
    } catch (Throwable $error) {
        error_log('MySQL no disponible: ' . $error->getMessage());
        $datos['database'] = 'unavailable';

        return [
            'codigo' => 503,
            'estado' => 'error',
            'mensaje' => 'La API está disponible, pero la base de datos no responde',
            'datos' => $datos,
        ];
    }
}
