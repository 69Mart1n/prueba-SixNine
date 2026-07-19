<?php

declare(strict_types=1);

function prepararArchivoSimulado(string $ruta): void
{
    if (!is_dir(dirname($ruta))) {
        throw new RuntimeException('La carpeta de datos simulados no existe');
    }

    if (!is_file($ruta) && file_put_contents($ruta, "[]\n", LOCK_EX) === false) {
        throw new RuntimeException('No fue posible crear el archivo simulado');
    }
}

/** @return array<int,array<string,mixed>> */
function leerRegistrosSimulados(string $ruta): array
{
    prepararArchivoSimulado($ruta);
    $archivo = fopen($ruta, 'rb');

    if ($archivo === false) {
        throw new RuntimeException('No fue posible abrir el archivo simulado');
    }

    try {
        flock($archivo, LOCK_SH);
        $contenido = stream_get_contents($archivo) ?: '[]';
        flock($archivo, LOCK_UN);
        $registros = json_decode($contenido, true, 512, JSON_THROW_ON_ERROR);

        if (!is_array($registros) || !array_is_list($registros)) {
            throw new RuntimeException('El archivo debe contener una lista JSON');
        }

        return $registros;
    } finally {
        fclose($archivo);
    }
}

function modificarArchivoSimulado(string $ruta, callable $operacion): mixed
{
    prepararArchivoSimulado($ruta);
    $archivo = fopen($ruta, 'c+b');

    if ($archivo === false) {
        throw new RuntimeException('No fue posible abrir el archivo simulado');
    }

    try {
        flock($archivo, LOCK_EX);
        $contenido = stream_get_contents($archivo) ?: '[]';
        $registros = json_decode($contenido, true, 512, JSON_THROW_ON_ERROR);

        if (!is_array($registros) || !array_is_list($registros)) {
            throw new RuntimeException('El archivo debe contener una lista JSON');
        }

        $resultado = $operacion($registros);
        $json = json_encode(
            array_values($registros),
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
        );

        rewind($archivo);
        ftruncate($archivo, 0);

        if (fwrite($archivo, $json . PHP_EOL) === false) {
            throw new RuntimeException('No fue posible guardar el archivo simulado');
        }

        fflush($archivo);
        flock($archivo, LOCK_UN);

        return $resultado;
    } finally {
        fclose($archivo);
    }
}

/** @return array<int,array<string,mixed>> */
function listarRegistrosSimulados(string $ruta, array $filtros = []): array
{
    return array_values(array_filter(
        leerRegistrosSimulados($ruta),
        static function (array $registro) use ($filtros): bool {
            foreach ($filtros as $campo => $valor) {
                if ($valor !== '' && (string) ($registro[$campo] ?? '') !== (string) $valor) {
                    return false;
                }
            }

            return true;
        }
    ));
}

/** @return array<string,mixed>|null */
function obtenerRegistroSimulado(string $ruta, int $id): ?array
{
    foreach (leerRegistrosSimulados($ruta) as $registro) {
        if ((int) ($registro['id'] ?? 0) === $id) {
            return $registro;
        }
    }

    return null;
}

/** @return array<string,mixed> */
function crearRegistroSimulado(string $ruta, array $datos): array
{
    return modificarArchivoSimulado(
        $ruta,
        static function (array &$registros) use ($datos): array {
            $ids = array_column($registros, 'id');
            $datos['id'] = $ids === [] ? 1 : max($ids) + 1;
            $registros[] = $datos;

            return $datos;
        }
    );
}

/** @return array<string,mixed>|null */
function actualizarRegistroSimulado(string $ruta, int $id, array $datos): ?array
{
    return modificarArchivoSimulado(
        $ruta,
        static function (array &$registros) use ($id, $datos): ?array {
            foreach ($registros as $indice => $registro) {
                if ((int) ($registro['id'] ?? 0) === $id) {
                    $registros[$indice] = array_merge($registro, $datos, ['id' => $id]);

                    return $registros[$indice];
                }
            }

            return null;
        }
    );
}

function eliminarRegistroSimulado(string $ruta, int $id): bool
{
    return modificarArchivoSimulado(
        $ruta,
        static function (array &$registros) use ($id): bool {
            foreach ($registros as $indice => $registro) {
                if ((int) ($registro['id'] ?? 0) === $id) {
                    array_splice($registros, $indice, 1);

                    return true;
                }
            }

            return false;
        }
    );
}
