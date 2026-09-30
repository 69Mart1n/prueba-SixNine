<?php

declare(strict_types=1);

/** Reglas del módulo usuarios. */
final class ServicioUsuarios
{
    /**
     * Guarda la conexión a la base de datos que usará este servicio.
     * Entradas: $conexion. Salida: sin valor.
     */
    public function __construct(private PDO $conexion)
    {
    }

    /**
     * Valida y guarda un nuevo registro.
     * Entradas: $datos. Salida: array.
     */
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

    /**
     * Consulta los registros visibles de este módulo.
     * Entradas: ninguna. Salida: array.
     */
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

    /**
     * Comprueba permisos y aplica una transición de estado permitida.
     * Entradas: $idUsuario, $accion, $idAdministrador. Salida: array.
     */
    public function cambiarEstado(int $idUsuario, string $accion, ?int $idAdministrador = null): array
    {
        if ($accion === 'dar_baja' && $idAdministrador !== null && $idUsuario === $idAdministrador) {
            responderError(409, 'Un administrador no puede darse de baja a si mismo');
        }

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

    /**
     * Registra una solicitud para obtener otro perfil.
     * Entradas: $usuario, $datos. Salida: array.
     */
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

    /**
     * Aprueba o rechaza un rol solicitado por un usuario.
     * Entradas: $idUsuario, $rol, $accion, $idAdministrador. Salida: array.
     */
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

    /**
     * Busca la clave numérica del rol indicado.
     * Entradas: $rol. Salida: int.
     */
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

    /**
     * Impide registrar una cédula o correo ya existente.
     * Entradas: $cedula, $correo. Salida: void.
     */
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

    /**
     * Crea o actualiza la relación entre usuario y rol.
     * Entradas: $idUsuario, $idRol, $estado. Salida: void.
     */
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

    /**
     * Aprueba los roles pendientes al habilitar la cuenta.
     * Entradas: $idUsuario. Salida: void.
     */
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

    /**
     * Rechaza los roles que seguían pendientes.
     * Entradas: $idUsuario. Salida: void.
     */
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

    /**
     * Habilita la cuenta cuando dispone de un rol activo.
     * Entradas: $idUsuario. Salida: void.
     */
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

    /**
     * Crea la fila de perfil que corresponde al rol aprobado.
     * Entradas: $idUsuario, $rol. Salida: void.
     */
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

    /**
     * Asegura que exista el perfil de solicitante.
     * Entradas: $idUsuario. Salida: void.
     */
    private function crearPerfilSolicitante(int $idUsuario): void
    {
        $consulta = $this->conexion->prepare("INSERT IGNORE INTO solicitantes (id_usuario, sector) VALUES (:id, 'Docencia')");
        $consulta->execute(['id' => $idUsuario]);
    }
}

/**
 * Incidencias: listado, clasificación y resolución.
 */
