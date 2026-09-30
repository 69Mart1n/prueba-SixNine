<?php

declare(strict_types=1);

/** Reglas del módulo incidencias. */
final class ServicioIncidencias
{
    private const TRANSICIONES = [
        'pendiente' => ['en_proceso', 'cancelada'],
        'en_proceso' => ['resuelta', 'cancelada'],
        'resuelta' => [],
        'cancelada' => [],
    ];

    /**
     * Guarda la conexión a la base de datos que usará este servicio.
     * Entradas: $conexion. Salida: sin valor.
     */
    public function __construct(private PDO $conexion)
    {
    }

    // Listado: admin/técnico ven todo; solicitante ve solo sus tickets.
    /**
     * Consulta los registros visibles de este módulo.
     * Entradas: $usuario, $soloPropias. Salida: array.
     */
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
                  t.id_tecnico_asignado,
                  c.nombre AS categoria,
                  e.codigo_inventario,
                  e.nombre AS equipo,
                  ep.nombre AS espacio,
                  CONCAT(u.nombre, ' ', u.apellido) AS solicitante,
                  CONCAT(ut.nombre, ' ', ut.apellido) AS tecnico_principal,
                  ic.id_usuario AS id_colaborador,
                  CONCAT(uc.nombre, ' ', uc.apellido) AS colaborador,
                  CASE WHEN t.id_tecnico_asignado = :id_actual_principal THEN 1 ELSE 0 END AS es_responsable_principal,
                  CASE WHEN t.id_tecnico_asignado = :id_actual_participante OR ic.id_usuario = :id_actual_colaborador THEN 1 ELSE 0 END AS es_participante,
                  CASE WHEN t.id_tecnico_asignado IS NULL THEN 0 WHEN ic.id_usuario IS NULL THEN 1 ELSE 2 END AS cantidad_responsables,
                  r.diagnostico,
                  r.solucion_aplicada,
                  seg.nota AS nota_seguimiento,
                  seg.fecha_creacion AS fecha_seguimiento,
                  CONCAT(us.nombre, ' ', us.apellido) AS tecnico_seguimiento,
                  CASE WHEN r.foto_nombre_interno IS NULL THEN 0 ELSE 1 END AS tiene_foto_resolucion
                FROM tickets_incidencia t
                INNER JOIN usuarios u ON u.id_usuario = t.id_solicitante
                LEFT JOIN equipos e ON e.id_equipo = t.id_equipo
                LEFT JOIN espacios ep ON ep.id_espacio = t.id_espacio
                LEFT JOIN categorias_incidencia c ON c.id_categoria = t.id_categoria
                LEFT JOIN usuarios ut ON ut.id_usuario = t.id_tecnico_asignado
                LEFT JOIN incidencias_colaboradores ic ON ic.id_ticket = t.id_ticket
                LEFT JOIN usuarios uc ON uc.id_usuario = ic.id_usuario
                LEFT JOIN resoluciones_incidencia r ON r.id_ticket = t.id_ticket
                LEFT JOIN seguimientos_incidencia seg ON seg.id_seguimiento = (
                    SELECT s2.id_seguimiento
                    FROM seguimientos_incidencia s2
                    WHERE s2.id_ticket = t.id_ticket
                    ORDER BY s2.fecha_creacion DESC, s2.id_seguimiento DESC
                    LIMIT 1
                )
                LEFT JOIN usuarios us ON us.id_usuario = seg.id_tecnico";

        $parametros = [
            'id_actual_principal' => $usuario['id_usuario'],
            'id_actual_participante' => $usuario['id_usuario'],
            'id_actual_colaborador' => $usuario['id_usuario'],
        ];

        if ($soloPropias || $usuario['rol'] === 'solicitante') {
            $sql .= " WHERE t.id_solicitante = :id_usuario";
            $parametros['id_usuario'] = $usuario['id_usuario'];
        }

        $sql .= " ORDER BY t.fecha_creacion DESC";

        $consulta = $this->conexion->prepare($sql);
        $consulta->execute($parametros);

