import { escapar, insignia, nombreTipoSolicitud, formatearCambiosHistorial } from "./ayudas.js";
import { obtenerConfiguracionRegional, traducir } from "../preferencias.js?v=11";

/** Presenta los datos de prestamos solicitudes sin consultar la API. */
export const vistaPrestamosSolicitudes = {
/** Dibuja prestamos con los datos recibidos. Entradas: items, rol. Salida: valor calculado o pantalla actualizada. */
renderPrestamos(items, rol) {
    const tbody = document.getElementById("tablaPrestamos");
    if (!tbody) return;
    if (items.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="8" class="text-center text-muted py-5">No hay préstamos registrados.</td></tr>';
      return;
    }
    tbody.innerHTML = items
      .map(
        (item) => `<tr>
      <td>${escapar(item.recurso_solicitado)}</td><td>${escapar(item.nombre_estudiante)}<br><small>${escapar(item.cedula_estudiante)}</small></td>
      <td>${escapar(item.docente_asociado || "-")}</td><td>${escapar(this.fecha(item.fecha_prestamo))}</td>
      <td>${escapar(this.fecha(item.fecha_devolucion_prevista))}</td><td>${this.insigniaPrestamo(item.estado)}</td>
      <td>${escapar(item.motivo || "-")}</td><td><div class="table-actions">${this.accionesPrestamo(item, rol)}</div></td>
    </tr>`,
      )
      .join("");
  },

  /** Construye las acciones disponibles para prestamo. Entradas: item, rol. Salida: valor calculado o pantalla actualizada. */
  accionesPrestamo(item, rol) {
    if (!String(rol).includes("tecnico"))
      return '<span class="text-muted small">Consulta</span>';
    if (item.estado === "solicitado") {
      return `
        <button class="btn btn-success btn-sm" data-accion-prestamo="aprobado" data-id="${item.id_prestamo}">Aceptar</button>
        <button class="btn btn-outline-danger btn-sm" data-accion-prestamo="rechazado" data-id="${item.id_prestamo}">Denegar</button>
      `;
    }
    if (item.estado === "aprobado")
      return `<button class="btn btn-primary btn-sm" data-accion-prestamo="entregado" data-id="${item.id_prestamo}">Marcar entregado</button>
        <button class="btn btn-outline-danger btn-sm" data-accion-prestamo="cancelado" data-id="${item.id_prestamo}">Cancelar</button>`;
    if (["entregado", "atrasado"].includes(item.estado))
      return `<button class="btn btn-outline-success btn-sm" data-accion-prestamo="devuelto" data-id="${item.id_prestamo}">Registrar devolucion</button>`;
    return '<span class="text-muted small">Cerrado</span>';
  },

  /** Dibuja solicitudes con los datos recibidos. Entradas: items, rol. Salida: valor calculado o pantalla actualizada. */
  renderSolicitudes(items, rol) {
    const tbody = document.getElementById("tablaSolicitudes");
    if (!tbody) return;
    if (items.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted py-5">No hay solicitudes registradas.</td></tr>';
      return;
    }
    tbody.innerHTML = items
      .map(
        (item) => `<tr>
      <td>${escapar(nombreTipoSolicitud(item.tipo_solicitud))}</td><td>${escapar(this.fecha(item.fecha_solicitada))}</td>
      <td>${escapar(item.sala_solicitada)} - ${escapar(item.descripcion)}<br><small>${escapar(item.solicitante || "")}</small></td>
      <td>${this.insigniaSolicitud(item.estado)}</td>
      <td><div class="table-actions">${this.accionesSolicitud(item, rol)}</div></td>
    </tr>`,
      )
      .join("");
  },

  /** Construye las acciones disponibles para solicitud. Entradas: item, rol. Salida: valor calculado o pantalla actualizada. */
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
    if (
      String(rol).includes("administrador") &&
      !["completada", "rechazada", "cancelada"].includes(item.estado)
    ) {
      return `<button class="btn btn-outline-danger btn-sm" data-accion-solicitud="cancelada" data-id="${item.id_solicitud}">Cancelar</button>`;
    }
    return '<span class="text-muted small">Consulta</span>';
  },
};
