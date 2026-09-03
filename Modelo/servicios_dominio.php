<?php

declare(strict_types=1);

/**
 * Autenticación: login, logout y datos de sesión.
 */
final class ServicioAutenticacion
{
    public function __construct(private PDO $conexion)
    {
    }

    // Login: valida credenciales y guarda usuario/rol en la sesión.
    public function iniciarSesion(array $datos): array
    {
        $correo = trim((string) ($datos['correo'] ?? $datos['usr_email'] ?? ''));
        $contrasena = trim((string) ($datos['contrasena'] ?? $datos['usr_pass'] ?? ''));

        if ($correo === '' || $contrasena === '') {
            responderError(422, 'Correo y contraseña son obligatorios');
        }

        $consulta = $this->conexion->prepare(
            "SELECT u.id_usuario, u.nombre, u.apellido, u.correo, u.hash_contrasena, u.estado,
                    u.intentos_fallidos, u.ultimo_intento_fallido
             FROM usuarios u
             WHERE u.correo = :correo
             LIMIT 1"
        );
        $consulta->execute(['correo' => $correo]);
        $usuario = $consulta->fetch();

        if (!$usuario || !password_verify($contrasena, (string) $usuario['hash_contrasena'])) {
            if ($usuario && $usuario['estado'] === 'activo') {
                $this->registrarIntentoFallido($usuario);
            }
            responderError(401, 'Usuario o contraseña incorrectos');
        }

        if ($usuario['estado'] === 'activo') {
            $this->reiniciarIntentos((int) $usuario['id_usuario']);
        }

        $_SESSION['id_usuario'] = (int) $usuario['id_usuario'];
        $_SESSION['correo'] = (string) $usuario['correo'];
        $_SESSION['nombre'] = trim($usuario['nombre'] . ' ' . $usuario['apellido']);
        return $this->refrescarSesion();
    }

    /**
     * Crea un enlace temporal sin revelar si la dirección pertenece a una cuenta.
     */
    public function solicitarRecuperacion(array $datos): array
    {
        $correo = trim((string) ($datos['correo'] ?? ''));
        $respuesta = ['mensaje' => 'Si el correo está registrado, recibirá un enlace para restablecer la contraseña.'];
        if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            return $respuesta;
        }

        $consulta = $this->conexion->prepare(
            "SELECT id_usuario, nombre, apellido, correo
             FROM usuarios
             WHERE correo = :correo AND hash_contrasena IS NOT NULL
             LIMIT 1"
        );
        $consulta->execute(['correo' => $correo]);
        $usuario = $consulta->fetch();
        if (!$usuario) {
            return $respuesta;
        }

        $limite = $this->conexion->prepare(
            "SELECT COUNT(*) FROM tokens_recuperacion_contrasena
             WHERE id_usuario = :id AND fecha_creacion >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE)"
        );
        $limite->execute(['id' => $usuario['id_usuario']]);
        if ((int) $limite->fetchColumn() >= 3) {
            return $respuesta;
        }

        $token = bin2hex(random_bytes(32));
        $hashToken = hash('sha256', $token);
        $this->conexion->beginTransaction();
        try {
            $this->conexion->prepare(
                "UPDATE tokens_recuperacion_contrasena
                 SET fecha_uso = CURRENT_TIMESTAMP
                 WHERE id_usuario = :id AND fecha_uso IS NULL"
            )->execute(['id' => $usuario['id_usuario']]);
            $this->conexion->prepare(
                "INSERT INTO tokens_recuperacion_contrasena
                   (id_usuario, hash_token, fecha_expiracion)
                 VALUES (:id, :hash, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 MINUTE))"
            )->execute(['id' => $usuario['id_usuario'], 'hash' => $hashToken]);
            $this->conexion->commit();
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }

        try {
            $nombre = trim((string) $usuario['nombre'] . ' ' . (string) $usuario['apellido']);
            (new ServicioCorreo())->enviarRecuperacion((string) $usuario['correo'], $nombre, $token);
        } catch (Throwable $error) {
            $this->conexion->prepare(
                "DELETE FROM tokens_recuperacion_contrasena WHERE hash_token = :hash"
            )->execute(['hash' => $hashToken]);
            error_log('No se pudo enviar la recuperación de contraseña: ' . $error->getMessage());
        }

        $this->conexion->exec(
            "DELETE FROM tokens_recuperacion_contrasena
             WHERE fecha_expiracion < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 7 DAY)"
        );
        return $respuesta;
    }

    /**
     * Comprueba que un token exista, no haya vencido y no haya sido utilizado.
     */
    public function validarRecuperacion(string $token): array
    {
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
            return ['valido' => false];
        }
        $consulta = $this->conexion->prepare(
            "SELECT COUNT(*) FROM tokens_recuperacion_contrasena
             WHERE hash_token = :hash AND fecha_uso IS NULL AND fecha_expiracion > CURRENT_TIMESTAMP"
        );
        $consulta->execute(['hash' => hash('sha256', $token)]);
        return ['valido' => (int) $consulta->fetchColumn() === 1];
    }

    /**
     * Reemplaza la contraseña y consume de forma atómica el token recibido.
     */
    public function restablecerContrasena(array $datos): array
    {
        $token = trim((string) ($datos['token'] ?? ''));
        $contrasena = (string) ($datos['contrasena'] ?? '');
        $confirmacion = (string) ($datos['confirmar_contrasena'] ?? '');
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
            responderError(422, 'El enlace de recuperación no es válido o venció');
        }
        if (strlen($contrasena) < 8) {
            responderError(422, 'La contraseña debe tener al menos 8 caracteres');
        }
        if ($contrasena !== $confirmacion) {
            responderError(422, 'Las contraseñas no coinciden');
        }

        $hashToken = hash('sha256', $token);
        $this->conexion->beginTransaction();
        try {
            $consulta = $this->conexion->prepare(
                "SELECT id_token, id_usuario
                 FROM tokens_recuperacion_contrasena
                 WHERE hash_token = :hash AND fecha_uso IS NULL AND fecha_expiracion > CURRENT_TIMESTAMP
                 LIMIT 1 FOR UPDATE"
            );
            $consulta->execute(['hash' => $hashToken]);
            $registro = $consulta->fetch();
            if (!$registro) {
                responderError(422, 'El enlace de recuperación no es válido o venció');
            }

            $this->conexion->prepare(
                "UPDATE usuarios SET
                   hash_contrasena = :hash,
                   intentos_fallidos = 0,
                   ultimo_intento_fallido = NULL,
                   estado = CASE WHEN estado = 'bloqueado' AND motivo_bloqueo = 'seguridad' THEN 'activo' ELSE estado END,
                   motivo_bloqueo = CASE WHEN estado = 'bloqueado' AND motivo_bloqueo = 'seguridad' THEN NULL ELSE motivo_bloqueo END
                 WHERE id_usuario = :id"
            )->execute([
                'hash' => password_hash($contrasena, PASSWORD_DEFAULT),
                'id' => $registro['id_usuario'],
            ]);
            $this->conexion->prepare(
                "UPDATE tokens_recuperacion_contrasena
                 SET fecha_uso = CURRENT_TIMESTAMP
                 WHERE id_usuario = :id AND fecha_uso IS NULL"
            )->execute(['id' => $registro['id_usuario']]);
            (new ServicioAuditoria($this->conexion))->registrar(
                (int) $registro['id_usuario'],
                'usuarios',
                'restablecer_contrasena',
                'usuario',
                (int) $registro['id_usuario']
            );
            $this->conexion->commit();
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
        return ['restablecida' => true];
    }

    public function refrescarSesion(): array
    {
        $sesion = exigirAutenticacion();
        $consulta = $this->conexion->prepare(
            "SELECT u.estado, u.motivo_bloqueo, u.fecha_actualizacion,
                    r.nombre AS rol_solicitado
             FROM usuarios u
             INNER JOIN roles r ON r.id_rol = u.id_rol
             WHERE u.id_usuario = :id_usuario
             LIMIT 1"
        );
        $consulta->execute(['id_usuario' => $sesion['id_usuario']]);
        $cuenta = $consulta->fetch();

        if (!$cuenta) {
            $this->cerrarSesion();
            responderError(401, 'La cuenta ya no está disponible');
        }

        $_SESSION['estado_cuenta'] = (string) $cuenta['estado'];
        $_SESSION['motivo_bloqueo'] = $cuenta['motivo_bloqueo'] === null ? '' : (string) $cuenta['motivo_bloqueo'];
        $_SESSION['rol_solicitado'] = (string) $cuenta['rol_solicitado'];
        $_SESSION['fecha_actualizacion_cuenta'] = (string) $cuenta['fecha_actualizacion'];
        $_SESSION['roles_disponibles'] = $cuenta['estado'] === 'activo'
            ? $this->obtenerRolesActivos((int) $sesion['id_usuario'])
            : [];
        $_SESSION['rol'] = $_SESSION['roles_disponibles'][0] ?? '';

        return obtenerUsuarioSesion() ?? [];
    }

    public function seleccionarPerfil(array $datos): array
    {
        $usuario = exigirAutenticacion();
        $rol = trim((string) ($datos['rol'] ?? ''));
        $roles = $usuario['roles_disponibles'];

        if ($rol === '' || !in_array($rol, $roles, true)) {
            responderError(403, 'El perfil seleccionado no está disponible');
        }

        // Compatibilidad: el endpoint se conserva, pero el panel siempre usa el rol principal.
        $_SESSION['rol'] = $roles[0] ?? '';

        return obtenerUsuarioSesion() ?? [];
    }

    // Logout: borra variables y cookie de sesión.
    public function cerrarSesion(): void
    {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $parametros = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $parametros['path'],
                $parametros['domain'] ?? '',
                $parametros['secure'],
                $parametros['httponly']
            );
        }

        session_destroy();
    }

    private function obtenerRolesActivos(int $idUsuario): array
    {
        $consulta = $this->conexion->prepare(
            "SELECT r.nombre
             FROM usuarios_roles ur
             INNER JOIN roles r ON r.id_rol = ur.id_rol
             WHERE ur.id_usuario = :id_usuario
               AND ur.estado = 'activo'
             ORDER BY FIELD(r.nombre, 'administrador', 'tecnico', 'solicitante')"
        );
        $consulta->execute(['id_usuario' => $idUsuario]);

        return array_map('strval', $consulta->fetchAll(PDO::FETCH_COLUMN));
    }

    private function registrarIntentoFallido(array $usuario): void
    {
        $consulta = $this->conexion->prepare(
            "UPDATE usuarios SET
               intentos_fallidos = CASE
                 WHEN ultimo_intento_fallido >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE)
                   THEN intentos_fallidos + 1
                 ELSE 1
               END,
               ultimo_intento_fallido = CURRENT_TIMESTAMP
             WHERE id_usuario = :id"
        );
        $consulta->execute(['id' => $usuario['id_usuario']]);
        $verificar = $this->conexion->prepare("SELECT intentos_fallidos FROM usuarios WHERE id_usuario = :id");
        $verificar->execute(['id' => $usuario['id_usuario']]);
        $bloquear = (int) $verificar->fetchColumn() >= 5;
        if ($bloquear) {
            $this->conexion->prepare(
                "UPDATE usuarios SET estado = 'bloqueado', motivo_bloqueo = 'seguridad' WHERE id_usuario = :id"
            )->execute(['id' => $usuario['id_usuario']]);
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'usuarios', 'bloqueo_seguridad', 'usuario', (int) $usuario['id_usuario']);
        }
    }

    private function reiniciarIntentos(int $idUsuario): void
    {
        $consulta = $this->conexion->prepare(
            "UPDATE usuarios SET intentos_fallidos = 0, ultimo_intento_fallido = NULL
             WHERE id_usuario = :id"
        );
        $consulta->execute(['id' => $idUsuario]);
    }
}

