<?php

declare(strict_types=1);

/** Reglas del módulo autenticacion. */
final class ServicioAutenticacion
{
    /**
     * Guarda la conexión a la base de datos que usará este servicio.
     * Entradas: $conexion. Salida: sin valor.
     */
    public function __construct(private PDO $conexion)
    {
    }

    // Login: valida credenciales y guarda usuario/rol en la sesión.
    /**
     * Verifica las credenciales y abre una sesión segura para el usuario.
     * Entradas: $datos. Salida: array.
     */
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

        // Evita fijacion de sesion: se entrega un ID nuevo luego del login correcto.
        session_regenerate_id(true);
        unset($_SESSION['csrf_token']);
        $_SESSION['id_usuario'] = (int) $usuario['id_usuario'];
        $_SESSION['correo'] = (string) $usuario['correo'];
        $_SESSION['nombre'] = trim($usuario['nombre'] . ' ' . $usuario['apellido']);
        $_SESSION['ultima_actividad'] = time();
        $_SESSION['huella_credenciales'] = hash('sha256', (string) $usuario['hash_contrasena']);
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

    /**
     * Comprueba la sesión actual y devuelve sus datos vigentes.
     * Entradas: ninguna. Salida: array.
     */
    public function refrescarSesion(): array
    {
        return exigirAutenticacion();
    }

    /**
     * Activa uno de los perfiles aprobados del usuario.
     * Entradas: $datos. Salida: array.
     */
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

    // Logout y expiración usan la misma limpieza de sesión y cookie.
    /**
     * Destruye la sesión y elimina su cookie.
     * Entradas: ninguna. Salida: void.
     */
    public function cerrarSesion(): void
    {
        cerrarSesionActual();
    }

    /**
     * Cuenta un acceso fallido para aplicar el bloqueo previsto.
     * Entradas: $usuario. Salida: void.
     */
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

    /**
     * Limpia los fallos de acceso tras una autenticación correcta.
     * Entradas: $idUsuario. Salida: void.
     */
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
