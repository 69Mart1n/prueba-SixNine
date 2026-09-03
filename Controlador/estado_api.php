<?php

declare(strict_types=1);

/**
 * Capa de servicio: valida el estado de API, sesión y conexión PDO.
 */
final class ServicioEstadoApi
{
    public function verificar(): array
    {
        $nombreBase = obtenerVariableEntorno('DB_NAME', 'sgrsi');

        try {
            $conexion = conectarBaseDatos();
            $conexion->query('SELECT 1');
        } catch (Throwable $error) {
            error_log('Fallo de healthcheck de base de datos: ' . $error->getMessage());

            return [
                'codigo' => 503,
                'estado' => 'error',
                'mensaje' => 'API disponible, pero la base de datos no responde',
                'datos' => [
                    'php_version' => PHP_VERSION,
                    'database' => 'unavailable',
                    'database_name' => $nombreBase,
                    'session' => $this->estadoSesion(),
                ],
            ];
        }

        return [
            'codigo' => 200,
            'estado' => 'success',
            'mensaje' => 'API y base de datos disponibles',
            'datos' => [
                'php_version' => PHP_VERSION,
                'database' => 'available',
                'database_name' => $nombreBase,
                'session' => $this->estadoSesion(),
            ],
        ];
    }

    private function estadoSesion(): string
    {
        return session_status() === PHP_SESSION_ACTIVE ? 'available' : 'unavailable';
    }
}

function verificarEstadoApi(): array
{
    return (new ServicioEstadoApi())->verificar();
}
