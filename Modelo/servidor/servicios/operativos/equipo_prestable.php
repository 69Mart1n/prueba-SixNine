<?php

declare(strict_types=1);

/** Reglas del módulo equipo_prestable. */
final class EquipoPrestable
{
    /**
     * Comprueba si el tipo de equipo es portátil.
     * Entradas: $tipo. Salida: bool.
     */
    public static function esPortatil(string $tipo): bool
    {
        return preg_match('/^(notebook|laptop)$/i', trim($tipo)) === 1;
    }

    /**
     * Comprueba tipo, estado y disponibilidad para un préstamo.
     * Entradas: $equipo. Salida: bool.
     */
    public static function puedePrestarse(array $equipo): bool
    {
        return (int) ($equipo['es_prestable'] ?? 0) === 1
            && self::esPortatil((string) ($equipo['tipo'] ?? ''));
    }
}
