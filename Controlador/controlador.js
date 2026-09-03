import { Modelo } from "../Modelo/modelo.js?v=5";
import { Vista } from "../Vista/vista.js?v=13";
import { iniciarPreferencias, traducir } from "../Vista/preferencias.js?v=2";

const estado = {
  usuario: null,
  incidencias: [],
  usuarios: [],
  solicitudes: [],
  reportesUso: [],
  inventario: [],
  categorias: [],
  tareas: [],
};

function $(id) {
  return document.getElementById(id);
}

function datosFormulario(formulario) {
  return Object.fromEntries(new FormData(formulario).entries());
}

function leerPorIds(ids) {
  return Object.fromEntries(ids.map((id) => [id, $(id)?.value?.trim() || ""]));
}

/** Construye una pregunta de confirmación localizada sin traducir datos del usuario. */
function mensajeConfirmacion(accionLocalizada) {
  return traducir("¿Está seguro de que desea {accion}?").replace("{accion}", accionLocalizada);
}

async function ejecutar(tarea, mensajeOk = null) {
  try {
    const resultado = await tarea();
    if (mensajeOk) Vista.mostrarMensaje(mensajeOk, "success");
    return resultado;
  } catch (error) {
    Vista.mostrarMensaje(error.message || "No se pudo completar la operacion", "danger");
    return null;
  }
}

function rolesPagina() {
  return (document.body.dataset.roles || "").split(" ").filter(Boolean);
}

function rolDeVista() {
  if (document.body.dataset.scope === "mine") return "solicitante";
  const roles = estado.usuario?.roles_disponibles || [estado.usuario?.rol];
  return roles.includes("administrador") ? [...roles, "tecnico"].join(" ") : roles.join(" ");
}

function guardarSesion(sesion) {
  sessionStorage.setItem("rolSGRSI", sesion.rol || "");
  sessionStorage.setItem("rolesSGRSI", JSON.stringify(sesion.roles_disponibles || []));
  sessionStorage.setItem("usuarioSGRSI", sesion.correo);
  sessionStorage.setItem("nombreSGRSI", sesion.nombre);
}

async function protegerPagina() {
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

  estado.usuario = sesion;
  guardarSesion(sesion);
  Vista.construirMenu(sesion);
  Vista.actualizarIdentidadPanel(sesion);
  return true;
}

function iniciarNavegacion() {
  const botonSalir = $("btnSalir");
  if (botonSalir) {
    const seccion = botonSalir.closest(".CTAs");
    seccion?.classList.add("sidebar-session");
    if (seccion && !seccion.querySelector(".sidebar-session-label")) {
      seccion.insertAdjacentHTML("afterbegin", '<li class="sidebar-session-label">Sesión</li>');
    }
    botonSalir.className = "sidebar-logout";
    botonSalir.innerHTML = '<i class="bi bi-box-arrow-right" aria-hidden="true"></i> Cerrar sesión';
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

    botonSalir.setAttribute("aria-disabled", "true");
    botonSalir.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span> Cerrando sesión...';
    await Modelo.cerrarSesion();
    sessionStorage.clear();
    window.location.href = "login.html";
  });

  $("sidebarCollapse")?.addEventListener("click", () => $("sidebar")?.classList.toggle("active"));
}

function iniciarLogin() {
  const form = $("formInicioSesion");
  if (!form) return;

  const botonIngresar = form.querySelector('button[type="submit"]');

  const autenticar = async () => {
    const contenidoBoton = botonIngresar?.innerHTML;
    if (botonIngresar) {
      botonIngresar.disabled = true;
      botonIngresar.setAttribute("aria-busy", "true");
      botonIngresar.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Ingresando';
    }
    const usuario = await ejecutar(() => Modelo.iniciarSesion(datosFormulario(form)));

    if (botonIngresar) {
      botonIngresar.disabled = false;
      botonIngresar.removeAttribute("aria-busy");
      botonIngresar.innerHTML = contenidoBoton;
    }
    if (!usuario) return;
    guardarSesion(usuario);
    window.location.href = usuario.acceso_sistema
      ? Modelo.obtenerPaginaPorRol(usuario.rol)
      : "estado-cuenta.html";
  };

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    await autenticar();
  });

  $("btnMostrarContrasena")?.addEventListener("click", (evento) => {
    const campo = $("contrasena");
    const mostrar = campo.type === "password";
    campo.type = mostrar ? "text" : "password";
    evento.currentTarget.setAttribute("aria-pressed", String(mostrar));
    evento.currentTarget.setAttribute("title", mostrar ? "Ocultar contraseña" : "Mostrar contraseña");
    evento.currentTarget.innerHTML = `<i class="bi ${mostrar ? "bi-eye-slash" : "bi-eye"}"></i>`;
  });
}

