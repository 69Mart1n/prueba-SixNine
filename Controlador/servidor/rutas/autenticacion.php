<?php

declare(strict_types=1);

/** Atiende las peticiones de auth y devuelve una respuesta JSON. */
function atenderRutaAutenticacion(string $metodo, array $segmentos): never
{
    if (($segmentos[1] ?? '') === 'csrf') {
        if ($metodo !== 'GET') {
            responderMetodoNoPermitido(['GET']);
        }
        responder(200, 'success', 'Token CSRF disponible', ['token' => obtenerTokenCsrf()]);
    }

    $conexion = conectarBaseDatos();
    $servicio = new ServicioAutenticacion($conexion);
    $accion = $segmentos[1] ?? '';

    if ($accion === 'login') {
        if ($metodo !== 'POST') {
            responderMetodoNoPermitido(['POST']);
        }

        responder(200, 'success', 'Sesión iniciada correctamente', $servicio->iniciarSesion(leerDatosSolicitud()));
    }

    if ($accion === 'recuperar-contrasena') {
        if ($metodo !== 'POST') {
            responderMetodoNoPermitido(['POST']);
        }
        responder(202, 'success', 'Solicitud de recuperación recibida', $servicio->solicitarRecuperacion(leerDatosSolicitud()));
    }

    if ($accion === 'validar-recuperacion') {
        if ($metodo !== 'GET') {
            responderMetodoNoPermitido(['GET']);
        }
        responder(200, 'success', 'Estado del enlace de recuperación', $servicio->validarRecuperacion(trim((string) ($_GET['token'] ?? ''))));
    }

    if ($accion === 'restablecer-contrasena') {
        if ($metodo !== 'POST') {
            responderMetodoNoPermitido(['POST']);
        }
        responder(200, 'success', 'Contraseña restablecida correctamente', $servicio->restablecerContrasena(leerDatosSolicitud()));
    }

    if ($accion === 'logout') {
        if ($metodo !== 'POST') {
            responderMetodoNoPermitido(['POST']);
        }

        exigirAutenticacion();
        $servicio->cerrarSesion();
        responder(200, 'success', 'Sesión cerrada correctamente');
    }

    if ($accion === 'perfil') {
        if ($metodo !== 'POST') {
            responderMetodoNoPermitido(['POST']);
        }

        responder(200, 'success', 'Perfil activo actualizado', $servicio->seleccionarPerfil(leerDatosSolicitud()));
    }

    if ($accion === 'session') {
        if ($metodo !== 'GET') {
            responderMetodoNoPermitido(['GET']);
        }

        responder(200, 'success', 'Estado de sesión', $servicio->refrescarSesion());
    }

    responderError(404, 'Endpoint de autenticación no encontrado');
}
