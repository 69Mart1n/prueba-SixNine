<?php

declare(strict_types=1);

function iniciarApi(): void
{
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }

    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
}

function responder(
    int $codigo,
    string $estado,
    string $mensaje,
    mixed $datos = null,
    array $errores = []
): never {
    http_response_code($codigo);

    echo json_encode(
        [
            'status' => $estado,
            'message' => $mensaje,
            'data' => $datos,
            'errors' => $errores,
        ],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    exit;
}

function responderError(int $codigo, string $mensaje, array $errores = []): never
{
    responder($codigo, 'error', $mensaje, null, $errores);
}

function responderMetodoNoPermitido(array $metodosPermitidos): never
{
    header('Allow: ' . implode(', ', $metodosPermitidos));
    responderError(405, 'Método HTTP no permitido');
}

function leerJsonSolicitud(): array
{
    $contenido = file_get_contents('php://input');

    if ($contenido === false || trim($contenido) === '') {
        return [];
    }

    try {
        $datos = json_decode($contenido, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        responderError(400, 'El cuerpo de la solicitud debe contener JSON válido');
    }

    if (!is_array($datos)) {
        responderError(400, 'El cuerpo debe contener un objeto JSON');
    }

    return $datos;
}

function leerDatosSolicitud(): array
{
    if (!empty($_POST)) {
        return $_POST;
    }

    return leerJsonSolicitud();
}

function obtenerUsuarioSesion(): ?array
{
    if (empty($_SESSION['id_usuario'])) {
        return null;
    }

    $rolesDisponibles = array_values(array_map('strval', $_SESSION['roles_disponibles'] ?? []));
    if (empty($_SESSION['rol']) && !empty($rolesDisponibles)) {
        $_SESSION['rol'] = $rolesDisponibles[0];
    }

    return [
        'id_usuario' => (int) $_SESSION['id_usuario'],
        'correo' => (string) ($_SESSION['correo'] ?? ''),
        'rol' => (string) ($_SESSION['rol'] ?? ''),
        'roles_disponibles' => $rolesDisponibles,
        'nombre' => (string) ($_SESSION['nombre'] ?? ''),
        'estado_cuenta' => (string) ($_SESSION['estado_cuenta'] ?? ''),
        'motivo_bloqueo' => (string) ($_SESSION['motivo_bloqueo'] ?? ''),
        'rol_solicitado' => (string) ($_SESSION['rol_solicitado'] ?? ''),
        'fecha_actualizacion_cuenta' => (string) ($_SESSION['fecha_actualizacion_cuenta'] ?? ''),
        'acceso_sistema' => ($_SESSION['estado_cuenta'] ?? '') === 'activo' && $rolesDisponibles !== [],
    ];
}

function exigirAutenticacion(): array
{
    $usuario = obtenerUsuarioSesion();

    if ($usuario === null) {
        responderError(401, 'Debe iniciar sesión');
    }

    return $usuario;
}

function exigirPerfilActivo(): array
{
    $usuario = exigirAutenticacion();

    if (($usuario['estado_cuenta'] ?? '') !== 'activo') {
        responderError(403, 'La cuenta todavía no está habilitada para acceder al sistema');
    }

    if ($usuario['rol'] === '' && !empty($usuario['roles_disponibles'])) {
        $_SESSION['rol'] = (string) $usuario['roles_disponibles'][0];
        $usuario['rol'] = $_SESSION['rol'];
    }

    if ($usuario['rol'] === '') {
        responderError(409, 'Debe seleccionar un perfil de acceso');
    }

    return $usuario;
}

function exigirRol(array $rolesPermitidos): array
{
    $usuario = exigirPerfilActivo();

    if (!usuarioTieneAlgunRol($usuario, $rolesPermitidos)) {
        responderError(403, 'No tiene permisos para realizar esta acción');
    }

    return $usuario;
}

function usuarioTieneAlgunRol(array $usuario, array $roles): bool
{
    $rolesActivos = array_map('strval', $usuario['roles_disponibles'] ?? []);

    if (count(array_intersect($rolesActivos, $roles)) > 0) {
        return true;
    }

    // El administrador hereda todas las capacidades operativas del técnico
    // sin necesitar un segundo rol de acceso.
    return in_array('administrador', $rolesActivos, true)
        && in_array('tecnico', $roles, true);
}

function obtenerEnteroRuta(array $segmentos, int $indice, string $nombre): int
{
    $valor = $segmentos[$indice] ?? '';

    if (!ctype_digit($valor)) {
        responderError(400, "El parámetro {$nombre} debe ser numérico");
    }

    return (int) $valor;
}

function obtenerRutaApi(): string
{
    if (!empty($_SERVER['PATH_INFO'])) {
        return (string) $_SERVER['PATH_INFO'];
    }

    $rutaSolicitada = (string) parse_url(
        $_SERVER['REQUEST_URI'] ?? '/',
        PHP_URL_PATH
    );
    $nombreScript = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');

    if ($nombreScript !== '' && str_starts_with($rutaSolicitada, $nombreScript)) {
        return substr($rutaSolicitada, strlen($nombreScript)) ?: '/';
    }

    return '/';
}

/** @return string[] */
function obtenerSegmentosRuta(): array
{
    return array_values(array_filter(
        explode('/', trim(obtenerRutaApi(), '/')),
        static fn (string $segmento): bool => $segmento !== ''
    ));
}