/** Gestiona la solicitud pública de un enlace de recuperación. */
function iniciarRecuperacionContrasena() {
  const formulario = $("formRecuperarContrasena");
  if (!formulario) return;
  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const boton = formulario.querySelector('button[type="submit"]');
    boton.disabled = true;
    const resultado = await ejecutar(() => Modelo.solicitarRecuperacion(datosFormulario(formulario)));
    boton.disabled = false;
    if (resultado) {
      Vista.mostrarMensaje(traducir(resultado.mensaje), "success");
      formulario.reset();
    }
  });
}

/** Valida el enlace y procesa la elección de una nueva contraseña. */
async function iniciarRestablecimientoContrasena() {
  const formulario = $("formRestablecerContrasena");
  if (!formulario) return;
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const estadoToken = await ejecutar(() => Modelo.validarRecuperacion(token));
  if (!estadoToken?.valido) {
    formulario.querySelectorAll("input, button").forEach((control) => { control.disabled = true; });
    Vista.mostrarMensaje(traducir("El enlace de recuperación no es válido o venció"), "danger");
    return;
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const datos = datosFormulario(formulario);
    datos.token = token;
    if (datos.contrasena !== datos.confirmar_contrasena) {
      Vista.mostrarMensaje(traducir("Las contraseñas no coinciden"), "danger");
      return;
    }
    const boton = formulario.querySelector('button[type="submit"]');
    boton.disabled = true;
    const resultado = await ejecutar(() => Modelo.restablecerContrasena(datos));
    boton.disabled = false;
    if (resultado) {
      Vista.mostrarMensaje(traducir("Contraseña restablecida correctamente"), "success");
      formulario.reset();
      formulario.querySelectorAll("input, button").forEach((control) => { control.disabled = true; });
      $("enlaceVolverLogin")?.classList.remove("d-none");
    }
  });
}

async function cargarEstadoCuenta() {
  const sesion = await ejecutar(() => Modelo.obtenerSesion());
  if (!sesion) {
    window.location.href = "login.html";
    return;
  }
  guardarSesion(sesion);
  if (sesion.acceso_sistema) {
    window.location.href = Modelo.obtenerPaginaPorRol(sesion.rol);
    return;
  }
  Vista.renderEstadoCuenta(sesion);
}

async function iniciarEstadoCuenta() {
  await cargarEstadoCuenta();
  $("btnActualizarEstadoCuenta")?.addEventListener("click", async (evento) => {
    const boton = evento.currentTarget;
    const contenido = boton.innerHTML;
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Actualizando';
    await cargarEstadoCuenta();
    boton.disabled = false;
    boton.innerHTML = contenido;
  });
  $("btnSalirEstadoCuenta")?.addEventListener("click", async () => {
    await Modelo.cerrarSesion();
    sessionStorage.clear();
    window.location.href = "login.html";
  });
}

function conectarFormulario(id, recolector, creador, mensajeOk) {
  const form = $(id);
  if (!form) return;

  Vista.prepararCampos(form);
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const validacion = Modelo.validarFormulario(form);
    if (!validacion.valido) {
      Vista.marcarInvalidos(form, validacion.camposInvalidos);
      Vista.mostrarMensaje("Por favor, complete correctamente los campos obligatorios.", "warning");
      return;
    }

    const resultado = await ejecutar(() => creador(recolector(form)), mensajeOk);
    if (resultado) {
      Vista.reiniciarFormulario(form);
    }
  });
}

function iniciarFormularios() {
  Vista.iniciarCamposSala();
  Vista.iniciarTablaUsoSala();

  conectarFormulario("formRegistro", (form) => datosFormulario(form), Modelo.registrarUsuario, "Solicitud creada. Ya puede iniciar sesión para consultar su estado de aprobación.");
  conectarFormulario("formTicket", () => ({
    titulo: $("titulo")?.value.trim() || "",
    id_categoria: $("idCategoriaIncidencia")?.value || "",
    id_espacio: $("idEspacioIncidencia")?.value || "",
    id_equipo: $("idEquipoIncidencia")?.value || "",
    fecha_reportada: $("fechaReportada")?.value || "",
    descripcion: $("descripcion")?.value.trim() || "",
  }), Modelo.crearIncidencia, "Incidencia creada en estado pendiente.");
  conectarFormulario("formPrestamo", () => ({
    ...leerPorIds(["estudiante", "cedulaEstudiante", "fechaPrestamo", "fechaDevolucion", "motivo"]),
    id_equipo: $("idEquipoPrestamo")?.value || "",
    grupo: $("actividad")?.value.trim() || "",
  }), Modelo.crearPrestamo, "Solicitud de prestamo registrada.");
  conectarFormulario("formSolicitud", () => leerPorIds(["tipoSolicitud", "tipoSala", "salaSolicitada", "fechaSolicitada", "turno", "grupo", "asignatura", "software", "descripcion"]), Modelo.crearSolicitud, "Solicitud enviada correctamente.");
  iniciarFormularioUsoSala();
  conectarFormulario("formSolicitudRol", (form) => datosFormulario(form), (datos) => Modelo.solicitarRol(datos.rol), "Solicitud de rol enviada. Queda pendiente de aprobacion.");
}

