<?php

declare(strict_types=1);

function conectarBaseDatos(): PDO
{
    static $conexion = null;

    if ($conexion instanceof PDO) {
        return $conexion;
    }

    $servidor = obtenerVariableEntorno('DB_HOST', '127.0.0.1');
    $puerto = obtenerVariableEntorno('DB_PORT', '3306');
    $nombre = obtenerVariableEntorno('DB_NAME', 'sgrsi');
    $usuario = obtenerVariableEntorno('DB_USER', 'root');
    $contrasena = obtenerVariableEntorno('DB_PASSWORD', '');
    $dsn = "mysql:host={$servidor};port={$puerto};dbname={$nombre};charset=utf8mb4";

    $conexion = new PDO(
        $dsn,
        $usuario,
        $contrasena,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );

    return $conexion;
}
