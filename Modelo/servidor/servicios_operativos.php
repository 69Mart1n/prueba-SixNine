<?php

declare(strict_types=1);

// Carga los servicios del dominio; cada clase está en su archivo.
require_once __DIR__ . '/servicios/operativos/auditoria.php';
require_once __DIR__ . '/servicios/operativos/equipo_prestable.php';
require_once __DIR__ . '/servicios/operativos/inventario.php';
require_once __DIR__ . '/servicios/operativos/espacios.php';
require_once __DIR__ . '/servicios/operativos/categorias_incidencia.php';
require_once __DIR__ . '/servicios/operativos/conocimiento.php';
require_once __DIR__ . '/servicios/operativos/tareas.php';
require_once __DIR__ . '/servicios/operativos/correo.php';
require_once __DIR__ . '/servicios/operativos/estado_api.php';
