<?php

declare(strict_types=1);

/**
 * Capa de acceso a datos: crea y reutiliza una conexion PDO segura.
 */
final class ConexionBaseDatos
{
    private ?PDO $conexion = null;

    /**
     * Obtiene los datos solicitados desde la base de datos.
     * Entradas: ninguna. Salida: PDO.
     */
    public function obtener(): PDO
    {
        if ($this->conexion instanceof PDO) {
            return $this->conexion;
        }

        $host = obtenerVariableEntorno('DB_HOST', '127.0.0.1');
        $puerto = obtenerVariableEntorno('DB_PORT', '3306');
        $nombre = obtenerVariableEntorno('DB_NAME', 'sgrsi');
        $usuario = obtenerVariableEntorno('DB_USER');
        $contrasena = obtenerVariableEntorno('DB_PASSWORD');

        if ($usuario === '') {
            throw new RuntimeException('La base de datos no fue configurada.');
        }

        $dsn = "mysql:host={$host};port={$puerto};dbname={$nombre};charset=utf8mb4";

        $this->conexion = new PDO(
            $dsn,
            $usuario,
            $contrasena,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );

        return $this->conexion;
    }
}

/**
 * Abre o reutiliza la conexión PDO configurada.
 * Entradas: ninguna. Salida: PDO.
 */
function conectarBaseDatos(): PDO
{
    static $baseDatos = null;

    if (!$baseDatos instanceof ConexionBaseDatos) {
        $baseDatos = new ConexionBaseDatos();
    }

    return $baseDatos->obtener();
}
