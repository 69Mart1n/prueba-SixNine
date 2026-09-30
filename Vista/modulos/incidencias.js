import { escapar, insignia, nombreTipoSolicitud, formatearCambiosHistorial } from "./ayudas.js";
import { obtenerConfiguracionRegional, traducir } from "../preferencias.js?v=11";

/** Presenta los datos de incidencias sin consultar la API. */
export const vistaIncidencias = {
/** Dibuja incidencias con los datos recibidos. Entradas: items, rol. Salida: valor calculado o pantalla actualizada. */
renderIncidencias(items, rol) {
    const tbody = document.getElementById("tablaIncidencias");
    if (!tbody) return;
    const todas = window.SGRSI_INCIDENCIAS_TOTAL || items;
    document.getElementById("metricaTotalIncidencias") &&
      (document.getElementById("metricaTotalIncidencias").textContent =
        todas.length);
    document.getElementById("metricaNoResueltas") &&
      (document.getElementById("metricaNoResueltas").textContent = todas.filter(
        (i) => !["resuelta", "cancelada"].includes(i.estado),
      ).length);
    document.getElementById("metricaResueltas") &&
      (document.getElementById("metricaResueltas").textContent = todas.filter(
        (i) => i.estado === "resuelta",
      ).length);
    tbody.innerHTML = items
      .map((item) => {
        const acciones = String(rol).includes("tecnico")
          ? this.accionesIncidencia(item)
          : '<span class="text-muted small">Consulta</span>';
        const responsables = item.tecnico_principal
          ? `<strong>${escapar(item.tecnico_principal)}</strong>${item.colaborador ? `<br><small class="text-muted"><i class="bi bi-people-fill" aria-hidden="true"></i> ${escapar(item.colaborador)}</small>` : '<br><small class="text-muted">Sin colaborador</small>'}`
          : '<span class="text-muted small">Sin asignar</span>';
        return `<tr>
        <td><strong>${escapar(item.titulo)}</strong></td><td>${escapar(item.solicitante || "-")}</td>
        <td>${escapar(item.categoria || "-")}</td><td>${escapar(item.equipo || item.codigo_inventario || "-")}</td>
        <td>${this.insigniaPrioridad(item.prioridad)}</td>
        <td>${this.insigniaIncidencia(item.estado)}</td><td>${responsables}</td><td>${escapar(this.fecha(item.fecha_creacion))}</td>
        <td>${this.detalleTrabajoIncidencia(item)}${Number(item.tiene_foto_resolucion) === 1 ? `<br><a class="btn btn-outline-primary btn-sm mt-2" href="../../Controlador/api.php/incidencias/${item.id_ticket}/foto-resolucion" target="_blank" rel="noopener"><i class="bi bi-camera-fill" aria-hidden="true"></i> Ver fotografía</a>` : ""}</td><td><div class="table-actions">${acciones}</div></td>
      </tr>`;
      })
      .join("");
  },

  // Muestra el dato útil según la etapa del ticket.
  // - Ticket abierto: última nota de seguimiento.
  // - Ticket resuelto: diagnóstico final.
  /** Realiza la operación «detalle trabajo incidencia» en este módulo. Entradas: item. Salida: valor calculado o pantalla actualizada. */
  detalleTrabajoIncidencia(item) {
    if (item.estado === "resuelta") {
      return escapar(item.diagnostico || "Sin diagnóstico");
    }
    if (item.nota_seguimiento) {
      const fecha = item.fecha_seguimiento
        ? `<br><small class="text-muted">${escapar(this.fecha(item.fecha_seguimiento))}</small>`
        : "";
      return `<span>${escapar(item.nota_seguimiento)}</span>${fecha}`;
    }
    return '<span class="text-muted">Sin seguimiento registrado</span>';
  },

  /** Construye las acciones disponibles para incidencia. Entradas: item. Salida: valor calculado o pantalla actualizada. */
  accionesIncidencia(item) {
    if (["resuelta", "cancelada"].includes(item.estado))
      return '<span class="text-muted small">Cerrada</span>';
    if (item.estado === "pendiente") {
      return `
        <button class="btn btn-success btn-sm" data-accion-incidencia="aceptar" data-id="${item.id_ticket}">Aceptar</button>
        <button class="btn btn-outline-danger btn-sm" data-accion-incidencia="denegar" data-id="${item.id_ticket}">Denegar</button>
      `;
    }
    if (Number(item.es_participante) !== 1) {
      return `<button class="btn btn-outline-primary btn-sm" data-accion-incidencia="unirse-codigo" data-id="${item.id_ticket}"><i class="bi bi-key" aria-hidden="true"></i> Unirse con código</button>`;
    }
    const generarCodigo =
      Number(item.es_responsable_principal) === 1 && !item.id_colaborador
        ? `<button class="btn btn-outline-primary btn-sm" data-accion-incidencia="generar-codigo" data-id="${item.id_ticket}"><i class="bi bi-shield-lock" aria-hidden="true"></i> Generar código</button>`
        : "";
    return `
      <button class="btn btn-outline-secondary btn-sm" data-accion-incidencia="clasificar" data-id="${item.id_ticket}">Clasificar</button>
      <button class="btn btn-primary btn-sm" data-accion-incidencia="resolver" data-id="${item.id_ticket}">Resolver</button>
      ${generarCodigo}
    `;
  },

  /** Muestra modal unirse colaboracion al usuario. Entradas: item. Salida: valor calculado o pantalla actualizada. */
  abrirModalUnirseColaboracion(item) {
    const modal = document.getElementById("modalColaboracionIncidencia");
    const form = document.getElementById("formUnirseColaboracion");
    const panel = document.getElementById("panelCodigoGenerado");
    if (!modal || !form || !panel) return;
    form.reset();
    form.id_ticket.value = item.id_ticket;
    form.hidden = false;
    panel.hidden = true;
    document.getElementById("tituloColaboracionIncidencia").textContent =
      "Unirse al ticket";
    document.getElementById("nombreTicketColaboracion").textContent =
      item.titulo;
    const instancia = bootstrap.Modal.getOrCreateInstance(modal);
    modal.addEventListener(
      "shown.bs.modal",
      () => document.getElementById("codigoColaboracion")?.focus(),
      { once: true },
    );
    instancia.show();
  },

  /** Muestra codigo colaboracion al usuario. Entradas: item, datos. Salida: valor calculado o pantalla actualizada. */
  mostrarCodigoColaboracion(item, datos) {
    const modal = document.getElementById("modalColaboracionIncidencia");
    const form = document.getElementById("formUnirseColaboracion");
    const panel = document.getElementById("panelCodigoGenerado");
    if (!modal || !form || !panel) return;
    form.hidden = true;
    panel.hidden = false;
    document.getElementById("tituloColaboracionIncidencia").textContent =
      "Código para colaborar";
    document.getElementById("nombreTicketColaboracion").textContent =
      item.titulo;
    document.getElementById("codigoColaboracionMostrado").textContent =
      datos.codigo;
    bootstrap.Modal.getOrCreateInstance(modal).show();
  },

  /** Muestra modal incidencia al usuario. Entradas: item, resolver. Salida: valor calculado o pantalla actualizada. */
  abrirModalIncidencia(item, resolver = false) {
    const form = document.getElementById("formResolverIncidencia");
    if (!form) return;
    form.reset();
    form.id_ticket.value = item.id_ticket;
    form.prioridad.value = item.prioridad || "sin_asignar";
    form.estado.value = resolver
      ? "resuelta"
      : item.estado === "pendiente"
        ? "en_proceso"
        : item.estado;
    form.diagnostico.value = item.diagnostico || "";
    if (form.solucion_aplicada)
      form.solucion_aplicada.value = item.solucion_aplicada || "";
    if (form.nota_seguimiento)
      form.nota_seguimiento.value = item.nota_seguimiento || "";
    this.mostrarVistaPreviaFoto(null);
    document.getElementById("tituloResolverIncidencia").textContent =
      item.titulo;

    // En una actualización normal se pide una nota de seguimiento.
    // Al resolver, se piden diagnóstico y solución final.
    const camposSeguimiento = document.getElementById("camposSeguimiento");
    const notaSeguimiento = document.getElementById("notaSeguimiento");
    if (camposSeguimiento) camposSeguimiento.hidden = resolver;
    if (notaSeguimiento) notaSeguimiento.required = !resolver;
    document.getElementById("camposResolucion").hidden = !resolver;
    document.getElementById("diagnostico").required = resolver;
    const solucion = document.getElementById("solucionAplicada");
    if (solucion) solucion.required = resolver;
    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("modalResolverIncidencia"),
    ).show();
  },

  /** Realiza la operación «cerrar modal incidencia» en este módulo. Entradas: ninguna. Salida: valor calculado o pantalla actualizada. */
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
    if (imagen.dataset.urlTemporal)
      URL.revokeObjectURL(imagen.dataset.urlTemporal);
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
};