async function cargarCatalogosFormularios() {
  const necesitaEspacios = $("idEspacioIncidencia") || $("idEspacioEquipo") || $("idEspacioTarea");
  const necesitaInventario = $("idEquipoIncidencia") || $("idEquipoPrestamo") || $("idEquipoTarea");
  const necesitaCategorias = $("idCategoriaIncidencia") || $("filtroCategoriaConocimiento");
  const [espacios, inventario, categorias] = await Promise.all([
    necesitaEspacios ? ejecutar(() => Modelo.listarEspacios()) : Promise.resolve(null),
    necesitaInventario ? ejecutar(() => Modelo.listarInventario($("idEquipoPrestamo") ? "disponibles=1" : "")) : Promise.resolve(null),
    necesitaCategorias ? ejecutar(() => Modelo.listarCategorias()) : Promise.resolve(null),
  ]);
  const llenar = (elemento, items, etiqueta, valor, texto, opcional = true) => {
    if (!elemento || !items) return;
    elemento.innerHTML = opcional ? `<option value="">${etiqueta}</option>` : `<option value="">Seleccionar</option>`;
    items.forEach((item) => elemento.insertAdjacentHTML("beforeend", `<option value="${item[valor]}">${Vista.escaparTexto(texto(item))}</option>`));
  };
  llenar($("idEspacioIncidencia"), espacios, "Sin espacio específico", "id_espacio", (e) => `${e.nombre} (${e.tipo})`);
  llenar($("idEspacioEquipo"), espacios, "Sin ubicación asignada", "id_espacio", (e) => `${e.nombre} (${e.tipo})`);
  llenar($("idEspacioTarea"), espacios, "Sin espacio específico", "id_espacio", (e) => `${e.nombre} (${e.tipo})`);
  llenar($("idEquipoIncidencia"), inventario, "Sin equipo específico", "id_equipo", (e) => `${e.codigo_inventario} - ${e.nombre}`);
  llenar($("idEquipoPrestamo"), inventario, "Seleccionar equipo disponible", "id_equipo", (e) => `${e.codigo_inventario} - ${e.nombre}`, false);
  llenar($("idEquipoTarea"), inventario, "Sin equipo específico", "id_equipo", (e) => `${e.codigo_inventario} - ${e.nombre}`);
  llenar($("idCategoriaIncidencia"), categorias, "Seleccionar categoría", "id_categoria", (c) => c.nombre, false);
  llenar($("filtroCategoriaConocimiento"), categorias, "Todas las categorías", "id_categoria", (c) => c.nombre);
}

function iniciarFormularioUsoSala() {
  const form = $("formUsoSala");
  if (!form) return;

  Vista.prepararCampos(form);
  const establecerFechaHoy = () => {
    const campoFecha = $("fecha");
    if (!campoFecha) return;
    campoFecha.value = Modelo.hoyISO().split("-").reverse().join("/");
    campoFecha.dispatchEvent(new Event("input", { bubbles: true }));
  };
  $("btnFechaHoy")?.addEventListener("click", establecerFechaHoy);
  establecerFechaHoy();
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (form.dataset.registrado === "true") return;

    const validacion = Modelo.validarFormulario(form);
    if (!validacion.valido) {
      Vista.marcarInvalidos(form, validacion.camposInvalidos);
      Vista.mostrarMensaje("Complete correctamente los datos generales de la planilla.", "warning");
      return;
    }

    const equipos = Vista.obtenerEquiposUsoSala();
    if (equipos.length === 0) {
      Vista.mostrarMensaje("Agregue al menos un alumno y su equipo antes de registrar el uso.", "warning");
      $("numeroEquipo")?.focus();
      return;
    }

    const datos = {
      ...leerPorIds(["tipoSala", "salaSolicitada", "fecha", "horaEntrada", "horaSalida", "grupo", "asignatura", "docente", "turno", "observaciones"]),
      equipos,
    };
    const confirmado = await Vista.confirmarAccion({
      titulo: "Confirmar planilla de uso",
      mensaje: traducir(equipos.length === 1
        ? "Se registrará {cantidad} equipo para {sala}, grupo {grupo}, el {fecha}. Verifique los datos antes de continuar."
        : "Se registrarán {cantidad} equipos para {sala}, grupo {grupo}, el {fecha}. Verifique los datos antes de continuar.")
        .replace("{cantidad}", String(equipos.length))
        .replace("{sala}", datos.salaSolicitada)
        .replace("{grupo}", datos.grupo)
        .replace("{fecha}", datos.fecha),
      textoConfirmar: "Registrar planilla",
      variante: "success",
    });
    if (!confirmado) return;

    const resultado = await ejecutar(
      () => Modelo.registrarUsoSala(datos),
      "Uso de sala registrado correctamente. La planilla quedo disponible para imprimir."
    );
    if (resultado) Vista.marcarUsoSalaRegistrado(form);
  });
}

