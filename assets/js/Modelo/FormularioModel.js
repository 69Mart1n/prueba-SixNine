/**
 * Modelo de formularios.
 * Define reglas de validacion frontend y no guarda datos.
 */
class FormularioModel {
  /**
   * Revisa campos obligatorios, patrones, correos y fechas del formulario recibido.
   * @param {HTMLFormElement} formulario Formulario que se desea validar.
   * @returns {{valido: boolean, camposInvalidos: HTMLElement[]}} Resultado completo.
   */
  validarFormulario(formulario) {
    const camposInvalidos = [];

    this.obtenerCamposValidables(formulario).forEach((campo) => {
      if (campo.required && !this.campoTieneValor(campo)) {
        camposInvalidos.push(campo);
      }

      if (campo.type === "email" && campo.value.trim() && !this.emailValido(campo.value)) {
        camposInvalidos.push(campo);
      }

      if (campo.value.trim() && !this.patronValido(campo)) {
        camposInvalidos.push(campo);
      }

      if (campo.dataset.dateLatin === "true" && !this.fechaLatinaValida(campo.value)) {
        camposInvalidos.push(campo);
      }

      if (campo.dataset.noPast === "true" && !this.fechaNoEsPasada(campo.value)) {
        camposInvalidos.push(campo);
      }

      if (campo.dataset.todayOnly === "true" && !this.fechaISOEsHoy(campo.value)) {
        camposInvalidos.push(campo);
      }
    });

    this.validarReglasDelFormulario(formulario, camposInvalidos);

    return {
      valido: camposInvalidos.length === 0,
      camposInvalidos: [...new Set(camposInvalidos)],
    };
  }

  /**
   * Devuelve los campos que deben participar en la validacion manual.
   * @param {HTMLFormElement} formulario Formulario que se desea validar.
   * @returns {HTMLElement[]} Campos habilitados para validar.
   */
  obtenerCamposValidables(formulario) {
    return [...formulario.querySelectorAll("input, select, textarea")].filter(
      (campo) => !campo.disabled && campo.type !== "hidden"
    );
  }

  /**
   * Comprueba que un campo tenga contenido distinto de espacios.
   * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} campo Campo a revisar.
   * @returns {boolean} true cuando el campo contiene un valor.
   */
  campoTieneValor(campo) {
    return campo.value.trim() !== "";
  }

  /**
   * Comprueba que un correo tenga una estructura basica usuario@dominio.
   * @param {string} email Correo que se desea validar.
   * @returns {boolean} true cuando el formato es valido.
   */
  emailValido(email) {
    if (!email.trim()) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  /**
   * Valida el atributo pattern del campo cuando existe.
   * @param {HTMLInputElement|HTMLTextAreaElement} campo Campo a revisar.
   * @returns {boolean} true cuando no hay patron o el valor coincide.
   */
  patronValido(campo) {
    if (!campo.pattern) return true;
    return new RegExp(`^(?:${campo.pattern})$`).test(campo.value.trim());
  }

  /**
   * Comprueba fechas con formato latinoamericano dd/mm/aaaa.
   * @param {string} valor Fecha escrita por el usuario.
   * @returns {boolean} true cuando la fecha existe en calendario.
   */
  fechaLatinaValida(valor) {
    return this.convertirFechaLatina(valor) !== null;
  }

  /**
   * Comprueba que una fecha dd/mm/aaaa sea hoy o futura.
   * @param {string} valor Fecha escrita por el usuario.
   * @returns {boolean} true cuando no esta en el pasado.
   */
  fechaNoEsPasada(valor) {
    const fecha = this.convertirFechaLatina(valor);
    if (!fecha) return false;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fecha >= hoy;
  }

  /**
   * Comprueba que una fecha yyyy-mm-dd sea exactamente hoy.
   * @param {string} valor Fecha nativa de input date.
   * @returns {boolean} true cuando coincide con la fecha actual.
   */
  fechaISOEsHoy(valor) {
    return valor === this.formatearFechaISO(this.hoy());
  }

  /**
   * Devuelve la fecha actual normalizada.
   * @returns {Date} Fecha de hoy sin hora.
   */
  hoy() {
    const fecha = new Date();
    fecha.setHours(0, 0, 0, 0);
    return fecha;
  }

  /**
   * Formatea una fecha como yyyy-mm-dd para input date.
   * @param {Date} fecha Fecha que se desea mostrar.
   * @returns {string} Fecha formateada.
   */
  formatearFechaISO(fecha) {
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  /**
   * Convierte dd/mm/aaaa en Date si el calendario es valido.
   * @param {string} valor Fecha escrita por el usuario.
   * @returns {Date|null} Fecha normalizada o null.
   */
  convertirFechaLatina(valor) {
    const coincidencia = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor.trim());
    if (!coincidencia) return null;

    const dia = Number(coincidencia[1]);
    const mes = Number(coincidencia[2]);
    const anio = Number(coincidencia[3]);
    const fecha = new Date(anio, mes - 1, dia);

    if (
      fecha.getFullYear() !== anio ||
      fecha.getMonth() !== mes - 1 ||
      fecha.getDate() !== dia
    ) {
      return null;
    }

    fecha.setHours(0, 0, 0, 0);
    return fecha;
  }

  /**
   * Aplica reglas entre campos del mismo formulario.
   * @param {HTMLFormElement} formulario Formulario validado.
   * @param {HTMLElement[]} camposInvalidos Lista mutable de campos invalidos.
   */
  validarReglasDelFormulario(formulario, camposInvalidos) {
    if (formulario.id === "formPrestamo") {
      this.validarRangoFechas(
        formulario,
        "fechaPrestamo",
        "fechaDevolucion",
        camposInvalidos
      );
    }

    if (formulario.id === "formUsoSala") {
      this.validarRangoHoras(
        formulario,
        "horaEntrada",
        "horaSalida",
        camposInvalidos
      );
    }
  }

  /**
   * Exige que la segunda fecha sea igual o posterior a la primera.
   * @param {HTMLFormElement} formulario Formulario validado.
   * @param {string} idInicio Campo de fecha inicial.
   * @param {string} idFin Campo de fecha final.
   * @param {HTMLElement[]} camposInvalidos Lista mutable de campos invalidos.
   */
  validarRangoFechas(formulario, idInicio, idFin, camposInvalidos) {
    const inicio = formulario.querySelector(`#${idInicio}`);
    const fin = formulario.querySelector(`#${idFin}`);
    if (!inicio || !fin) return;

    const fechaInicio = this.convertirFechaLatina(inicio.value);
    const fechaFin = this.convertirFechaLatina(fin.value);

    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      camposInvalidos.push(fin);
    }
  }

  /**
   * Exige que la hora de salida sea posterior a la entrada.
   * @param {HTMLFormElement} formulario Formulario validado.
   * @param {string} idInicio Campo de hora inicial.
   * @param {string} idFin Campo de hora final.
   * @param {HTMLElement[]} camposInvalidos Lista mutable de campos invalidos.
   */
  validarRangoHoras(formulario, idInicio, idFin, camposInvalidos) {
    const inicio = formulario.querySelector(`#${idInicio}`);
    const fin = formulario.querySelector(`#${idFin}`);
    if (!inicio || !fin || !inicio.value || !fin.value) return;

    if (fin.value <= inicio.value) {
      camposInvalidos.push(fin);
    }
  }
}

window.FormularioModel = FormularioModel;
