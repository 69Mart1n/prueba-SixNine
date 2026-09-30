<?php

declare(strict_types=1);

// Comprueba identidad y roles antes de ejecutar acciones privadas.
/** Recupera el usuario de la sesión. Entradas: ninguna. Salida: array o null. */
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

/**
 * Comprueba que la sesión, cuenta y roles siguen vigentes.
 * Entradas: ninguna. Salida: array.
 */
function exigirAutenticacion(): array
{
    $usuario = obtenerUsuarioSesion();

    if ($usuario === null) {
        responderError(401, 'Debe iniciar sesión');
    }

    static $credencialesComprobadas = false;
    if (!$credencialesComprobadas) {
        $conexion = conectarBaseDatos();
        $consulta = $conexion->prepare(
            'SELECT u.hash_contrasena, u.estado, u.motivo_bloqueo, u.fecha_actualizacion,
                    r.nombre AS rol_solicitado
             FROM usuarios u
             INNER JOIN roles r ON r.id_rol = u.id_rol
             WHERE u.id_usuario = :id LIMIT 1'
        );
        $consulta->execute(['id' => $usuario['id_usuario']]);
        $cuenta = $consulta->fetch();
        $huella = $_SESSION['huella_credenciales'] ?? null;
        if (!$cuenta || !is_string($cuenta['hash_contrasena']) || !is_string($huella)
            || !hash_equals($huella, hash('sha256', $cuenta['hash_contrasena']))) {
            cerrarSesionActual();
            responderError(401, 'La sesión ya no es válida; vuelva a iniciar sesión');
        }

        $_SESSION['estado_cuenta'] = (string) $cuenta['estado'];
        $_SESSION['motivo_bloqueo'] = (string) ($cuenta['motivo_bloqueo'] ?? '');
        $_SESSION['rol_solicitado'] = (string) $cuenta['rol_solicitado'];
        $_SESSION['fecha_actualizacion_cuenta'] = (string) $cuenta['fecha_actualizacion'];
        $roles = [];
        if ($cuenta['estado'] === 'activo') {
            $consultaRoles = $conexion->prepare(
                "SELECT r.nombre FROM usuarios_roles ur
                 INNER JOIN roles r ON r.id_rol = ur.id_rol
                 WHERE ur.id_usuario = :id AND ur.estado = 'activo'
                 ORDER BY FIELD(r.nombre, 'administrador', 'tecnico', 'solicitante')"
            );
            $consultaRoles->execute(['id' => $usuario['id_usuario']]);
            $roles = array_map('strval', $consultaRoles->fetchAll(PDO::FETCH_COLUMN));
        }
        $_SESSION['roles_disponibles'] = $roles;
        $_SESSION['rol'] = $roles[0] ?? '';
        $credencialesComprobadas = true;
        $usuario = obtenerUsuarioSesion();
    }

    return $usuario;
}

/**
 * Exige que el usuario tenga un perfil activo.
 * Entradas: ninguna. Salida: array.
 */
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
        responderError(403, 'No tiene un perfil activo para acceder al sistema');
    }

    return $usuario;
}

/**
 * Comprueba que el usuario tiene uno de los roles admitidos.
 * Entradas: $rolesPermitidos. Salida: array.
 */
function exigirRol(array $rolesPermitidos): array
{
    $usuario = exigirPerfilActivo();

    if (!usuarioTieneAlgunRol($usuario, $rolesPermitidos)) {
        responderError(403, 'No tiene permisos para realizar esta acción');
    }

    return $usuario;
}

/**
 * Indica si el usuario posee alguno de los roles indicados.
 * Entradas: $usuario, $roles. Salida: bool.
 */
function usuarioTieneAlgunRol(array $usuario, array $roles): bool
{
    $rolesActivos = array_map('strval', $usuario['roles_disponibles'] ?? []);

    // RBAC estricto: cada accion exige uno de los roles indicados.
    // Si una operacion admite administrador y tecnico, ambos se declaran en la ruta.
    return count(array_intersect($rolesActivos, $roles)) > 0;
}

/**
 * Lee y valida un identificador numérico de la URL.
 * Entradas: $segmentos, $indice, $nombre. Salida: int.
 */
