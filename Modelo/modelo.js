import { obtenerIdioma, traducir } from "../Vista/preferencias.js?v=2";

const BASE_API = new URL("../Controlador/api.php", import.meta.url).href.replace(/\/$/, "");

/** Ejecuta una solicitud contra la API y normaliza los errores para la interfaz. */
async function solicitar(ruta, opciones = {}) {
  const usaFormulario = opciones.body instanceof FormData;
  const respuesta = await fetch(`${BASE_API}${ruta}`, {
    credentials: "same-origin",
    headers: {
      "Accept-Language": obtenerIdioma(),
      ...(opciones.body && !usaFormulario ? { "Content-Type": "application/json" } : {}),
      ...(opciones.headers || {}),
    },
    ...opciones,
  });
  const cuerpo = await respuesta.json().catch(() => null);

  if (!respuesta.ok || !cuerpo || cuerpo.status !== "success") {
    throw new Error(traducir(cuerpo?.message || "No se pudo completar la operación"));
  }

  return cuerpo.data;
}

function conJson(metodo, datos) {
  return { method: metodo, body: JSON.stringify(datos) };
}

/** Prepara una solicitud multipart para campos y archivos. */
function conFormulario(metodo, datos) {
  const formulario = datos instanceof FormData ? datos : new FormData();
  if (!(datos instanceof FormData)) {
    Object.entries(datos).forEach(([clave, valor]) => formulario.append(clave, valor));
  }
  return { method: metodo, body: formulario };
}

function fechaLatinaAISO(valor) {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((valor || "").trim());
  if (!partes) return null;

  const fecha = new Date(Number(partes[3]), Number(partes[2]) - 1, Number(partes[1]));
  if (fecha.getFullYear() !== Number(partes[3]) || fecha.getMonth() !== Number(partes[2]) - 1 || fecha.getDate() !== Number(partes[1])) {
    return null;
  }

  return `${partes[3]}-${partes[2]}-${partes[1]}`;
}

