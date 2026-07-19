/**
 * Controlador de formularios.
 * Coordina eventos entre FormularioModel, FormularioView y MensajeView.
 */
class FormularioController {
  /**
   * Recibe las capas que validan, presentan y notifican el estado del formulario.
   * @param {FormularioModel} formularioModel Modelo de validacion.
   * @param {FormularioView} formularioView Vista de estados visuales.
   * @param {MensajeView} mensajeView Vista de mensajes al usuario.
   */
  constructor(formularioModel, formularioView, mensajeView) {
    this.formularioModel = formularioModel;
    this.formularioView = formularioView;
    this.mensajeView = mensajeView;
    this.formularios = [
      "formTicket",
      "formSolicitud",
      "formPrestamo",
      "formUsoSala",
      "formRegistro",
    ];
  }

  /**
   * Localiza los formularios conocidos y registra sus eventos de correccion y envio.
   */
  iniciar() {
    this.formularios.forEach((idFormulario) => {
      const formulario = document.getElementById(idFormulario);
      if (!formulario) return;

      this.formularioView.escucharCorrecciones(formulario);
      formulario.addEventListener("submit", (evento) =>
        this.procesar(evento, formulario)
      );
    });
  }

  /**
   * Evita el envio real, valida los campos y muestra el resultado al usuario.
   * Cuando la validacion es correcta, reinicia el formulario.
   * @param {SubmitEvent} evento Evento de envio recibido.
   * @param {HTMLFormElement} formulario Formulario que se debe procesar.
   */
  procesar(evento, formulario) {
    evento.preventDefault();

    const resultado = this.formularioModel.validarFormulario(formulario);

    if (!resultado.valido) {
      this.formularioView.marcarInvalidos(formulario, resultado.camposInvalidos);
      this.mensajeView.mostrar(
        this.obtenerMensajeError(resultado.camposInvalidos),
        "warning"
      );
      return;
    }

    this.mensajeView.mostrar(this.obtenerMensajeExito(formulario.id), "success");
    this.formularioView.reiniciar(formulario);
  }

  /**
   * Devuelve el mensaje de exito apropiado para cada tipo de formulario.
   * @param {string} idFormulario Identificador del formulario procesado.
   * @returns {string} Mensaje que se mostrara en pantalla.
   */
  obtenerMensajeExito(idFormulario) {
    if (idFormulario === "formRegistro") {
      return "Solicitud de registro validada. Queda pendiente de aprobacion.";
    }

    return "Formulario validado correctamente. En futuras entregas se enviara al servidor.";
  }

  /**
   * Devuelve un mensaje de error mas preciso segun los campos invalidos.
   * @param {HTMLElement[]} camposInvalidos Campos que no superaron la validacion.
   * @returns {string} Mensaje de error para mostrar.
   */
  obtenerMensajeError(camposInvalidos) {
    const fechaNoActual = camposInvalidos.some(
      (campo) => campo.dataset.todayOnly === "true"
    );

    if (fechaNoActual) {
      return "La incidencia solo puede registrarse con la fecha actual.";
    }

    const fechaPasada = camposInvalidos.some(
      (campo) =>
        campo.dataset.noPast === "true" &&
        this.formularioModel.fechaLatinaValida(campo.value) &&
        !this.formularioModel.fechaNoEsPasada(campo.value)
    );

    if (fechaPasada) {
      return "No se puede registrar una fecha anterior a la fecha actual.";
    }

    const fechaInvalida = camposInvalidos.some(
      (campo) => campo.dataset.dateLatin === "true"
    );

    if (fechaInvalida) {
      return "Ingrese una fecha valida con formato dd/mm/aaaa.";
    }

    return "Por favor, complete correctamente los campos obligatorios.";
  }
}

window.FormularioController = FormularioController;
