import { Modelo } from "../../Modelo/modelo.js?v=10";
import { Vista } from "../../Vista/vista.js?v=24";
import { traducir } from "../../Vista/preferencias.js?v=12";
import { obtenerElemento, datosFormulario, leerPorIds, ejecutar, datosPantalla } from "./comun.js";

/** Realiza la operación «conectar formulario» en este módulo. Entradas: id, recolector, creador, mensajeOk. Salida: resultado de la acción o pantalla actualizada. */
export function conectarFormulario(id, recolector, creador, mensajeOk) {
  const form = obtenerElemento(id);
  if (!form) return;

  Vista.prepararCampos(form);
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const validacion = Modelo.validarFormulario(form);
    if (!validacion.valido) {
      Vista.marcarInvalidos(form, validacion.camposInvalidos);
      Vista.mostrarMensaje(
        "Por favor, complete correctamente los campos obligatorios.",
        "warning",
      );
      return;
    }

    const resultado = await ejecutar(
      () => creador(recolector(form)),
      mensajeOk,
    );
    if (resultado) {
      Vista.reiniciarFormulario(form);
    }
  });
}
/** Conecta los eventos de formularios cuando corresponde a esta página. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function iniciarFormularios() {
  Vista.iniciarTablaUsoSala();

  conectarFormulario(
    "formRegistro",
    (form) => datosFormulario(form),
    Modelo.registrarUsuario,
    "Solicitud creada. Ya puede iniciar sesión para consultar su estado de aprobación.",
  );
  conectarFormulario(
    "formTicket",
    () => ({
      titulo: obtenerElemento("titulo")?.value.trim() || "",
      id_categoria: obtenerElemento("idCategoriaIncidencia")?.value || "",
      id_espacio: obtenerElemento("idEspacioIncidencia")?.value || "",
      id_equipo: obtenerElemento("idEquipoIncidencia")?.value || "",
      fecha_reportada: obtenerElemento("fechaReportada")?.value || "",
      descripcion: obtenerElemento("descripcion")?.value.trim() || "",
    }),
    Modelo.crearIncidencia,
    "Incidencia creada en estado pendiente.",
  );
  conectarFormulario(
    "formPrestamo",
    () => ({
      ...leerPorIds([
        "estudiante",
        "cedulaEstudiante",
        "fechaPrestamo",
        "fechaDevolucion",
        "motivo",
      ]),
      id_equipo: obtenerElemento("idEquipoPrestamo")?.value || "",
      grupo: obtenerElemento("actividad")?.value.trim() || "",
    }),
    Modelo.crearPrestamo,
    "Solicitud de prestamo registrada.",
  );
  conectarFormulario(
    "formSolicitud",
    () =>
      leerPorIds([
        "tipoSolicitud",
        "tipoSala",
        "salaSolicitada",
        "fechaSolicitada",
        "turno",
        "grupo",
        "asignatura",
        "software",
        "descripcion",
      ]),
    Modelo.crearSolicitud,
    "Solicitud enviada correctamente.",
  );
  iniciarFormularioUsoSala();
  conectarFormulario(
    "formSolicitudRol",
    (form) => datosFormulario(form),
    (datos) => Modelo.solicitarRol(datos.rol),
    "Solicitud de rol enviada. Queda pendiente de aprobacion.",
  );
}
/** Consulta catalogos formularios y actualiza la pantalla. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export async function cargarCatalogosFormularios() {
  const necesitaEspacios =
    obtenerElemento("idEspacioIncidencia") || obtenerElemento("idEspacioEquipo") || obtenerElemento("idEspacioTarea") || obtenerElemento("salaSolicitada");
  const necesitaInventario =
    obtenerElemento("idEquipoIncidencia") || obtenerElemento("idEquipoPrestamo") || obtenerElemento("idEquipoTarea");
  const necesitaCategorias =
    obtenerElemento("idCategoriaIncidencia") || obtenerElemento("filtroCategoriaConocimiento");
  const [espacios, inventario, categorias] = await Promise.all([
    necesitaEspacios
      ? ejecutar(() => Modelo.listarEspacios())
      : Promise.resolve(null),
    necesitaInventario
      ? ejecutar(() =>
          Modelo.listarInventario(obtenerElemento("idEquipoPrestamo") ? "disponibles=1" : ""),
        )
      : Promise.resolve(null),
    necesitaCategorias
      ? ejecutar(() => Modelo.listarCategorias())
      : Promise.resolve(null),
  ]);
  if (obtenerElemento("salaSolicitada")) Vista.iniciarCamposSala(espacios || []);
  const llenar = (elemento, items, etiqueta, valor, texto) => {
    if (!elemento || !items) return;
    elemento.innerHTML = `<option value="">${Vista.escaparTexto(etiqueta)}</option>`;
    items.forEach((item) =>
      elemento.insertAdjacentHTML(
        "beforeend",
        `<option value="${item[valor]}">${Vista.escaparTexto(texto(item))}</option>`,
      ),
    );
  };
  llenar(
    obtenerElemento("idEspacioIncidencia"),
    espacios,
    "Sin espacio específico",
    "id_espacio",
    (e) => `${e.nombre} (${e.tipo})`,
  );
  llenar(
    obtenerElemento("idEspacioEquipo"),
    espacios,
    "Sin ubicación asignada",
    "id_espacio",
    (e) => `${e.nombre} (${e.tipo})`,
  );
  llenar(
    obtenerElemento("idEspacioTarea"),
    espacios,
    "Sin espacio específico",
    "id_espacio",
    (e) => `${e.nombre} (${e.tipo})`,
  );
  llenar(
    obtenerElemento("idEquipoIncidencia"),
    inventario,
    "Sin equipo específico",
    "id_equipo",
    (e) => `${e.codigo_inventario} - ${e.nombre}`,
  );
  llenar(
    obtenerElemento("idEquipoPrestamo"),
    inventario,
    inventario?.length ? "Seleccionar laptop disponible" : "No hay laptops disponibles",
    "id_equipo",
    (e) => `${e.codigo_inventario} - ${e.nombre}`,
  );
  if (obtenerElemento("sinLaptopsDisponibles") && Array.isArray(inventario)) {
    obtenerElemento("sinLaptopsDisponibles").hidden = inventario.length > 0;
    obtenerElemento("formPrestamo").querySelector('button[type="submit"], button:not([type])').disabled =
      inventario.length === 0;
  }
  llenar(
    obtenerElemento("idEquipoTarea"),
    inventario,
    "Sin equipo específico",
    "id_equipo",
    (e) => `${e.codigo_inventario} - ${e.nombre}`,
  );
  llenar(
    obtenerElemento("idCategoriaIncidencia"),
    categorias,
    "Seleccionar tipo de incidencia",
    "id_categoria",
    (c) => c.nombre,
  );
  llenar(
    obtenerElemento("filtroCategoriaConocimiento"),
    categorias,
    "Todas las categorías",
    "id_categoria",
    (c) => c.nombre,
  );
}
/** Conecta los eventos de formulario uso sala cuando corresponde a esta página. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function iniciarFormularioUsoSala() {
  const form = obtenerElemento("formUsoSala");
  if (!form) return;

  Vista.prepararCampos(form);
  const establecerFechaHoy = () => {
    const campoFecha = obtenerElemento("fecha");
    if (!campoFecha) return;
    campoFecha.value = Modelo.hoyISO().split("-").reverse().join("/");
    campoFecha.dispatchEvent(new Event("input", { bubbles: true }));
  };
  obtenerElemento("btnFechaHoy")?.addEventListener("click", establecerFechaHoy);
  establecerFechaHoy();
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (form.dataset.registrado === "true") return;

    const validacion = Modelo.validarFormulario(form);
    if (!validacion.valido) {
      Vista.marcarInvalidos(form, validacion.camposInvalidos);
      Vista.mostrarMensaje(
        "Complete correctamente los datos generales de la planilla.",
        "warning",
      );
      return;
    }

    const equipos = Vista.obtenerEquiposUsoSala();
    if (obtenerElemento("tipoSala")?.value !== "Salón" && equipos.length === 0) {
      Vista.mostrarMensaje(
        "Agregue al menos un alumno y su equipo antes de registrar el uso.",
        "warning",
      );
      obtenerElemento("numeroEquipo")?.focus();
      return;
    }

    const datos = {
      ...leerPorIds([
        "tipoSala",
        "salaSolicitada",
        "fecha",
        "horaEntrada",
        "horaSalida",
        "grupo",
        "asignatura",
        "docente",
        "turno",
        "observaciones",
      ]),
      equipos,
    };
    const confirmado = await Vista.confirmarAccion({
      titulo: "Confirmar planilla de uso",
      mensaje: traducir(
        equipos.length === 0
          ? "Se registrará el uso de {sala}, grupo {grupo}, el {fecha}. Verifique los datos antes de continuar."
          : equipos.length === 1
          ? "Se registrará {cantidad} equipo para {sala}, grupo {grupo}, el {fecha}. Verifique los datos antes de continuar."
          : "Se registrarán {cantidad} equipos para {sala}, grupo {grupo}, el {fecha}. Verifique los datos antes de continuar.",
      )
        .replace("{cantidad}", String(equipos.length))
        .replace("{sala}", datos.salaSolicitada)
        .replace("{grupo}", datos.grupo)
        .replace("{fecha}", datos.fecha),
      textoConfirmar: "Registrar planilla",
      variante: "success",
    });
    if (!confirmado) return;

    const resultado = await ejecutar(
      () => Modelo.registrarUsoSala(datos),
      "Uso de sala registrado correctamente. La planilla quedo disponible para imprimir.",
    );
    if (resultado) Vista.marcarUsoSalaRegistrado(form);
  });
}
