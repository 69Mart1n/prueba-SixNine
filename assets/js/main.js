/**
 * Punto de entrada de la maqueta SGRSI.
 * Carga la estructura MVC y ejecuta la inicialización general.
 */
(function () {
  const archivosMVC = [
    "Modelo/UsuarioModel.js",
    "Modelo/FormularioModel.js",
    "Vista/MensajeView.js",
    "Vista/FormularioView.js",
    "Vista/MenuView.js",
    "Controlador/AuthController.js",
    "Controlador/FormularioController.js",
    "Controlador/NavegacionController.js",
  ];

  const versionMVC = "8";
  const baseUrl = new URL(".", document.currentScript.src);

  /**
   * Inserta un archivo JavaScript en el documento y avisa cuando termina de cargar.
   * @param {string} ruta Ruta relativa al directorio de main.js.
   * @returns {Promise<void>} Promesa resuelta al cargar o rechazada si falla.
   */
  function cargarScript(ruta) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL(`${ruta}?v=${versionMVC}`, baseUrl).href;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`No se pudo cargar ${ruta}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Carga los archivos MVC en orden para que cada dependencia exista a tiempo.
   * @returns {Promise<void>} Promesa completada cuando todos los archivos cargaron.
   */
  async function cargarMVC() {
    for (const archivo of archivosMVC) {
      await cargarScript(archivo);
    }
  }

  /**
   * Ejecuta una funcion cuando el DOM ya puede consultarse de forma segura.
   * @param {Function} callback Funcion que se debe ejecutar al estar listo el DOM.
   */
  function cuandoDocumentoEsteListo(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
      return;
    }

    callback();
  }

  /**
   * Crea modelos, vistas y controladores; protege la pagina e inicia sus eventos.
   * Tambien expone las instancias en window.SGRSI para facilitar su inspeccion.
   */
  function iniciarAplicacion() {
    const models = {
      usuarioModel: new UsuarioModel(),
      formularioModel: new FormularioModel(),
    };

    const views = {
      mensajeView: new MensajeView(),
      formularioView: new FormularioView(),
      menuView: new MenuView(),
    };

    const authController = new AuthController(
      models.usuarioModel,
      views.mensajeView
    );

    const controllers = {
      authController,
      formularioController: new FormularioController(
        models.formularioModel,
        views.formularioView,
        views.mensajeView
      ),
      navegacionController: new NavegacionController(
        authController,
        views.menuView
      ),
    };

    window.SGRSI = {
      models,
      views,
      controllers,
    };

    const rolesDeclarados = controllers.authController.obtenerRolesPermitidos();

    if (rolesDeclarados.length > 0) {
      controllers.authController.protegerPagina(rolesDeclarados);
    }

    controllers.authController.iniciarLogin();
    controllers.navegacionController.iniciar();
    controllers.formularioController.iniciar();
  }

  cargarMVC()
    .then(() => cuandoDocumentoEsteListo(iniciarAplicacion))
    .catch((error) => {
      console.error("Error al inicializar SGRSI:", error);
    });
})();
