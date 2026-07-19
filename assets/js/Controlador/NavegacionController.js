/**
 * Controlador de navegación general de la maqueta frontend.
 */
class NavegacionController {
  /**
   * Guarda los componentes encargados de la sesion y del menu lateral.
   * @param {AuthController} authController Controlador de autenticacion.
   * @param {MenuView} menuView Vista que construye el menu por rol.
   */
  constructor(authController, menuView) {
    this.authController = authController;
    this.menuView = menuView;
  }

  /**
   * Activa todas las funciones de navegacion disponibles en la pagina.
   */
  iniciar() {
    this.iniciarMenu();
    this.iniciarCerrarSesion();
    this.iniciarSidebarResponsive();
  }

  /**
   * Construye el menu correspondiente al rol de la sesion actual.
   */
  iniciarMenu() {
    this.menuView.construir(this.authController.obtenerRolActual());
  }

  /**
   * Conecta el boton Salir con la limpieza de la sesion.
   */
  iniciarCerrarSesion() {
    const botonSalir = document.getElementById("btnSalir");
    if (botonSalir) {
      botonSalir.addEventListener("click", (evento) =>
        this.authController.cerrarSesion(evento)
      );
    }
  }

  /**
   * Permite mostrar u ocultar la barra lateral en pantallas reducidas.
   */
  iniciarSidebarResponsive() {
    const boton = document.getElementById("sidebarCollapse");
    const sidebar = document.getElementById("sidebar");

    if (!boton || !sidebar) return;

    boton.addEventListener("click", () => sidebar.classList.toggle("active"));
  }
}

window.NavegacionController = NavegacionController;
