<?php

declare(strict_types=1);

/** Atiende las peticiones de usuarios y devuelve una respuesta JSON. */
function atenderRutaUsuarios(string $metodo, array $segmentos): never
{
    $conexion = conectarBaseDatos();
    $servicio = new ServicioUsuarios($conexion);

    if ($metodo === 'POST' && count($segmentos) === 1) {
        responder(201, 'success', 'Solicitud de registro creada', $servicio->registrar(leerDatosSolicitud()));
    }

    if (($segmentos[1] ?? '') === 'roles' && $metodo === 'POST') {
        $usuario = exigirPerfilActivo();
        responder(201, 'success', 'Solicitud de rol creada', $servicio->solicitarRolAdicional($usuario, leerDatosSolicitud()));
    }

    exigirRol(['administrador']);

    if ($metodo === 'GET' && count($segmentos) === 1) {
        responder(200, 'success', 'Usuarios obtenidos', $servicio->listar());
    }

    $idUsuario = obtenerEnteroRuta($segmentos, 1, 'id_usuario');
    $accion = $segmentos[2] ?? '';

    if ($metodo === 'PUT' && $accion === 'roles') {
        $rol = (string) ($segmentos[3] ?? '');
        $subaccion = (string) ($segmentos[4] ?? '');
        if ($subaccion !== 'estado') {
            responderError(404, 'Endpoint de rol no encontrado');
        }

        $datos = leerDatosSolicitud();
        $admin = exigirRol(['administrador']);
        responder(
            200,
            'success',
            'Estado de rol actualizado',
            $servicio->cambiarEstadoRol(
                $idUsuario,
                $rol,
                (string) ($datos['accion'] ?? ''),
                (int) $admin['id_usuario']
            )
        );
    }

    if ($metodo === 'PUT' && $accion === 'estado') {
        $datos = leerDatosSolicitud();
        responder(
            200,
            'success',
            'Estado de usuario actualizado',
            $servicio->cambiarEstado($idUsuario, (string) ($datos['accion'] ?? ''), (int) exigirRol(['administrador'])['id_usuario'])
        );
    }

    // DELETE se implementa como baja logica: conserva historial y relaciones.
    if ($metodo === 'DELETE' && count($segmentos) === 2) {
        $admin = exigirRol(['administrador']);
        responder(
            200,
            'success',
            'Usuario dado de baja',
            $servicio->cambiarEstado($idUsuario, 'dar_baja', (int) $admin['id_usuario'])
        );
    }

    responderMetodoNoPermitido(['GET', 'POST', 'PUT', 'DELETE']);
}