async function cargarUsuarios() {
  if (!$("tablaUsuarios")) return;
  const usuarios = await ejecutar(() => Modelo.listarUsuarios());
  if (usuarios) {
    estado.usuarios = usuarios;
    renderUsuariosFiltrados();
  }
}

function iniciarAccionesUsuarios() {
  $("buscarUsuario")?.addEventListener("input", renderUsuariosFiltrados);
  $("filtroRolUsuario")?.addEventListener("change", renderUsuariosFiltrados);
  $("filtroEstadoUsuario")?.addEventListener("change", renderUsuariosFiltrados);

  $("tablaUsuarios")?.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("[data-accion-usuario]");
    if (!boton) return;

    const textos = {
      aprobar: ["Confirmar aprobacion", "Aprobar usuario", "success"],
      rechazar: ["Confirmar rechazo", "Rechazar usuario", "danger"],
      dar_baja: ["Confirmar baja", "Dar de baja", "danger"],
      reactivar: ["Confirmar reactivacion", "Reactivar", "primary"],
    };
    const [titulo, textoConfirmar, variante] = textos[boton.dataset.accionUsuario];
    const confirmado = await Vista.confirmarAccion({
      titulo,
      mensaje: mensajeConfirmacion(`${traducir(textoConfirmar.toLowerCase())} ${boton.dataset.nombre}`),
      textoConfirmar,
      variante,
    });
    if (!confirmado) return;

    const resultado = await ejecutar(
      () => Modelo.cambiarEstadoUsuario(boton.dataset.id, boton.dataset.accionUsuario),
      "Estado de usuario actualizado."
    );
    if (resultado) cargarUsuarios();
  });

  $("tablaUsuarios")?.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("[data-accion-rol]");
    if (!boton) return;

    const textos = {
      aprobar: ["Confirmar rol", "aprobar este rol", "Aprobar", "success"],
      rechazar: ["Confirmar rechazo", "rechazar este rol", "Rechazar", "danger"],
    };
    const [titulo, mensaje, textoConfirmar, variante] = textos[boton.dataset.accionRol];
    const confirmado = await Vista.confirmarAccion({
      titulo,
      mensaje: mensajeConfirmacion(traducir(mensaje)),
      textoConfirmar,
      variante,
    });
    if (!confirmado) return;

    const resultado = await ejecutar(
      () => Modelo.cambiarEstadoRolUsuario(boton.dataset.id, boton.dataset.rol, boton.dataset.accionRol),
      "Rol actualizado."
    );
    if (resultado) cargarUsuarios();
  });
}

function renderUsuariosFiltrados() {
  const texto = ($("buscarUsuario")?.value || "").toLowerCase();
  const rol = $("filtroRolUsuario")?.value || "";
  const estadoFiltro = $("filtroEstadoUsuario")?.value || "";
  const visibles = estado.usuarios.filter((usuario) => {
    const contenido = [usuario.nombre, usuario.apellido, usuario.cedula, usuario.correo, usuario.telefono].join(" ").toLowerCase();
    return (!rol || (usuario.roles_resumen || usuario.rol_solicitado || "").includes(rol)) &&
      (!estadoFiltro || usuario.estado === estadoFiltro) &&
      contenido.includes(texto);
  });
  Vista.renderUsuarios(visibles, estado.usuarios);
}

async function cargarIncidencias() {
  if (!$("tablaIncidencias")) return;
  const scope = document.body.dataset.scope === "mine" ? "mine" : "";
  const incidencias = await ejecutar(() => Modelo.listarIncidencias(scope));
  if (!incidencias) return;
  estado.incidencias = incidencias;
  window.SGRSI_INCIDENCIAS_TOTAL = incidencias;
  renderIncidenciasFiltradas();
}

