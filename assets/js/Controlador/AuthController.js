/**
 * Controlador de autenticación.
 * Coordina el login simulado entre UsuarioModel y MensajeView.
 */
class AuthController {
  /**
   * Guarda las dependencias necesarias para validar usuarios y mostrar mensajes.
   * @param {UsuarioModel} usuarioModel Modelo que contiene los usuarios de prueba.
   * @param {MensajeView} mensajeView Vista utilizada para informar el resultado.
   */
  constructor(usuarioModel, mensajeView) {
    this.usuarioModel = usuarioModel;
    this.mensajeView = mensajeView;
  }

  /**
   * Busca el formulario de login y conecta su envio con el metodo login.
   * Si la pagina no contiene el formulario, no realiza ninguna accion.
   */
  iniciarLogin() {
    const formulario = document.getElementById("formLogin");
    if (formulario) formulario.addEventListener("submit", (evento) => this.login(evento));
  }

  /**
   * Valida las credenciales, guarda la sesion y redirige segun el rol.
   * @param {SubmitEvent} evento Evento de envio del formulario de acceso.
   */
  login(evento) {
    evento.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const usuario = this.usuarioModel.validarCredenciales(email, password);

    if (!usuario) {
      this.mensajeView.mostrar("Usuario o contraseña incorrectos.", "danger");
      return;
    }

    sessionStorage.setItem("usuarioSGRSI", usuario.email);
    sessionStorage.setItem("rolSGRSI", usuario.rol);
    sessionStorage.setItem("nombreSGRSI", usuario.nombre);

    window.location.href = this.usuarioModel.obtenerPaginaPorRol(usuario.rol);
  }

  /**
   * Elimina los datos de la sesion actual y vuelve a la pagina de login.
   * @param {Event} [evento] Evento opcional del enlace para cerrar sesion.
   */
  cerrarSesion(evento) {
    if (evento) evento.preventDefault();

    sessionStorage.removeItem("usuarioSGRSI");
    sessionStorage.removeItem("rolSGRSI");
    sessionStorage.removeItem("nombreSGRSI");

    window.location.href = "login.html";
  }

  /**
   * Protege la pagina usando los roles declarados en el atributo data-roles.
   */
  protegerPaginaActual() {
    const roles = this.obtenerRolesPermitidos();
    if (roles.length === 0) return;

    this.protegerPagina(roles);
  }

  /**
   * Comprueba si el rol almacenado puede entrar en la pagina actual.
   * Redirige al login cuando no existe una sesion valida o el rol no coincide.
   * @param {string[]} rolesPermitidos Lista de roles autorizados.
   */
  protegerPagina(rolesPermitidos) {
    const rolUsuario = sessionStorage.getItem("rolSGRSI");

    if (!rolUsuario || !rolesPermitidos.includes(rolUsuario)) {
      window.location.href = "login.html";
    }
  }

  /**
   * Lee y convierte en una lista los roles definidos en el elemento body.
   * @returns {string[]} Roles permitidos para la pagina actual.
   */
  obtenerRolesPermitidos() {
    const roles = document.body.dataset.roles;
    if (!roles) return [];

    return roles.split(" ").filter(Boolean);
  }

  /**
   * Obtiene el rol del usuario guardado en sessionStorage.
   * @returns {string|null} Rol actual o null cuando no hay sesion.
   */
  obtenerRolActual() {
    return sessionStorage.getItem("rolSGRSI");
  }
}

window.AuthController = AuthController;