/**
 * Usuarios: registro pendiente, consulta y cambios de estado limitados.
 */
final class ServicioUsuarios
{
    public function __construct(private PDO $conexion)
    {
    }

    public function registrar(array $datos): array
    {
        $nombre = trim((string) ($datos['nombre'] ?? ''));
        $apellido = trim((string) ($datos['apellido'] ?? ''));
        $cedula = preg_replace('/\D+/', '', (string) ($datos['cedula'] ?? ''));
        $telefono = preg_replace('/\D+/', '', (string) ($datos['telefono'] ?? ''));
        $correo = trim((string) ($datos['correo'] ?? ''));
        $contrasena = (string) ($datos['contrasena'] ?? '');
        $rol = trim((string) ($datos['rolSolicitado'] ?? $datos['rol_solicitado'] ?? ''));

        if ($nombre === '' || $apellido === '' || $cedula === '' || $telefono === '' || $correo === '' || $contrasena === '' || $rol === '') {
            responderError(422, 'Todos los datos de registro son obligatorios');
        }

        if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            responderError(422, 'Correo electrónico no válido');
        }

        if (!preg_match('/^\d{7,8}$/', $cedula) || !preg_match('/^\d{8,15}$/', $telefono)) {
            responderError(422, 'Cédula o teléfono no válidos');
        }

        if (strlen($contrasena) < 8) {
            responderError(422, 'La contraseña debe tener al menos 8 caracteres');
        }

        $idRol = $this->obtenerIdRol($rol);
        $this->asegurarSinDuplicados($cedula, $correo);

        $this->conexion->beginTransaction();

        try {
            $consulta = $this->conexion->prepare(
                "INSERT INTO usuarios
                   (id_rol, nombre, apellido, cedula, telefono, correo, hash_contrasena, estado)
                 VALUES
                   (:id_rol, :nombre, :apellido, :cedula, :telefono, :correo, :hash_contrasena, 'pendiente')"
            );
            $consulta->execute([
                'id_rol' => $idRol,
                'nombre' => $nombre,
                'apellido' => $apellido,
                'cedula' => $cedula,
                'telefono' => $telefono,
                'correo' => $correo,
                'hash_contrasena' => password_hash($contrasena, PASSWORD_DEFAULT),
            ]);

            $idUsuario = (int) $this->conexion->lastInsertId();
            $this->guardarRolUsuario($idUsuario, $idRol, 'pendiente');
            $this->conexion->commit();
        } catch (Throwable $error) {
            $this->conexion->rollBack();
            throw $error;
        }

        return ['id_usuario' => $idUsuario, 'estado' => 'pendiente', 'rol_solicitado' => $rol];
    }

    public function listar(): array
    {
        $consulta = $this->conexion->query(
            "SELECT u.id_usuario, u.nombre, u.apellido, u.cedula, u.telefono, u.correo,
                    r.nombre AS rol_solicitado,
                    u.estado,
                    u.fecha_creacion,
                    GROUP_CONCAT(CONCAT(rr.nombre, ':', ur.estado) ORDER BY rr.nombre SEPARATOR ',') AS roles_resumen
             FROM usuarios u
             INNER JOIN roles r ON r.id_rol = u.id_rol
             LEFT JOIN usuarios_roles ur ON ur.id_usuario = u.id_usuario
             LEFT JOIN roles rr ON rr.id_rol = ur.id_rol
             GROUP BY u.id_usuario, u.nombre, u.apellido, u.cedula, u.telefono, u.correo, r.nombre, u.estado, u.fecha_creacion
             ORDER BY FIELD(u.estado, 'pendiente', 'activo', 'bloqueado', 'rechazado'), u.fecha_creacion DESC"
        );

        return $consulta->fetchAll();
    }

    public function cambiarEstado(int $idUsuario, string $accion, ?int $idAdministrador = null): array
    {
        $estado = match ($accion) {
            'aprobar' => 'activo',
            'rechazar' => 'rechazado',
            'dar_baja' => 'bloqueado',
            'reactivar' => 'activo',
            default => null,
        };

        if ($estado === null) {
            responderError(422, 'Acción de usuario no válida');
        }

        $transiciones = [
            'aprobar' => ['pendiente', 'rechazado'],
            'rechazar' => ['pendiente'],
            'dar_baja' => ['activo'],
            'reactivar' => ['bloqueado', 'rechazado'],
        ];

        $this->conexion->beginTransaction();

        try {
            $buscar = $this->conexion->prepare("SELECT estado FROM usuarios WHERE id_usuario = :id FOR UPDATE");
            $buscar->execute(['id' => $idUsuario]);
            $estadoAnterior = $buscar->fetchColumn();
            if ($estadoAnterior === false) {
                responderError(404, 'Usuario no encontrado');
            }
            if (!in_array((string) $estadoAnterior, $transiciones[$accion] ?? [], true)) {
                responderError(409, 'La transición de usuario no está permitida');
            }

            $consulta = $this->conexion->prepare(
                "UPDATE usuarios
                 SET estado = :estado,
                     intentos_fallidos = CASE WHEN :reactivar = 1 THEN 0 ELSE intentos_fallidos END,
                     ultimo_intento_fallido = CASE WHEN :reactivar_fecha = 1 THEN NULL ELSE ultimo_intento_fallido END,
                     motivo_bloqueo = CASE
                       WHEN :dar_baja = 1 THEN 'administrativo'
                       WHEN :reactivar_motivo = 1 THEN NULL
                       ELSE motivo_bloqueo
                     END
                 WHERE id_usuario = :id_usuario"
            );
            $consulta->execute([
                'estado' => $estado,
                'reactivar' => $accion === 'reactivar' ? 1 : 0,
                'reactivar_fecha' => $accion === 'reactivar' ? 1 : 0,
                'dar_baja' => $accion === 'dar_baja' ? 1 : 0,
                'reactivar_motivo' => $accion === 'reactivar' ? 1 : 0,
                'id_usuario' => $idUsuario,
            ]);

            if ($accion === 'aprobar' || $accion === 'reactivar') {
                $this->activarRolesPendientes($idUsuario);
            } elseif ($accion === 'rechazar') {
                $this->rechazarRolesPendientes($idUsuario);
            }

            (new ServicioAuditoria($this->conexion))->registrar(
                $idAdministrador,
                'usuarios',
                $accion,
                'usuario',
                $idUsuario,
                ['estado' => $estadoAnterior],
                ['estado' => $estado]
            );
            $this->conexion->commit();
        } catch (Throwable $error) {
            $this->conexion->rollBack();
            throw $error;
        }

        return ['id_usuario' => $idUsuario, 'estado' => $estado];
    }

    public function solicitarRolAdicional(array $usuario, array $datos): array
    {
        $rol = trim((string) ($datos['rol'] ?? ''));
        $idRol = $this->obtenerIdRol($rol);

        $consulta = $this->conexion->prepare(
            "SELECT estado
             FROM usuarios_roles
             WHERE id_usuario = :id_usuario
               AND id_rol = :id_rol
             LIMIT 1"
        );
        $consulta->execute([
            'id_usuario' => $usuario['id_usuario'],
            'id_rol' => $idRol,
        ]);
        $estadoActual = $consulta->fetchColumn();

        if ($estadoActual === 'activo') {
            responderError(409, 'Ese rol ya está activo para este usuario');
        }

        $this->guardarRolUsuario((int) $usuario['id_usuario'], $idRol, 'pendiente');

        return ['rol' => $rol, 'estado' => 'pendiente'];
    }

    public function cambiarEstadoRol(int $idUsuario, string $rol, string $accion, int $idAdministrador): array
    {
        $estado = match ($accion) {
            'aprobar' => 'activo',
            'rechazar' => 'rechazado',
            default => null,
        };

        if ($estado === null) {
            responderError(422, 'Acción de rol no válida');
        }

        $idRol = $this->obtenerIdRol($rol);
        $this->conexion->beginTransaction();

        try {
            $consulta = $this->conexion->prepare(
                "UPDATE usuarios_roles
                 SET estado = :estado,
                     fecha_decision = CURRENT_TIMESTAMP,
                     id_administrador_decisor = :id_administrador
                 WHERE id_usuario = :id_usuario
                   AND id_rol = :id_rol"
            );
            $consulta->execute([
                'estado' => $estado,
                'id_administrador' => $idAdministrador,
                'id_usuario' => $idUsuario,
                'id_rol' => $idRol,
            ]);

            if ($consulta->rowCount() === 0) {
                responderError(404, 'Solicitud de rol no encontrada');
            }

            if ($estado === 'activo') {
                $this->crearPerfilesPorRol($idUsuario, $rol);
                $this->activarUsuarioSiTieneRoles($idUsuario);
            }

            $this->conexion->commit();
        } catch (Throwable $error) {
            $this->conexion->rollBack();
            throw $error;
        }

        return ['id_usuario' => $idUsuario, 'rol' => $rol, 'estado' => $estado];
    }

    private function obtenerIdRol(string $rol): int
    {
        $consulta = $this->conexion->prepare("SELECT id_rol FROM roles WHERE nombre = :rol LIMIT 1");
        $consulta->execute(['rol' => $rol]);
        $idRol = $consulta->fetchColumn();

        if ($idRol === false) {
            responderError(422, 'Rol solicitado no válido');
        }

        return (int) $idRol;
    }

    private function asegurarSinDuplicados(string $cedula, string $correo): void
    {
        $consulta = $this->conexion->prepare(
            "SELECT COUNT(*) FROM usuarios WHERE cedula = :cedula OR correo = :correo"
        );
        $consulta->execute(['cedula' => $cedula, 'correo' => $correo]);

        if ((int) $consulta->fetchColumn() > 0) {
            responderError(409, 'Ya existe un usuario con esa cédula o correo');
        }
    }

    private function guardarRolUsuario(int $idUsuario, int $idRol, string $estado): void
    {
        $consulta = $this->conexion->prepare(
            "INSERT INTO usuarios_roles (id_usuario, id_rol, estado)
             VALUES (:id_usuario, :id_rol, :estado)
             ON DUPLICATE KEY UPDATE
               estado = CASE WHEN usuarios_roles.estado = 'activo' THEN 'activo' ELSE VALUES(estado) END,
               fecha_solicitud = CURRENT_TIMESTAMP,
               fecha_decision = NULL,
               id_administrador_decisor = NULL"
        );
        $consulta->execute([
            'id_usuario' => $idUsuario,
            'id_rol' => $idRol,
            'estado' => $estado,
        ]);
    }

    private function activarRolesPendientes(int $idUsuario): void
    {
        $consulta = $this->conexion->prepare(
            "SELECT r.nombre
             FROM usuarios_roles ur
             INNER JOIN roles r ON r.id_rol = ur.id_rol
             WHERE ur.id_usuario = :id_usuario
               AND ur.estado IN ('pendiente', 'rechazado')"
        );
        $consulta->execute(['id_usuario' => $idUsuario]);
        $roles = array_map('strval', $consulta->fetchAll(PDO::FETCH_COLUMN));

        $actualizar = $this->conexion->prepare(
            "UPDATE usuarios_roles
             SET estado = 'activo',
                 fecha_decision = CURRENT_TIMESTAMP
             WHERE id_usuario = :id_usuario
               AND estado IN ('pendiente', 'rechazado')"
        );
        $actualizar->execute(['id_usuario' => $idUsuario]);

        foreach ($roles as $rol) {
            $this->crearPerfilesPorRol($idUsuario, $rol);
        }
    }

    private function rechazarRolesPendientes(int $idUsuario): void
    {
        $consulta = $this->conexion->prepare(
            "UPDATE usuarios_roles
             SET estado = 'rechazado',
                 fecha_decision = CURRENT_TIMESTAMP
             WHERE id_usuario = :id_usuario
               AND estado = 'pendiente'"
        );
        $consulta->execute(['id_usuario' => $idUsuario]);
    }

    private function activarUsuarioSiTieneRoles(int $idUsuario): void
    {
        $consulta = $this->conexion->prepare(
            "UPDATE usuarios
             SET estado = 'activo'
             WHERE id_usuario = :id_usuario
               AND estado IN ('pendiente', 'rechazado')"
        );
        $consulta->execute(['id_usuario' => $idUsuario]);
    }

    private function crearPerfilesPorRol(int $idUsuario, string $rol): void
    {
        if ($rol === 'solicitante') {
            $this->crearPerfilSolicitante($idUsuario);
        } elseif ($rol === 'tecnico') {
            $consulta = $this->conexion->prepare("INSERT IGNORE INTO tecnicos (id_usuario, especialidad) VALUES (:id, 'General')");
            $consulta->execute(['id' => $idUsuario]);
        } else {
            $consulta = $this->conexion->prepare("INSERT IGNORE INTO administradores (id_usuario, nivel_acceso) VALUES (:id, 'general')");
            $consulta->execute(['id' => $idUsuario]);
            $consulta = $this->conexion->prepare("INSERT IGNORE INTO tecnicos (id_usuario, especialidad) VALUES (:id, 'Administración técnica')");
            $consulta->execute(['id' => $idUsuario]);
        }
    }

    private function crearPerfilSolicitante(int $idUsuario): void
    {
        $consulta = $this->conexion->prepare("INSERT IGNORE INTO solicitantes (id_usuario, sector) VALUES (:id, 'Docencia')");
        $consulta->execute(['id' => $idUsuario]);
    }
}