function iniciarAccionesIncidencias() {
  $("buscarIncidencia")?.addEventListener("input", renderIncidenciasFiltradas);
  $("filtroEstado")?.addEventListener("change", renderIncidenciasFiltradas);

  $("tablaIncidencias")?.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("[data-accion-incidencia]");
    if (!boton) return;
    const incidencia = estado.incidencias.find((item) => String(item.id_ticket) === String(boton.dataset.id));
    if (!incidencia) return;

    if (boton.dataset.accionIncidencia === "aceptar") {
      const confirmado = await Vista.confirmarAccion({
        titulo: "Confirmar incidencia",
        mensaje: mensajeConfirmacion(`${traducir("aceptar la incidencia")} "${incidencia.titulo}"`),
        textoConfirmar: "Aceptar",
        variante: "success",
      });
      if (!confirmado) return;
      const resultado = await ejecutar(() => Modelo.cambiarEstadoIncidencia(incidencia.id_ticket, { estado: "en_proceso", prioridad: incidencia.prioridad || "sin_asignar" }), "Incidencia aceptada.");
      if (resultado) cargarIncidencias();
      return;
    }

    if (boton.dataset.accionIncidencia === "denegar") {
      const confirmado = await Vista.confirmarAccion({
        titulo: "Confirmar denegacion",
        mensaje: mensajeConfirmacion(`${traducir("denegar la incidencia")} "${incidencia.titulo}"`),
        textoConfirmar: "Denegar",
        variante: "danger",
      });
      if (!confirmado) return;
      const resultado = await ejecutar(() => Modelo.cambiarEstadoIncidencia(incidencia.id_ticket, { estado: "cancelada" }), "Incidencia denegada.");
      if (resultado) cargarIncidencias();
      return;
    }

    Vista.abrirModalIncidencia(incidencia, boton.dataset.accionIncidencia === "resolver");
  });

  $("formResolverIncidencia")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const form = evento.target;
    const id = form.id_ticket.value;
    const datos = new FormData();
    datos.append("prioridad", form.prioridad.value);
    datos.append("estado", form.estado.value);
    datos.append("diagnostico", form.diagnostico.value.trim());
    datos.append("solucion_aplicada", form.solucion_aplicada?.value.trim() || "");
    const foto = form.foto?.files?.[0];
    if (foto) datos.append("foto", foto);
    const estadoNuevo = form.estado.value;
    const confirmado = await Vista.confirmarAccion({
      titulo: estadoNuevo === "resuelta" ? "Confirmar resolucion" : "Confirmar cambio",
      mensaje: estadoNuevo === "resuelta" ? "Esta seguro de marcar esta incidencia como resuelta?" : "Esta seguro de actualizar esta incidencia?",
      textoConfirmar: estadoNuevo === "resuelta" ? "Resolver" : "Actualizar",
      variante: "primary",
    });
    if (!confirmado) return;

    const resultado = estadoNuevo === "resuelta"
      ? await ejecutar(() => Modelo.resolverIncidencia(id, datos), "Incidencia resuelta.")
      : await ejecutar(() => Modelo.cambiarEstadoIncidencia(id, Object.fromEntries(datos.entries())), "Incidencia actualizada.");
    if (resultado) {
      Vista.cerrarModalIncidencia();
      cargarIncidencias();
    }
  });

  const campoFoto = $("fotoResolucion");
  campoFoto?.addEventListener("change", () => {
    const archivo = campoFoto.files?.[0] || null;
    if (!archivo) {
      Vista.mostrarVistaPreviaFoto(null);
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      campoFoto.value = "";
      Vista.mostrarVistaPreviaFoto(null);
      Vista.mostrarMensaje("La fotografía debe pesar como máximo 5 MB", "warning");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      campoFoto.value = "";
      Vista.mostrarVistaPreviaFoto(null);
      Vista.mostrarMensaje("La fotografía debe estar en formato JPEG, PNG o WebP", "warning");
      return;
    }
    Vista.mostrarVistaPreviaFoto(archivo);
  });
  $("quitarFotoResolucion")?.addEventListener("click", () => {
    if (campoFoto) campoFoto.value = "";
    Vista.mostrarVistaPreviaFoto(null);
  });
}

function renderIncidenciasFiltradas() {
  const texto = ($("buscarIncidencia")?.value || "").toLowerCase();
  const filtro = $("filtroEstado")?.value || "";
  const visibles = estado.incidencias.filter((item) => {
    const coincideEstado = !filtro || item.estado === filtro;
    const contenido = [item.titulo, item.solicitante, item.equipo, item.codigo_inventario].join(" ").toLowerCase();
    return coincideEstado && contenido.includes(texto);
  });
  Vista.renderIncidencias(visibles, rolDeVista());
}

