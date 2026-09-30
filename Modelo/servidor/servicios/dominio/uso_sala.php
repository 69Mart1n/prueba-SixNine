<?php

declare(strict_types=1);

/** Reglas del módulo uso_sala. */
final class ServicioUsoSala
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
     * Entradas: $usuario, $datos. Salida: array.
     */
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

        if ($tipoSala !== 'salon' && $equipos === []) {
            responderError(422, 'Debe agregar al menos un equipo a la planilla');
        }
        if ($tipoSala === 'salon' && $equipos !== []) {
            responderError(422, 'Los salones comunes no tienen PC de alumnos');
        }

        $numerosEquipos = [];
        foreach ($equipos as $equipo) {
            $numero = trim((string) ($equipo['numeroEquipo'] ?? ''));
            $alumno = trim((string) ($equipo['alumno'] ?? ''));
            if (!preg_match('/^Equipo (?:[1-9]|1[0-6])$/', $numero) || $alumno === '') {
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

    /**
     * Guarda el detalle de un equipo usado en una sala.
     * Entradas: $idRegistro, $idEspacio, $equipo. Salida: void.
     */
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

    /**
     * Busca el equipo o lo registra si aún no existe.
     * Entradas: $idEspacio, $numero. Salida: int.
     */
    private function obtenerOCrearEquipo(int $idEspacio, string $numero): int
    {
        $puesto = 'Puesto ' . str_pad(substr($numero, 7), 2, '0', STR_PAD_LEFT);
        $consulta = $this->conexion->prepare(
            "SELECT id_equipo FROM equipos
             WHERE id_espacio_actual = :id_espacio AND tipo = 'PC'
               AND ubicacion_detalle = :puesto AND estado <> 'baja' LIMIT 1"
        );
        $consulta->execute(['id_espacio' => $idEspacio, 'puesto' => $puesto]);
        $id = $consulta->fetchColumn();
        if ($id !== false) {
            return (int) $id;
        }
        responderError(422, 'El puesto seleccionado no está registrado en el inventario');
    }

    /**
     * Busca el espacio o lo registra si aún no existe.
     * Entradas: $tipo, $nombre. Salida: int.
     */
    private function obtenerOCrearEspacio(string $tipo, string $nombre): int
    {
        $consulta = $this->conexion->prepare("SELECT id_espacio FROM espacios WHERE tipo = :tipo AND nombre = :nombre AND estado <> 'inactivo' LIMIT 1");
        $consulta->execute(['tipo' => $tipo, 'nombre' => $nombre]);
        $id = $consulta->fetchColumn();
        if ($id !== false) {
            return (int) $id;
        }

        responderError(422, 'La sala seleccionada no está registrada');
    }

    /**
     * Convierte el tipo de sala a una opción admitida.
     * Entradas: $valor. Salida: ?string.
     */
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

    /**
     * Convierte y valida la fecha recibida al formato de la base.
     * Entradas: $valor. Salida: ?string.
     */
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
