/**
 * Vista encargada de marcar visualmente los campos de formulario.
 */
class FormularioView {
  /**
   * Limpia marcas anteriores y resalta los campos que no superaron la validacion.
   * @param {HTMLFormElement} formulario Formulario que contiene los campos.
   * @param {HTMLElement[]} camposInvalidos Campos que deben resaltarse.
   */
  marcarInvalidos(formulario, camposInvalidos) {
    this.limpiarInvalidos(formulario);
    camposInvalidos.forEach((campo) => campo.classList.add("is-invalid"));
  }

  /**
   * Elimina todas las marcas visuales de error de un formulario.
   * @param {HTMLFormElement} formulario Formulario que se desea limpiar.
   */
  limpiarInvalidos(formulario) {
    formulario
      .querySelectorAll(".is-invalid")
      .forEach((campo) => campo.classList.remove("is-invalid"));
  }

  /**
   * Quita el error de un campo cuando el usuario vuelve a escribir o selecciona.
   * @param {HTMLFormElement} formulario Formulario cuyos campos se escucharan.
   */
  escucharCorrecciones(formulario) {
    this.configurarFechasSoloHoy(formulario);
    this.crearAccesosRapidosFecha(formulario);

    formulario.querySelectorAll("input, select, textarea").forEach((campo) => {
      campo.addEventListener("input", () => {
        this.normalizarEntrada(campo);
        this.actualizarEstadoCampo(campo);
      });
      campo.addEventListener("change", () => this.actualizarEstadoCampo(campo));
    });
  }

  /**
   * Ajusta en vivo los campos que tienen reglas de formato declaradas.
   * @param {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement} campo Campo editado.
   */
  normalizarEntrada(campo) {
    if (campo.dataset.onlyDigits === "true") {
      campo.value = campo.value.replace(/\D/g, "");
    }

    if (campo.dataset.dateLatin === "true") {
      const digitos = campo.value.replace(/\D/g, "").slice(0, 8);
      const partes = [
        digitos.slice(0, 2),
        digitos.slice(2, 4),
        digitos.slice(4, 8),
      ].filter(Boolean);

      campo.value = partes.join("/");
    }
  }

  /**
   * Marca inmediatamente fechas invalidas o anteriores a hoy.
   * @param {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement} campo Campo editado.
   */
  actualizarEstadoCampo(campo) {
    campo.classList.remove("is-invalid");

    if (campo.dataset.dateLatin !== "true" || campo.value.trim() === "") return;
    if (campo.value.trim().length < 10) return;

    const fecha = this.convertirFechaLatina(campo.value);
    const fechaInvalida = !fecha;
    const fechaPasada = campo.dataset.noPast === "true" && fecha && fecha < this.hoy();

    if (fechaInvalida || fechaPasada) {
      campo.classList.add("is-invalid");
    }
  }

  /**
   * Configura los calendarios que solo admiten la fecha actual.
   * @param {HTMLFormElement} formulario Formulario que contiene los campos.
   */
  configurarFechasSoloHoy(formulario) {
    formulario.querySelectorAll('[data-today-only="true"]').forEach((campo) => {
      const hoy = this.formatearFechaISO(this.hoy());
      campo.min = hoy;
      campo.max = hoy;

      campo.addEventListener("change", () => {
        campo.classList.toggle("is-invalid", campo.value !== "" && campo.value !== hoy);
      });
    });
  }

  /**
   * Agrega botones para seleccionar fechas comunes sin escribir.
   * @param {HTMLFormElement} formulario Formulario que recibira accesos rapidos.
   */
  crearAccesosRapidosFecha(formulario) {
    formulario.querySelectorAll('[data-date-latin="true"][data-no-past="true"]').forEach((campo) => {
      if (campo.dataset.shortcutsReady === "true") return;

      const contenedor = document.createElement("div");
      contenedor.className = "date-shortcuts";
      contenedor.setAttribute("aria-label", "Seleccion rapida de fecha");

      const selectorCalendario = document.createElement("input");
      selectorCalendario.type = "date";
      selectorCalendario.className = "visually-hidden";
      selectorCalendario.tabIndex = -1;
      selectorCalendario.min = this.formatearFechaISO(this.hoy());
      selectorCalendario.addEventListener("change", () => {
        if (!selectorCalendario.value) return;
        campo.value = this.formatearFechaLatina(
          this.convertirFechaISO(selectorCalendario.value)
        );
        this.actualizarEstadoCampo(campo);
        campo.dispatchEvent(new Event("change", { bubbles: true }));
      });

      const botonCalendario = document.createElement("button");
      botonCalendario.type = "button";
      botonCalendario.className = "btn btn-outline-secondary btn-sm";
      botonCalendario.textContent = "Elegir";
      botonCalendario.addEventListener("click", () => {
        selectorCalendario.min = this.formatearFechaISO(this.hoy());
        if (typeof selectorCalendario.showPicker === "function") {
          selectorCalendario.showPicker();
          return;
        }

        selectorCalendario.click();
      });

      contenedor.appendChild(botonCalendario);
      contenedor.appendChild(selectorCalendario);

      [
        ["Hoy", 0],
        ["Manana", 1],
        ["+7 dias", 7],
      ].forEach(([texto, dias]) => {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "btn btn-outline-secondary btn-sm";
        boton.textContent = texto;
        boton.addEventListener("click", () => {
          campo.value = this.formatearFechaLatina(this.fechaDesdeHoy(dias));
          this.actualizarEstadoCampo(campo);
          campo.dispatchEvent(new Event("change", { bubbles: true }));
        });
        contenedor.appendChild(boton);
      });

      campo.insertAdjacentElement("afterend", contenedor);
      campo.dataset.shortcutsReady = "true";
    });
  }

  /**
   * Convierte dd/mm/aaaa en Date si es una fecha real.
   * @param {string} valor Fecha escrita por el usuario.
   * @returns {Date|null} Fecha o null.
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
   * Devuelve la fecha actual normalizada.
   * @returns {Date} Fecha de hoy sin hora.
   */
  hoy() {
    const fecha = new Date();
    fecha.setHours(0, 0, 0, 0);
    return fecha;
  }

  /**
   * Devuelve una fecha futura cercana.
   * @param {number} dias Dias que se suman a hoy.
   * @returns {Date} Fecha resultante.
   */
  fechaDesdeHoy(dias) {
    const fecha = this.hoy();
    fecha.setDate(fecha.getDate() + dias);
    return fecha;
  }

  /**
   * Formatea una fecha como dd/mm/aaaa.
   * @param {Date} fecha Fecha que se desea mostrar.
   * @returns {string} Fecha formateada.
   */
  formatearFechaLatina(fecha) {
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    return `${dia}/${mes}/${fecha.getFullYear()}`;
  }

  /**
   * Convierte yyyy-mm-dd en Date local.
   * @param {string} valor Fecha nativa de input date.
   * @returns {Date} Fecha convertida.
   */
  convertirFechaISO(valor) {
    const [anio, mes, dia] = valor.split("-").map(Number);
    const fecha = new Date(anio, mes - 1, dia);
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
   * Devuelve los campos a sus valores iniciales y elimina los errores visuales.
   * @param {HTMLFormElement} formulario Formulario que se desea reiniciar.
   */
  reiniciar(formulario) {
    formulario.reset();
    this.limpiarInvalidos(formulario);
  }
}

window.FormularioView = FormularioView;