async function cargarPrestamos() {
  if (!$("tablaPrestamos")) return;
  const scope = document.body.dataset.scope === "mine" ? "mine" : "";
  const prestamos = await ejecutar(() => Modelo.listarPrestamos(scope));
  if (prestamos) Vista.renderPrestamos(prestamos, rolDeVista());
}

function iniciarAccionesPrestamos() {
  $("tablaPrestamos")?.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("[data-accion-prestamo]");
    if (!boton) return;
    const accion = boton.dataset.accionPrestamo;
    if (accion === "devuelto") {
      const form = $("formDevolucionPrestamo");
      if (!form) return;
      form.reset();
      form.id_prestamo.value = boton.dataset.id;
      bootstrap.Modal.getOrCreateInstance($("modalDevolucionPrestamo")).show();
      return;
    }
    const textos = {
      aprobado: ["Confirmar prestamo", "aprobar este prestamo", "Aceptar", "success"],
      rechazado: ["Confirmar denegacion", "denegar este prestamo", "Denegar", "danger"],
      entregado: ["Confirmar entrega", "marcar este prestamo como entregado", "Marcar entregado", "primary"],
      devuelto: ["Confirmar devolucion", "registrar la devolucion del prestamo", "Registrar devolucion", "success"],
    };
    const [titulo, mensaje, textoConfirmar, variante] = textos[accion];
    const confirmado = await Vista.confirmarAccion({
      titulo,
      mensaje: mensajeConfirmacion(traducir(mensaje)),
      textoConfirmar,
      variante,
    });
    if (!confirmado) return;

    const tarea = accion === "entregado"
      ? () => Modelo.entregarPrestamo(boton.dataset.id)
      : () => Modelo.cambiarEstadoPrestamo(boton.dataset.id, accion);
    const resultado = await ejecutar(tarea, "Prestamo actualizado.");
    if (resultado) cargarPrestamos();
  });

  $("formDevolucionPrestamo")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const confirmado = await Vista.confirmarAccion({
      titulo: "Confirmar devolución",
      mensaje: "La devolución actualizará el inventario y regularizará la Black list asociada.",
      textoConfirmar: "Registrar devolución",
      variante: "success",
    });
    if (!confirmado) return;
    const resultado = await ejecutar(() => Modelo.devolverPrestamo(form.id_prestamo.value, {
      condicion: form.condicion.value,
      observaciones: form.observaciones.value.trim(),
    }), "Devolución registrada e inventario actualizado.");
    if (resultado) {
      bootstrap.Modal.getInstance($("modalDevolucionPrestamo"))?.hide();
      cargarPrestamos();
    }
  });
}

async function cargarSolicitudes() {
  if (!$("tablaSolicitudes")) return;
  const scope = document.body.dataset.scope === "mine" ? "mine" : "";
  const solicitudes = await ejecutar(() => Modelo.listarSolicitudes(scope));
  if (solicitudes) {
    estado.solicitudes = solicitudes;
    Vista.renderSolicitudes(solicitudes, rolDeVista());
  }
}

function iniciarAccionesSolicitudes() {
  $("tablaSolicitudes")?.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("[data-accion-solicitud]");
    if (!boton) return;

    const textos = {
      aprobada: ["Confirmar aprobacion", "aprobar esta solicitud", "Aprobar", "success"],
      rechazada: ["Confirmar rechazo", "rechazar esta solicitud", "Rechazar", "danger"],
      en_proceso: ["Confirmar toma", "tomar esta solicitud", "Tomar", "primary"],
      completada: ["Confirmar cierre", "marcar esta solicitud como completada", "Completar", "success"],
      cancelada: ["Confirmar cancelacion", "cancelar esta solicitud", "Cancelar", "danger"],
    };
    const [titulo, mensaje, textoConfirmar, variante] = textos[boton.dataset.accionSolicitud];
    const confirmado = await Vista.confirmarAccion({
      titulo,
      mensaje: mensajeConfirmacion(traducir(mensaje)),
      textoConfirmar,
      variante,
    });
    if (!confirmado) return;

    const resultado = await ejecutar(
      () => Modelo.cambiarEstadoSolicitud(boton.dataset.id, boton.dataset.accionSolicitud),
      "Solicitud actualizada."
    );
    if (resultado) cargarSolicitudes();
  });
}

async function cargarBlacklist() {
  if (!$("tablaBlacklist")) return;
  const lista = await ejecutar(() => Modelo.listarBlacklist());
  if (lista) Vista.renderBlacklist(lista);
}

async function cargarReportes() {
  if (!$("tablaReportesUso")) return;
  const reportes = await ejecutar(() => Modelo.listarReportes());
  if (!reportes) return;

  estado.reportesUso = reportes.usos_sala || [];
  filtrarReportesUso();
}

