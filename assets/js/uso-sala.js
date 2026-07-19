/**
 * Comportamiento compartido para la seleccion de salas y solicitudes de software.
 */
(function () {
  const TIPOS_DE_SALA = ["Salon", "Taller", "Laboratorio"];
  const CANTIDAD_EQUIPOS_POR_LABORATORIO = 16;

  /**
   * Vacia el selector de salas y lo deshabilita hasta que exista un tipo valido.
   * @param {HTMLSelectElement} selectSala Selector de la sala solicitada.
   */
  function reiniciarSala(selectSala) {
    selectSala.innerHTML =
      '<option value="">Seleccione primero un tipo de sala</option>';
    selectSala.disabled = true;
  }

  /**
   * Genera las cinco salas correspondientes al tipo seleccionado.
   * @param {string} tipoSala Tipo elegido: Salon, Taller o Laboratorio.
   * @param {HTMLSelectElement} selectSala Selector que recibira las opciones.
   */
  function cargarSalas(tipoSala, selectSala) {
    reiniciarSala(selectSala);

    if (!TIPOS_DE_SALA.includes(tipoSala)) return;

    selectSala.innerHTML = '<option value="">Seleccionar sala</option>';

    for (let numero = 1; numero <= 5; numero += 1) {
      const opcion = document.createElement("option");
      opcion.value = `${tipoSala} ${numero}`;
      opcion.textContent = `${tipoSala} ${numero}`;
      selectSala.appendChild(opcion);
    }

    selectSala.disabled = false;
  }

  /**
   * Conecta los selectores de tipo y sala, y restaura su estado al reiniciar.
   * @param {HTMLFormElement} formulario Formulario que contiene ambos selectores.
   */
  function iniciarSelectorDeSala(formulario) {
    const selectTipo = formulario.querySelector("#tipoSala");
    const selectSala = formulario.querySelector("#salaSolicitada");

    if (!selectTipo || !selectSala) return;

    cargarSalas(selectTipo.value, selectSala);
    selectTipo.addEventListener("change", () => {
      cargarSalas(selectTipo.value, selectSala);
      selectSala.classList.remove("is-invalid");
    });

    formulario.addEventListener("reset", () => {
      window.setTimeout(() => reiniciarSala(selectSala), 0);
    });
  }

  /**
   * Controla la visibilidad y limpieza del campo Software requerido.
   * @param {HTMLFormElement} formulario Formulario de solicitud de servicio.
   */
  function iniciarCampoSoftware(formulario) {
    const selectTipoSolicitud = formulario.querySelector("#tipoSolicitud");
    const contenedorSoftware = formulario.querySelector("#campoSoftware");
    const campoSoftware = formulario.querySelector("#software");

    if (!selectTipoSolicitud || !contenedorSoftware || !campoSoftware) return;

    /**
     * Muestra Software requerido solo para una instalacion y lo limpia al ocultarlo.
     */
    function actualizarCampoSoftware() {
      const mostrar =
        selectTipoSolicitud.value === "Instalacion de software";

      contenedorSoftware.hidden = !mostrar;

      if (!mostrar) {
        campoSoftware.value = "";
        campoSoftware.classList.remove("is-invalid");
      }
    }

    actualizarCampoSoftware();
    selectTipoSolicitud.addEventListener("change", actualizarCampoSoftware);
    formulario.addEventListener("reset", () => {
      window.setTimeout(actualizarCampoSoftware, 0);
    });
  }

  /**
   * Evita insertar texto HTML desde campos escritos por el usuario.
   * @param {HTMLTableRowElement} fila Fila donde se agrega la celda.
   * @param {string} texto Texto seguro para mostrar.
   */
  function agregarCelda(fila, texto) {
    const celda = document.createElement("td");
    celda.textContent = texto || "-";
    fila.appendChild(celda);
  }

  /**
   * Carga los equipos disponibles por defecto para cada laboratorio.
   * @param {HTMLSelectElement} selectEquipo Selector de numero de equipo.
   */
  function cargarEquipos(selectEquipo) {
    selectEquipo.innerHTML = '<option value="">Seleccionar equipo</option>';

    for (let numero = 1; numero <= CANTIDAD_EQUIPOS_POR_LABORATORIO; numero += 1) {
      const opcion = document.createElement("option");
      opcion.value = `Equipo ${numero}`;
      opcion.textContent = `Equipo ${numero}`;
      selectEquipo.appendChild(opcion);
    }
  }

  /**
   * Agrega a la tabla el alumno y equipo cargados en la planilla.
   * @param {HTMLFormElement} formulario Formulario de uso de sala.
   */
  function iniciarCargaAlumnoEquipo(formulario) {
    const botonAgregar = formulario.querySelector("#btnAgregarAlumno");
    const tabla = document.getElementById("tablaAlumnos");
    const campoEquipo = formulario.querySelector("#numeroEquipo");
    const campoAlumno = formulario.querySelector("#alumno");
    const campoEstado = formulario.querySelector("#estadoEquipo");
    const campoObservaciones = formulario.querySelector("#obsEquipo");

    if (
      !botonAgregar ||
      !tabla ||
      !campoEquipo ||
      !campoAlumno ||
      !campoEstado ||
      !campoObservaciones
    ) {
      return;
    }

    cargarEquipos(campoEquipo);

    botonAgregar.addEventListener("click", () => {
      const numeroEquipo = campoEquipo.value.trim();
      const alumno = campoAlumno.value.trim();
      const equipoYaCargado = [...tabla.querySelectorAll("tr td:first-child")]
        .some((celda) => celda.textContent.trim() === numeroEquipo);

      campoEquipo.classList.toggle("is-invalid", numeroEquipo === "" || equipoYaCargado);
      campoAlumno.classList.toggle("is-invalid", alumno === "");

      if (!numeroEquipo || !alumno || equipoYaCargado) return;

      const fila = document.createElement("tr");
      agregarCelda(fila, numeroEquipo);
      agregarCelda(fila, alumno);
      agregarCelda(fila, campoEstado.value);
      agregarCelda(fila, campoObservaciones.value.trim());
      tabla.appendChild(fila);

      campoEquipo.value = "";
      campoAlumno.value = "";
      campoEstado.value = "Libre";
      campoObservaciones.value = "";
      campoEquipo.classList.remove("is-invalid");
      campoAlumno.classList.remove("is-invalid");
      campoEquipo.focus();
    });

    formulario.addEventListener("reset", () => {
      tabla.innerHTML = "";
    });
  }

  /**
   * Inicializa la logica dinamica en los formularios que existan en la pagina.
   */
  function iniciar() {
    document
      .querySelectorAll("#formSolicitud, #formUsoSala")
      .forEach((formulario) => {
        iniciarSelectorDeSala(formulario);
        iniciarCampoSoftware(formulario);
        iniciarCargaAlumnoEquipo(formulario);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