/**
 * Incidencias: listado, clasificación y resolución.
 */
final class ServicioIncidencias
{
    private const TRANSICIONES = [
        'pendiente' => ['en_proceso', 'cancelada'],
        'en_proceso' => ['resuelta', 'cancelada'],
        'resuelta' => [],
        'cancelada' => [],
    ];

    public function __construct(private PDO $conexion)
    {
    }

    // Listado: admin/técnico ven todo; solicitante ve solo sus tickets.
    public function listar(array $usuario, bool $soloPropias = false): array
    {
        $sql = "SELECT
                  t.id_ticket,
                  t.titulo,
                  t.descripcion,
                  t.prioridad,
                  t.estado,
                  t.fecha_reportada,
                  t.fecha_creacion,
                  t.fecha_cierre,
                  c.nombre AS categoria,
                  e.codigo_inventario,
                  e.nombre AS equipo,
                  ep.nombre AS espacio,
                  CONCAT(u.nombre, ' ', u.apellido) AS solicitante,
                  r.diagnostico,
                  r.solucion_aplicada,
                  CASE WHEN r.foto_nombre_interno IS NULL THEN 0 ELSE 1 END AS tiene_foto_resolucion
                FROM tickets_incidencia t
                INNER JOIN usuarios u ON u.id_usuario = t.id_solicitante
                LEFT JOIN equipos e ON e.id_equipo = t.id_equipo
                LEFT JOIN espacios ep ON ep.id_espacio = t.id_espacio
                LEFT JOIN categorias_incidencia c ON c.id_categoria = t.id_categoria
                LEFT JOIN resoluciones_incidencia r ON r.id_ticket = t.id_ticket";

        $parametros = [];

        if ($soloPropias || $usuario['rol'] === 'solicitante') {
            $sql .= " WHERE t.id_solicitante = :id_usuario";
            $parametros['id_usuario'] = $usuario['id_usuario'];
        }

        $sql .= " ORDER BY t.fecha_creacion DESC";

        $consulta = $this->conexion->prepare($sql);
        $consulta->execute($parametros);

        return $consulta->fetchAll();
    }

    public function crear(array $usuario, array $datos): array
    {
        $titulo = trim((string) ($datos['titulo'] ?? ''));
        $descripcion = trim((string) ($datos['descripcion'] ?? ''));
        $idEquipo = ($datos['id_equipo'] ?? '') === '' ? null : (int) $datos['id_equipo'];
        $idEspacio = ($datos['id_espacio'] ?? '') === '' ? null : (int) $datos['id_espacio'];
        $idCategoria = (int) ($datos['id_categoria'] ?? 0);
        $fechaReportada = trim((string) ($datos['fecha_reportada'] ?? date('Y-m-d')));

        if ($titulo === '' || $descripcion === '' || $idCategoria <= 0 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaReportada)) {
            responderError(422, 'Título, descripción, categoría y fecha reportada son obligatorios');
        }

