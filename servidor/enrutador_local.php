<?php

declare(strict_types=1);

$rutaSolicitada = rawurldecode(
    (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH)
);
$raizPublica = dirname(__DIR__);

// El servidor integrado no interpreta .htaccess. Estas rutas nunca son públicas.
if (
    str_starts_with($rutaSolicitada, '/servidor/')
    || preg_match('#/(?:\.env(?:\.example)?|\.git)(?:/|$)#', $rutaSolicitada) === 1
) {
    http_response_code(404);
    echo 'Recurso no encontrado';
    return true;
}

// Permite probar también la ruta limpia /api/health sin Apache.
if (preg_match('#^/api/(?!api\.php(?:/|$))(.+)$#', $rutaSolicitada, $coincidencias)) {
    $_SERVER['PATH_INFO'] = '/' . $coincidencias[1];
    require $raizPublica . '/api/api.php';
    return true;
}

$archivoSolicitado = $raizPublica
    . str_replace('/', DIRECTORY_SEPARATOR, $rutaSolicitada);

if ($rutaSolicitada !== '/' && is_file($archivoSolicitado)) {
    return false;
}

return false;
