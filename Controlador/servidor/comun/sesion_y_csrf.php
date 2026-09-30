<?php

declare(strict_types=1);

// Abre y protege la sesión de cada petición de la API.
/** Inicia la API y controla 30 minutos de inactividad. Entradas: ninguna. Salida: void. */
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
    enviarHeadersSeguridad();

    if (!empty($_SESSION['id_usuario'])) {
        $ahora = time();
        $ultimaActividad = $_SESSION['ultima_actividad'] ?? null;
        if (!is_int($ultimaActividad) || $ultimaActividad > $ahora || $ahora - $ultimaActividad > 1800) {
            cerrarSesionActual();
            responderError(401, 'La sesión expiró por inactividad');
        }
        $_SESSION['ultima_actividad'] = $ahora;
    }
}

/**
 * Indica si la petición se recibió mediante HTTPS.
 * Entradas: ninguna. Salida: bool.
 */
function conexionHttps(): bool
{
    return !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
}

/**
 * Envía los encabezados que protegen las respuestas HTTP.
 * Entradas: ninguna. Salida: void.
 */
function enviarHeadersSeguridad(): void
{
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    // Bootstrap necesita estilos inline para algunos componentes; no se permite JS inline ni eval.
    header("Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; font-src 'self' https://cdn.jsdelivr.net data:; img-src 'self' data: blob:; connect-src 'self'");
    if (conexionHttps()) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}

/**
 * Genera y guarda un token aleatorio para esta sesión.
 * Entradas: ninguna. Salida: string.
 */
function generarTokenCsrf(): string
{
    $token = $_SESSION['csrf_token'] ?? null;
    if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/D', $token)) {
        $token = bin2hex(random_bytes(32));
        $_SESSION['csrf_token'] = $token;
    }
    return $token;
}

/**
 * Devuelve el token actual o crea uno si falta.
 * Entradas: ninguna. Salida: string.
 */
function obtenerTokenCsrf(): string
{
    return generarTokenCsrf();
}

/**
 * Compara el token recibido con el de sesión de forma segura.
 * Entradas: $token. Salida: bool.
 */
function validarTokenCsrf(mixed $token): bool
{
    $esperado = $_SESSION['csrf_token'] ?? null;
    return is_string($token)
        && is_string($esperado)
        && preg_match('/^[a-f0-9]{64}$/D', $esperado) === 1
        && hash_equals($esperado, $token);
}

/**
 * Rechaza operaciones de escritura sin un token válido.
 * Entradas: ninguna. Salida: void.
 */
function exigirCsrf(): void
{
    if (!in_array(strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
        return;
    }

    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? null);
    if (!validarTokenCsrf($token)) {
        responderError(403, 'Token CSRF inválido o ausente');
    }
}

/**
 * Borra los datos, la cookie y el archivo de sesión actual.
 * Entradas: ninguna. Salida: void.
 */
function cerrarSesionActual(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $parametros = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $parametros['path'],
            'domain' => $parametros['domain'],
            'secure' => $parametros['secure'],
            'httponly' => $parametros['httponly'],
            'samesite' => $parametros['samesite'] ?? 'Lax',
        ]);
    }
    session_destroy();
}

/**
 * Devuelve una respuesta HTTP con el contrato JSON de la API.
 * Entradas: $codigo, $estado, $mensaje, $datos, $errores. Salida: never.
 */