        $consulta = $this->conexion->prepare(
            "INSERT INTO tickets_incidencia
               (id_solicitante, id_espacio, id_equipo, id_categoria, titulo, descripcion, fecha_reportada, prioridad, estado)
             VALUES
               (:id_solicitante, :id_espacio, :id_equipo, :id_categoria, :titulo, :descripcion, :fecha_reportada, 'sin_asignar', 'pendiente')"
        );
        try {
            $consulta->execute([
                'id_solicitante' => $usuario['id_usuario'],
                'id_espacio' => $idEspacio,
                'id_equipo' => $idEquipo,
                'id_categoria' => $idCategoria,
                'titulo' => $titulo,
                'descripcion' => $descripcion,
                'fecha_reportada' => $fechaReportada,
            ]);
        } catch (PDOException $error) {
            if ((string) $error->getCode() === '23000') {
                responderError(409, 'La incidencia ya existe o contiene referencias no válidas');
            }
            throw $error;
        }
        $id = (int) $this->conexion->lastInsertId();
        (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'incidencias', 'crear', 'incidencia', $id, null, ['titulo' => $titulo]);
        return ['id_ticket' => $id, 'estado' => 'pendiente'];
    }

    public function cambiarEstado(int $idTicket, array $usuario, string $estado, ?string $prioridad = null): array
    {
        $estados = ['pendiente', 'en_proceso', 'resuelta', 'cancelada'];
        $prioridades = ['sin_asignar', 'baja', 'media', 'alta'];

        if (!in_array($estado, $estados, true)) {
            responderError(422, 'Estado de incidencia no válido');
        }

        if ($prioridad !== null && !in_array($prioridad, $prioridades, true)) {
            responderError(422, 'Prioridad de incidencia no válida');
        }

        $this->conexion->beginTransaction();
        try {
            $consulta = $this->conexion->prepare("SELECT estado, prioridad FROM tickets_incidencia WHERE id_ticket = :id FOR UPDATE");
            $consulta->execute(['id' => $idTicket]);
            $anterior = $consulta->fetch();
            if (!$anterior) {
                responderError(404, 'Incidencia no encontrada');
            }
            $soloClasificar = $estado === (string) $anterior['estado'] && $prioridad !== null;
            if (!$soloClasificar && !in_array($estado, self::TRANSICIONES[(string) $anterior['estado']] ?? [], true)) {
                responderError(409, 'Transición de incidencia no permitida');
            }
            if ($estado === 'resuelta') {
                responderError(409, 'Use la acción resolver para cerrar una incidencia');
            }
            $actualizar = $this->conexion->prepare(
                "UPDATE tickets_incidencia SET estado = :estado,
                   prioridad = COALESCE(:prioridad, prioridad),
                   id_tecnico_asignado = CASE WHEN :estado_asignado = 'en_proceso' THEN :tecnico ELSE id_tecnico_asignado END,
                   fecha_cierre = CASE WHEN :estado_cierre = 'cancelada' THEN CURRENT_TIMESTAMP ELSE NULL END
                 WHERE id_ticket = :id"
            );
            $actualizar->execute([
                'estado' => $estado,
                'prioridad' => $prioridad,
                'estado_asignado' => $estado,
                'tecnico' => $usuario['id_usuario'],
                'estado_cierre' => $estado,
                'id' => $idTicket,
            ]);
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'incidencias', 'cambiar_estado', 'incidencia', $idTicket, $anterior, ['estado' => $estado, 'prioridad' => $prioridad]);
            $this->conexion->commit();
            return ['id_ticket' => $idTicket, 'estado' => $estado, 'prioridad' => $prioridad];
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
    }

    // Resolución: guarda el diagnóstico registrado por admin/técnico.
    public function resolver(int $idTicket, array $usuario, array $datos, ?array $foto = null): array
    {
        $diagnostico = trim((string) ($datos['diagnostico'] ?? ''));
        $solucion = trim((string) ($datos['solucion_aplicada'] ?? $datos['solucion'] ?? ''));

        if ($diagnostico === '' || $solucion === '') {
            responderError(422, 'Diagnóstico y solución aplicada son obligatorios');
        }

        $archivo = null;
        $this->conexion->beginTransaction();

        try {
            $bloqueo = $this->conexion->prepare("SELECT estado, prioridad FROM tickets_incidencia WHERE id_ticket = :id FOR UPDATE");
            $bloqueo->execute(['id' => $idTicket]);
            $anterior = $bloqueo->fetch();
            if (!$anterior) {
                responderError(404, 'Incidencia no encontrada');
            }
            if ((string) $anterior['estado'] !== 'en_proceso') {
                responderError(409, 'Solo una incidencia en proceso puede resolverse');
            }
            $prioridad = isset($datos['prioridad']) ? (string) $datos['prioridad'] : (string) $anterior['prioridad'];
            if (!in_array($prioridad, ['sin_asignar', 'baja', 'media', 'alta'], true)) {
                responderError(422, 'Prioridad de incidencia no válida');
            }

            // La imagen se mueve únicamente después de validar el ticket para no
            // dejar archivos huérfanos ante una referencia o transición inválida.
            $archivo = $this->guardarFoto($idTicket, $foto);
            $actualizar = $this->conexion->prepare(
                "UPDATE tickets_incidencia SET estado = 'resuelta', prioridad = :prioridad,
                   id_tecnico_asignado = :tecnico, fecha_cierre = CURRENT_TIMESTAMP
                 WHERE id_ticket = :id"
            );
            $actualizar->execute(['prioridad' => $prioridad, 'tecnico' => $usuario['id_usuario'], 'id' => $idTicket]);

            $consulta = $this->conexion->prepare(
                "INSERT INTO resoluciones_incidencia
                   (id_ticket, id_tecnico, diagnostico, solucion_aplicada,
                    foto_nombre_interno, foto_nombre_original, foto_tipo_mime, foto_tamano)
                 VALUES
                   (:id_ticket, :id_tecnico, :diagnostico, :solucion,
                    :foto_interna, :foto_original, :foto_mime, :foto_tamano)
                 ON DUPLICATE KEY UPDATE
                   id_tecnico = VALUES(id_tecnico),
                   diagnostico = VALUES(diagnostico),
                   solucion_aplicada = VALUES(solucion_aplicada),
                   foto_nombre_interno = VALUES(foto_nombre_interno),
                   foto_nombre_original = VALUES(foto_nombre_original),
                   foto_tipo_mime = VALUES(foto_tipo_mime),
                   foto_tamano = VALUES(foto_tamano),
                   fecha_resolucion = CURRENT_TIMESTAMP"
            );
            $consulta->execute([
                'id_ticket' => $idTicket,
                'id_tecnico' => $usuario['id_usuario'],
                'diagnostico' => $diagnostico,
                'solucion' => $solucion,
                'foto_interna' => $archivo['nombre_interno'] ?? null,
                'foto_original' => $archivo['nombre_original'] ?? null,
                'foto_mime' => $archivo['tipo_mime'] ?? null,
                'foto_tamano' => $archivo['tamano'] ?? null,
            ]);
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'incidencias', 'resolver', 'incidencia', $idTicket, ['estado' => 'en_proceso'], ['estado' => 'resuelta']);
            $this->conexion->commit();
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            if ($archivo !== null && is_file($archivo['ruta'])) {
                unlink($archivo['ruta']);
            }
            throw $error;
        }

        return ['id_ticket' => $idTicket, 'estado' => 'resuelta', 'tiene_foto_resolucion' => $archivo !== null];
    }

    /**
     * Obtiene una fotografía protegida después de comprobar la propiedad del ticket.
     */
    public function obtenerFotoResolucion(int $idTicket, array $usuario): array
    {
        $consulta = $this->conexion->prepare(
            "SELECT t.id_solicitante, r.foto_nombre_interno, r.foto_nombre_original,
                    r.foto_tipo_mime, r.foto_tamano
             FROM tickets_incidencia t
             INNER JOIN resoluciones_incidencia r ON r.id_ticket = t.id_ticket
             WHERE t.id_ticket = :id
             LIMIT 1"
        );
        $consulta->execute(['id' => $idTicket]);
        $foto = $consulta->fetch();
        if (!$foto || $foto['foto_nombre_interno'] === null) {
            responderError(404, 'La incidencia no tiene una fotografía de resolución');
        }
        $esPersonalTecnico = usuarioTieneAlgunRol($usuario, ['administrador', 'tecnico']);
        if (!$esPersonalTecnico && (int) $foto['id_solicitante'] !== (int) $usuario['id_usuario']) {
            responderError(403, 'No tiene permisos para ver esta fotografía');
        }

        $directorio = $this->obtenerDirectorioFotos();
        $rutaBase = realpath($directorio);
        $ruta = realpath($directorio . DIRECTORY_SEPARATOR . basename((string) $foto['foto_nombre_interno']));
        if ($rutaBase === false || $ruta === false || !str_starts_with($ruta, $rutaBase . DIRECTORY_SEPARATOR) || !is_file($ruta)) {
            responderError(404, 'El archivo de la fotografía ya no está disponible');
        }
        return [
            'ruta' => $ruta,
            'nombre' => (string) $foto['foto_nombre_original'],
            'tipo_mime' => (string) $foto['foto_tipo_mime'],
            'tamano' => (int) $foto['foto_tamano'],
        ];
    }

    /**
     * Valida y mueve la imagen recibida al almacenamiento privado.
     */
    private function guardarFoto(int $idTicket, ?array $foto): ?array
    {
        if ($foto === null || (int) ($foto['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            return null;
        }
        if ((int) ($foto['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
            responderError(422, 'No se pudo recibir la fotografía');
        }
        $tamano = (int) ($foto['size'] ?? 0);
        if ($tamano <= 0 || $tamano > 5 * 1024 * 1024) {
            responderError(422, 'La fotografía debe pesar como máximo 5 MB');
        }
        $temporal = (string) ($foto['tmp_name'] ?? '');
        if (!is_uploaded_file($temporal) || @getimagesize($temporal) === false) {
            responderError(422, 'El archivo recibido no es una imagen válida');
        }

        $nombreOriginal = basename((string) ($foto['name'] ?? ''));
        $extensionOriginal = strtolower(pathinfo($nombreOriginal, PATHINFO_EXTENSION));
        $mimesPorExtension = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
        ];
        if (!isset($mimesPorExtension[$extensionOriginal])) {
            responderError(422, 'La fotografía debe tener extensión JPG, JPEG, PNG o WebP');
        }

        $detector = new finfo(FILEINFO_MIME_TYPE);
        $tipoMime = (string) $detector->file($temporal);
        $extensiones = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!isset($extensiones[$tipoMime]) || $mimesPorExtension[$extensionOriginal] !== $tipoMime) {
            responderError(422, 'La fotografía debe estar en formato JPEG, PNG o WebP');
        }

        $directorio = $this->obtenerDirectorioFotos();
        if (!is_dir($directorio) && !mkdir($directorio, 0770, true) && !is_dir($directorio)) {
            throw new RuntimeException('No fue posible crear el directorio privado de fotografías.');
        }
        if (!is_writable($directorio)) {
            throw new RuntimeException('El directorio privado de fotografías no permite escritura.');
        }

        $nombreInterno = $idTicket . '_' . bin2hex(random_bytes(20)) . '.' . $extensiones[$tipoMime];
        $ruta = $directorio . DIRECTORY_SEPARATOR . $nombreInterno;
        if (!move_uploaded_file($temporal, $ruta)) {
            throw new RuntimeException('No fue posible guardar la fotografía de resolución.');
        }
        return [
            'ruta' => $ruta,
            'nombre_interno' => $nombreInterno,
            'nombre_original' => mb_substr($nombreOriginal, 0, 255),
            'tipo_mime' => $tipoMime,
            'tamano' => $tamano,
        ];
    }

    /**
     * Devuelve la ubicación privada configurada para las evidencias.
     */
    private function obtenerDirectorioFotos(): string
    {
        $directorio = trim(obtenerVariableEntorno('RUTA_ARCHIVOS_RESOLUCIONES'));
        if ($directorio === '') {
            throw new RuntimeException('RUTA_ARCHIVOS_RESOLUCIONES no fue configurada.');
        }
        return rtrim($directorio, "\\/");
    }

}

/**
 * Préstamos: estados, devoluciones, atrasos y bloqueo por blacklist.
 */
final class ServicioPrestamos
{
    private const TRANSICIONES = [
        'solicitado' => ['aprobado', 'rechazado', 'cancelado'],
        'aprobado' => ['entregado', 'cancelado'],
        'entregado' => ['atrasado', 'devuelto'],
        'atrasado' => ['devuelto'],
        'devuelto' => [],
        'rechazado' => [],
        'cancelado' => [],
    ];

    public function __construct(private PDO $conexion)
    {
    }

    // Listado: actualiza atrasos antes de devolver datos.
    public function listar(array $usuario, bool $soloPropias = false): array
    {
        $this->actualizarAtrasos();

        $sql = "SELECT
                  p.id_prestamo,
                  p.recurso_solicitado,
                  p.nombre_estudiante,
                  p.cedula_estudiante,
                  p.grupo,
                  p.motivo,
                  p.fecha_prestamo,
                  p.fecha_devolucion_prevista,
                  p.fecha_entrega_real,
                  p.fecha_devolucion_real,
                  p.condicion_devolucion,
                  p.observaciones_devolucion,
                  p.estado,
                  e.codigo_inventario,
                  e.nombre AS equipo,
                  CONCAT(u.nombre, ' ', u.apellido) AS docente_asociado
                FROM prestamos p
                INNER JOIN usuarios u ON u.id_usuario = p.id_solicitante
                LEFT JOIN equipos e ON e.id_equipo = p.id_equipo";

        $parametros = [];

        if ($soloPropias || $usuario['rol'] === 'solicitante') {
            $sql .= " WHERE p.id_solicitante = :id_usuario";
            $parametros['id_usuario'] = $usuario['id_usuario'];
        }

        $sql .= " ORDER BY p.fecha_creacion DESC";

        $consulta = $this->conexion->prepare($sql);
        $consulta->execute($parametros);

        return $consulta->fetchAll();
    }

    public function crear(array $usuario, array $datos): array
    {
        $idEquipo = (int) ($datos['id_equipo'] ?? 0);
        $estudiante = trim((string) ($datos['estudiante'] ?? $datos['nombre_estudiante'] ?? ''));
        $cedula = preg_replace('/\D+/', '', (string) ($datos['cedulaEstudiante'] ?? $datos['cedula_estudiante'] ?? ''));
        $grupo = trim((string) ($datos['grupo'] ?? $datos['actividad'] ?? ''));
        $motivo = trim((string) ($datos['motivo'] ?? ''));
        $fechaPrestamo = $this->normalizarFecha((string) ($datos['fechaPrestamo'] ?? $datos['fecha_prestamo'] ?? ''));
        $fechaDevolucion = $this->normalizarFecha((string) ($datos['fechaDevolucion'] ?? $datos['fecha_devolucion_prevista'] ?? ''));

        if ($idEquipo <= 0 || $estudiante === '' || $cedula === '' || $grupo === '' || $motivo === '' || $fechaPrestamo === null || $fechaDevolucion === null) {
            responderError(422, 'Datos de préstamo incompletos');
        }

        if ($fechaDevolucion < $fechaPrestamo) {
            responderError(422, 'La fecha de devolución no puede ser anterior al préstamo');
        }

        $this->conexion->beginTransaction();
        try {
            $equipo = $this->conexion->prepare(
                "SELECT id_equipo, codigo_inventario, nombre, estado FROM equipos WHERE id_equipo = :id FOR UPDATE"
            );
            $equipo->execute(['id' => $idEquipo]);
            $filaEquipo = $equipo->fetch();
            if (!$filaEquipo || (string) $filaEquipo['estado'] !== 'disponible') {
                responderError(409, 'El equipo no está disponible');
            }
            $ocupado = $this->conexion->prepare(
                "SELECT COUNT(*) FROM prestamos WHERE id_equipo = :id AND estado IN ('solicitado', 'aprobado', 'entregado', 'atrasado')"
            );
            $ocupado->execute(['id' => $idEquipo]);
            if ((int) $ocupado->fetchColumn() > 0) {
                responderError(409, 'El equipo ya tiene una solicitud o préstamo activo');
            }
            $recurso = $filaEquipo['codigo_inventario'] . ' - ' . $filaEquipo['nombre'];
            $consulta = $this->conexion->prepare(
                "INSERT INTO prestamos
                   (id_solicitante, id_equipo, recurso_solicitado, nombre_estudiante, cedula_estudiante, grupo, motivo, fecha_prestamo, fecha_devolucion_prevista, estado)
                 VALUES
                   (:id_solicitante, :id_equipo, :recurso, :estudiante, :cedula, :grupo, :motivo, :fecha_prestamo, :fecha_devolucion, 'solicitado')"
            );
            $consulta->execute([
                'id_solicitante' => $usuario['id_usuario'],
                'id_equipo' => $idEquipo,
                'recurso' => $recurso,
                'estudiante' => $estudiante,
                'cedula' => $cedula,
                'grupo' => $grupo,
                'motivo' => $motivo,
                'fecha_prestamo' => $fechaPrestamo,
                'fecha_devolucion' => $fechaDevolucion,
            ]);
            $id = (int) $this->conexion->lastInsertId();
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'prestamos', 'solicitar', 'prestamo', $id, null, ['id_equipo' => $idEquipo]);
            $this->conexion->commit();
            return ['id_prestamo' => $id, 'estado' => 'solicitado'];
        } catch (PDOException $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            if ((string) $error->getCode() === '23000') {
                responderError(409, 'Ya existe una solicitud equivalente');
            }
            throw $error;
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
    }

    // Estado: administra el ciclo solicitado, aprobado, entregado, devuelto, etc.
    public function cambiarEstado(int $idPrestamo, array $usuario, string $estado): array
    {
        $estados = ['solicitado', 'aprobado', 'entregado', 'devuelto', 'atrasado', 'rechazado', 'cancelado'];

        if (!in_array($estado, $estados, true)) {
            responderError(422, 'Estado de préstamo no válido');
        }

        if (!in_array($estado, ['aprobado', 'rechazado', 'cancelado'], true)) {
            responderError(409, 'Use la acción específica para entregar o devolver');
        }
        $this->conexion->beginTransaction();
        try {
            $prestamo = $this->obtenerBloqueado($idPrestamo);
            if (!in_array($estado, self::TRANSICIONES[(string) $prestamo['estado']] ?? [], true)) {
                responderError(409, 'Transición de préstamo no permitida');
            }
            if ($estado === 'aprobado' && $this->estudianteEstaEnBlacklist($idPrestamo)) {
                responderError(409, 'El estudiante posee una restricción activa en Black list');
            }
            $consulta = $this->conexion->prepare("UPDATE prestamos SET estado = :estado WHERE id_prestamo = :id");
            $consulta->execute(['estado' => $estado, 'id' => $idPrestamo]);
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'prestamos', 'cambiar_estado', 'prestamo', $idPrestamo, ['estado' => $prestamo['estado']], ['estado' => $estado]);
            $this->conexion->commit();
            return ['id_prestamo' => $idPrestamo, 'estado' => $estado];
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
    }

    public function marcarEntregado(int $idPrestamo, array $usuario): array
    {
        $this->conexion->beginTransaction();
        try {
            $prestamo = $this->obtenerBloqueado($idPrestamo);
            if (!in_array('entregado', self::TRANSICIONES[(string) $prestamo['estado']] ?? [], true)) {
                responderError(409, 'El préstamo debe estar aprobado antes de entregarse');
            }
            if ((string) $prestamo['fecha_prestamo'] > date('Y-m-d')) {
                responderError(409, 'El préstamo no puede entregarse antes de la fecha solicitada');
            }
            $equipo = $this->conexion->prepare("SELECT estado FROM equipos WHERE id_equipo = :id FOR UPDATE");
            $equipo->execute(['id' => $prestamo['id_equipo']]);
            if ($equipo->fetchColumn() !== 'disponible') {
                responderError(409, 'El equipo dejó de estar disponible');
            }
            $this->conexion->prepare(
                "UPDATE prestamos SET estado = 'entregado', fecha_entrega_real = CURRENT_TIMESTAMP, id_tecnico_entrega = :tecnico WHERE id_prestamo = :id"
            )->execute(['tecnico' => $usuario['id_usuario'], 'id' => $idPrestamo]);
            $this->conexion->prepare("UPDATE equipos SET estado = 'prestado' WHERE id_equipo = :id")
                ->execute(['id' => $prestamo['id_equipo']]);
            $this->registrarMovimientoEquipo((int) $prestamo['id_equipo'], (int) $usuario['id_usuario'], 'prestamo', 'Equipo entregado en préstamo');
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'prestamos', 'entregar', 'prestamo', $idPrestamo, ['estado' => $prestamo['estado']], ['estado' => 'entregado']);
            $this->conexion->commit();
            return ['id_prestamo' => $idPrestamo, 'estado' => 'entregado'];
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
    }

    public function marcarDevuelto(int $idPrestamo, array $usuario, array $datos): array
    {
        $condicion = trim((string) ($datos['condicion'] ?? ''));
        $observaciones = trim((string) ($datos['observaciones'] ?? ''));
        $estadosEquipo = ['bueno' => 'disponible', 'observado' => 'en_reparacion', 'dañado' => 'fuera_de_servicio', 'danado' => 'fuera_de_servicio'];
        if (!isset($estadosEquipo[$condicion])) {
            responderError(422, 'La condición debe ser bueno, observado o dañado');
        }
        if ($condicion !== 'bueno' && $observaciones === '') {
            responderError(422, 'Las observaciones son obligatorias si el equipo no vuelve en buen estado');
        }
        $this->conexion->beginTransaction();
        try {
            $prestamo = $this->obtenerBloqueado($idPrestamo);
            if (!in_array('devuelto', self::TRANSICIONES[(string) $prestamo['estado']] ?? [], true)) {
                responderError(409, 'Solo un préstamo entregado o atrasado puede devolverse');
            }
            $estadoEquipo = $estadosEquipo[$condicion];
            $this->conexion->prepare(
                "UPDATE prestamos SET estado = 'devuelto', fecha_devolucion_real = CURRENT_DATE,
                   id_tecnico_devolucion = :tecnico, condicion_devolucion = :condicion,
                   observaciones_devolucion = :observaciones WHERE id_prestamo = :id"
            )->execute([
                'tecnico' => $usuario['id_usuario'],
                'condicion' => $condicion === 'danado' ? 'dañado' : $condicion,
                'observaciones' => $observaciones !== '' ? $observaciones : null,
                'id' => $idPrestamo,
            ]);
            $this->conexion->prepare("UPDATE equipos SET estado = :estado WHERE id_equipo = :id")
                ->execute(['estado' => $estadoEquipo, 'id' => $prestamo['id_equipo']]);
            $this->conexion->prepare("UPDATE blacklist_estudiantes SET estado = 'regularizado', fecha_salida = CURRENT_TIMESTAMP WHERE id_prestamo = :id AND estado = 'activo'")
                ->execute(['id' => $idPrestamo]);
            $this->registrarMovimientoEquipo((int) $prestamo['id_equipo'], (int) $usuario['id_usuario'], 'devolucion', 'Equipo devuelto. Condición: ' . $condicion);
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'prestamos', 'devolver', 'prestamo', $idPrestamo, ['estado' => $prestamo['estado']], ['estado' => 'devuelto', 'condicion' => $condicion]);
            $this->conexion->commit();
            return ['id_prestamo' => $idPrestamo, 'estado' => 'devuelto', 'estado_equipo' => $estadoEquipo];
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
    }

    // El atraso comienza al vencer la fecha; Black list se activa a los siete días.
    public function actualizarAtrasos(): int
    {
        $consulta = $this->conexion->prepare(
            "UPDATE prestamos
             SET estado = 'atrasado'
             WHERE estado = 'entregado'
               AND fecha_devolucion_prevista < CURRENT_DATE
               AND fecha_devolucion_real IS NULL"
        );
        $consulta->execute();
        $actualizados = $consulta->rowCount();

        $this->registrarBlacklistPorAtrasos();

        return $actualizados;
    }

    // Blacklist automática: guarda estudiante y docente asociado.
    private function registrarBlacklistPorAtrasos(): void
    {
        $consulta = $this->conexion->prepare(
            "INSERT INTO blacklist_estudiantes
              (id_prestamo, id_solicitante, nombre_estudiante, cedula_estudiante, grupo, docente_asociado, motivo, dias_atraso, estado)
             SELECT
              p.id_prestamo,
              p.id_solicitante,
              p.nombre_estudiante,
              p.cedula_estudiante,
              p.grupo,
              CONCAT(u.nombre, ' ', u.apellido),
              'No devolvió el equipo luego de 7 días de atraso.',
              DATEDIFF(CURRENT_DATE, p.fecha_devolucion_prevista),
              'activo'
             FROM prestamos p
             INNER JOIN usuarios u ON u.id_usuario = p.id_solicitante
             WHERE p.estado = 'atrasado'
               AND DATEDIFF(CURRENT_DATE, p.fecha_devolucion_prevista) >= 7
             ON DUPLICATE KEY UPDATE
               dias_atraso = VALUES(dias_atraso),
               estado = 'activo'"
        );
        $consulta->execute();
    }

    // Bloqueo: si el estudiante esta en blacklist, el préstamo se rechaza.
    private function estudianteEstaEnBlacklist(int $idPrestamo): bool
    {
        $consulta = $this->conexion->prepare(
            "SELECT COUNT(*) AS total
             FROM blacklist_estudiantes b
             INNER JOIN prestamos p ON p.cedula_estudiante = b.cedula_estudiante
             WHERE p.id_prestamo = :id_prestamo
               AND b.estado = 'activo'"
        );
        $consulta->execute(['id_prestamo' => $idPrestamo]);

        return (int) $consulta->fetchColumn() > 0;
    }

    private function obtenerBloqueado(int $idPrestamo): array
    {
        $consulta = $this->conexion->prepare("SELECT * FROM prestamos WHERE id_prestamo = :id FOR UPDATE");
        $consulta->execute(['id' => $idPrestamo]);
        $fila = $consulta->fetch();
        if (!$fila) {
            responderError(404, 'Préstamo no encontrado');
        }
        return $fila;
    }

    private function registrarMovimientoEquipo(int $idEquipo, int $idUsuario, string $tipo, string $descripcion): void
    {
        $consulta = $this->conexion->prepare(
            "INSERT INTO historial_equipos (id_equipo, id_usuario_responsable, tipo_movimiento, descripcion)
             VALUES (:equipo, :usuario, :tipo, :descripcion)"
        );
        $consulta->execute(['equipo' => $idEquipo, 'usuario' => $idUsuario, 'tipo' => $tipo, 'descripcion' => $descripcion]);
    }

    private function normalizarFecha(string $valor): ?string
    {
        $valor = trim($valor);
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $valor)) {
            return $valor;
        }

        if (!preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $valor, $partes)) {
            return null;
        }

        return checkdate((int) $partes[2], (int) $partes[1], (int) $partes[3])
            ? "{$partes[3]}-{$partes[2]}-{$partes[1]}"
            : null;
    }
}

