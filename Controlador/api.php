<?php

declare(strict_types=1);

require_once __DIR__ . '/../Modelo/configuracion.php';
require_once __DIR__ . '/../Modelo/base_datos.php';
require_once __DIR__ . '/funciones_api.php';
require_once __DIR__ . '/estado_api.php';
require_once __DIR__ . '/../Modelo/servicios_operativos.php';
require_once __DIR__ . '/../Modelo/servicio_correo.php';
require_once __DIR__ . '/../Modelo/servicios_dominio.php';

iniciarApi();

$metodo = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$segmentos = obtenerSegmentosRuta();
$recurso = $segmentos[0] ?? '';
$conexion = null;

try {
    switch ($recurso) {
        case 'health':
            if ($metodo !== 'GET') {
                responderMetodoNoPermitido(['GET']);
            }

            $resultado = verificarEstadoApi();
            responder(
                $resultado['codigo'],
                $resultado['estado'],
                $resultado['mensaje'],
                $resultado['datos']
            );

        case 'auth':
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

        case 'usuarios':
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

            responderMetodoNoPermitido(['GET', 'POST', 'PUT']);

        case 'incidencias':
            $usuario = exigirPerfilActivo();
            $conexion = conectarBaseDatos();
            $servicio = new ServicioIncidencias($conexion);
            $soloPropias = ($_GET['scope'] ?? '') === 'mine';

            if ($metodo === 'GET' && count($segmentos) === 1) {
                if ($soloPropias) {
                    exigirRol(['solicitante']);
                }
                responder(200, 'success', 'Incidencias obtenidas', $servicio->listar($usuario, $soloPropias));
            }

            if ($metodo === 'POST' && count($segmentos) === 1) {
                exigirRol(['solicitante']);
                responder(201, 'success', 'Incidencia creada', $servicio->crear($usuario, leerDatosSolicitud()));
            }

            $idTicket = obtenerEnteroRuta($segmentos, 1, 'id_ticket');
            $accion = $segmentos[2] ?? '';

            if ($metodo === 'GET' && $accion === 'foto-resolucion') {
                $foto = $servicio->obtenerFotoResolucion($idTicket, $usuario);
                $extension = match ($foto['tipo_mime']) {
                    'image/png' => 'png',
                    'image/webp' => 'webp',
                    default => 'jpg',
                };
                header('Content-Type: ' . $foto['tipo_mime']);
                header('Content-Length: ' . (string) $foto['tamano']);
                header('Content-Disposition: inline; filename="evidencia-resolucion.' . $extension . '"');
                header('X-Content-Type-Options: nosniff');
                header('Cache-Control: private, no-store');
                readfile($foto['ruta']);
                exit;
            }

            exigirRol(['tecnico']);

            if ($metodo === 'PUT' && $accion === 'estado') {
                $datos = leerDatosSolicitud();
                responder(
                    200,
                    'success',
                    'Estado de incidencia actualizado',
                    $servicio->cambiarEstado(
                        $idTicket,
                        $usuario,
                        (string) ($datos['estado'] ?? ''),
                        isset($datos['prioridad']) ? (string) $datos['prioridad'] : null
                    )
                );
            }

            if ($metodo === 'POST' && $accion === 'resolver') {
                responder(
                    200,
                    'success',
                    'Incidencia resuelta correctamente',
                    $servicio->resolver($idTicket, $usuario, leerDatosSolicitud(), $_FILES['foto'] ?? null)
                );
            }

            responderMetodoNoPermitido(['GET', 'PUT', 'POST']);

        case 'prestamos':
            $usuario = exigirPerfilActivo();
            $conexion = conectarBaseDatos();
            $servicio = new ServicioPrestamos($conexion);
            $soloPropias = ($_GET['scope'] ?? '') === 'mine';

            if ($metodo === 'GET') {
                if ($soloPropias) {
                    exigirRol(['solicitante']);
                }
                responder(200, 'success', 'Préstamos obtenidos', $servicio->listar($usuario, $soloPropias));
            }

            if ($metodo === 'POST' && count($segmentos) === 1) {
                exigirRol(['solicitante']);
                responder(201, 'success', 'Solicitud de préstamo creada', $servicio->crear($usuario, leerDatosSolicitud()));
            }

            if (($segmentos[1] ?? '') === 'actualizar-atrasos') {
                exigirRol(['tecnico']);

                if ($metodo !== 'POST') {
                    responderMetodoNoPermitido(['POST']);
                }

                responder(
                    200,
                    'success',
                    'Atrasos y blacklist actualizados',
                    ['prestamos_actualizados' => $servicio->actualizarAtrasos()]
                );
            }

            $idPrestamo = obtenerEnteroRuta($segmentos, 1, 'id_prestamo');
            $accion = $segmentos[2] ?? '';
            exigirRol(['tecnico']);

            if ($metodo === 'PUT' && $accion === 'estado') {
                $datos = leerDatosSolicitud();
                responder(
                    200,
                    'success',
                    'Estado de préstamo actualizado',
                    $servicio->cambiarEstado($idPrestamo, $usuario, (string) ($datos['estado'] ?? ''))
                );
            }

            if ($metodo === 'POST' && $accion === 'entregar') {
                responder(
                    200,
                    'success',
                    'Préstamo entregado correctamente',
                    $servicio->marcarEntregado($idPrestamo, $usuario)
                );
            }

            if ($metodo === 'POST' && $accion === 'devolver') {
                responder(
                    200,
                    'success',
                    'Préstamo marcado como devuelto',
                    $servicio->marcarDevuelto($idPrestamo, $usuario, leerDatosSolicitud())
                );
            }

            responderMetodoNoPermitido(['GET', 'PUT', 'POST']);

        case 'solicitudes':
            $usuario = exigirPerfilActivo();
            $conexion = conectarBaseDatos();
            $servicio = new ServicioSolicitudes($conexion);
            $soloPropias = ($_GET['scope'] ?? '') === 'mine';

            if ($metodo === 'GET') {
                if ($soloPropias) {
                    exigirRol(['solicitante']);
                }
                responder(200, 'success', 'Solicitudes obtenidas', $servicio->listar($usuario, $soloPropias));
            }

            if ($metodo === 'POST' && count($segmentos) === 1) {
                exigirRol(['solicitante']);
                responder(201, 'success', 'Solicitud creada', $servicio->crear($usuario, leerDatosSolicitud()));
            }

            $idSolicitud = obtenerEnteroRuta($segmentos, 1, 'id_solicitud');
            $accion = $segmentos[2] ?? '';
            exigirRol(['administrador', 'tecnico']);

            if ($metodo === 'PUT' && $accion === 'estado') {
                $datos = leerDatosSolicitud();
                $estado = (string) ($datos['estado'] ?? '');
                if (in_array($estado, ['aprobada', 'rechazada', 'cancelada'], true)) {
                    exigirRol(['administrador']);
                } else {
                    exigirRol(['tecnico']);
                }
                responder(
                    200,
                    'success',
                    'Estado de solicitud actualizado',
                    $servicio->cambiarEstado($idSolicitud, $usuario, $estado)
                );
            }

            responderMetodoNoPermitido(['GET', 'POST', 'PUT']);

        case 'uso-sala':
            $usuario = exigirRol(['solicitante']);

            if ($metodo !== 'POST') {
                responderMetodoNoPermitido(['POST']);
            }

            $conexion = conectarBaseDatos();
            responder(
                201,
                'success',
                'Uso de sala registrado',
                (new ServicioUsoSala($conexion))->registrar($usuario, leerDatosSolicitud())
            );

        case 'blacklist':
            exigirRol(['administrador', 'tecnico']);

            if ($metodo !== 'GET') {
                responderMetodoNoPermitido(['GET']);
            }

            $conexion = conectarBaseDatos();
            responder(
                200,
                'success',
                'Black list obtenida',
                (new ServicioBlacklist($conexion))->listar()
            );

        case 'reportes':
            exigirRol(['administrador', 'tecnico']);

            if ($metodo !== 'GET') {
                responderMetodoNoPermitido(['GET']);
            }

            $conexion = conectarBaseDatos();
            responder(
                200,
                'success',
                'Reportes obtenidos',
                (new ServicioReportes($conexion))->listar()
            );

        case 'inventario':
            $usuario = exigirPerfilActivo();
            $conexion = conectarBaseDatos();
            $servicio = new ServicioInventario($conexion);
            if ($metodo === 'GET') {
                responder(200, 'success', 'Inventario obtenido', $servicio->listar($_GET));
            }
            exigirRol(['administrador']);
            if ($metodo === 'POST' && count($segmentos) === 1) {
                responder(201, 'success', 'Equipo registrado', $servicio->crear($usuario, leerDatosSolicitud()));
            }
            $idEquipo = obtenerEnteroRuta($segmentos, 1, 'id_equipo');
            if ($metodo === 'PUT') {
                responder(200, 'success', 'Equipo actualizado', $servicio->actualizar($idEquipo, $usuario, leerDatosSolicitud()));
            }
            if ($metodo === 'DELETE') {
                responder(200, 'success', 'Equipo dado de baja', $servicio->darBaja($idEquipo, $usuario));
            }
            responderMetodoNoPermitido(['GET', 'POST', 'PUT', 'DELETE']);

        case 'espacios':
            exigirPerfilActivo();
            if ($metodo !== 'GET') {
                responderMetodoNoPermitido(['GET']);
            }
            $conexion = conectarBaseDatos();
            responder(200, 'success', 'Espacios obtenidos', (new ServicioEspacios($conexion))->listar());

        case 'categorias-incidencia':
            $usuario = exigirPerfilActivo();
            $conexion = conectarBaseDatos();
            $servicio = new ServicioCategoriasIncidencia($conexion);
            if ($metodo === 'GET') {
                $incluirInactivas = usuarioTieneAlgunRol($usuario, ['tecnico']) && ($_GET['all'] ?? '') === '1';
                responder(200, 'success', 'Categorías obtenidas', $servicio->listar($incluirInactivas));
            }
            exigirRol(['tecnico']);
            if ($metodo === 'POST' && count($segmentos) === 1) {
                responder(201, 'success', 'Categoría registrada', $servicio->crear($usuario, leerDatosSolicitud()));
            }
            $idCategoria = obtenerEnteroRuta($segmentos, 1, 'id_categoria');
            if ($metodo === 'PUT') {
                responder(200, 'success', 'Categoría actualizada', $servicio->actualizar($idCategoria, $usuario, leerDatosSolicitud()));
            }
            responderMetodoNoPermitido(['GET', 'POST', 'PUT']);

        case 'historial':
            exigirRol(['administrador']);
            if ($metodo !== 'GET') {
                responderMetodoNoPermitido(['GET']);
            }
            $conexion = conectarBaseDatos();
            responder(200, 'success', 'Historial obtenido', (new ServicioAuditoria($conexion))->listar($_GET));

        case 'conocimiento':
            exigirRol(['administrador', 'tecnico']);
            if ($metodo !== 'GET') {
                responderMetodoNoPermitido(['GET']);
            }
            $conexion = conectarBaseDatos();
            responder(200, 'success', 'Base de conocimiento obtenida', (new ServicioConocimiento($conexion))->buscar($_GET));

        case 'tareas':
            $usuario = exigirRol(['administrador', 'tecnico']);
            $conexion = conectarBaseDatos();
            $servicio = new ServicioTareas($conexion);
            if ($metodo === 'GET') {
                responder(200, 'success', 'Tareas obtenidas', $servicio->listar());
            }
            if ($metodo === 'POST' && count($segmentos) === 1) {
                exigirRol(['administrador']);
                responder(201, 'success', 'Tarea programada', $servicio->crear($usuario, leerDatosSolicitud()));
            }
            $idTarea = obtenerEnteroRuta($segmentos, 1, 'id_tarea');
            if ($metodo === 'PUT' && ($segmentos[2] ?? '') === 'estado') {
                exigirRol(['tecnico']);
                responder(200, 'success', 'Estado de tarea actualizado', $servicio->cambiarEstado($idTarea, $usuario, leerDatosSolicitud()));
            }
            responderMetodoNoPermitido(['GET', 'POST', 'PUT']);

        case 'dashboard':
            $usuario = exigirPerfilActivo();

            if ($metodo !== 'GET') {
                responderMetodoNoPermitido(['GET']);
            }

            $conexion = conectarBaseDatos();
            responder(
                200,
                'success',
                'Métricas del dashboard obtenidas',
                (new ServicioDashboard($conexion))->obtener(
                    $usuario['rol'],
                    $usuario['id_usuario'],
                    $usuario['roles_disponibles']
                )
            );

        default:
            responderError(404, 'Endpoint no encontrado');
    }
} catch (Throwable $error) {
    error_log('Error no controlado en API: ' . $error->getMessage());
    responderError(500, 'Error interno del servidor');
}
