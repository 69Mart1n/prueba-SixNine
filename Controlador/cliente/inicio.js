/* Punto de entrada: conecta los módulos de cada pantalla. */
import { iniciarPreferencias } from "../../Vista/preferencias.js?v=12";
import { Modelo } from "../../Modelo/modelo.js?v=10";
import { protegerPagina, iniciarNavegacion } from "./comun.js";
import { iniciarLogin, iniciarRecuperacionContrasena, iniciarRestablecimientoContrasena, iniciarEstadoCuenta } from "./autenticacion.js";
import { iniciarFormularios, cargarCatalogosFormularios } from "./formularios.js";
import { cargarUsuarios, iniciarAccionesUsuarios } from "./usuarios.js";
import { cargarIncidencias, iniciarAccionesIncidencias } from "./incidencias.js";
import { cargarPrestamos, iniciarAccionesPrestamos } from "./prestamos.js";
import { cargarSolicitudes, iniciarAccionesSolicitudes } from "./solicitudes.js";
import { cargarBlacklist, cargarReportes, iniciarAccionesReportes, cargarDashboard } from "./reportes.js";
import { cargarInventario, iniciarAccionesInventario } from "./inventario.js";
import { cargarHistorial, cargarConocimiento, cargarCategoriasGestion, iniciarAccionesCategorias, cargarEspaciosGestion, iniciarAccionesEspacios } from "./catalogos.js";
import { cargarTareas, iniciarAccionesTareas } from "./tareas.js";

/** Inicia preferencias, sesión y módulos presentes en la página. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
async function iniciar() {
  iniciarPreferencias();
  // Completa automáticamente los campos ocultos; las llamadas fetch esperan el mismo token.
  void Modelo.prepararCsrf().catch(() => null);
  iniciarLogin();
  iniciarRecuperacionContrasena();
  await iniciarRestablecimientoContrasena();
  if (document.body.dataset.accountStatus === "true") {
    await iniciarEstadoCuenta();
    return;
  }
  const protegida = await protegerPagina();
  if (!protegida) return;

  iniciarNavegacion();
  await cargarCatalogosFormularios();
  iniciarFormularios();
  await cargarDashboard();
  await cargarUsuarios();
  iniciarAccionesUsuarios();
  await cargarIncidencias();
  iniciarAccionesIncidencias();
  await cargarPrestamos();
  iniciarAccionesPrestamos();
  await cargarSolicitudes();
  iniciarAccionesSolicitudes();
  await cargarBlacklist();
  await cargarReportes();
  iniciarAccionesReportes();
  await cargarInventario();
  iniciarAccionesInventario();
  await cargarHistorial();
  $("btnFiltrarHistorial")?.addEventListener("click", cargarHistorial);
  await cargarConocimiento();
  $("buscarConocimiento")?.addEventListener("input", cargarConocimiento);
  $("filtroCategoriaConocimiento")?.addEventListener(
    "change",
    cargarConocimiento,
  );
  await cargarCategoriasGestion();
  iniciarAccionesCategorias();
  iniciarAccionesEspacios();
  await cargarEspaciosGestion();
  await cargarTareas();
  iniciarAccionesTareas();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar);
} else {
  iniciar();
}