/**
 * Solicitudes de servicio: reserva de sala, software y soporte.
 */
final class ServicioSolicitudes
{
    private const TRANSICIONES = [
        'pendiente' => ['aprobada', 'rechazada', 'cancelada'],
        'aprobada' => ['en_proceso', 'cancelada'],
        'en_proceso' => ['completada', 'cancelada'],
        'rechazada' => [],
        'completada' => [],
        'cancelada' => [],
    ];

    public function __construct(private PDO $conexion)
    {
    }

    public function listar(array $usuario, bool $soloPropias = false): array
    {
        // La identidad de quienes procesan una solicitud es trazabilidad interna:
        // no debe exponerse en la API ni en el frontend.
        $sql = "SELECT s.id_solicitud, s.tipo_solicitud, s.descripcion, s.fecha_solicitada,
                       s.turno, s.grupo, s.asignatura, s.software_requerido, s.estado,
                       s.fecha_decision,
                       e.nombre AS sala_solicitada, e.tipo AS tipo_sala,
                       CONCAT(us.nombre, ' ', us.apellido) AS solicitante
                FROM solicitudes_servicio s
                INNER JOIN espacios e ON e.id_espacio = s.id_espacio
                INNER JOIN usuarios us ON us.id_usuario = s.id_solicitante";
        $parametros = [];

        if ($soloPropias || $usuario['rol'] === 'solicitante') {
            $sql .= " WHERE s.id_solicitante = :id_usuario";
            $parametros['id_usuario'] = $usuario['id_usuario'];
        }

        $sql .= " ORDER BY s.fecha_creacion DESC";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute($parametros);

        return $consulta->fetchAll();
    }