function hoyISO() {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export const Modelo = {
  iniciarSesion: (datos) => solicitar("/auth/login", conJson("POST", datos)),
  solicitarRecuperacion: (datos) => solicitar("/auth/recuperar-contrasena", conJson("POST", datos)),
  validarRecuperacion: (token) => solicitar(`/auth/validar-recuperacion?token=${encodeURIComponent(token)}`),
  restablecerContrasena: (datos) => solicitar("/auth/restablecer-contrasena", conJson("POST", datos)),
  seleccionarPerfil: (rol) => solicitar("/auth/perfil", conJson("POST", { rol })),
  cerrarSesion: () => solicitar("/auth/logout", { method: "POST" }).catch(() => null),
  obtenerSesion: () => solicitar("/auth/session"),
  registrarUsuario: (datos) => solicitar("/usuarios", conJson("POST", datos)),
  listarUsuarios: () => solicitar("/usuarios"),
  cambiarEstadoUsuario: (id, accion) => solicitar(`/usuarios/${id}/estado`, conJson("PUT", { accion })),
  cambiarEstadoRolUsuario: (id, rol, accion) => solicitar(`/usuarios/${id}/roles/${rol}/estado`, conJson("PUT", { accion })),
  solicitarRol: (rol) => solicitar("/usuarios/roles", conJson("POST", { rol })),
  crearIncidencia: (datos) => solicitar("/incidencias", conJson("POST", datos)),
  listarIncidencias: (scope = "") => solicitar(`/incidencias${scope ? `?scope=${encodeURIComponent(scope)}` : ""}`),
  cambiarEstadoIncidencia: (id, datos) => solicitar(`/incidencias/${id}/estado`, conJson("PUT", datos)),
  resolverIncidencia: (id, datos) => solicitar(`/incidencias/${id}/resolver`, conFormulario("POST", datos)),
  obtenerUrlFotoResolucion: (id) => `${BASE_API}/incidencias/${encodeURIComponent(id)}/foto-resolucion`,
  crearPrestamo: (datos) => solicitar("/prestamos", conJson("POST", datos)),
  listarPrestamos: (scope = "") => solicitar(`/prestamos${scope ? `?scope=${encodeURIComponent(scope)}` : ""}`),
  cambiarEstadoPrestamo: (id, estado) => solicitar(`/prestamos/${id}/estado`, conJson("PUT", { estado })),
  entregarPrestamo: (id) => solicitar(`/prestamos/${id}/entregar`, { method: "POST" }),
  devolverPrestamo: (id, datos) => solicitar(`/prestamos/${id}/devolver`, conJson("POST", datos)),
  listarBlacklist: () => solicitar("/blacklist"),
  listarReportes: () => solicitar("/reportes"),
  crearSolicitud: (datos) => solicitar("/solicitudes", conJson("POST", datos)),
  listarSolicitudes: (scope = "") => solicitar(`/solicitudes${scope ? `?scope=${encodeURIComponent(scope)}` : ""}`),
  cambiarEstadoSolicitud: (id, estado) => solicitar(`/solicitudes/${id}/estado`, conJson("PUT", { estado })),
  registrarUsoSala: (datos) => solicitar("/uso-sala", conJson("POST", datos)),
  obtenerDashboard: () => solicitar("/dashboard"),
  listarInventario: (filtros = "") => solicitar(`/inventario${filtros ? `?${filtros}` : ""}`),
  crearEquipo: (datos) => solicitar("/inventario", conJson("POST", datos)),
  actualizarEquipo: (id, datos) => solicitar(`/inventario/${id}`, conJson("PUT", datos)),
  darBajaEquipo: (id) => solicitar(`/inventario/${id}`, { method: "DELETE" }),
  listarEspacios: () => solicitar("/espacios"),
  listarCategorias: (todas = false) => solicitar(`/categorias-incidencia${todas ? "?all=1" : ""}`),
  crearCategoria: (datos) => solicitar("/categorias-incidencia", conJson("POST", datos)),
  actualizarCategoria: (id, datos) => solicitar(`/categorias-incidencia/${id}`, conJson("PUT", datos)),
  listarHistorial: (filtros = "") => solicitar(`/historial${filtros ? `?${filtros}` : ""}`),
  buscarConocimiento: (filtros = "") => solicitar(`/conocimiento${filtros ? `?${filtros}` : ""}`),
  listarTareas: () => solicitar("/tareas"),
  crearTarea: (datos) => solicitar("/tareas", conJson("POST", datos)),
  cambiarEstadoTarea: (id, datos) => solicitar(`/tareas/${id}/estado`, conJson("PUT", datos)),

  obtenerPaginaPorRol(rol) {
    return {
      administrador: "administrador.html",
      tecnico: "tecnico.html",
      solicitante: "solicitante.html",
    }[rol] || "login.html";
  },

  validarFormulario(formulario) {
    const invalidos = [...formulario.querySelectorAll("input, select, textarea")]
      .filter((campo) => !campo.disabled && campo.type !== "hidden")
      .filter((campo) => {
        if (campo.required && campo.value.trim() === "") return true;
        if (campo.type === "email" && campo.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campo.value.trim())) return true;
        if (campo.pattern && campo.value && !(new RegExp(`^(?:${campo.pattern})$`).test(campo.value.trim()))) return true;
        if (campo.dataset.fechaLatina === "true" && !fechaLatinaAISO(campo.value)) return true;
        if (campo.dataset.noPasada === "true" && fechaLatinaAISO(campo.value) < hoyISO()) return true;
        if (campo.dataset.soloHoy === "true" && campo.value !== hoyISO()) return true;
        return false;
      });

    const inicioPrestamo = formulario.querySelector("#fechaPrestamo");
    const finPrestamo = formulario.querySelector("#fechaDevolucion");
    if (inicioPrestamo && finPrestamo && fechaLatinaAISO(finPrestamo.value) < fechaLatinaAISO(inicioPrestamo.value)) {
      invalidos.push(finPrestamo);
    }

    const entrada = formulario.querySelector("#horaEntrada");
    const salida = formulario.querySelector("#horaSalida");
    if (entrada && salida && entrada.value && salida.value <= entrada.value) {
      invalidos.push(salida);
    }

    return { valido: invalidos.length === 0, camposInvalidos: [...new Set(invalidos)] };
  },

  fechaLatinaAISO,
  hoyISO,
};
