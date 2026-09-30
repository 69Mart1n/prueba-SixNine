import { obtenerIdioma, traducir } from "../../Vista/preferencias.js?v=5";

/*
 * MODELO DEL FRONTEND
 * Centraliza todas las llamadas Fetch. La Vista y el Controlador JS no conocen
 * URLs internas de PHP: llaman metodos de este objeto y reciben datos JSON.
 */

const BASE_API = new URL(
  "../../Controlador/api.php",
  import.meta.url,
).href.replace(/\/$/, "");

let tokenCsrf = null;
let solicitudTokenCsrf = null;

function incluirTokenEnFormularios(token) {
  document.querySelectorAll("form").forEach((formulario) => {
    if (!formulario.hasAttribute("method")) formulario.method = "post";
    let campo = formulario.querySelector('input[name="csrf_token"]');
    if (!campo) {
      campo = document.createElement("input");
      campo.type = "hidden";
      campo.name = "csrf_token";
      formulario.append(campo);
    }
    campo.value = token;
    campo.defaultValue = token;
  });
}

async function obtenerTokenCsrf() {
  if (tokenCsrf) return tokenCsrf;
  if (!solicitudTokenCsrf) {
    solicitudTokenCsrf = fetch(`${BASE_API}/auth/csrf`, {
      credentials: "same-origin",
    })
      .then(async (respuesta) => {
        const cuerpo = await respuesta.json();
        if (!respuesta.ok || cuerpo.status !== "success" || !cuerpo.data?.token) {
          throw new Error("No se pudo preparar la protección del formulario");
        }
        tokenCsrf = cuerpo.data.token;
        incluirTokenEnFormularios(tokenCsrf);
        return tokenCsrf;
      })
      .finally(() => { solicitudTokenCsrf = null; });
  }
  return solicitudTokenCsrf;
}