    public function crear(array $usuario, array $datos): array
    {
        $tipoSolicitud = $this->normalizarTipoSolicitud((string) ($datos['tipoSolicitud'] ?? ''));
        $tipoSala = $this->normalizarTipoSala((string) ($datos['tipoSala'] ?? ''));
        $sala = trim((string) ($datos['salaSolicitada'] ?? ''));
        $fecha = $this->normalizarFecha((string) ($datos['fechaSolicitada'] ?? ''));
        $turno = $this->normalizarTexto((string) ($datos['turno'] ?? ''));
        $grupo = trim((string) ($datos['grupo'] ?? ''));
        $asignatura = trim((string) ($datos['asignatura'] ?? ''));
        $descripcion = trim((string) ($datos['descripcion'] ?? ''));
        $software = trim((string) ($datos['software'] ?? ''));

        if ($tipoSolicitud === null || $tipoSala === null || $sala === '' || $fecha === null || $turno === '' || $grupo === '' || $asignatura === '' || $descripcion === '') {
            responderError(422, 'Datos de solicitud incompletos');
        }

        if ($tipoSolicitud === 'instalacion_software' && $software === '') {
            responderError(422, 'Software requerido es obligatorio');
        }

        $idEspacio = $this->obtenerOCrearEspacio($tipoSala, $sala);
        $consulta = $this->conexion->prepare(
            "INSERT INTO solicitudes_servicio
               (id_solicitante, id_espacio, tipo_solicitud, descripcion, fecha_solicitada, turno, grupo, asignatura, software_requerido, estado)
             VALUES
               (:id_solicitante, :id_espacio, :tipo_solicitud, :descripcion, :fecha_solicitada, :turno, :grupo, :asignatura, :software, 'pendiente')"
        );
        $consulta->execute([
            'id_solicitante' => $usuario['id_usuario'],
            'id_espacio' => $idEspacio,
            'tipo_solicitud' => $tipoSolicitud,
            'descripcion' => $descripcion,
            'fecha_solicitada' => $fecha,
            'turno' => $turno,
            'grupo' => $grupo,
            'asignatura' => $asignatura,
            'software' => $software !== '' ? $software : null,
        ]);

        return ['id_solicitud' => (int) $this->conexion->lastInsertId(), 'estado' => 'pendiente'];
    }

