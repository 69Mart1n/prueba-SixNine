<?php

declare(strict_types=1);

/**
 * Correo de recuperación delegado a Google Apps Script y Gmail.
 */
final class ServicioCorreo
{
    /**
     * Envía al usuario el enlace de recuperación de contraseña.
     */
    public function enviarRecuperacion(string $correo, string $nombre, string $token): void
    {
        $urlServicio = trim(obtenerVariableEntorno('GMAIL_SCRIPT_URL'));
        $secreto = obtenerVariableEntorno('GMAIL_SCRIPT_SECRET');
        $partesUrl = parse_url($urlServicio);
        if (
            !is_array($partesUrl)
            || ($partesUrl['scheme'] ?? '') !== 'https'
            || ($partesUrl['host'] ?? '') !== 'script.google.com'
            || $secreto === ''
        ) {
            throw new RuntimeException('El servicio de recuperación de Gmail no fue configurado.');
        }

        $urlBase = rtrim(obtenerVariableEntorno('APP_URL'), '/');
        if ($urlBase === '') {
            throw new RuntimeException('APP_URL no fue configurada.');
        }
        $enlace = $urlBase . '/pages/restablecer-contrasena.html?token=' . rawurlencode($token);

        if (!function_exists('curl_init')) {
            throw new RuntimeException('La extensión cURL de PHP no está disponible.');
        }

        $contenido = json_encode([
            'secreto' => $secreto,
            'destino' => $correo,
            'nombre' => $nombre,
            'enlace' => $enlace,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($contenido === false) {
            throw new RuntimeException('No fue posible preparar el correo de recuperación.');
        }

        $solicitud = curl_init($urlServicio);
        if ($solicitud === false) {
            throw new RuntimeException('No fue posible iniciar el servicio de Gmail.');
        }
        curl_setopt_array($solicitud, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $contenido,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json; charset=utf-8'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 20,
        ]);
        if (defined('CURLOPT_PROTOCOLS') && defined('CURLPROTO_HTTPS')) {
            curl_setopt($solicitud, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
            curl_setopt($solicitud, CURLOPT_REDIR_PROTOCOLS, CURLPROTO_HTTPS);
        }

        $respuesta = curl_exec($solicitud);
        $codigoHttp = (int) curl_getinfo($solicitud, CURLINFO_RESPONSE_CODE);
        $detalleError = curl_error($solicitud);
        curl_close($solicitud);

        $datosRespuesta = is_string($respuesta) ? json_decode($respuesta, true) : null;
        if ($codigoHttp < 200 || $codigoHttp >= 300 || !is_array($datosRespuesta) || ($datosRespuesta['ok'] ?? false) !== true) {
            error_log('Google Apps Script no pudo enviar la recuperación: HTTP ' . $codigoHttp . ' ' . $detalleError);
            throw new RuntimeException('No fue posible enviar el correo de recuperación.');
        }
    }
}
