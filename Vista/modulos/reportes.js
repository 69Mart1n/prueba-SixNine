import { escapar, insignia, nombreTipoSolicitud, formatearCambiosHistorial } from "./ayudas.js";
import { obtenerConfiguracionRegional, traducir } from "../preferencias.js?v=11";

/** Presenta los datos de reportes sin consultar la API. */
export const vistaReportes = {
/** Dibuja reportes uso con los datos recibidos. Entradas: items. Salida: valor calculado o pantalla actualizada. */
renderReportesUso(items) {
    const tbody = document.getElementById("tablaReportesUso");
    const cantidad = document.getElementById("cantidadReportesUso");
    if (!tbody) return;

    if (cantidad)
      cantidad.textContent = `${items.length} ${items.length === 1 ? "registro" : "registros"}`;
    if (items.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="text-center text-muted py-5">No hay planillas que coincidan con los filtros.</td></tr>';
      return;
    }

    tbody.innerHTML = items
      .map(
        (item) => `
      <tr>
        <td><strong>${escapar(this.fecha(item.fecha))}</strong><br><small class="text-muted">#${escapar(item.id_registro)}</small></td>
        <td>${escapar(item.sala)}<br><small class="text-muted text-capitalize">${escapar(item.tipo_sala)}</small></td>
        <td>${escapar(item.docente)}<br><small class="text-muted">Registró: ${escapar(item.registrado_por)}</small></td>
        <td>${escapar(item.grupo)}<br><small class="text-muted">${escapar(item.asignatura)}</small></td>
        <td>${escapar(this.hora(item.hora_entrada))} a ${escapar(this.hora(item.hora_salida))}<br><small class="text-muted text-capitalize">${escapar(item.turno)}</small></td>
        <td><span class="badge text-bg-light">${escapar(item.cantidad_equipos)}</span></td>
        <td><button type="button" class="btn btn-outline-primary btn-sm" data-ver-reporte-uso="${escapar(item.id_registro)}"><i class="bi bi-eye" aria-hidden="true"></i> Ver detalle</button></td>
      </tr>
    `,
      )
      .join("");
  },

  /** Muestra reporte uso al usuario. Entradas: item. Salida: valor calculado o pantalla actualizada. */
  abrirReporteUso(item) {
    document.getElementById("tituloModalReporteUso").textContent =
      `Planilla #${item.id_registro} - ${item.sala}`;
    document.getElementById("detalleReporteUso").innerHTML =
      this.construirDetalleReporteUso(item);
    document.getElementById("btnImprimirReporteUso").dataset.idRegistro =
      item.id_registro;
    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("modalReporteUso"),
    ).show();
  },

  /** Realiza la operación «imprimir reporte uso» en este módulo. Entradas: item. Salida: valor calculado o pantalla actualizada. */
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

  /** Realiza la operación «construir detalle reporte uso» en este módulo. Entradas: item, impresion. Salida: valor calculado o pantalla actualizada. */
  construirDetalleReporteUso(item, impresion = false) {
    const filas = (item.equipos || [])
      .map(
        (equipo) => `
      <tr>
        <td>${escapar(equipo.numero_equipo || equipo.codigo_inventario || "-")}</td>
        <td>${escapar(equipo.nombre_alumno || "-")}</td>
        <td class="text-capitalize">${escapar(equipo.estado_reportado || "-")}</td>
        <td>${escapar(equipo.observaciones || "-")}</td>
      </tr>
    `,
      )
      .join("");

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

  /** Dibuja blacklist con los datos recibidos. Entradas: items. Salida: valor calculado o pantalla actualizada. */
  renderBlacklist(items) {
    const tbody = document.getElementById("tablaBlacklist");
    if (!tbody) return;
    const estudiantes = new Set(items.map((item) => item.cedula_estudiante))
      .size;
    const equiposRetenidos = items.filter(
      (item) => item.estado === "activo",
    ).length;
    const docentes = new Set(
      items.map((item) => item.docente_asociado).filter(Boolean),
    ).size;
    const metricas = {
      metricaEstudiantesBlacklist: estudiantes,
      metricaEquiposBlacklist: equiposRetenidos,
      metricaDocentesBlacklist: docentes,
    };
    Object.entries(metricas).forEach(([id, valor]) => {
      const elemento = document.getElementById(id);
      if (elemento) elemento.textContent = String(valor);
    });
    tbody.innerHTML = items.length
      ? items
          .map(
            (item) => `<tr>
      <td>${escapar(item.nombre_estudiante)}<br><small>${escapar(item.cedula_estudiante)}</small></td>
      <td>${escapar(item.grupo)}</td><td>${escapar(item.motivo)}</td><td>${escapar(item.docente_asociado)}</td>
      <td>${escapar(this.fecha(item.fecha_ingreso))}</td><td>${escapar(item.dias_atraso)}</td><td>${this.insigniaPrestamo(item.estado)}</td>
    </tr>`,
          )
          .join("")
      : '<tr><td colspan="7" class="text-center text-muted py-5">No hay registros en la Black list.</td></tr>';
  },

  /** Realiza la operación «insignia usuario» en este módulo. Entradas: estado. Salida: valor calculado o pantalla actualizada. */
  insigniaUsuario: (estado) =>
    insignia(estado, {
      pendiente: { texto: "Pendiente", clase: "warning" },
      activo: { texto: "Activo", clase: "success" },
      bloqueado: { texto: "Bloqueado", clase: "secondary" },
      rechazado: { texto: "Rechazado", clase: "danger" },
    }),
  /** Realiza la operación «insignia rol» en este módulo. Entradas: rol. Salida: valor calculado o pantalla actualizada. */
  insigniaRol: (rol) =>
    insignia(rol, {
      administrador: { texto: "Administrador", clase: "primary" },
      tecnico: { texto: "Técnico", clase: "info" },
      solicitante: { texto: "Solicitante", clase: "secondary" },
    }),
};