    public function cambiarEstado(int $idSolicitud, array $usuario, string $estado): array
    {
        $estados = ['pendiente', 'aprobada', 'rechazada', 'en_proceso', 'completada', 'cancelada'];

        if (!in_array($estado, $estados, true)) {
            responderError(422, 'Estado de solicitud no válido');
        }

        $idAdministrador = in_array('administrador', $usuario['roles_disponibles'] ?? [], true)
            && in_array($estado, ['aprobada', 'rechazada'], true)
            ? (int) $usuario['id_usuario']
            : null;
        $idTecnico = (in_array('tecnico', $usuario['roles_disponibles'] ?? [], true)
                || in_array('administrador', $usuario['roles_disponibles'] ?? [], true))
            && in_array($estado, ['en_proceso', 'completada'], true)
            ? (int) $usuario['id_usuario']
            : null;

        $this->conexion->beginTransaction();
        try {
            $bloqueo = $this->conexion->prepare("SELECT estado FROM solicitudes_servicio WHERE id_solicitud = :id FOR UPDATE");
            $bloqueo->execute(['id' => $idSolicitud]);
            $actual = $bloqueo->fetchColumn();
            if ($actual === false) {
                responderError(404, 'Solicitud no encontrada');
            }
            if (!in_array($estado, self::TRANSICIONES[(string) $actual] ?? [], true)) {
                responderError(409, 'Transición de solicitud no permitida');
            }
            $consulta = $this->conexion->prepare(
                "UPDATE solicitudes_servicio
                 SET estado = :estado,
                     id_administrador_aprobador = COALESCE(:id_administrador, id_administrador_aprobador),
                     id_tecnico_asignado = COALESCE(:id_tecnico, id_tecnico_asignado),
                     fecha_decision = CASE
                       WHEN :estado_decision IN ('aprobada', 'rechazada', 'completada', 'cancelada') THEN CURRENT_TIMESTAMP
                       ELSE fecha_decision
                     END
                 WHERE id_solicitud = :id_solicitud"
            );
            $consulta->execute([
                'estado' => $estado,
                'id_administrador' => $idAdministrador,
                'id_tecnico' => $idTecnico,
                'estado_decision' => $estado,
                'id_solicitud' => $idSolicitud,
            ]);
            (new ServicioAuditoria($this->conexion))->registrar((int) $usuario['id_usuario'], 'solicitudes', 'cambiar_estado', 'solicitud', $idSolicitud, ['estado' => $actual], ['estado' => $estado]);
            $this->conexion->commit();
            return ['id_solicitud' => $idSolicitud, 'estado' => $estado];
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
    }

    private function obtenerOCrearEspacio(string $tipo, string $nombre): int
    {
        $consulta = $this->conexion->prepare("SELECT id_espacio FROM espacios WHERE tipo = :tipo AND nombre = :nombre LIMIT 1");
        $consulta->execute(['tipo' => $tipo, 'nombre' => $nombre]);
        $id = $consulta->fetchColumn();
        if ($id !== false) {
            return (int) $id;
        }

        $insertar = $this->conexion->prepare(
            "INSERT INTO espacios (tipo, nombre, ubicacion, capacidad, estado)
             VALUES (:tipo, :nombre, 'UTU', 30, 'disponible')"
        );
        $insertar->execute(['tipo' => $tipo, 'nombre' => $nombre]);

        return (int) $this->conexion->lastInsertId();
    }

    private function normalizarTipoSolicitud(string $valor): ?string
    {
        $texto = $this->normalizarTexto($valor);
        if (str_contains($texto, 'software')) {
            return 'instalacion_software';
        }
        if (str_contains($texto, 'soporte')) {
            return 'soporte_clase';
        }
        if (str_contains($texto, 'reserva')) {
            return 'reserva_sala';
        }

        return null;
    }

    private function normalizarTipoSala(string $valor): ?string
    {
        $texto = $this->normalizarTexto($valor);
        if (str_contains($texto, 'taller')) {
            return 'taller';
        }
        if (str_contains($texto, 'laboratorio')) {
            return 'laboratorio';
        }
        if (str_contains($texto, 'sal')) {
            return 'salon';
        }

        return null;
    }

    private function normalizarTexto(string $valor): string
    {
        return strtolower(trim($valor));
    }

    private function normalizarFecha(string $valor): ?string
    {
        if (!preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', trim($valor), $partes)) {
            return null;
        }

        return checkdate((int) $partes[2], (int) $partes[1], (int) $partes[3])
            ? "{$partes[3]}-{$partes[2]}-{$partes[1]}"
            : null;
    }
}

/**
 * Registro de uso de sala con cabecera y detalle de equipos.
 */
final class ServicioUsoSala
{
    public function __construct(private PDO $conexion)
    {
    }

    public function registrar(array $usuario, array $datos): array
    {
        $tipoSala = $this->normalizarTipoSala((string) ($datos['tipoSala'] ?? ''));
        $sala = trim((string) ($datos['salaSolicitada'] ?? ''));
        $fecha = $this->normalizarFecha((string) ($datos['fecha'] ?? ''));
        $entrada = trim((string) ($datos['horaEntrada'] ?? ''));
        $salida = trim((string) ($datos['horaSalida'] ?? ''));
        $grupo = trim((string) ($datos['grupo'] ?? ''));
        $asignatura = trim((string) ($datos['asignatura'] ?? ''));
        $docente = trim((string) ($datos['docente'] ?? ''));
        $turno = strtolower(trim((string) ($datos['turno'] ?? '')));
        $observaciones = trim((string) ($datos['observaciones'] ?? ''));
        $equipos = is_array($datos['equipos'] ?? null) ? $datos['equipos'] : [];

        if ($tipoSala === null || $sala === '' || $fecha === null || $entrada === '' || $salida === '' || $grupo === '' || $asignatura === '' || $docente === '' || $turno === '') {
            responderError(422, 'Datos de uso de sala incompletos');
        }

        if ($salida <= $entrada) {
            responderError(422, 'La hora de salida debe ser posterior a la entrada');
        }

        if ($equipos === []) {
            responderError(422, 'Debe agregar al menos un equipo a la planilla');
        }

        $numerosEquipos = [];
        foreach ($equipos as $equipo) {
            $numero = trim((string) ($equipo['numeroEquipo'] ?? ''));
            $alumno = trim((string) ($equipo['alumno'] ?? ''));
            if ($numero === '' || $alumno === '') {
                responderError(422, 'Cada equipo debe tener un alumno asociado');
            }
            if (isset($numerosEquipos[$numero])) {
                responderError(422, 'No se puede registrar el mismo equipo mas de una vez');
            }
            $numerosEquipos[$numero] = true;
        }

        $this->conexion->beginTransaction();

        try {
            $idEspacio = $this->obtenerOCrearEspacio($tipoSala, $sala);
            $consulta = $this->conexion->prepare(
                "INSERT INTO registros_uso_sala
                   (id_solicitante, id_espacio, fecha, hora_entrada, hora_salida, grupo, taller_curso, asignatura, docente, turno, observaciones)
                 VALUES
                   (:id_solicitante, :id_espacio, :fecha, :entrada, :salida, :grupo, :taller, :asignatura, :docente, :turno, :observaciones)"
            );
            $consulta->execute([
                'id_solicitante' => $usuario['id_usuario'],
                'id_espacio' => $idEspacio,
                'fecha' => $fecha,
                'entrada' => $entrada,
                'salida' => $salida,
                'grupo' => $grupo,
                'taller' => $asignatura,
                'asignatura' => $asignatura,
                'docente' => $docente,
                'turno' => $turno,
                'observaciones' => $observaciones !== '' ? $observaciones : null,
            ]);

            $idRegistro = (int) $this->conexion->lastInsertId();
            foreach ($equipos as $equipo) {
                $this->registrarEquipo($idRegistro, $idEspacio, $equipo);
            }

            $this->conexion->commit();
        } catch (Throwable $error) {
            $this->conexion->rollBack();
            throw $error;
        }

        return ['id_registro' => $idRegistro, 'equipos' => count($equipos)];
    }

    private function registrarEquipo(int $idRegistro, int $idEspacio, array $equipo): void
    {
        $numero = trim((string) ($equipo['numeroEquipo'] ?? ''));
        if ($numero === '') {
            return;
        }

        $idEquipo = $this->obtenerOCrearEquipo($idEspacio, $numero);
        $estado = match (strtolower(trim((string) ($equipo['estado'] ?? 'libre')))) {
            'ocupado' => 'ocupado',
            'observado' => 'observado',
            'dañado', 'danado' => 'danado',
            default => 'libre',
        };

        $consulta = $this->conexion->prepare(
            "INSERT INTO registros_uso_equipos
               (id_registro, id_equipo, nombre_alumno, estado_reportado, observaciones)
             VALUES
               (:id_registro, :id_equipo, :alumno, :estado, :observaciones)"
        );
        $consulta->execute([
            'id_registro' => $idRegistro,
            'id_equipo' => $idEquipo,
            'alumno' => trim((string) ($equipo['alumno'] ?? '')) ?: null,
            'estado' => $estado,
            'observaciones' => trim((string) ($equipo['observaciones'] ?? '')) ?: null,
        ]);
    }

    private function obtenerOCrearEquipo(int $idEspacio, string $numero): int
    {
        $codigo = 'USO-' . $idEspacio . '-' . preg_replace('/\s+/', '-', strtoupper($numero));
        $consulta = $this->conexion->prepare("SELECT id_equipo FROM equipos WHERE codigo_inventario = :codigo LIMIT 1");
        $consulta->execute(['codigo' => $codigo]);
        $id = $consulta->fetchColumn();
        if ($id !== false) {
            return (int) $id;
        }

        $insertar = $this->conexion->prepare(
            "INSERT INTO equipos (id_espacio_actual, codigo_inventario, nombre, tipo, estado, ubicacion_detalle, fecha_alta)
             VALUES (:id_espacio, :codigo, :nombre, 'PC', 'disponible', :ubicacion, CURRENT_DATE)"
        );
        $insertar->execute([
            'id_espacio' => $idEspacio,
            'codigo' => $codigo,
            'nombre' => $numero,
            'ubicacion' => $numero,
        ]);

        return (int) $this->conexion->lastInsertId();
    }

    private function obtenerOCrearEspacio(string $tipo, string $nombre): int
    {
        $consulta = $this->conexion->prepare("SELECT id_espacio FROM espacios WHERE tipo = :tipo AND nombre = :nombre LIMIT 1");
        $consulta->execute(['tipo' => $tipo, 'nombre' => $nombre]);
        $id = $consulta->fetchColumn();
        if ($id !== false) {
            return (int) $id;
        }

        $insertar = $this->conexion->prepare(
            "INSERT INTO espacios (tipo, nombre, ubicacion, capacidad, estado)
             VALUES (:tipo, :nombre, 'UTU', 30, 'disponible')"
        );
        $insertar->execute(['tipo' => $tipo, 'nombre' => $nombre]);

        return (int) $this->conexion->lastInsertId();
    }

