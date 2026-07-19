/**
 * Modelo de usuarios de la maqueta.
 * Contiene credenciales de prueba y no se conecta a una base de datos.
 */
class UsuarioModel {
  /**
   * Inicializa los usuarios de demostracion disponibles en la maqueta frontend.
   */
  constructor() {
    this.usuarios = [
      {
        email: "admin@sgrsi.edu",
        password: "admin",
        rol: "admin",
        nombre: "Administrador",
      },
      {
        email: "tecnico@sgrsi.edu",
        password: "tecnico",
        rol: "tecnico",
        nombre: "Técnico",
      },
      {
        email: "docente@sgrsi.edu",
        password: "docente",
        rol: "solicitante",
        nombre: "Docente solicitante",
      },
    ];
  }

  /**
   * Busca un usuario cuyas credenciales coincidan exactamente con las recibidas.
   * @param {string} email Correo ingresado en el login.
   * @param {string} password Contrasena ingresada en el login.
   * @returns {{email: string, rol: string, nombre: string}|null} Usuario seguro o null.
   */
  validarCredenciales(email, password) {
    const usuario = this.usuarios.find(
      (item) => item.email === email && item.password === password
    );

    if (!usuario) return null;

    return {
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre,
    };
  }

  /**
   * Traduce un rol a la pagina principal que le corresponde.
   * @param {string} rol Rol del usuario autenticado.
   * @returns {string} Nombre del archivo de destino.
   */
  obtenerPaginaPorRol(rol) {
    const paginas = {
      admin: "admin.html",
      tecnico: "tecnico.html",
      solicitante: "solicitante.html",
    };

    return paginas[rol] || "login.html";
  }
}

window.UsuarioModel = UsuarioModel;
