<?php

declare(strict_types=1);

/*
 * CONTROLADOR DE LA API
 * Recibe la peticion HTTP, identifica el recurso y el metodo (GET/POST/PUT/DELETE),
 * verifica permisos y deriva el trabajo al servicio correspondiente del Modelo.
 * No contiene consultas SQL: esa responsabilidad queda en los servicios.
 */

require_once __DIR__ . '/../../Modelo/servidor/configuracion.php';
require_once __DIR__ . '/../../Modelo/servidor/base_datos.php';
require_once __DIR__ . '/comun/sesion_y_csrf.php';
require_once __DIR__ . '/comun/respuestas.php';
require_once __DIR__ . '/comun/solicitud.php';
require_once __DIR__ . '/comun/permisos.php';
require_once __DIR__ . '/comun/ruta.php';
require_once __DIR__ . '/../../Modelo/servidor/servicios_operativos.php';
require_once __DIR__ . '/../../Modelo/servidor/servicios_dominio.php';
require_once __DIR__ . '/rutas/estado.php';
require_once __DIR__ . '/rutas/autenticacion.php';
require_once __DIR__ . '/rutas/usuarios.php';
require_once __DIR__ . '/rutas/incidencias.php';
require_once __DIR__ . '/rutas/prestamos.php';
require_once __DIR__ . '/rutas/solicitudes.php';
require_once __DIR__ . '/rutas/uso_sala.php';
require_once __DIR__ . '/rutas/blacklist.php';
require_once __DIR__ . '/rutas/reportes.php';
require_once __DIR__ . '/rutas/inventario.php';
require_once __DIR__ . '/rutas/espacios.php';
require_once __DIR__ . '/rutas/categorias_incidencia.php';
require_once __DIR__ . '/rutas/historial.php';
require_once __DIR__ . '/rutas/conocimiento.php';
require_once __DIR__ . '/rutas/tareas.php';
require_once __DIR__ . '/rutas/dashboard.php';

iniciarApi();

$metodo = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$segmentos = obtenerSegmentosRuta();
$recurso = $segmentos[0] ?? '';
$conexion = null;

try {
    // Único control para todas las rutas que pueden modificar estado.
    // /health no modifica datos y conserva su respuesta 405 para otros métodos.
    if ($recurso !== 'health') {
        exigirCsrf();
    }

    switch ($recurso) {
        case 'health':
            atenderRutaEstado($metodo, $segmentos);

        case 'auth':
            atenderRutaAutenticacion($metodo, $segmentos);

        case 'usuarios':
            atenderRutaUsuarios($metodo, $segmentos);

        case 'incidencias':
            atenderRutaIncidencias($metodo, $segmentos);

        case 'prestamos':
            atenderRutaPrestamos($metodo, $segmentos);

        case 'solicitudes':
            atenderRutaSolicitudes($metodo, $segmentos);

        case 'uso-sala':
            atenderRutaUsoSala($metodo, $segmentos);

        case 'blacklist':
            atenderRutaBlacklist($metodo, $segmentos);

        case 'reportes':
            atenderRutaReportes($metodo, $segmentos);

        case 'inventario':
            atenderRutaInventario($metodo, $segmentos);

        case 'espacios':
            atenderRutaEspacios($metodo, $segmentos);

        case 'categorias-incidencia':
            atenderRutaCategoriasIncidencia($metodo, $segmentos);

        case 'historial':
            atenderRutaHistorial($metodo, $segmentos);

        case 'conocimiento':
            atenderRutaConocimiento($metodo, $segmentos);

        case 'tareas':
            atenderRutaTareas($metodo, $segmentos);

        case 'dashboard':
            atenderRutaDashboard($metodo, $segmentos);

        default:
            responderError(404, 'Endpoint no encontrado');
    }
} catch (Throwable $error) {
    error_log('Error no controlado en API: ' . $error->getMessage());
    responderError(500, 'Error interno del servidor');
}