    private function normalizarTipoSala(string $valor): ?string
    {
        $texto = strtolower(trim($valor));
        if (str_contains($texto, 'taller')) {
            return 'taller';
        }
        if (str_contains($texto, 'laboratorio')) {
            return 'laboratorio';
        }
        if (str_contains($texto, 'sal')) {
            return 'salon';
        }

        return null;
    }

    private function normalizarFecha(string $valor): ?string
    {
        if (!preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', trim($valor), $partes)) {
            return null;
        }

        return checkdate((int) $partes[2], (int) $partes[1], (int) $partes[3])
            ? "{$partes[3]}-{$partes[2]}-{$partes[1]}"
            : null;
    }
}

/**
 * Blacklist: estudiantes con devolución atrasada.
 */
final class ServicioBlacklist
{
    public function __construct(private PDO $conexion)
    {
    }

    // Consulta: muestra estudiante, docente asociado y estado.
    public function listar(): array
    {
        $consulta = $this->conexion->query(
            "SELECT id_blacklist, nombre_estudiante, cedula_estudiante, grupo, docente_asociado,
                    motivo, dias_atraso, estado, fecha_ingreso, fecha_salida
             FROM blacklist_estudiantes
             ORDER BY estado ASC, fecha_ingreso DESC"
        );

        return $consulta->fetchAll();
    }
}

/**
 * Reportes operativos construidos desde los registros reales del sistema.
 */
final class ServicioReportes
{
    public function __construct(private PDO $conexion)
    {
    }

    public function listar(): array
    {
        $consulta = $this->conexion->query(
            "SELECT r.id_registro,
                    r.fecha,
                    r.hora_entrada,
                    r.hora_salida,
                    r.grupo,
                    r.taller_curso,
                    r.asignatura,
                    r.docente,
                    r.turno,
                    r.observaciones,
                    r.fecha_creacion,
                    CONCAT(u.nombre, ' ', u.apellido) AS registrado_por,
                    u.correo AS correo_registrante,
                    e.nombre AS sala,
                    e.tipo AS tipo_sala,
                    (SELECT COUNT(*)
                     FROM registros_uso_equipos rue
                     WHERE rue.id_registro = r.id_registro) AS cantidad_equipos
             FROM registros_uso_sala r
             INNER JOIN usuarios u ON u.id_usuario = r.id_solicitante
             INNER JOIN espacios e ON e.id_espacio = r.id_espacio
             ORDER BY r.fecha DESC, r.hora_entrada DESC, r.id_registro DESC"
        );

        $usos = [];
        foreach ($consulta->fetchAll() as $fila) {
            $idRegistro = (int) $fila['id_registro'];
            $fila['id_registro'] = $idRegistro;
            $fila['cantidad_equipos'] = (int) $fila['cantidad_equipos'];
            $fila['equipos'] = [];
            $usos[$idRegistro] = $fila;
        }

        if ($usos !== []) {
            $detalles = $this->conexion->query(
                "SELECT rue.id_registro,
                        eq.nombre AS numero_equipo,
                        eq.codigo_inventario,
                        rue.nombre_alumno,
                        rue.estado_reportado,
                        rue.observaciones
                 FROM registros_uso_equipos rue
                 INNER JOIN equipos eq ON eq.id_equipo = rue.id_equipo
                 ORDER BY rue.id_registro DESC, eq.nombre ASC"
            );

            foreach ($detalles->fetchAll() as $detalle) {
                $idRegistro = (int) $detalle['id_registro'];
                if (isset($usos[$idRegistro])) {
                    unset($detalle['id_registro']);
                    $usos[$idRegistro]['equipos'][] = $detalle;
                }
            }
        }

        return ['usos_sala' => array_values($usos)];
    }
}

/**
 * Dashboard: métricas resumidas para cada rol.
 */
final class ServicioDashboard
{
    public function __construct(private PDO $conexion)
    {
    }

    // Selector: elige las métricas según el rol.
    public function obtener(string $rol, int $idUsuario, array $rolesDisponibles): array
    {
        $metricas = match ($rol) {
            'administrador' => $this->administrador(),
            'tecnico' => $this->tecnico($idUsuario),
            'solicitante' => $this->solicitante($idUsuario),
            default => [],
        };

        if ($rol !== 'solicitante' && in_array('solicitante', $rolesDisponibles, true)) {
            $metricas = array_merge($metricas, $this->solicitante($idUsuario));
        }

        if (in_array($rol, ['administrador', 'tecnico'], true)) {
            $metricas['analitica'] = $this->analitica();
        }

        return $metricas;
    }

    private function analitica(): array
    {
        $equipos = $this->conexion->query(
            "SELECT e.id_equipo, e.codigo_inventario, e.nombre, COUNT(t.id_ticket) AS fallas
             FROM equipos e
             INNER JOIN tickets_incidencia t ON t.id_equipo = e.id_equipo
             GROUP BY e.id_equipo, e.codigo_inventario, e.nombre
             ORDER BY fallas DESC, e.nombre LIMIT 5"
        )->fetchAll();
        $promedio = $this->conexion->query(
            "SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, fecha_creacion, fecha_cierre)) / 60, 1)
             FROM tickets_incidencia WHERE estado = 'resuelta' AND fecha_cierre IS NOT NULL"
        )->fetchColumn();
        return [
            'periodo_dias' => 30,
            'equipos_mas_fallados' => $equipos,
            'promedio_resolucion_horas' => $promedio === null ? 0 : (float) $promedio,
            'solicitudes_periodo' => $this->contar("SELECT COUNT(*) FROM solicitudes_servicio WHERE fecha_creacion >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"),
            'usos_laboratorio_periodo' => $this->contar(
                "SELECT COUNT(*) FROM registros_uso_sala r INNER JOIN espacios e ON e.id_espacio = r.id_espacio
                 WHERE e.tipo = 'laboratorio' AND r.fecha >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"
            ),
        ];
    }

    // Admin: visión general del sistema.
    private function administrador(): array
    {
        return [
            'usuarios_activos' => $this->contar("SELECT COUNT(*) FROM usuarios WHERE estado = 'activo'"),
            'usuarios_pendientes' => $this->contar("SELECT COUNT(*) FROM usuarios WHERE estado = 'pendiente'"),
            'incidencias_abiertas' => $this->contar("SELECT COUNT(*) FROM tickets_incidencia WHERE estado IN ('pendiente', 'en_proceso')"),
            'incidencias_resueltas' => $this->contar("SELECT COUNT(*) FROM tickets_incidencia WHERE estado = 'resuelta'"),
            'prestamos_activos' => $this->contar("SELECT COUNT(*) FROM prestamos WHERE estado IN ('solicitado', 'aprobado', 'entregado', 'atrasado')"),
            'prestamos_atrasados' => $this->contar("SELECT COUNT(*) FROM prestamos WHERE estado = 'atrasado'"),
            'blacklist_activos' => $this->contar("SELECT COUNT(*) FROM blacklist_estudiantes WHERE estado = 'activo'"),
            'equipos_disponibles' => $this->contar("SELECT COUNT(*) FROM equipos WHERE estado = 'disponible'"),
            'laboratorios_disponibles' => $this->contar("SELECT COUNT(*) FROM espacios WHERE tipo = 'laboratorio' AND estado = 'disponible'"),
        ];
    }

    // Técnico: trabajo operativo pendiente.
    private function tecnico(int $idUsuario): array
    {
        return [
            'incidencias_abiertas' => $this->contar("SELECT COUNT(*) FROM tickets_incidencia WHERE estado IN ('pendiente', 'en_proceso')"),
            'incidencias_asignadas' => $this->contarPreparado("SELECT COUNT(*) FROM tickets_incidencia WHERE id_tecnico_asignado = :id AND estado = 'en_proceso'", $idUsuario),
            'prestamos_pendientes' => $this->contar("SELECT COUNT(*) FROM prestamos WHERE estado IN ('solicitado', 'aprobado', 'entregado')"),
            'equipos_revision' => $this->contar("SELECT COUNT(*) FROM equipos WHERE estado = 'en_reparacion'"),
            'solicitudes_pendientes' => $this->contar("SELECT COUNT(*) FROM solicitudes_servicio WHERE estado IN ('aprobada', 'en_proceso')"),
            'laboratorios_disponibles' => $this->contar("SELECT COUNT(*) FROM espacios WHERE tipo = 'laboratorio' AND estado = 'disponible'"),
        ];
    }

    // Solicitante: resumen de sus propios registros.
    private function solicitante(int $idUsuario): array
    {
        return [
            'mis_incidencias' => $this->contarPreparado("SELECT COUNT(*) FROM tickets_incidencia WHERE id_solicitante = :id", $idUsuario),
            'mis_incidencias_abiertas' => $this->contarPreparado("SELECT COUNT(*) FROM tickets_incidencia WHERE id_solicitante = :id AND estado IN ('pendiente', 'en_proceso')", $idUsuario),
            'mis_prestamos' => $this->contarPreparado("SELECT COUNT(*) FROM prestamos WHERE id_solicitante = :id", $idUsuario),
            'mis_prestamos_activos' => $this->contarPreparado("SELECT COUNT(*) FROM prestamos WHERE id_solicitante = :id AND estado IN ('solicitado', 'aprobado', 'entregado', 'atrasado')", $idUsuario),
            'mis_solicitudes' => $this->contarPreparado("SELECT COUNT(*) FROM solicitudes_servicio WHERE id_solicitante = :id", $idUsuario),
            'mis_solicitudes_abiertas' => $this->contarPreparado("SELECT COUNT(*) FROM solicitudes_servicio WHERE id_solicitante = :id AND estado IN ('pendiente', 'aprobada', 'en_proceso')", $idUsuario),
            'usos_sala' => $this->contarPreparado("SELECT COUNT(*) FROM registros_uso_sala WHERE id_solicitante = :id", $idUsuario),
        ];
    }

    // Cuenta simple sin parámetros.
    private function contar(string $sql): int
    {
        return (int) $this->conexion->query($sql)->fetchColumn();
    }

    // Cuenta usando consulta preparada.
    private function contarPreparado(string $sql, int $idUsuario): int
    {
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute(['id' => $idUsuario]);

        return (int) $consulta->fetchColumn();
    }
}
