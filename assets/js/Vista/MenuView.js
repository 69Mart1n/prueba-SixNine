/**
 * Vista encargada de construir el menú lateral según el rol.
 */
class MenuView {
  /**
   * Define las opciones de navegacion disponibles para cada rol del sistema.
   */
  constructor() {
    this.opcionesPorRol = {
      solicitante: [
        ["inicio", "solicitante.html", "bi-house-door", "Inicio"],
        ["uso-sala", "uso-sala.html", "bi-clipboard-data", "Uso de sala"],
        ["laboratorio", "solicitud-servicio.html", "bi-display", "Solicitar laboratorio"],
        ["incidencia", "ticket-incidencia.html", "bi-ticket-detailed", "Reportar incidencia"],
        ["prestamo", "prestamo.html", "bi-box-arrow-up-right", "Prestamo"],
        ["mis-solicitudes", "mis-solicitudes.html", "bi-folder2-open", "Mis solicitudes"],
      ],
      tecnico: [
        ["inicio", "tecnico.html", "bi-house-door", "Inicio"],
        ["incidencias", "incidencias.html", "bi-ticket-detailed-fill", "Incidencias"],
        ["laboratorios", "laboratorio.html", "bi-display-fill", "Laboratorios"],
        ["equipos", "equipo.html", "bi-pc-display", "Equipos"],
      ],
      admin: [
        ["inicio", "admin.html", "bi-house-door", "Inicio"],
        ["usuarios", "usuarios.html", "bi-people-fill", "Usuarios"],
        ["incidencias", "incidencias.html", "bi-ticket-detailed-fill", "Incidencias"],
        ["laboratorios", "laboratorio.html", "bi-display-fill", "Laboratorios"],
        ["equipos", "equipo.html", "bi-pc-display", "Equipos"],
        ["reportes", "reporte.html", "bi-file-earmark-bar-graph-fill", "Reportes"],
      ],
    };
  }

  /**
   * Genera el menu del rol indicado y resalta la opcion de la pagina actual.
   * @param {string|null} rol Rol almacenado en la sesion.
   */
  construir(rol) {
    const menu = document.getElementById("menuRol");
    if (!menu) return;

    const activo = menu.dataset.active || "inicio";
    const opciones = this.opcionesPorRol[rol] || [];

    menu.innerHTML = opciones
      .map(
        ([id, href, icono, texto]) => `
          <li class="${id === activo ? "active" : ""}">
            <a href="${href}"><i class="bi ${icono}"></i> ${texto}</a>
          </li>
        `
      )
      .join("");
  }
}

window.MenuView = MenuView;
