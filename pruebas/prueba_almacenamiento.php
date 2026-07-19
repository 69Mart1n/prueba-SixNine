<?php

declare(strict_types=1);

require_once __DIR__ . '/../servidor/almacenamiento_json.php';

$rutaTemporal = sys_get_temp_dir()
    . DIRECTORY_SEPARATOR
    . 'sgrsi-prueba-'
    . bin2hex(random_bytes(8))
    . '.json';

function verificarPrueba(bool $condicion, string $mensaje): void
{
    if (!$condicion) {
        throw new RuntimeException($mensaje);
    }
}

try {
    $primero = crearRegistroSimulado($rutaTemporal, ['estado' => 'pendiente']);
    $segundo = crearRegistroSimulado($rutaTemporal, ['estado' => 'resuelto']);

    verificarPrueba($primero['id'] === 1, 'El primer ID debe ser 1');
    verificarPrueba($segundo['id'] === 2, 'El segundo ID debe ser 2');
    verificarPrueba(
        count(listarRegistrosSimulados($rutaTemporal, ['estado' => 'pendiente'])) === 1,
        'El filtro debe devolver un registro'
    );

    $actualizado = actualizarRegistroSimulado(
        $rutaTemporal,
        1,
        ['estado' => 'en_proceso']
    );

    verificarPrueba($actualizado !== null, 'El registro debe actualizarse');
    verificarPrueba(
        obtenerRegistroSimulado($rutaTemporal, 1)['estado'] === 'en_proceso',
        'El cambio debe persistir'
    );
    verificarPrueba(
        eliminarRegistroSimulado($rutaTemporal, 2),
        'El segundo registro debe eliminarse'
    );

    echo "Correcto: almacenamiento simulado" . PHP_EOL;
} finally {
    if (is_file($rutaTemporal)) {
        unlink($rutaTemporal);
    }
}
