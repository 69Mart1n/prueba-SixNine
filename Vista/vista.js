import { obtenerConfiguracionRegional, traducir } from "./preferencias.js?v=2";

function escapar(valor) {
  const span = document.createElement("span");
  span.textContent = valor ?? "";
  return span.innerHTML;
}

function insignia(valor, mapa, defecto = "secondary") {
  const info = mapa[valor] || { texto: valor || "-", clase: defecto };
  return `<span class="badge text-bg-${info.clase}">${escapar(info.texto)}</span>`;
}

function formatearCambiosHistorial(datos) {
  const etiquetas = {
    estado: "Estado",
    prioridad: "Prioridad",
    tipo: "Tipo",
    rol: "Rol",
    equipo: "Equipo",
    condicion: "Condición",
    titulo: "Título",
  };
  const valores = {
    en_proceso: "En proceso",
    sin_asignar: "Sin asignar",
    pendiente: "Pendiente",
    resuelta: "Resuelta",
    cancelada: "Cancelada",
    aprobada: "Aprobada",
    aprobado: "Aprobado",
    completada: "Completada",
    entregado: "Entregado",
    devuelto: "Devuelto",
    prestado: "Prestado",
    activo: "Activo",
    rechazado: "Rechazado",
    solicitante: "Solicitante",
    administrador: "Administrador",
    tecnico: "Técnico",
    preventiva: "Preventiva",
    reactiva: "Reactiva",
    danado: "Dañado",
    baja: "Baja",
    media: "Media",
    alta: "Alta",
  };
  let cambios = datos;
  if (typeof cambios === "string") {
    try {
      cambios = JSON.parse(cambios);
    } catch {
      return cambios;
    }
  }
  if (!cambios || typeof cambios !== "object" || Array.isArray(cambios)) {
    return "Sin detalle adicional";
  }
  const partes = Object.entries(cambios).map(([clave, valor]) => {
    const etiqueta = etiquetas[clave] || clave.replaceAll("_", " ").replace(/^./, (letra) => letra.toUpperCase());
    const texto = typeof valor === "object" && valor !== null
      ? JSON.stringify(valor)
      : (valores[String(valor)] || String(valor ?? "-").replaceAll("_", " "));
    return `${etiqueta}: ${texto}`;
  });
  return partes.length ? partes.join(" · ") : "Sin detalle adicional";
}

