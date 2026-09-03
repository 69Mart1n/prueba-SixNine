<?php

declare(strict_types=1);

use PHPMailer\PHPMailer\Exception as ExcepcionCorreo;
use PHPMailer\PHPMailer\PHPMailer;

/**
 * Correo saliente: configura SMTP y envía mensajes institucionales.
 */
final class ServicioCorreo
{
    /**
     * Envía al usuario el enlace de recuperación de contraseña.
     */
    public function enviarRecuperacion(string $correo, string $nombre, string $token): void
    {
        $rutaAutocarga = RAIZ_APLICACION . '/vendor/autoload.php';
        if (!is_file($rutaAutocarga)) {
            throw new RuntimeException('Falta instalar la dependencia de correo con Composer.');
        }
        require_once $rutaAutocarga;

        $host = obtenerVariableEntorno('SMTP_HOST');
        $remitente = obtenerVariableEntorno('SMTP_REMITENTE');
        if ($host === '' || $remitente === '') {
            throw new RuntimeException('El servidor SMTP no fue configurado.');
        }

        $urlBase = rtrim(obtenerVariableEntorno('APP_URL'), '/');
        if ($urlBase === '') {
            throw new RuntimeException('APP_URL no fue configurada.');
        }
        $enlace = $urlBase . '/pages/restablecer-contrasena.html?token=' . rawurlencode($token);

        $mensaje = new PHPMailer(true);
        try {
            $mensaje->CharSet = PHPMailer::CHARSET_UTF8;
            $mensaje->isSMTP();
            $mensaje->Host = $host;
            $mensaje->Port = (int) obtenerVariableEntorno('SMTP_PORT', '587');
            $usuario = obtenerVariableEntorno('SMTP_USUARIO');
            $mensaje->SMTPAuth = $usuario !== '';
            if ($mensaje->SMTPAuth) {
                $mensaje->Username = $usuario;
                $mensaje->Password = obtenerVariableEntorno('SMTP_CONTRASENA');
            }

            $cifrado = strtolower(obtenerVariableEntorno('SMTP_CIFRADO', 'tls'));
            if ($cifrado === 'ssl') {
                $mensaje->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } elseif ($cifrado === 'tls') {
                $mensaje->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            } else {
                $mensaje->SMTPAutoTLS = false;
            }

            $mensaje->setFrom($remitente, obtenerVariableEntorno('SMTP_NOMBRE_REMITENTE', 'SGRSI UTU'));
            $mensaje->addAddress($correo, $nombre);
            $mensaje->isHTML(true);
            $mensaje->Subject = 'Recuperación de contraseña de SGRSI';
            $nombreSeguro = htmlspecialchars($nombre, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $enlaceSeguro = htmlspecialchars($enlace, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $mensaje->Body = "<p>Hola {$nombreSeguro},</p><p>Recibimos una solicitud para cambiar tu contraseña de SGRSI.</p><p><a href=\"{$enlaceSeguro}\">Restablecer contraseña</a></p><p>El enlace vence en 30 minutos y puede utilizarse una sola vez. Si no solicitaste el cambio, ignora este correo.</p>";
            $mensaje->AltBody = "Hola {$nombre}. Restablece tu contraseña en {$enlace}. El enlace vence en 30 minutos y puede utilizarse una sola vez.";
            $mensaje->send();
        } catch (ExcepcionCorreo $error) {
            throw new RuntimeException('No fue posible enviar el correo de recuperación.', 0, $error);
        }
    }
}