        return $consulta->fetchAll();
    }

    /**
     * Valida los datos y crea un registro de este módulo.
     * Entradas: $usuario, $datos. Salida: array.
     */
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

    /**
     * Comprueba permisos y aplica una transición de estado permitida.
     * Entradas: $idTicket, $usuario, $estado, $prioridad, $notaSeguimiento. Salida: array.
     */
    public function cambiarEstado(
        int $idTicket,
        array $usuario,
        string $estado,
        ?string $prioridad = null,
        ?string $notaSeguimiento = null
    ): array
    {
        $estados = ['pendiente', 'en_proceso', 'resuelta', 'cancelada'];
        $prioridades = ['sin_asignar', 'baja', 'media', 'alta'];

        if (!in_array($estado, $estados, true)) {
            responderError(422, 'Estado de incidencia no válido');
        }

        if ($prioridad !== null && !in_array($prioridad, $prioridades, true)) {
            responderError(422, 'Prioridad de incidencia no válida');
        }

        // La nota es opcional para aceptar/cancelar rápidamente, pero cuando llega
        // desde el formulario se guarda como historial de trabajo del ticket.
        $notaSeguimiento = $notaSeguimiento === null ? null : trim($notaSeguimiento);
        if ($notaSeguimiento !== null && strlen($notaSeguimiento) > 2000) {
            responderError(422, 'La nota de seguimiento no puede superar los 2000 caracteres');
        }

        $this->conexion->beginTransaction();
        try {
            $consulta = $this->conexion->prepare(
                "SELECT t.estado, t.prioridad, t.id_tecnico_asignado, ic.id_usuario AS id_colaborador
                 FROM tickets_incidencia t
                 LEFT JOIN incidencias_colaboradores ic ON ic.id_ticket = t.id_ticket
                 WHERE t.id_ticket = :id
                 FOR UPDATE"
            );
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
            if ((string) $anterior['estado'] === 'en_proceso'
                && (int) $anterior['id_tecnico_asignado'] !== (int) $usuario['id_usuario']
                && (int) ($anterior['id_colaborador'] ?? 0) !== (int) $usuario['id_usuario']) {
                responderError(403, 'Debe unirse al equipo del ticket antes de modificarlo');
            }
            $actualizar = $this->conexion->prepare(
                "UPDATE tickets_incidencia SET estado = :estado,
                   prioridad = COALESCE(:prioridad, prioridad),
                   id_tecnico_asignado = CASE WHEN :estado_asignado = 'en_proceso' THEN COALESCE(id_tecnico_asignado, :tecnico) ELSE id_tecnico_asignado END,
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

            // Cada avance queda registrado. Así otro técnico (o el mismo más tarde)
            // puede saber qué se revisó y qué falta hacer sin depender de memoria.
            if ($notaSeguimiento !== null && $notaSeguimiento !== '') {
                $seguimiento = $this->conexion->prepare(
                    "INSERT INTO seguimientos_incidencia (id_ticket, id_tecnico, nota)
                     VALUES (:id_ticket, :id_tecnico, :nota)"
                );
                $seguimiento->execute([
                    'id_ticket' => $idTicket,
                    'id_tecnico' => $usuario['id_usuario'],
                    'nota' => $notaSeguimiento,
                ]);
            }

            (new ServicioAuditoria($this->conexion))->registrar(
                (int) $usuario['id_usuario'],
                'incidencias',
                'cambiar_estado',
                'incidencia',
                $idTicket,
                $anterior,
                ['estado' => $estado, 'prioridad' => $prioridad, 'nota_seguimiento' => $notaSeguimiento]
            );
            $this->conexion->commit();
            return [
                'id_ticket' => $idTicket,
                'estado' => $estado,
                'prioridad' => $prioridad,
                'nota_seguimiento' => $notaSeguimiento,
            ];
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
    }

    // Resolución: guarda el diagnóstico registrado por admin/técnico.
    /**
     * Guarda diagnóstico, solución y evidencia de una incidencia.
     * Entradas: $idTicket, $usuario, $datos, $foto. Salida: array.
     */
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
            $bloqueo = $this->conexion->prepare(
                "SELECT t.estado, t.prioridad, t.id_tecnico_asignado, ic.id_usuario AS id_colaborador
                 FROM tickets_incidencia t
                 LEFT JOIN incidencias_colaboradores ic ON ic.id_ticket = t.id_ticket
                 WHERE t.id_ticket = :id
                 FOR UPDATE"
            );
            $bloqueo->execute(['id' => $idTicket]);
            $anterior = $bloqueo->fetch();
            if (!$anterior) {
                responderError(404, 'Incidencia no encontrada');
            }
            if ((string) $anterior['estado'] !== 'en_proceso') {
                responderError(409, 'Solo una incidencia en proceso puede resolverse');
            }
            if ((int) $anterior['id_tecnico_asignado'] !== (int) $usuario['id_usuario']
                && (int) ($anterior['id_colaborador'] ?? 0) !== (int) $usuario['id_usuario']) {
                responderError(403, 'Debe unirse al equipo del ticket antes de resolverlo');
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
                   id_tecnico_asignado = COALESCE(id_tecnico_asignado, :tecnico), fecha_cierre = CURRENT_TIMESTAMP
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

    /** Genera un código de un solo uso para incorporar a un segundo responsable. */
    public function generarCodigoColaboracion(int $idTicket, array $usuario): array
    {
        $this->conexion->beginTransaction();

        try {
            $consulta = $this->conexion->prepare(
                "SELECT t.estado, t.id_tecnico_asignado, ic.id_usuario AS id_colaborador
                 FROM tickets_incidencia t
                 LEFT JOIN incidencias_colaboradores ic ON ic.id_ticket = t.id_ticket
                 WHERE t.id_ticket = :id
                 FOR UPDATE"
            );
            $consulta->execute(['id' => $idTicket]);
            $ticket = $consulta->fetch();

            if (!$ticket) {
                $this->abortarTransaccion(404, 'Incidencia no encontrada');
            }
            if ((string) $ticket['estado'] !== 'en_proceso') {
                $this->abortarTransaccion(409, 'El código solo puede generarse para una incidencia en proceso');
            }
            if ((int) $ticket['id_tecnico_asignado'] !== (int) $usuario['id_usuario']) {
                $this->abortarTransaccion(403, 'Solo el responsable principal puede generar el código');
            }
            if ($ticket['id_colaborador'] !== null) {
                $this->abortarTransaccion(409, 'El ticket ya tiene dos responsables');
            }

            $this->conexion->prepare(
                "UPDATE codigos_colaboracion_incidencia
                 SET fecha_uso = CURRENT_TIMESTAMP
                 WHERE id_ticket = :id AND fecha_uso IS NULL"
            )->execute(['id' => $idTicket]);

            $codigo = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $hash = password_hash($codigo, PASSWORD_DEFAULT);
            if ($hash === false) {
                throw new RuntimeException('No fue posible proteger el código de colaboración');
            }

            $insertar = $this->conexion->prepare(
                "INSERT INTO codigos_colaboracion_incidencia
                   (id_ticket, id_generador, hash_codigo, fecha_expiracion)
                 VALUES (:id_ticket, :id_generador, :hash_codigo, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE))"
            );
            $insertar->execute([
                'id_ticket' => $idTicket,
                'id_generador' => $usuario['id_usuario'],
                'hash_codigo' => $hash,
            ]);
            $idCodigo = (int) $this->conexion->lastInsertId();
            $expiracion = $this->conexion->prepare(
                "SELECT fecha_expiracion FROM codigos_colaboracion_incidencia WHERE id_codigo = :id"
            );
            $expiracion->execute(['id' => $idCodigo]);
            $fechaExpiracion = (string) $expiracion->fetchColumn();

            (new ServicioAuditoria($this->conexion))->registrar(
                (int) $usuario['id_usuario'],
                'incidencias',
                'generar_codigo_colaboracion',
                'incidencia',
                $idTicket,
                null,
                ['fecha_expiracion' => $fechaExpiracion]
            );
            $this->conexion->commit();

            return [
                'id_ticket' => $idTicket,
                'codigo' => $codigo,
                'fecha_expiracion' => $fechaExpiracion,
                'duracion_minutos' => 10,
            ];
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            throw $error;
        }
    }

    /** Valida el código temporal e incorpora al segundo responsable del ticket. */
    public function unirseConCodigo(int $idTicket, array $usuario, string $codigo): array
    {
        $codigo = trim($codigo);
        if (!preg_match('/^\d{6}$/', $codigo)) {
            responderError(422, 'El código debe contener exactamente 6 dígitos');
        }

        $this->conexion->beginTransaction();

        try {
            $consulta = $this->conexion->prepare(
                "SELECT t.estado, t.id_tecnico_asignado, ic.id_usuario AS id_colaborador
                 FROM tickets_incidencia t
                 LEFT JOIN incidencias_colaboradores ic ON ic.id_ticket = t.id_ticket
                 WHERE t.id_ticket = :id
                 FOR UPDATE"
            );
            $consulta->execute(['id' => $idTicket]);
            $ticket = $consulta->fetch();

            if (!$ticket) {
                $this->abortarTransaccion(404, 'Incidencia no encontrada');
            }
            if ((string) $ticket['estado'] !== 'en_proceso') {
                $this->abortarTransaccion(409, 'Solo puede unirse a una incidencia en proceso');
            }
            if ((int) $ticket['id_tecnico_asignado'] === (int) $usuario['id_usuario']) {
                $this->abortarTransaccion(409, 'Usted ya es el responsable principal del ticket');
            }
            if ($ticket['id_colaborador'] !== null) {
                if ((int) $ticket['id_colaborador'] === (int) $usuario['id_usuario']) {
                    $this->conexion->commit();
                    return ['id_ticket' => $idTicket, 'unido' => true, 'ya_participaba' => true];
                }
                $this->abortarTransaccion(409, 'El ticket ya tiene dos responsables');
            }

            $buscarCodigo = $this->conexion->prepare(
                "SELECT id_codigo, hash_codigo, intentos_fallidos,
                        CASE WHEN fecha_expiracion < CURRENT_TIMESTAMP THEN 1 ELSE 0 END AS vencido
                 FROM codigos_colaboracion_incidencia
                 WHERE id_ticket = :id AND fecha_uso IS NULL
                 ORDER BY id_codigo DESC
                 LIMIT 1
                 FOR UPDATE"
            );
            $buscarCodigo->execute(['id' => $idTicket]);
            $registroCodigo = $buscarCodigo->fetch();

            if (!$registroCodigo || (int) $registroCodigo['vencido'] === 1 || (int) $registroCodigo['intentos_fallidos'] >= 5) {
                if ($registroCodigo) {
                    $this->conexion->prepare(
                        "UPDATE codigos_colaboracion_incidencia SET fecha_uso = CURRENT_TIMESTAMP WHERE id_codigo = :id"
                    )->execute(['id' => $registroCodigo['id_codigo']]);
                    $this->conexion->commit();
                } else {
                    $this->conexion->rollBack();
                }
                responderError(422, 'Código inválido o vencido');
            }

            if (!password_verify($codigo, (string) $registroCodigo['hash_codigo'])) {
                $intentos = (int) $registroCodigo['intentos_fallidos'] + 1;
                $actualizarIntentos = $this->conexion->prepare(
                    "UPDATE codigos_colaboracion_incidencia
                     SET intentos_fallidos = :intentos,
                         fecha_uso = CASE WHEN :bloqueado = 1 THEN CURRENT_TIMESTAMP ELSE fecha_uso END
                     WHERE id_codigo = :id"
                );
                $actualizarIntentos->execute([
                    'intentos' => $intentos,
                    'bloqueado' => $intentos >= 5 ? 1 : 0,
                    'id' => $registroCodigo['id_codigo'],
                ]);
                $this->conexion->commit();
                responderError(422, 'Código inválido o vencido');
            }

            $insertar = $this->conexion->prepare(
                "INSERT INTO incidencias_colaboradores (id_ticket, id_usuario) VALUES (:id_ticket, :id_usuario)"
            );
            $insertar->execute(['id_ticket' => $idTicket, 'id_usuario' => $usuario['id_usuario']]);
            $this->conexion->prepare(
                "UPDATE codigos_colaboracion_incidencia
                 SET fecha_uso = CURRENT_TIMESTAMP, id_usuario_uso = :id_usuario
                 WHERE id_codigo = :id_codigo"
            )->execute(['id_usuario' => $usuario['id_usuario'], 'id_codigo' => $registroCodigo['id_codigo']]);

            (new ServicioAuditoria($this->conexion))->registrar(
                (int) $usuario['id_usuario'],
                'incidencias',
                'unirse_colaboracion',
                'incidencia',
                $idTicket,
                null,
                ['id_colaborador' => (int) $usuario['id_usuario']]
            );
            $this->conexion->commit();

            return ['id_ticket' => $idTicket, 'unido' => true, 'ya_participaba' => false];
        } catch (Throwable $error) {
            if ($this->conexion->inTransaction()) {
                $this->conexion->rollBack();
            }
            if ($error instanceof PDOException && (string) $error->getCode() === '23000') {
                responderError(409, 'El ticket ya tiene dos responsables');
            }
            throw $error;
        }
    }

    /**
     * Cancela la transacción y devuelve un error controlado.
     * Entradas: $codigo, $mensaje. Salida: never.
     */
    private function abortarTransaccion(int $codigo, string $mensaje): never
    {
        if ($this->conexion->inTransaction()) {
            $this->conexion->rollBack();
        }
        responderError($codigo, $mensaje);
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