/** Ejecuta una solicitud contra la API y normaliza los errores para la interfaz. */
async function solicitar(ruta, opciones = {}) {
  const usaFormulario = opciones.body instanceof FormData;
  const metodo = (opciones.method || "GET").toUpperCase();
  const modificaDatos = ["POST", "PUT", "PATCH", "DELETE"].includes(metodo);
  const enviar = async (csrf) => {
    const respuesta = await fetch(`${BASE_API}${ruta}`, {
      ...opciones,
      credentials: "same-origin",
      headers: {
        "Accept-Language": obtenerIdioma(),
        ...(opciones.body && !usaFormulario
          ? { "Content-Type": "application/json" }
          : {}),
        ...(opciones.headers || {}),
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
    });
    return { respuesta, cuerpo: await respuesta.json().catch(() => null) };
  };

  let { respuesta, cuerpo } = await enviar(modificaDatos ? await obtenerTokenCsrf() : null);
  if (modificaDatos && respuesta.status === 403 && cuerpo?.message === "Token CSRF inválido o ausente") {
    // Otra pestaña pudo iniciar sesión y renovar el token.
    tokenCsrf = null;
    ({ respuesta, cuerpo } = await enviar(await obtenerTokenCsrf()));
  }

  if (respuesta.status === 401 && (document.body.dataset.roles || document.body.dataset.accountStatus)) {
    sessionStorage.clear();
    window.location.replace(new URL("../../Vista/pages/login.html", import.meta.url).href);
  }

  if (!respuesta.ok || !cuerpo || cuerpo.status !== "success") {
    const error = new Error(
      traducir(cuerpo?.message || "No se pudo completar la operación"),
    );
    error.status = respuesta.status;
    throw error;
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
    Object.entries(datos).forEach(([clave, valor]) =>
      formulario.append(clave, valor),
    );
  }
  return { method: metodo, body: formulario };
}

function fechaLatinaAISO(valor) {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((valor || "").trim());
  if (!partes) return null;

  const fecha = new Date(
    Number(partes[3]),
    Number(partes[2]) - 1,
    Number(partes[1]),
  );
  if (
    fecha.getFullYear() !== Number(partes[3]) ||
    fecha.getMonth() !== Number(partes[2]) - 1 ||
    fecha.getDate() !== Number(partes[1])
  ) {
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
  /** Solicita a la API preparar csrf y devuelve su resultado. Entradas: ninguna. Salida: promesa con datos de la API. */
  prepararCsrf: obtenerTokenCsrf,
  /** Solicita a la API iniciar sesion y devuelve su resultado. Entradas: datos. Salida: promesa con datos de la API. */
  iniciarSesion: async (datos) => {
    const sesion = await solicitar("/auth/login", conJson("POST", datos));
    tokenCsrf = null;
    await obtenerTokenCsrf();
    return sesion;
  },
  /** Solicita a la API solicitar recuperacion y devuelve su resultado. Entradas: datos. Salida: promesa con datos de la API. */
  solicitarRecuperacion: (datos) =>
    solicitar("/auth/recuperar-contrasena", conJson("POST", datos)),
  /** Solicita a la API validar recuperacion y devuelve su resultado. Entradas: token. Salida: promesa con datos de la API. */
  validarRecuperacion: (token) =>
    solicitar(`/auth/validar-recuperacion?token=${encodeURIComponent(token)}`),
  /** Solicita a la API restablecer contrasena y devuelve su resultado. Entradas: datos. Salida: promesa con datos de la API. */
  restablecerContrasena: (datos) =>
    solicitar("/auth/restablecer-contrasena", conJson("POST", datos)),
  /** Solicita a la API seleccionar perfil y devuelve su resultado. Entradas: rol. Salida: promesa con datos de la API. */
  seleccionarPerfil: (rol) =>
    solicitar("/auth/perfil", conJson("POST", { rol })),
  /** Solicita a la API cerrar sesion y devuelve su resultado. Entradas: ninguna. Salida: promesa con datos de la API. */
  cerrarSesion: async () => {
    try {
      await solicitar("/auth/logout", { method: "POST" });
      return true;
    } catch (error) {
      if (error.status === 401) return true; // La sesión ya terminó en el servidor.
      throw error;
    }
  },
  /** Solicita a la API obtener sesion y devuelve su resultado. Entradas: ninguna. Salida: promesa con datos de la API. */
  obtenerSesion: () => solicitar("/auth/session"),
  /** Solicita a la API registrar usuario y devuelve su resultado. Entradas: datos. Salida: promesa con datos de la API. */
  registrarUsuario: (datos) => solicitar("/usuarios", conJson("POST", datos)),
  /** Solicita a la API listar usuarios y devuelve su resultado. Entradas: ninguna. Salida: promesa con datos de la API. */
  listarUsuarios: () => solicitar("/usuarios"),
  /** Solicita a la API cambiar estado usuario y devuelve su resultado. Entradas: id, accion. Salida: promesa con datos de la API. */
  cambiarEstadoUsuario: (id, accion) =>
    solicitar(`/usuarios/${id}/estado`, conJson("PUT", { accion })),
  /** Solicita a la API dar baja usuario y devuelve su resultado. Entradas: id. Salida: promesa con datos de la API. */
  darBajaUsuario: (id) => solicitar(`/usuarios/${id}`, { method: "DELETE" }),
  /** Solicita a la API cambiar estado rol usuario y devuelve su resultado. Entradas: id, rol, accion. Salida: promesa con datos de la API. */
  cambiarEstadoRolUsuario: (id, rol, accion) =>
    solicitar(
      `/usuarios/${id}/roles/${rol}/estado`,
      conJson("PUT", { accion }),
    ),
  /** Solicita a la API solicitar rol y devuelve su resultado. Entradas: rol. Salida: promesa con datos de la API. */
  solicitarRol: (rol) => solicitar("/usuarios/roles", conJson("POST", { rol })),
  /** Solicita a la API crear incidencia y devuelve su resultado. Entradas: datos. Salida: promesa con datos de la API. */
  crearIncidencia: (datos) => solicitar("/incidencias", conJson("POST", datos)),
  /** Solicita a la API listar incidencias y devuelve su resultado. Entradas: scope. Salida: promesa con datos de la API. */
  listarIncidencias: (scope = "") =>
    solicitar(
      `/incidencias${scope ? `?scope=${encodeURIComponent(scope)}` : ""}`,
    ),
  /** Solicita a la API cambiar estado incidencia y devuelve su resultado. Entradas: id, datos. Salida: promesa con datos de la API. */
  cambiarEstadoIncidencia: (id, datos) =>
    solicitar(`/incidencias/${id}/estado`, conJson("PUT", datos)),
  /** Solicita a la API cancelar incidencia y devuelve su resultado. Entradas: id. Salida: promesa con datos de la API. */
  cancelarIncidencia: (id) =>
    solicitar(`/incidencias/${id}`, { method: "DELETE" }),
  /** Solicita a la API resolver incidencia y devuelve su resultado. Entradas: id, datos. Salida: promesa con datos de la API. */
  resolverIncidencia: (id, datos) =>
    solicitar(`/incidencias/${id}/resolver`, conFormulario("POST", datos)),
  /** Solicita a la API generar codigo colaboracion y devuelve su resultado. Entradas: id. Salida: promesa con datos de la API. */
  generarCodigoColaboracion: (id) =>
    solicitar(`/incidencias/${id}/codigo-colaboracion`, { method: "POST" }),
  /** Solicita a la API unirse colaboracion incidencia y devuelve su resultado. Entradas: id, codigo. Salida: promesa con datos de la API. */
  unirseColaboracionIncidencia: (id, codigo) =>
    solicitar(
      `/incidencias/${id}/unirse-colaboracion`,
      conJson("POST", { codigo }),
    ),
  /** Solicita a la API crear prestamo y devuelve su resultado. Entradas: datos. Salida: promesa con datos de la API. */
  crearPrestamo: (datos) => solicitar("/prestamos", conJson("POST", datos)),
  /** Solicita a la API actualizar atrasos prestamos y devuelve su resultado. Entradas: ninguna. Salida: promesa con datos de la API. */
  actualizarAtrasosPrestamos: () =>
    solicitar("/prestamos/actualizar-atrasos", { method: "POST" }),
  /** Solicita a la API listar prestamos y devuelve su resultado. Entradas: scope. Salida: promesa con datos de la API. */
  listarPrestamos: (scope = "") =>
    solicitar(
      `/prestamos${scope ? `?scope=${encodeURIComponent(scope)}` : ""}`,
    ),
  /** Solicita a la API cambiar estado prestamo y devuelve su resultado. Entradas: id, estado. Salida: promesa con datos de la API. */
  cambiarEstadoPrestamo: (id, estado) =>
    solicitar(`/prestamos/${id}/estado`, conJson("PUT", { estado })),
  /** Solicita a la API cancelar prestamo y devuelve su resultado. Entradas: id. Salida: promesa con datos de la API. */
  cancelarPrestamo: (id) => solicitar(`/prestamos/${id}`, { method: "DELETE" }),
  /** Solicita a la API entregar prestamo y devuelve su resultado. Entradas: id. Salida: promesa con datos de la API. */
  entregarPrestamo: (id) =>
    solicitar(`/prestamos/${id}/entregar`, { method: "POST" }),
  /** Solicita a la API devolver prestamo y devuelve su resultado. Entradas: id, datos. Salida: promesa con datos de la API. */
  devolverPrestamo: (id, datos) =>
    solicitar(`/prestamos/${id}/devolver`, conJson("POST", datos)),
  /** Solicita a la API listar blacklist y devuelve su resultado. Entradas: ninguna. Salida: promesa con datos de la API. */
  listarBlacklist: () => solicitar("/blacklist"),
  /** Solicita a la API listar reportes y devuelve su resultado. Entradas: ninguna. Salida: promesa con datos de la API. */
  listarReportes: () => solicitar("/reportes"),
  /** Solicita a la API crear solicitud y devuelve su resultado. Entradas: datos. Salida: promesa con datos de la API. */
  crearSolicitud: (datos) => solicitar("/solicitudes", conJson("POST", datos)),
  /** Solicita a la API listar solicitudes y devuelve su resultado. Entradas: scope. Salida: promesa con datos de la API. */
  listarSolicitudes: (scope = "") =>
    solicitar(
      `/solicitudes${scope ? `?scope=${encodeURIComponent(scope)}` : ""}`,
    ),
  /** Solicita a la API cambiar estado solicitud y devuelve su resultado. Entradas: id, estado. Salida: promesa con datos de la API. */
  cambiarEstadoSolicitud: (id, estado) =>
    solicitar(`/solicitudes/${id}/estado`, conJson("PUT", { estado })),
  /** Solicita a la API cancelar solicitud y devuelve su resultado. Entradas: id. Salida: promesa con datos de la API. */
  cancelarSolicitud: (id) =>
    solicitar(`/solicitudes/${id}`, { method: "DELETE" }),
  /** Solicita a la API registrar uso sala y devuelve su resultado. Entradas: datos. Salida: promesa con datos de la API. */
  registrarUsoSala: (datos) => solicitar("/uso-sala", conJson("POST", datos)),
  /** Solicita a la API obtener dashboard y devuelve su resultado. Entradas: ninguna. Salida: promesa con datos de la API. */
  obtenerDashboard: () => solicitar("/dashboard"),
  /** Solicita a la API listar inventario y devuelve su resultado. Entradas: filtros. Salida: promesa con datos de la API. */
  listarInventario: (filtros = "") =>
    solicitar(`/inventario${filtros ? `?${filtros}` : ""}`),
  /** Solicita a la API crear equipo y devuelve su resultado. Entradas: datos. Salida: promesa con datos de la API. */
  crearEquipo: (datos) => solicitar("/inventario", conJson("POST", datos)),
  /** Solicita a la API actualizar equipo y devuelve su resultado. Entradas: id, datos. Salida: promesa con datos de la API. */
  actualizarEquipo: (id, datos) =>
    solicitar(`/inventario/${id}`, conJson("PUT", datos)),
  /** Solicita a la API dar baja equipo y devuelve su resultado. Entradas: id. Salida: promesa con datos de la API. */
  darBajaEquipo: (id) => solicitar(`/inventario/${id}`, { method: "DELETE" }),
  /** Solicita a la API listar espacios y devuelve su resultado. Entradas: todos. Salida: promesa con datos de la API. */
  listarEspacios: (todos = false) =>
    solicitar(`/espacios${todos ? "?all=1" : ""}`),
  /** Solicita a la API crear espacio y devuelve su resultado. Entradas: datos. Salida: promesa con datos de la API. */
  crearEspacio: (datos) => solicitar("/espacios", conJson("POST", datos)),
  /** Solicita a la API actualizar espacio y devuelve su resultado. Entradas: id, datos. Salida: promesa con datos de la API. */
  actualizarEspacio: (id, datos) =>
    solicitar(`/espacios/${id}`, conJson("PUT", datos)),
  /** Solicita a la API desactivar espacio y devuelve su resultado. Entradas: id. Salida: promesa con datos de la API. */
  desactivarEspacio: (id) =>
    solicitar(`/espacios/${id}`, { method: "DELETE" }),
  /** Solicita a la API listar categorias y devuelve su resultado. Entradas: todas. Salida: promesa con datos de la API. */
  listarCategorias: (todas = false) =>
    solicitar(`/categorias-incidencia${todas ? "?all=1" : ""}`),
  /** Solicita a la API crear categoria y devuelve su resultado. Entradas: datos. Salida: promesa con datos de la API. */
  crearCategoria: (datos) =>
    solicitar("/categorias-incidencia", conJson("POST", datos)),
  /** Solicita a la API actualizar categoria y devuelve su resultado. Entradas: id, datos. Salida: promesa con datos de la API. */
  actualizarCategoria: (id, datos) =>
    solicitar(`/categorias-incidencia/${id}`, conJson("PUT", datos)),
  /** Solicita a la API desactivar categoria y devuelve su resultado. Entradas: id. Salida: promesa con datos de la API. */
  desactivarCategoria: (id) =>
    solicitar(`/categorias-incidencia/${id}`, { method: "DELETE" }),
  /** Solicita a la API listar historial y devuelve su resultado. Entradas: filtros. Salida: promesa con datos de la API. */
  listarHistorial: (filtros = "") =>
    solicitar(`/historial${filtros ? `?${filtros}` : ""}`),
  /** Solicita a la API buscar conocimiento y devuelve su resultado. Entradas: filtros. Salida: promesa con datos de la API. */
  buscarConocimiento: (filtros = "") =>
    solicitar(`/conocimiento${filtros ? `?${filtros}` : ""}`),
  /** Solicita a la API listar tareas y devuelve su resultado. Entradas: ninguna. Salida: promesa con datos de la API. */
  listarTareas: () => solicitar("/tareas"),
  /** Solicita a la API crear tarea y devuelve su resultado. Entradas: datos. Salida: promesa con datos de la API. */
  crearTarea: (datos) => solicitar("/tareas", conJson("POST", datos)),
  /** Solicita a la API cambiar estado tarea y devuelve su resultado. Entradas: id, datos. Salida: promesa con datos de la API. */
  cambiarEstadoTarea: (id, datos) =>
    solicitar(`/tareas/${id}/estado`, conJson("PUT", datos)),
  /** Solicita a la API cancelar tarea y devuelve su resultado. Entradas: id. Salida: promesa con datos de la API. */
  cancelarTarea: (id) => solicitar(`/tareas/${id}`, { method: "DELETE" }),

  /** Elige la página inicial según el rol activo. Entradas: rol. Salida: nombre de página. */
  obtenerPaginaPorRol(rol) {
    return (
      {
        administrador: "administrador.html",
        tecnico: "tecnico.html",
        solicitante: "solicitante.html",
      }[rol] || "login.html"
    );
  },

  /** Comprueba los campos obligatorios antes de enviarlos. Entradas: formulario. Salida: resultado de validación. */
  validarFormulario(formulario) {
    const invalidos = [
      ...formulario.querySelectorAll("input, select, textarea"),
    ]
      .filter((campo) => !campo.disabled && campo.type !== "hidden")
      .filter((campo) => {
        if (campo.required && campo.value.trim() === "") return true;
        if (
          campo.type === "email" &&
          campo.value &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campo.value.trim())
        )
          return true;
        if (
          campo.pattern &&
          campo.value &&
          !new RegExp(`^(?:${campo.pattern})$`).test(campo.value.trim())
        )
          return true;
        if (
          campo.dataset.fechaLatina === "true" &&
          !fechaLatinaAISO(campo.value)
        )
          return true;
        if (
          campo.dataset.noPasada === "true" &&
          fechaLatinaAISO(campo.value) < hoyISO()
        )
          return true;
        if (campo.dataset.soloHoy === "true" && campo.value !== hoyISO())
          return true;
        return false;
      });

    const inicioPrestamo = formulario.querySelector("#fechaPrestamo");
    const finPrestamo = formulario.querySelector("#fechaDevolucion");
    if (
      inicioPrestamo &&
      finPrestamo &&
      fechaLatinaAISO(finPrestamo.value) < fechaLatinaAISO(inicioPrestamo.value)
    ) {
      invalidos.push(finPrestamo);
    }

    const entrada = formulario.querySelector("#horaEntrada");
    const salida = formulario.querySelector("#horaSalida");
    if (entrada && salida && entrada.value && salida.value <= entrada.value) {
      invalidos.push(salida);
    }

    return {
      valido: invalidos.length === 0,
      camposInvalidos: [...new Set(invalidos)],
    };
  },

  fechaLatinaAISO,
  hoyISO,
};
