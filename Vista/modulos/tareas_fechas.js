import { escapar, insignia, nombreTipoSolicitud, formatearCambiosHistorial } from "./ayudas.js";
import { obtenerConfiguracionRegional, traducir } from "../preferencias.js?v=11";

/** Presenta los datos de tareas fechas sin consultar la API. */
export const vistaTareasFechas = {
/** Dibuja tareas con los datos recibidos. Entradas: items, roles. Salida: valor calculado o pantalla actualizada. */
renderTareas(items, roles) {
    const tbody = document.getElementById("tablaTareas");
    if (!tbody) return;
    const tecnico = roles.includes("tecnico");
    const administrador = roles.includes("administrador");
    tbody.innerHTML = items.length
      ? items
          .map((item) => {
            const acciones = [];
            if (tecnico && item.estado === "pendiente") {
              acciones.push(`<button class="btn btn-primary btn-sm" data-estado-tarea="en_proceso" data-id="${item.id_tarea}"><i class="bi bi-play-fill"></i> Iniciar</button>`);
            }
            if (tecnico && item.estado === "en_proceso") {
              acciones.push(`<button class="btn btn-success btn-sm" data-estado-tarea="completada" data-id="${item.id_tarea}"><i class="bi bi-check2"></i> Completar</button>`);
            }
            if (administrador && ["pendiente", "en_proceso"].includes(item.estado)) {
              acciones.push(`<button class="btn btn-outline-danger btn-sm" data-cancelar-tarea="${item.id_tarea}">Cancelar</button>`);
            }
            return `<tr><td>${escapar(this.fechaHora(item.fecha_programada))}</td><td class="text-capitalize">${escapar(item.tipo)}</td><td><strong>${escapar(item.titulo)}</strong><br><small>${escapar(item.descripcion)}</small></td><td>${escapar(item.equipo || item.espacio || "General")}</td><td>${this.insigniaTarea(item.estado)}</td><td>${escapar(item.resultado || "-")}</td><td><div class="table-actions">${acciones.join("") || '<span class="text-muted small">Consulta</span>'}</div></td></tr>`;
          })
          .join("")
      : '<tr><td colspan="7" class="text-center text-muted py-5">No hay tareas programadas.</td></tr>';
  },
  /** Realiza la operación «insignia incidencia» en este módulo. Entradas: estado. Salida: valor calculado o pantalla actualizada. */
  insigniaIncidencia: (estado) =>
    insignia(estado, {
      pendiente: { texto: "Pendiente", clase: "danger" },
      en_proceso: { texto: "En proceso", clase: "warning" },
      resuelta: { texto: "Resuelta", clase: "success" },
      cancelada: { texto: "Cancelada", clase: "secondary" },
    }),
  /** Realiza la operación «insignia prioridad» en este módulo. Entradas: prioridad. Salida: valor calculado o pantalla actualizada. */
  insigniaPrioridad: (prioridad) =>
    insignia(prioridad, {
      sin_asignar: { texto: "Sin asignar", clase: "light" },
      baja: { texto: "Baja", clase: "info" },
      media: { texto: "Media", clase: "secondary" },
      alta: { texto: "Alta", clase: "warning" },
    }),
  /** Realiza la operación «insignia prestamo» en este módulo. Entradas: estado. Salida: valor calculado o pantalla actualizada. */
  insigniaPrestamo: (estado) =>
    insignia(estado, {
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
  /** Realiza la operación «insignia equipo» en este módulo. Entradas: estado. Salida: valor calculado o pantalla actualizada. */
  insigniaEquipo: (estado) =>
    insignia(estado, {
      disponible: { texto: "Disponible", clase: "success" },
      prestado: { texto: "Prestado", clase: "primary" },
      en_reparacion: { texto: "En reparación", clase: "warning" },
      fuera_de_servicio: { texto: "Fuera de servicio", clase: "danger" },
      baja: { texto: "Baja", clase: "secondary" },
    }),
  /** Realiza la operación «insignia tarea» en este módulo. Entradas: estado. Salida: valor calculado o pantalla actualizada. */
  insigniaTarea: (estado) =>
    insignia(estado, {
      pendiente: { texto: "Pendiente", clase: "warning" },
      en_proceso: { texto: "En proceso", clase: "primary" },
      completada: { texto: "Completada", clase: "success" },
      cancelada: { texto: "Cancelada", clase: "secondary" },
    }),
  /** Realiza la operación «insignia solicitud» en este módulo. Entradas: estado. Salida: valor calculado o pantalla actualizada. */
  insigniaSolicitud: (estado) =>
    insignia(estado, {
      pendiente: { texto: "Pendiente", clase: "warning" },
      aprobada: { texto: "Aprobada", clase: "success" },
      rechazada: { texto: "Rechazada", clase: "danger" },
      en_proceso: { texto: "En proceso", clase: "primary" },
      completada: { texto: "Completada", clase: "success" },
      cancelada: { texto: "Cancelada", clase: "secondary" },
    }),

  /** Presenta una fecha con formato local uruguayo. Entradas: valor. Salida: valor calculado o pantalla actualizada. */
  fecha(valor) {
    if (!valor) return "";
    const fechaSimple = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    if (fechaSimple) {
      return new Date(
        Number(fechaSimple[1]),
        Number(fechaSimple[2]) - 1,
        Number(fechaSimple[3]),
      ).toLocaleDateString("es-UY");
    }
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime())
      ? valor
      : fecha.toLocaleDateString("es-UY");
  },

  /** Presenta una hora sin los segundos. Entradas: valor. Salida: valor calculado o pantalla actualizada. */
  hora(valor) {
    return String(valor || "").slice(0, 5);
  },

  /** Presenta fecha y hora con formato local. Entradas: valor. Salida: valor calculado o pantalla actualizada. */
  fechaHora(valor) {
    if (!valor) return "";
    const fecha = new Date(String(valor).replace(" ", "T"));
    return Number.isNaN(fecha.getTime())
      ? valor
      : fecha.toLocaleString("es-UY", {
          dateStyle: "short",
          timeStyle: "short",
        });
  },

  /** Añade barras mientras se escribe una fecha. Entradas: valor. Salida: valor calculado o pantalla actualizada. */
  formatearEntradaFecha(valor) {
    const digitos = valor.replace(/\D/g, "").slice(0, 8);
    return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4, 8)]
      .filter(Boolean)
      .join("/");
  },

  /** Devuelve la fecha de hoy en formato ISO. Entradas: ninguna. Salida: valor calculado o pantalla actualizada. */
  hoyISO() {
    const fecha = new Date();
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
  },
};
