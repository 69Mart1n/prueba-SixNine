import { escapar, insignia, nombreTipoSolicitud, formatearCambiosHistorial } from "./ayudas.js";
import { obtenerConfiguracionRegional, traducir } from "../preferencias.js?v=11";

/** Presenta los datos de panel sin consultar la API. */
export const vistaPanel = {
/** Realiza la operación «actualizar identidad panel» en este módulo. Entradas: sesion. Salida: valor calculado o pantalla actualizada. */
actualizarIdentidadPanel(sesion) {
    const nombre = document.getElementById("nombreUsuarioPanel");
    const rol = document.getElementById("rolUsuarioPanel");
    const fecha = document.getElementById("fechaPanel");
    if (nombre)
      nombre.textContent = sesion.nombre || sesion.correo || "Usuario";
    if (rol)
      rol.textContent = (sesion.roles_disponibles || [sesion.rol])
        .map((item) => this.textoRol(item))
        .join(" · ");
    document.querySelectorAll("[data-requires-role]").forEach((elemento) => {
      const roles = sesion.roles_disponibles || [];
      const requerido = elemento.dataset.requiresRole;
      elemento.hidden =
        !roles.includes(requerido) &&
        !(requerido === "tecnico" && roles.includes("administrador"));
    });
    if (fecha) {
      fecha.textContent = new Intl.DateTimeFormat("es-UY", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date());
    }
  },

  /** Dibuja dashboard con los datos recibidos. Entradas: metricas. Salida: valor calculado o pantalla actualizada. */
  renderDashboard(metricas) {
    document.querySelectorAll("[data-dashboard-key]").forEach((elemento) => {
      const valor = Number(metricas[elemento.dataset.dashboardKey] ?? 0);
      elemento.textContent = String(valor);
    });

    document
      .querySelectorAll("[data-dashboard-summary]")
      .forEach((elemento) => {
        const valor = Number(metricas[elemento.dataset.dashboardSummary] ?? 0);
        const textoVacio = elemento.dataset.empty || "Sin pendientes";
        const textoUno = elemento.dataset.one || "1 registro";
        const textoVarios = (elemento.dataset.many || "{n} registros").replace(
          "{n}",
          String(valor),
        );
        elemento.textContent =
          valor === 0 ? textoVacio : valor === 1 ? textoUno : textoVarios;
        elemento.classList.toggle("text-success", valor === 0);
        elemento.classList.toggle(
          "text-danger",
          valor > 0 && elemento.dataset.alert === "true",
        );
      });
  },
};
