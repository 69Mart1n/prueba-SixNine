import { Modelo } from "../../Modelo/modelo.js?v=10";
import { Vista } from "../../Vista/vista.js?v=24";
import { traducir } from "../../Vista/preferencias.js?v=12";


/*
 * CONTROLADOR DEL FRONTEND
 * Escucha formularios y botones, valida acciones, llama al Modelo y solicita
 * a la Vista que vuelva a dibujar los datos. Aqui vive el flujo de la interfaz.
 */


export const datosPantalla = {
  usuario: null,
  incidencias: [],
  usuarios: [],
  solicitudes: [],
  reportesUso: [],
  inventario: [],
  categorias: [],
  espacios: [],
  tareas: [],
};

/** Busca un elemento de la página por su identificador. Entradas: id. Salida: elemento o null. */
export function obtenerElemento(id) {
  return document.getElementById(id);
}
/** Convierte los campos de un formulario en un objeto. Entradas: formulario. Salida: objeto de datos. */
export function datosFormulario(formulario) {
  return Object.fromEntries(new FormData(formulario).entries());
}
/** Lee y limpia los valores de varios campos. Entradas: ids. Salida: resultado de la acción o pantalla actualizada. */
export function leerPorIds(ids) {
  return Object.fromEntries(ids.map((id) => [id, obtenerElemento(id)?.value?.trim() || ""]));
}
/** Construye una pregunta de confirmación localizada sin traducir datos del usuario. */
export function mensajeConfirmacion(accionLocalizada) {
  return traducir("¿Está seguro de que desea {accion}?").replace(
    "{accion}",
    accionLocalizada,
  );
}
/** Ejecuta una tarea y muestra un mensaje si falla. Entradas: tarea, mensajeOk, null. Salida: promesa con resultado o null. */
export async function ejecutar(tarea, mensajeOk = null) {
  try {
    const resultado = await tarea();
    if (mensajeOk) Vista.mostrarMensaje(mensajeOk, "success");
    return resultado;
  } catch (error) {
    Vista.mostrarMensaje(
      error.message || "No se pudo completar la operacion",
      "danger",
    );
    return null;
  }
}
/** Lee los roles permitidos indicados en la página. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function rolesPagina() {
  return (document.body.dataset.roles || "").split(" ").filter(Boolean);
}
/** Determina el perfil con que se dibujarán los datos. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function rolDeVista() {
  if (document.body.dataset.scope === "mine") return "solicitante";
  const roles = datosPantalla.usuario?.roles_disponibles || [datosPantalla.usuario?.rol];
  return roles.join(" ");
}
/** Guarda datos básicos de la sesión para la navegación. Entradas: sesion. Salida: resultado de la acción o pantalla actualizada. */
export function guardarSesion(sesion) {
  sessionStorage.setItem("rolSGRSI", sesion.rol || "");
  sessionStorage.setItem(
    "rolesSGRSI",
    JSON.stringify(sesion.roles_disponibles || []),
  );
  sessionStorage.setItem("usuarioSGRSI", sesion.correo);
  sessionStorage.setItem("nombreSGRSI", sesion.nombre);
}
/** Comprueba sesión y rol antes de mostrar una página privada. Entradas: ninguna. Salida: promesa con permiso verdadero/falso. */
export async function protegerPagina() {
  const roles = rolesPagina();
  if (roles.length === 0) return true;

  const sesion = await ejecutar(() => Modelo.obtenerSesion());
  const rolesDisponibles = sesion?.roles_disponibles || [];
  if (sesion && !sesion.acceso_sistema) {
    window.location.href = "estado-cuenta.html";
    return false;
  }
  if (!sesion || !roles.some((rol) => rolesDisponibles.includes(rol))) {
    window.location.href = "login.html";
    return false;
  }

  const rolPrincipalPagina = document.body.dataset.primaryRole;
  if (rolPrincipalPagina && rolPrincipalPagina !== sesion.rol) {
    window.location.href = Modelo.obtenerPaginaPorRol(sesion.rol);
    return false;
  }

  datosPantalla.usuario = sesion;
  guardarSesion(sesion);
  Vista.construirMenu(sesion);
  Vista.actualizarIdentidadPanel(sesion);
  return true;
}
/** Conecta los eventos de navegacion cuando corresponde a esta página. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function iniciarNavegacion() {
  const botonSalir = obtenerElemento("btnSalir");
  if (botonSalir) {
    const seccion = botonSalir.closest(".CTAs");
    seccion?.classList.add("sidebar-session");
    if (seccion && !seccion.querySelector(".sidebar-session-label")) {
      seccion.insertAdjacentHTML(
        "afterbegin",
        '<li class="sidebar-session-label">Sesión</li>',
      );
    }
    botonSalir.className = "sidebar-logout";
    botonSalir.innerHTML =
      '<i class="bi bi-box-arrow-right" aria-hidden="true"></i> Cerrar sesión';
  }

  botonSalir?.addEventListener("click", async (evento) => {
    evento.preventDefault();
    const confirmado = await Vista.confirmarAccion({
      titulo: "Cerrar sesión",
      mensaje: "¿Está seguro de que desea cerrar la sesión actual?",
      textoConfirmar: "Cerrar sesión",
      variante: "danger",
    });
    if (!confirmado) return;

    const contenidoAnterior = botonSalir.innerHTML;
    botonSalir.setAttribute("aria-disabled", "true");
    botonSalir.innerHTML =
      '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span> Cerrando sesión...';
    const cerrado = await ejecutar(() => Modelo.cerrarSesion());
    if (!cerrado) {
      botonSalir.removeAttribute("aria-disabled");
      botonSalir.innerHTML = contenidoAnterior;
      return;
    }
    sessionStorage.clear();
    window.location.href = "login.html";
  });

  obtenerElemento("sidebarCollapse")?.addEventListener("click", () =>
    obtenerElemento("sidebar")?.classList.toggle("active"),
  );
}