function filtrarReportesUso() {
  const texto = ($("buscarReporteUso")?.value || "").trim().toLowerCase();
  const desde = $("reporteDesde")?.value || "";
  const hasta = $("reporteHasta")?.value || "";
  const visibles = estado.reportesUso.filter((item) => {
    const contenido = [item.sala, item.tipo_sala, item.docente, item.registrado_por, item.grupo, item.asignatura]
      .join(" ")
      .toLowerCase();
    return (!texto || contenido.includes(texto))
      && (!desde || item.fecha >= desde)
      && (!hasta || item.fecha <= hasta);
  });
  Vista.renderReportesUso(visibles);
}

function iniciarAccionesReportes() {
  ["buscarReporteUso", "reporteDesde", "reporteHasta"].forEach((id) => {
    $(id)?.addEventListener("input", filtrarReportesUso);
  });

  $("btnLimpiarFiltrosReporte")?.addEventListener("click", () => {
    ["buscarReporteUso", "reporteDesde", "reporteHasta"].forEach((id) => { $(id).value = ""; });
    filtrarReportesUso();
  });

  $("tablaReportesUso")?.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-ver-reporte-uso]");
    if (!boton) return;
    const reporte = estado.reportesUso.find((item) => String(item.id_registro) === boton.dataset.verReporteUso);
    if (reporte) Vista.abrirReporteUso(reporte);
  });

  $("btnImprimirReporteUso")?.addEventListener("click", (evento) => {
    const reporte = estado.reportesUso.find((item) => String(item.id_registro) === evento.currentTarget.dataset.idRegistro);
    if (reporte) Vista.imprimirReporteUso(reporte);
  });
}

async function cargarDashboard() {
  if (!document.body.hasAttribute("data-dashboard")) return;
  const metricas = await ejecutar(() => Modelo.obtenerDashboard());
  if (metricas) Vista.renderDashboard(metricas);
}

async function cargarInventario() {
  if (!$("tablaInventario")) return;
  const inventario = await ejecutar(() => Modelo.listarInventario());
  if (!inventario) return;
  estado.inventario = inventario;
  filtrarInventario();
}

function filtrarInventario() {
  const texto = ($("buscarEquipo")?.value || "").trim().toLowerCase();
  const filtro = $("filtroEstadoEquipo")?.value || "";
  const items = estado.inventario.filter((item) => {
    const contenido = [item.codigo_inventario, item.nombre, item.tipo, item.espacio, item.ubicacion_detalle].join(" ").toLowerCase();
    return (!filtro || item.estado === filtro) && contenido.includes(texto);
  });
  Vista.renderInventario(items, estado.usuario?.roles_disponibles || []);
}

function iniciarAccionesInventario() {
  $("buscarEquipo")?.addEventListener("input", filtrarInventario);
  $("filtroEstadoEquipo")?.addEventListener("change", filtrarInventario);
  const abrir = (item = null) => {
    const form = $("formEquipo");
    form.reset();
    form.id_equipo.value = item?.id_equipo || "";
    form.codigo_inventario.value = item?.codigo_inventario || "";
    form.nombre.value = item?.nombre || "";
    form.tipo.value = item?.tipo || "";
    form.id_espacio.value = item?.id_espacio_actual || "";
    form.ubicacion_detalle.value = item?.ubicacion_detalle || "";
    form.estado.value = item?.estado === "prestado" || item?.estado === "baja" ? "disponible" : (item?.estado || "disponible");
    form.fecha_alta.value = item?.fecha_alta || Modelo.hoyISO();
    $("tituloModalEquipo").textContent = item ? `Editar ${item.codigo_inventario}` : "Nuevo equipo";
    bootstrap.Modal.getOrCreateInstance($("modalEquipo")).show();
  };
  $("btnNuevoEquipo")?.addEventListener("click", () => abrir());
  $("tablaInventario")?.addEventListener("click", async (evento) => {
    const editar = evento.target.closest("[data-editar-equipo]");
    const baja = evento.target.closest("[data-baja-equipo]");
    if (editar) abrir(estado.inventario.find((item) => String(item.id_equipo) === editar.dataset.editarEquipo));
    if (!baja) return;
    const confirmado = await Vista.confirmarAccion({ titulo: "Dar de baja", mensaje: "El equipo dejará de estar disponible pero conservará su historial.", textoConfirmar: "Dar de baja", variante: "danger" });
    if (!confirmado) return;
    const resultado = await ejecutar(() => Modelo.darBajaEquipo(baja.dataset.bajaEquipo), "Equipo dado de baja.");
    if (resultado) cargarInventario();
  });
  $("formEquipo")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const datos = Object.fromEntries(new FormData(form).entries());
    const id = datos.id_equipo;
    delete datos.id_equipo;
    const resultado = await ejecutar(() => id ? Modelo.actualizarEquipo(id, datos) : Modelo.crearEquipo(datos), "Inventario actualizado.");
    if (resultado) {
      bootstrap.Modal.getInstance($("modalEquipo"))?.hide();
      cargarInventario();
    }
  });
}

