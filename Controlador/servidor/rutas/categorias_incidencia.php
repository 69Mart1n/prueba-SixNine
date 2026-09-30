<?php

declare(strict_types=1);

/** Atiende las peticiones de categorias-incidencia y devuelve una respuesta JSON. */
function atenderRutaCategoriasIncidencia(string $metodo, array $segmentos): never
{
    $usuario = exigirPerfilActivo();
    $conexion = conectarBaseDatos();
    $servicio = new ServicioCategoriasIncidencia($conexion);
    if ($metodo === 'GET') {
        $incluirInactivas = usuarioTieneAlgunRol($usuario, ['administrador', 'tecnico']) && ($_GET['all'] ?? '') === '1';
        responder(200, 'success', 'Categorías obtenidas', $servicio->listar($incluirInactivas));
    }
    exigirRol(['administrador', 'tecnico']);
    if ($metodo === 'POST' && count($segmentos) === 1) {
        responder(201, 'success', 'Categoría registrada', $servicio->crear($usuario, leerDatosSolicitud()));
    }
    $idCategoria = obtenerEnteroRuta($segmentos, 1, 'id_categoria');
    if ($metodo === 'PUT') {
        responder(200, 'success', 'Categoría actualizada', $servicio->actualizar($idCategoria, $usuario, leerDatosSolicitud()));
    }
    if ($metodo === 'DELETE') {
        responder(200, 'success', 'Categoría desactivada', $servicio->desactivar($idCategoria, $usuario));
    }
    responderMetodoNoPermitido(['GET', 'POST', 'PUT', 'DELETE']);
}
