<?php

declare(strict_types=1);

// Carga los servicios del dominio; cada clase está en su archivo.
require_once __DIR__ . '/servicios/dominio/autenticacion.php';
require_once __DIR__ . '/servicios/dominio/usuarios.php';
require_once __DIR__ . '/servicios/dominio/incidencias.php';
require_once __DIR__ . '/servicios/dominio/prestamos.php';
require_once __DIR__ . '/servicios/dominio/solicitudes.php';
require_once __DIR__ . '/servicios/dominio/uso_sala.php';
require_once __DIR__ . '/servicios/dominio/blacklist.php';
require_once __DIR__ . '/servicios/dominio/reportes.php';
require_once __DIR__ . '/servicios/dominio/dashboard.php';