export const Vista = {
  escaparTexto: escapar,
  renderEstadoCuenta(sesion) {
    const configuracion = {
      pendiente: {
        etiqueta: "Pendiente de aprobación",
        titulo: "Tu solicitud está en revisión",
        mensaje: "El equipo administrador debe revisar y aprobar tu cuenta antes de que puedas ingresar a los módulos del sistema.",
        icono: "bi-hourglass-split",
        tono: "warning",
        pasoRevision: "current",
        pasoAcceso: "pending",
      },
      rechazado: {
        etiqueta: "Solicitud rechazada",
        titulo: "Tu solicitud no fue aprobada",
        mensaje: "La solicitud fue rechazada. Si considera que se trata de un error, comuníquese con la administración para solicitar una revisión.",
        icono: "bi-x-circle-fill",
        tono: "danger",
        pasoRevision: "rejected",
        pasoAcceso: "pending",
      },
      bloqueado: {
        etiqueta: "Cuenta dada de baja",
        titulo: "Tu acceso está deshabilitado",
        mensaje: sesion.motivo_bloqueo === "administrativo"
          ? "La cuenta fue dada de baja por la administración. Comuníquese con el centro si necesita solicitar su reactivación."
          : "La cuenta fue bloqueada por seguridad. Comuníquese con la administración para recuperar el acceso.",
        icono: "bi-lock-fill",
        tono: "danger",
        pasoRevision: "done",
        pasoAcceso: "rejected",
      },
    }[sesion.estado_cuenta] || {
      etiqueta: "Acceso no habilitado",
      titulo: "No es posible ingresar todavía",
      mensaje: "Consulte nuevamente el estado o comuníquese con la administración.",
      icono: "bi-info-circle-fill",
      tono: "secondary",
      pasoRevision: "current",
      pasoAcceso: "pending",
    };
    const asignar = (id, texto) => {
      const elemento = document.getElementById(id);
      if (elemento) elemento.textContent = texto;
    };
    const icono = document.getElementById("iconoEstadoCuenta");
    if (icono) icono.className = `bi ${configuracion.icono}`;
    const tarjeta = document.getElementById("tarjetaEstadoCuenta");
    if (tarjeta) tarjeta.dataset.tone = configuracion.tono;
    const insignia = document.getElementById("insigniaEstadoCuenta");
    if (insignia) insignia.className = `badge text-bg-${configuracion.tono}`;
    asignar("insigniaEstadoCuenta", configuracion.etiqueta);
    asignar("tituloEstadoCuenta", configuracion.titulo);
    asignar("mensajeEstadoCuenta", configuracion.mensaje);
    asignar("nombreEstadoCuenta", sesion.nombre || "Usuario");
    asignar("correoEstadoCuenta", sesion.correo || "-");
    asignar("rolEstadoCuenta", this.textoRol(sesion.rol_solicitado));
    asignar("actualizacionEstadoCuenta", this.fechaHora(sesion.fecha_actualizacion_cuenta) || "Sin información");
    const revision = document.getElementById("pasoRevisionCuenta");
    const acceso = document.getElementById("pasoAccesoCuenta");
    if (revision) revision.dataset.state = configuracion.pasoRevision;
    if (acceso) acceso.dataset.state = configuracion.pasoAcceso;
  },
  mostrarMensaje(texto, tipo = "success") {
    const contenedor = document.getElementById("mensaje");
    if (!contenedor) return;

    contenedor.innerHTML = `
      <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${escapar(traducir(texto))}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
      </div>
    `;
  },

  marcarInvalidos(formulario, campos) {
    this.limpiarInvalidos(formulario);
    campos.forEach((campo) => campo.classList.add("is-invalid"));
  },

  limpiarInvalidos(formulario) {
    formulario.querySelectorAll(".is-invalid").forEach((campo) => campo.classList.remove("is-invalid"));
  },

  reiniciarFormulario(formulario) {
    formulario.reset();
    this.limpiarInvalidos(formulario);
  },

  prepararCampos(formulario) {
    formulario.querySelectorAll("input, select, textarea").forEach((campo) => {
      campo.addEventListener("input", () => {
        if (campo.dataset.soloDigitos === "true") campo.value = campo.value.replace(/\D/g, "");
        if (campo.dataset.fechaLatina === "true") campo.value = this.formatearEntradaFecha(campo.value);
        campo.classList.remove("is-invalid");
      });
    });

    formulario.querySelectorAll('[data-solo-hoy="true"]').forEach((campo) => {
      const hoy = this.hoyISO();
      campo.min = hoy;
      campo.max = hoy;
      if (!campo.value) campo.value = hoy;
    });
  },

  iniciarCamposSala() {
    document.querySelectorAll("#formSolicitud, #formUsoSala").forEach((formulario) => {
      const tipo = formulario.querySelector("#tipoSala");
      const sala = formulario.querySelector("#salaSolicitada");
      if (tipo && sala) {
        const cargar = () => {
          sala.innerHTML = '<option value="">Seleccionar sala</option>';
          sala.disabled = !tipo.value;
          if (!tipo.value) {
            sala.innerHTML = '<option value="">Seleccione primero un tipo de sala</option>';
            return;
          }
          for (let numero = 1; numero <= 5; numero += 1) {
            const opcion = document.createElement("option");
            opcion.value = `${tipo.value} ${numero}`;
            opcion.textContent = `${tipo.value} ${numero}`;
            sala.appendChild(opcion);
          }
        };
        tipo.addEventListener("change", cargar);
        cargar();
      }

      const tipoSolicitud = formulario.querySelector("#tipoSolicitud");
      const campoSoftware = formulario.querySelector("#campoSoftware");
      const software = formulario.querySelector("#software");
      if (tipoSolicitud && campoSoftware && software) {
        const actualizar = () => {
          const mostrar = tipoSolicitud.value === "Instalacion de software" || tipoSolicitud.value === "Instalación de software";
          campoSoftware.hidden = !mostrar;
          software.required = mostrar;
          if (!mostrar) software.value = "";
        };
        tipoSolicitud.addEventListener("change", actualizar);
        actualizar();
      }
    });
  },

  iniciarTablaUsoSala() {
    const boton = document.getElementById("btnAgregarAlumno");
    const tabla = document.getElementById("tablaAlumnos");
    const equipo = document.getElementById("numeroEquipo");
    if (!boton || !tabla || !equipo) return;

    const botonImprimir = document.getElementById("btnImprimirUso");
    const actualizarTabla = () => {
      const equiposSeleccionados = new Set(
        [...tabla.querySelectorAll("tr[data-equipo]")].map((fila) => fila.dataset.equipo)
      );
      [...equipo.options].forEach((opcion) => {
        opcion.disabled = Boolean(opcion.value) && equiposSeleccionados.has(opcion.value);
      });
      if (botonImprimir) botonImprimir.disabled = equiposSeleccionados.size === 0;

      if (equiposSeleccionados.size === 0) {
        tabla.innerHTML = '<tr class="usage-empty-row"><td colspan="5">Agregue los equipos y alumnos que utilizaran la sala.</td></tr>';
      } else {
        tabla.querySelector(".usage-empty-row")?.remove();
      }
    };

    equipo.innerHTML = '<option value="">Seleccionar equipo</option>';
    for (let numero = 1; numero <= 16; numero += 1) {
      equipo.insertAdjacentHTML("beforeend", `<option value="Equipo ${numero}">Equipo ${numero}</option>`);
    }

    boton.addEventListener("click", () => {
      const alumno = document.getElementById("alumno");
      if (!equipo.value || !alumno.value.trim()) {
        equipo.classList.toggle("is-invalid", !equipo.value);
        alumno.classList.toggle("is-invalid", !alumno.value.trim());
        return;
      }

      const repetido = [...tabla.querySelectorAll("tr[data-equipo]")]
        .some((fila) => fila.dataset.equipo === equipo.value);
      if (repetido) {
        equipo.classList.add("is-invalid");
        this.mostrarMensaje("Ese equipo ya fue agregado a la planilla.", "warning");
        return;
      }

      const estado = document.getElementById("estadoEquipo").value;
      const observaciones = document.getElementById("obsEquipo").value.trim();
      tabla.querySelector(".usage-empty-row")?.remove();
      tabla.insertAdjacentHTML("beforeend", `
        <tr data-equipo="${escapar(equipo.value)}" data-alumno="${escapar(alumno.value.trim())}" data-estado="${escapar(estado)}" data-observaciones="${escapar(observaciones)}">
          <td>${escapar(equipo.value)}</td>
          <td>${escapar(alumno.value.trim())}</td>
          <td>${escapar(estado)}</td>
          <td>${escapar(observaciones || "-")}</td>
          <td class="usage-row-actions"><button type="button" class="btn btn-sm btn-outline-danger" data-quitar-equipo title="Quitar equipo" aria-label="Quitar ${escapar(equipo.value)}"><i class="bi bi-trash" aria-hidden="true"></i></button></td>
        </tr>
      `);
      equipo.value = "";
      equipo.classList.remove("is-invalid");
      alumno.value = "";
      alumno.classList.remove("is-invalid");
      document.getElementById("obsEquipo").value = "";
      document.getElementById("estadoEquipo").value = "Libre";
      actualizarTabla();
    });

    tabla.addEventListener("click", (evento) => {
      const quitar = evento.target.closest("[data-quitar-equipo]");
      if (!quitar) return;
      quitar.closest("tr")?.remove();
      actualizarTabla();
    });

    botonImprimir?.addEventListener("click", () => {
      this.prepararResumenUsoSala();
      window.print();
    });

    document.getElementById("btnNuevaPlanilla")?.addEventListener("click", () => {
      const formulario = document.getElementById("formUsoSala");
      if (!formulario) return;
      this.reiniciarFormulario(formulario);
      formulario.querySelectorAll("input, select, button").forEach((control) => { control.disabled = false; });
      formulario.dataset.registrado = "false";
      tabla.innerHTML = "";
      document.getElementById("btnNuevaPlanilla").hidden = true;
      document.getElementById("btnRegistrarUso").innerHTML = '<i class="bi bi-check2-circle" aria-hidden="true"></i> Confirmar y registrar';
      document.getElementById("tipoSala")?.dispatchEvent(new Event("change"));
      document.getElementById("btnFechaHoy")?.click();
      actualizarTabla();
      formulario.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    actualizarTabla();
  },

  obtenerEquiposUsoSala() {
    return [...document.querySelectorAll("#tablaAlumnos tr[data-equipo]")].map((fila) => ({
      numeroEquipo: fila.dataset.equipo,
      alumno: fila.dataset.alumno,
      estado: fila.dataset.estado,
      observaciones: fila.dataset.observaciones,
    }));
  },

  prepararResumenUsoSala() {
    const resumen = document.getElementById("resumenImpresionUsoSala");
    if (!resumen) return;

    const valor = (id) => document.getElementById(id)?.value?.trim() || "-";
    resumen.innerHTML = `
      <div class="usage-print-heading">
        <div><strong>SGRSI</strong><span>Planilla de uso de sala</span></div>
      </div>
      <dl>
        <div><dt>Sala</dt><dd>${escapar(valor("salaSolicitada"))} (${escapar(valor("tipoSala"))})</dd></div>
        <div><dt>Fecha y horario</dt><dd>${escapar(valor("fecha"))}, ${escapar(valor("horaEntrada"))} a ${escapar(valor("horaSalida"))}</dd></div>
        <div><dt>Grupo</dt><dd>${escapar(valor("grupo"))}</dd></div>
        <div><dt>Asignatura</dt><dd>${escapar(valor("asignatura"))}</dd></div>
        <div><dt>Docente</dt><dd>${escapar(valor("docente"))}</dd></div>
        <div><dt>Turno</dt><dd>${escapar(valor("turno"))}</dd></div>
        <div class="usage-print-wide"><dt>Observaciones</dt><dd>${escapar(valor("observaciones"))}</dd></div>
      </dl>
    `;
  },

  marcarUsoSalaRegistrado(formulario) {
    formulario.dataset.registrado = "true";
    formulario.querySelectorAll("input, select").forEach((control) => { control.disabled = true; });
    document.getElementById("btnAgregarAlumno").disabled = true;
    const registrar = document.getElementById("btnRegistrarUso");
    registrar.disabled = true;
    registrar.innerHTML = '<i class="bi bi-check-circle-fill" aria-hidden="true"></i> Planilla registrada';
    document.querySelectorAll("[data-quitar-equipo]").forEach((boton) => { boton.disabled = true; });
    document.getElementById("btnNuevaPlanilla").hidden = false;
    this.prepararResumenUsoSala();
  },

  confirmarAccion({ titulo, mensaje, textoConfirmar = "Confirmar", variante = "primary" }) {
    let modal = document.getElementById("modalConfirmacionSgrsi");
    if (!modal) {
      document.body.insertAdjacentHTML("beforeend", `
        <div class="modal fade" id="modalConfirmacionSgrsi" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h2 class="modal-title h5" id="modalConfirmacionTitulo"></h2>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
              </div>
              <div class="modal-body" id="modalConfirmacionMensaje"></div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn" id="modalConfirmacionAceptar"></button>
              </div>
            </div>
          </div>
        </div>
      `);
      modal = document.getElementById("modalConfirmacionSgrsi");
    }

    modal.querySelector("#modalConfirmacionTitulo").textContent = traducir(titulo);
    modal.querySelector("#modalConfirmacionMensaje").textContent = traducir(mensaje);
    const aceptar = modal.querySelector("#modalConfirmacionAceptar");
    aceptar.textContent = traducir(textoConfirmar);
    aceptar.className = `btn btn-${variante}`;

    return new Promise((resolve) => {
      const instancia = bootstrap.Modal.getOrCreateInstance(modal);
      let confirmado = false;
      const confirmar = () => {
        confirmado = true;
        instancia.hide();
      };
      const cerrar = () => {
        aceptar.removeEventListener("click", confirmar);
        modal.removeEventListener("hidden.bs.modal", cerrar);
        resolve(confirmado);
      };
      aceptar.addEventListener("click", confirmar);
      modal.addEventListener("hidden.bs.modal", cerrar);
      instancia.show();
    });
  },

  construirMenu(sesion) {
    const menu = document.getElementById("menuRol");
    if (!menu) return;

    const rol = sesion.rol;
    const roles = sesion.roles_disponibles || [];
    const opcionesPrincipales = {
      administrador: [
        ["inicio", "administrador.html", "bi-house-door", "Inicio"],
        ["usuarios", "usuarios.html", "bi-people-fill", "Usuarios"],
        ["incidencias", "incidencias.html", "bi-ticket-detailed-fill", "Incidencias"],
        ["prestamos", "prestamos-gestion.html", "bi-box-arrow-up-right", "Préstamos"],
        ["laboratorios", "laboratorio.html", "bi-display-fill", "Laboratorios"],
        ["equipos", "equipo.html", "bi-pc-display", "Inventario"],
        ["blacklist", "blacklist.html", "bi-person-fill-slash", "Black list"],
        ["reportes", "reporte.html", "bi-file-earmark-bar-graph-fill", "Reportes"],
        ["categorias", "categorias.html", "bi-tags", "Categorías"],
        ["tareas", "tareas.html", "bi-calendar-check", "Tareas de soporte"],
        ["conocimiento", "conocimiento.html", "bi-journal-check", "Conocimiento"],
        ["historial", "historial.html", "bi-clock-history", "Historial"],
      ],
      tecnico: [
        ["inicio", "tecnico.html", "bi-house-door", "Inicio"],
        ["incidencias", "incidencias.html", "bi-ticket-detailed-fill", "Incidencias"],
        ["prestamos", "prestamos-gestion.html", "bi-box-arrow-up-right", "Préstamos"],
        ["laboratorios", "laboratorio.html", "bi-display-fill", "Laboratorios"],
        ["equipos", "equipo.html", "bi-pc-display", "Equipos"],
        ["blacklist", "blacklist.html", "bi-person-fill-slash", "Black list"],
        ["reportes", "reporte.html", "bi-file-earmark-bar-graph-fill", "Reportes"],
        ["categorias", "categorias.html", "bi-tags", "Categorías"],
        ["tareas", "tareas.html", "bi-calendar-check", "Tareas de soporte"],
        ["conocimiento", "conocimiento.html", "bi-journal-check", "Conocimiento"],
      ],
      solicitante: [
        ["inicio", "solicitante.html", "bi-house-door", "Inicio"],
      ],
    }[rol] || [];
    const opcionesSolicitante = [
      ["uso-sala", "uso-sala.html", "bi-clipboard-data", "Uso de sala"],
      ["laboratorio", "solicitud-servicio.html", "bi-display", "Solicitar laboratorio"],
      ["incidencia", "ticket-incidencia.html", "bi-ticket-detailed", "Reportar incidencia"],
      ["prestamo", "prestamo.html", "bi-box-arrow-up-right", "Solicitar préstamo"],
      ["mis-solicitudes", "mis-solicitudes.html", "bi-folder2-open", "Mis solicitudes"],
    ];
    const grupos = [{ etiqueta: this.textoRol(rol), opciones: opcionesPrincipales }];
    if (roles.includes("solicitante")) {
      grupos.push({ etiqueta: rol === "solicitante" ? "Gestiones personales" : "Solicitante / Docente", opciones: opcionesSolicitante });
    }
    grupos.push({
      etiqueta: "Cuenta",
      opciones: [["solicitar-rol", "solicitar-rol.html", "bi-person-plus", "Solicitar otro rol"]],
    });

    const activo = menu.dataset.active || "inicio";
    menu.innerHTML = grupos.map(({ etiqueta, opciones }) => `
      <li class="menu-section-label">${escapar(etiqueta)}</li>
      ${opciones.map(([id, href, icono, texto]) => `
        <li class="${id === activo ? "active" : ""}"><a href="${href}"><i class="bi ${icono}"></i> ${texto}</a></li>
      `).join("")}
    `).join("");
  },

  actualizarIdentidadPanel(sesion) {
    const nombre = document.getElementById("nombreUsuarioPanel");
    const rol = document.getElementById("rolUsuarioPanel");
    const fecha = document.getElementById("fechaPanel");
    if (nombre) nombre.textContent = sesion.nombre || sesion.correo || "Usuario";
    if (rol) rol.textContent = (sesion.roles_disponibles || [sesion.rol]).map((item) => this.textoRol(item)).join(" · ");
    document.querySelectorAll("[data-requires-role]").forEach((elemento) => {
      const roles = sesion.roles_disponibles || [];
      const requerido = elemento.dataset.requiresRole;
      elemento.hidden = !roles.includes(requerido)
        && !(requerido === "tecnico" && roles.includes("administrador"));
    });
    if (fecha) {
      fecha.textContent = new Intl.DateTimeFormat("es-UY", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date());
    }
  },

  renderDashboard(metricas) {
    document.querySelectorAll("[data-dashboard-key]").forEach((elemento) => {
      const valor = Number(metricas[elemento.dataset.dashboardKey] ?? 0);
      elemento.textContent = String(valor);
    });

    document.querySelectorAll("[data-dashboard-summary]").forEach((elemento) => {
      const valor = Number(metricas[elemento.dataset.dashboardSummary] ?? 0);
      const textoVacio = elemento.dataset.empty || "Sin pendientes";
      const textoUno = elemento.dataset.one || "1 registro";
      const textoVarios = (elemento.dataset.many || "{n} registros").replace("{n}", String(valor));
      elemento.textContent = valor === 0 ? textoVacio : (valor === 1 ? textoUno : textoVarios);
      elemento.classList.toggle("text-success", valor === 0);
      elemento.classList.toggle("text-danger", valor > 0 && elemento.dataset.alert === "true");
    });
  },

  renderUsuarios(usuarios, todos = usuarios) {
    const tbody = document.querySelector("#tablaUsuarios");
    if (!tbody) return;
    this.actualizarResumenUsuarios(todos);

    tbody.innerHTML = usuarios.map((u) => {
      const acciones = [];
      if (u.estado === "pendiente") {
        acciones.push(`<button class="btn btn-success btn-sm" data-accion-usuario="aprobar" data-id="${u.id_usuario}" data-nombre="${escapar(`${u.nombre} ${u.apellido}`)}">Aprobar</button>`);
        acciones.push(`<button class="btn btn-outline-danger btn-sm" data-accion-usuario="rechazar" data-id="${u.id_usuario}" data-nombre="${escapar(`${u.nombre} ${u.apellido}`)}">Rechazar</button>`);
      }
      if (u.estado === "activo") acciones.push(`<button class="btn btn-outline-danger btn-sm" data-accion-usuario="dar_baja" data-id="${u.id_usuario}" data-nombre="${escapar(`${u.nombre} ${u.apellido}`)}">Dar de baja</button>`);
      if (u.estado === "bloqueado") acciones.push(`<button class="btn btn-outline-primary btn-sm" data-accion-usuario="reactivar" data-id="${u.id_usuario}" data-nombre="${escapar(`${u.nombre} ${u.apellido}`)}">Reactivar</button>`);

      return `<tr>
        <td><strong>${escapar(u.nombre)}</strong></td><td>${escapar(u.apellido)}</td><td><span class="font-monospace">${escapar(u.cedula)}</span></td>
        <td><span class="text-break">${escapar(u.correo)}</span></td><td>${escapar(u.telefono)}</td><td>${this.renderRolesUsuario(u)}</td>
        <td>${this.insigniaUsuario(u.estado)}</td><td>${escapar(this.fecha(u.fecha_creacion))}</td>
        <td><div class="table-actions">${acciones.join("") || '<span class="text-muted small">Sin acciones</span>'}</div></td>
      </tr>`;
    }).join("");
  },

  renderRolesUsuario(usuario) {
    const roles = this.parsearRoles(usuario.roles_resumen || `${usuario.rol_solicitado}:${usuario.estado}`);
    return roles.map(({ rol, estado }) => {
      const acciones = estado === "pendiente" && usuario.estado === "activo"
        ? `<button class="btn btn-success btn-sm ms-1" data-accion-rol="aprobar" data-id="${usuario.id_usuario}" data-rol="${escapar(rol)}">Aprobar rol</button>
           <button class="btn btn-outline-danger btn-sm ms-1" data-accion-rol="rechazar" data-id="${usuario.id_usuario}" data-rol="${escapar(rol)}">Rechazar</button>`
        : "";
      return `<div class="mb-1">${this.insigniaRol(rol)} ${this.insigniaUsuario(estado)}${acciones}</div>`;
    }).join("");
  },

  parsearRoles(valor) {
    return String(valor || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [rol, estado = "pendiente"] = item.split(":");
        return { rol, estado };
      });
  },

  actualizarResumenUsuarios(usuarios) {
    const escribir = (id, valor) => {
      const elemento = document.getElementById(id);
      if (elemento) elemento.textContent = valor;
    };
    escribir("usuariosTotal", usuarios.length);
    escribir("usuariosPendientes", usuarios.filter((u) => u.estado === "pendiente").length);
    escribir("usuariosActivos", usuarios.filter((u) => u.estado === "activo").length);
    escribir("usuariosBaja", usuarios.filter((u) => ["bloqueado", "rechazado"].includes(u.estado)).length);
  },

  renderIncidencias(items, rol) {
    const tbody = document.getElementById("tablaIncidencias");
    if (!tbody) return;
    const todas = window.SGRSI_INCIDENCIAS_TOTAL || items;
    document.getElementById("metricaTotalIncidencias") && (document.getElementById("metricaTotalIncidencias").textContent = todas.length);
    document.getElementById("metricaNoResueltas") && (document.getElementById("metricaNoResueltas").textContent = todas.filter((i) => !["resuelta", "cancelada"].includes(i.estado)).length);
    document.getElementById("metricaResueltas") && (document.getElementById("metricaResueltas").textContent = todas.filter((i) => i.estado === "resuelta").length);
    tbody.innerHTML = items.map((item) => {
      const acciones = String(rol).includes("tecnico") ? this.accionesIncidencia(item) : '<span class="text-muted small">Consulta</span>';
      return `<tr>
        <td><strong>${escapar(item.titulo)}</strong></td><td>${escapar(item.solicitante || "-")}</td>
        <td>${escapar(item.categoria || "-")}</td><td>${escapar(item.equipo || item.codigo_inventario || "-")}</td>
        <td>${this.insigniaPrioridad(item.prioridad)}</td>
        <td>${this.insigniaIncidencia(item.estado)}</td><td>${escapar(this.fecha(item.fecha_creacion))}</td>
        <td>${escapar(item.diagnostico || "Pendiente")}${Number(item.tiene_foto_resolucion) === 1 ? `<br><a class="btn btn-outline-primary btn-sm mt-2" href="../../Controlador/api.php/incidencias/${item.id_ticket}/foto-resolucion" target="_blank" rel="noopener"><i class="bi bi-camera-fill" aria-hidden="true"></i> Ver fotografía</a>` : ""}</td><td><div class="table-actions">${acciones}</div></td>
      </tr>`;
    }).join("");
  },

  accionesIncidencia(item) {
    if (["resuelta", "cancelada"].includes(item.estado)) return '<span class="text-muted small">Cerrada</span>';
    if (item.estado === "pendiente") {
      return `
        <button class="btn btn-success btn-sm" data-accion-incidencia="aceptar" data-id="${item.id_ticket}">Aceptar</button>
        <button class="btn btn-outline-danger btn-sm" data-accion-incidencia="denegar" data-id="${item.id_ticket}">Denegar</button>
      `;
    }
    return `
      <button class="btn btn-outline-secondary btn-sm" data-accion-incidencia="clasificar" data-id="${item.id_ticket}">Clasificar</button>
      <button class="btn btn-primary btn-sm" data-accion-incidencia="resolver" data-id="${item.id_ticket}">Resolver</button>
    `;
  },

  abrirModalIncidencia(item, resolver = false) {
    const form = document.getElementById("formResolverIncidencia");
    if (!form) return;
    form.reset();
    form.id_ticket.value = item.id_ticket;
    form.prioridad.value = item.prioridad || "sin_asignar";
    form.estado.value = resolver ? "resuelta" : (item.estado === "pendiente" ? "en_proceso" : item.estado);
    form.diagnostico.value = item.diagnostico || "";
    if (form.solucion_aplicada) form.solucion_aplicada.value = item.solucion_aplicada || "";
    this.mostrarVistaPreviaFoto(null);
    document.getElementById("tituloResolverIncidencia").textContent = item.titulo;
    document.getElementById("camposResolucion").hidden = !resolver;
    document.getElementById("diagnostico").required = resolver;
    const solucion = document.getElementById("solucionAplicada");
    if (solucion) solucion.required = resolver;
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalResolverIncidencia")).show();
  },

  cerrarModalIncidencia() {
    const modal = document.getElementById("modalResolverIncidencia");
    if (modal) bootstrap.Modal.getInstance(modal)?.hide();
  },

  /** Muestra o limpia la vista previa local de la evidencia seleccionada. */
  mostrarVistaPreviaFoto(archivo) {
    const contenedor = document.getElementById("vistaPreviaFotoResolucion");
    const imagen = document.getElementById("imagenPreviaFotoResolucion");
    const nombre = document.getElementById("nombreFotoResolucion");
    if (!contenedor || !imagen || !nombre) return;
    if (imagen.dataset.urlTemporal) URL.revokeObjectURL(imagen.dataset.urlTemporal);
    if (!archivo) {
      imagen.removeAttribute("src");
      delete imagen.dataset.urlTemporal;
      nombre.textContent = "";
      contenedor.hidden = true;
      return;
    }
    const urlTemporal = URL.createObjectURL(archivo);
    imagen.src = urlTemporal;
    imagen.dataset.urlTemporal = urlTemporal;
    nombre.textContent = `${archivo.name} · ${(archivo.size / 1024 / 1024).toFixed(2)} MB`;
    contenedor.hidden = false;
  },

  renderPrestamos(items, rol) {
    const tbody = document.getElementById("tablaPrestamos");
    if (!tbody) return;
    tbody.innerHTML = items.map((item) => `<tr>
      <td>${escapar(item.recurso_solicitado)}</td><td>${escapar(item.nombre_estudiante)}<br><small>${escapar(item.cedula_estudiante)}</small></td>
      <td>${escapar(item.docente_asociado || "-")}</td><td>${escapar(this.fecha(item.fecha_prestamo))}</td>
      <td>${escapar(this.fecha(item.fecha_devolucion_prevista))}</td><td>${this.insigniaPrestamo(item.estado)}</td>
      <td>${escapar(item.motivo || "-")}</td><td><div class="table-actions">${this.accionesPrestamo(item, rol)}</div></td>
    </tr>`).join("");
  },

  accionesPrestamo(item, rol) {
    if (!String(rol).includes("tecnico")) return '<span class="text-muted small">Consulta</span>';
    if (item.estado === "solicitado") {
      return `
        <button class="btn btn-success btn-sm" data-accion-prestamo="aprobado" data-id="${item.id_prestamo}">Aceptar</button>
        <button class="btn btn-outline-danger btn-sm" data-accion-prestamo="rechazado" data-id="${item.id_prestamo}">Denegar</button>
      `;
    }
    if (item.estado === "aprobado") return `<button class="btn btn-primary btn-sm" data-accion-prestamo="entregado" data-id="${item.id_prestamo}">Marcar entregado</button>`;
    if (["entregado", "atrasado"].includes(item.estado)) return `<button class="btn btn-outline-success btn-sm" data-accion-prestamo="devuelto" data-id="${item.id_prestamo}">Registrar devolucion</button>`;
    return '<span class="text-muted small">Cerrado</span>';
  },

  renderSolicitudes(items, rol) {
    const tbody = document.getElementById("tablaSolicitudes");
    if (!tbody) return;
    tbody.innerHTML = items.map((item) => `<tr>
      <td>${escapar(item.tipo_solicitud)}</td><td>${escapar(this.fecha(item.fecha_solicitada))}</td>
      <td>${escapar(item.sala_solicitada)} - ${escapar(item.descripcion)}<br><small>${escapar(item.solicitante || "")}</small></td>
      <td>${this.insigniaSolicitud(item.estado)}</td>
      <td><div class="table-actions">${this.accionesSolicitud(item, rol)}</div></td>
    </tr>`).join("");
  },

  accionesSolicitud(item, rol) {
    if (String(rol).includes("administrador") && item.estado === "pendiente") {
      return `
        <button class="btn btn-success btn-sm" data-accion-solicitud="aprobada" data-id="${item.id_solicitud}">Aprobar</button>
        <button class="btn btn-outline-danger btn-sm" data-accion-solicitud="rechazada" data-id="${item.id_solicitud}">Rechazar</button>
      `;
    }
    if (String(rol).includes("tecnico") && item.estado === "aprobada") {
      return `<button class="btn btn-primary btn-sm" data-accion-solicitud="en_proceso" data-id="${item.id_solicitud}">Tomar</button>`;
    }
    if (String(rol).includes("tecnico") && item.estado === "en_proceso") {
      return `<button class="btn btn-outline-success btn-sm" data-accion-solicitud="completada" data-id="${item.id_solicitud}">Completar</button>`;
    }
    if ((String(rol).includes("administrador") || String(rol).includes("tecnico")) && !["completada", "rechazada", "cancelada"].includes(item.estado)) {
      return `<button class="btn btn-outline-danger btn-sm" data-accion-solicitud="cancelada" data-id="${item.id_solicitud}">Cancelar</button>`;
    }
    return '<span class="text-muted small">Consulta</span>';
  },

  renderReportesUso(items) {
    const tbody = document.getElementById("tablaReportesUso");
    const cantidad = document.getElementById("cantidadReportesUso");
    if (!tbody) return;

    if (cantidad) cantidad.textContent = `${items.length} ${items.length === 1 ? "registro" : "registros"}`;
    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5">No hay planillas que coincidan con los filtros.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map((item) => `
      <tr>
        <td><strong>${escapar(this.fecha(item.fecha))}</strong><br><small class="text-muted">#${escapar(item.id_registro)}</small></td>
        <td>${escapar(item.sala)}<br><small class="text-muted text-capitalize">${escapar(item.tipo_sala)}</small></td>
        <td>${escapar(item.docente)}<br><small class="text-muted">Registró: ${escapar(item.registrado_por)}</small></td>
        <td>${escapar(item.grupo)}<br><small class="text-muted">${escapar(item.asignatura)}</small></td>
        <td>${escapar(this.hora(item.hora_entrada))} a ${escapar(this.hora(item.hora_salida))}<br><small class="text-muted text-capitalize">${escapar(item.turno)}</small></td>
        <td><span class="badge text-bg-light">${escapar(item.cantidad_equipos)}</span></td>
        <td><button type="button" class="btn btn-outline-primary btn-sm" data-ver-reporte-uso="${escapar(item.id_registro)}"><i class="bi bi-eye" aria-hidden="true"></i> Ver detalle</button></td>
      </tr>
    `).join("");
  },

  abrirReporteUso(item) {
    document.getElementById("tituloModalReporteUso").textContent = `Planilla #${item.id_registro} - ${item.sala}`;
    document.getElementById("detalleReporteUso").innerHTML = this.construirDetalleReporteUso(item);
    document.getElementById("btnImprimirReporteUso").dataset.idRegistro = item.id_registro;
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalReporteUso")).show();
  },

  imprimirReporteUso(item) {
    const contenedor = document.getElementById("reporteUsoImpresion");
    if (!contenedor) return;
    contenedor.innerHTML = this.construirDetalleReporteUso(item, true);
    contenedor.setAttribute("aria-hidden", "false");
    document.body.classList.add("printing-report");

    const limpiar = () => {
      document.body.classList.remove("printing-report");
      contenedor.setAttribute("aria-hidden", "true");
    };
    window.addEventListener("afterprint", limpiar, { once: true });
    window.print();
    window.setTimeout(() => {
      if (document.body.classList.contains("printing-report")) limpiar();
    }, 1000);
  },

  construirDetalleReporteUso(item, impresion = false) {
    const filas = (item.equipos || []).map((equipo) => `
      <tr>
        <td>${escapar(equipo.numero_equipo || equipo.codigo_inventario || "-")}</td>
        <td>${escapar(equipo.nombre_alumno || "-")}</td>
        <td class="text-capitalize">${escapar(equipo.estado_reportado || "-")}</td>
        <td>${escapar(equipo.observaciones || "-")}</td>
      </tr>
    `).join("");

    return `
      <div class="report-detail-heading">
        <div><strong>SGRSI</strong><span>Planilla de uso de sala #${escapar(item.id_registro)}</span></div>
        ${impresion ? `<span>${escapar(this.fecha(item.fecha))}</span>` : ""}
      </div>
      <dl class="report-detail-grid">
        <div><dt>Sala</dt><dd>${escapar(item.sala)} (${escapar(item.tipo_sala)})</dd></div>
        <div><dt>Fecha y horario</dt><dd>${escapar(this.fecha(item.fecha))}, ${escapar(this.hora(item.hora_entrada))} a ${escapar(this.hora(item.hora_salida))}</dd></div>
        <div><dt>Grupo</dt><dd>${escapar(item.grupo)}</dd></div>
        <div><dt>Asignatura</dt><dd>${escapar(item.asignatura)}</dd></div>
        <div><dt>Docente</dt><dd>${escapar(item.docente)}</dd></div>
        <div><dt>Turno</dt><dd class="text-capitalize">${escapar(item.turno)}</dd></div>
        <div><dt>Registrado por</dt><dd>${escapar(item.registrado_por)}<br><small>${escapar(item.correo_registrante)}</small></dd></div>
        <div class="report-detail-wide"><dt>Observaciones generales</dt><dd>${escapar(item.observaciones || "-")}</dd></div>
      </dl>
      <div class="table-responsive">
        <table class="table report-detail-table">
          <thead><tr><th>Equipo</th><th>Alumno</th><th>Estado</th><th>Observaciones</th></tr></thead>
          <tbody>${filas || '<tr><td colspan="4" class="text-center text-muted">Sin equipos registrados.</td></tr>'}</tbody>
        </table>
      </div>
    `;
  },

  renderBlacklist(items) {
    const tbody = document.getElementById("tablaBlacklist");
    if (!tbody) return;
    const estudiantes = new Set(items.map((item) => item.cedula_estudiante)).size;
    const equiposRetenidos = items.filter((item) => item.estado === "activo").length;
    const docentes = new Set(items.map((item) => item.docente_asociado).filter(Boolean)).size;
    const metricas = {
      metricaEstudiantesBlacklist: estudiantes,
      metricaEquiposBlacklist: equiposRetenidos,
      metricaDocentesBlacklist: docentes,
    };
    Object.entries(metricas).forEach(([id, valor]) => {
      const elemento = document.getElementById(id);
      if (elemento) elemento.textContent = String(valor);
    });
    tbody.innerHTML = items.length ? items.map((item) => `<tr>
      <td>${escapar(item.nombre_estudiante)}<br><small>${escapar(item.cedula_estudiante)}</small></td>
      <td>${escapar(item.grupo)}</td><td>${escapar(item.motivo)}</td><td>${escapar(item.docente_asociado)}</td>
      <td>${escapar(this.fecha(item.fecha_ingreso))}</td><td>${escapar(item.dias_atraso)}</td><td>${this.insigniaPrestamo(item.estado)}</td>
    </tr>`).join("") : '<tr><td colspan="7" class="text-center text-muted py-5">No hay registros en la Black list.</td></tr>';
  },

  insigniaUsuario: (estado) => insignia(estado, {
    pendiente: { texto: "Pendiente", clase: "warning" },
    activo: { texto: "Activo", clase: "success" },
    bloqueado: { texto: "Bloqueado", clase: "secondary" },
    rechazado: { texto: "Rechazado", clase: "danger" },
  }),
  insigniaRol: (rol) => insignia(rol, {
    administrador: { texto: "Administrador", clase: "primary" },
    tecnico: { texto: "Técnico", clase: "info" },
    solicitante: { texto: "Solicitante", clase: "secondary" },
  }),
  textoRol(rol) {
    return {
      administrador: "Admin / Coordinador",
      tecnico: "Técnico",
      solicitante: "Solicitante / Docente",
    }[rol] || rol;
  },

  renderInventario(items, roles) {
    const tbody = document.getElementById("tablaInventario");
    if (!tbody) return;
    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5">No hay equipos que coincidan con los filtros.</td></tr>';
      return;
    }
    const administra = roles.includes("administrador");
    tbody.innerHTML = items.map((item) => `<tr>
      <td><strong class="font-monospace">${escapar(item.codigo_inventario)}</strong></td>
      <td>${escapar(item.nombre)}</td><td>${escapar(item.tipo)}</td>
      <td>${escapar(item.espacio || item.ubicacion_detalle || "Sin asignar")}</td>
      <td>${this.insigniaEquipo(item.estado)}</td><td>${escapar(this.fecha(item.ultima_revision) || "Sin movimientos")}</td>
      <td>${administra && item.estado !== "baja" ? `<div class="table-actions"><button class="btn btn-outline-primary btn-sm" data-editar-equipo="${item.id_equipo}"><i class="bi bi-pencil"></i> Editar</button><button class="btn btn-outline-danger btn-sm" data-baja-equipo="${item.id_equipo}" ${item.estado === "prestado" ? "disabled" : ""}><i class="bi bi-archive"></i> Baja</button></div>` : '<span class="text-muted small">Consulta</span>'}</td>
    </tr>`).join("");
  },

  renderHistorial(items) {
    const tbody = document.getElementById("tablaHistorial");
    if (!tbody) return;
    tbody.innerHTML = items.length ? items.map((item) => `<tr><td>${escapar(this.fechaHora(item.fecha))}</td><td class="text-capitalize">${escapar(item.modulo)}</td><td class="text-capitalize">${escapar(item.accion.replaceAll("_", " "))}</td><td>${escapar(item.entidad)}${item.id_entidad ? ` #${item.id_entidad}` : ""}</td><td>${escapar(formatearCambiosHistorial(item.datos_nuevos))}</td></tr>`).join("") : '<tr><td colspan="5" class="text-center text-muted py-5">No hay acciones para los filtros elegidos.</td></tr>';
  },

  renderConocimiento(items) {
    const lista = document.getElementById("listaConocimiento");
    if (!lista) return;
    lista.innerHTML = items.length ? items.map((item) => `<article class="knowledge-entry"><header><div><span>${escapar(item.categoria || "Sin categoría")}</span><h2>${escapar(item.titulo)}</h2></div><small>${escapar(item.codigo_inventario || "General")}</small></header><dl><div><dt>Diagnóstico</dt><dd>${escapar(item.diagnostico)}</dd></div><div><dt>Solución aplicada</dt><dd>${escapar(item.solucion_aplicada)}</dd></div></dl></article>`).join("") : '<div class="empty-state"><p class="fw-bold">Sin soluciones coincidentes</p><p>La base se completa automáticamente al resolver incidencias.</p></div>';
  },

  renderCategorias(items) {
    const tbody = document.getElementById("tablaCategorias");
    if (!tbody) return;
    tbody.innerHTML = items.map((item) => `<tr><td><strong>${escapar(item.nombre)}</strong></td><td>${escapar(item.descripcion || "-")}</td><td>${item.estado === "activa" ? '<span class="badge text-bg-success">Activa</span>' : '<span class="badge text-bg-secondary">Inactiva</span>'}</td><td><button class="btn btn-sm btn-outline-${item.estado === "activa" ? "danger" : "success"}" data-toggle-categoria="${item.id_categoria}">${item.estado === "activa" ? "Desactivar" : "Activar"}</button></td></tr>`).join("");
  },

  renderTareas(items, roles) {
    const tbody = document.getElementById("tablaTareas");
    if (!tbody) return;
    const tecnico = roles.includes("tecnico") || roles.includes("administrador");
    tbody.innerHTML = items.length ? items.map((item) => `<tr><td>${escapar(this.fechaHora(item.fecha_programada))}</td><td class="text-capitalize">${escapar(item.tipo)}</td><td><strong>${escapar(item.titulo)}</strong><br><small>${escapar(item.descripcion)}</small></td><td>${escapar(item.equipo || item.espacio || "General")}</td><td>${this.insigniaTarea(item.estado)}</td><td>${escapar(item.resultado || "-")}</td><td>${tecnico && item.estado === "pendiente" ? `<button class="btn btn-primary btn-sm" data-estado-tarea="en_proceso" data-id="${item.id_tarea}"><i class="bi bi-play-fill"></i> Iniciar</button>` : tecnico && item.estado === "en_proceso" ? `<button class="btn btn-success btn-sm" data-estado-tarea="completada" data-id="${item.id_tarea}"><i class="bi bi-check2"></i> Completar</button>` : '<span class="text-muted small">Consulta</span>'}</td></tr>`).join("") : '<tr><td colspan="7" class="text-center text-muted py-5">No hay tareas programadas.</td></tr>';
  },
  insigniaIncidencia: (estado) => insignia(estado, {
    pendiente: { texto: "Pendiente", clase: "danger" },
    en_proceso: { texto: "En proceso", clase: "warning" },
    resuelta: { texto: "Resuelta", clase: "success" },
    cancelada: { texto: "Cancelada", clase: "secondary" },
  }),
  insigniaPrioridad: (prioridad) => insignia(prioridad, {
    sin_asignar: { texto: "Sin asignar", clase: "light" },
    baja: { texto: "Baja", clase: "info" },
    media: { texto: "Media", clase: "secondary" },
    alta: { texto: "Alta", clase: "warning" },
  }),
  insigniaPrestamo: (estado) => insignia(estado, {
    solicitado: { texto: "Solicitado", clase: "warning" },
    aprobado: { texto: "Aprobado", clase: "primary" },
    entregado: { texto: "Entregado", clase: "info" },
    devuelto: { texto: "Devuelto", clase: "success" },
    atrasado: { texto: "Atrasado", clase: "danger" },
    rechazado: { texto: "Rechazado", clase: "secondary" },
    cancelado: { texto: "Cancelado", clase: "secondary" },
    activo: { texto: "Activo", clase: "danger" },
    regularizado: { texto: "Regularizado", clase: "success" },
  }),
  insigniaEquipo: (estado) => insignia(estado, {
    disponible: { texto: "Disponible", clase: "success" },
    prestado: { texto: "Prestado", clase: "primary" },
    en_reparacion: { texto: "En reparación", clase: "warning" },
    fuera_de_servicio: { texto: "Fuera de servicio", clase: "danger" },
    baja: { texto: "Baja", clase: "secondary" },
  }),
  insigniaTarea: (estado) => insignia(estado, {
    pendiente: { texto: "Pendiente", clase: "warning" },
    en_proceso: { texto: "En proceso", clase: "primary" },
    completada: { texto: "Completada", clase: "success" },
    cancelada: { texto: "Cancelada", clase: "secondary" },
  }),
  insigniaSolicitud: (estado) => insignia(estado, {
    pendiente: { texto: "Pendiente", clase: "warning" },
    aprobada: { texto: "Aprobada", clase: "success" },
    rechazada: { texto: "Rechazada", clase: "danger" },
    en_proceso: { texto: "En proceso", clase: "primary" },
    completada: { texto: "Completada", clase: "success" },
    cancelada: { texto: "Cancelada", clase: "secondary" },
  }),

  fecha(valor) {
    if (!valor) return "";
    const fechaSimple = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    if (fechaSimple) {
      return new Date(Number(fechaSimple[1]), Number(fechaSimple[2]) - 1, Number(fechaSimple[3])).toLocaleDateString("es-UY");
    }
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? valor : fecha.toLocaleDateString("es-UY");
  },

  hora(valor) {
    return String(valor || "").slice(0, 5);
  },

  fechaHora(valor) {
    if (!valor) return "";
    const fecha = new Date(String(valor).replace(" ", "T"));
    return Number.isNaN(fecha.getTime()) ? valor : fecha.toLocaleString("es-UY", { dateStyle: "short", timeStyle: "short" });
  },

  formatearEntradaFecha(valor) {
    const digitos = valor.replace(/\D/g, "").slice(0, 8);
    return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4, 8)].filter(Boolean).join("/");
  },

  hoyISO() {
    const fecha = new Date();
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
  },
};