async function cargarHistorial() {
  if (!$("tablaHistorial")) return;
  const parametros = new URLSearchParams();
  if ($("filtroModuloHistorial")?.value) parametros.set("modulo", $("filtroModuloHistorial").value);
  if ($("historialDesde")?.value) parametros.set("desde", $("historialDesde").value);
  if ($("historialHasta")?.value) parametros.set("hasta", $("historialHasta").value);
  const items = await ejecutar(() => Modelo.listarHistorial(parametros.toString()));
  if (items) Vista.renderHistorial(items);
}

async function cargarConocimiento() {
  if (!$("listaConocimiento")) return;
  const parametros = new URLSearchParams();
  if ($("buscarConocimiento")?.value.trim()) parametros.set("q", $("buscarConocimiento").value.trim());
  if ($("filtroCategoriaConocimiento")?.value) parametros.set("id_categoria", $("filtroCategoriaConocimiento").value);
  const items = await ejecutar(() => Modelo.buscarConocimiento(parametros.toString()));
  if (items) Vista.renderConocimiento(items);
}

async function cargarCategoriasGestion() {
  if (!$("tablaCategorias")) return;
  const items = await ejecutar(() => Modelo.listarCategorias(true));
  if (!items) return;
  estado.categorias = items;
  Vista.renderCategorias(items);
}

function iniciarAccionesCategorias() {
  $("formCategoria")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const resultado = await ejecutar(() => Modelo.crearCategoria(Object.fromEntries(new FormData(evento.currentTarget).entries())), "Categoría registrada.");
    if (resultado) { evento.currentTarget.reset(); cargarCategoriasGestion(); }
  });
  $("tablaCategorias")?.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("[data-toggle-categoria]");
    if (!boton) return;
    const item = estado.categorias.find((categoria) => String(categoria.id_categoria) === boton.dataset.toggleCategoria);
    if (!item) return;
    const estadoNuevo = item.estado === "activa" ? "inactiva" : "activa";
    const resultado = await ejecutar(() => Modelo.actualizarCategoria(item.id_categoria, { nombre: item.nombre, descripcion: item.descripcion, estado: estadoNuevo }), "Categoría actualizada.");
    if (resultado) cargarCategoriasGestion();
  });
}

async function cargarTareas() {
  if (!$("tablaTareas")) return;
  const items = await ejecutar(() => Modelo.listarTareas());
  if (!items) return;
  estado.tareas = items;
  Vista.renderTareas(items, estado.usuario?.roles_disponibles || []);
}

function iniciarAccionesTareas() {
  $("btnNuevaTarea")?.addEventListener("click", () => {
    $("formTarea").reset();
    bootstrap.Modal.getOrCreateInstance($("modalTarea")).show();
  });
  $("formTarea")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const resultado = await ejecutar(() => Modelo.crearTarea(Object.fromEntries(new FormData(evento.currentTarget).entries())), "Tarea programada.");
    if (resultado) { bootstrap.Modal.getInstance($("modalTarea"))?.hide(); cargarTareas(); }
  });
  $("tablaTareas")?.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("[data-estado-tarea]");
    if (!boton) return;
    if (boton.dataset.estadoTarea === "completada") {
      $("formResultadoTarea").reset();
      $("formResultadoTarea").id_tarea.value = boton.dataset.id;
      bootstrap.Modal.getOrCreateInstance($("modalResultadoTarea")).show();
      return;
    }
    const resultado = await ejecutar(() => Modelo.cambiarEstadoTarea(boton.dataset.id, { estado: boton.dataset.estadoTarea }), "Tarea iniciada.");
    if (resultado) cargarTareas();
  });
  $("formResultadoTarea")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const resultado = await ejecutar(() => Modelo.cambiarEstadoTarea(form.id_tarea.value, { estado: "completada", resultado: form.resultado.value.trim() }), "Tarea completada.");
    if (resultado) { bootstrap.Modal.getInstance($("modalResultadoTarea"))?.hide(); cargarTareas(); }
  });
}

async function iniciar() {
  iniciarPreferencias();
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
  $("filtroCategoriaConocimiento")?.addEventListener("change", cargarConocimiento);
  await cargarCategoriasGestion();
  iniciarAccionesCategorias();
  await cargarTareas();
  iniciarAccionesTareas();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar);
} else {
  iniciar();
}
