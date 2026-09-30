import { Modelo } from "../../Modelo/modelo.js?v=10";
import { Vista } from "../../Vista/vista.js?v=24";
import { traducir } from "../../Vista/preferencias.js?v=12";
import { obtenerElemento, mensajeConfirmacion, ejecutar, rolDeVista, datosPantalla } from "./comun.js";

/** Consulta incidencias y actualiza la pantalla. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export async function cargarIncidencias() {
  if (!obtenerElemento("tablaIncidencias")) return;
  const scope = document.body.dataset.scope === "mine" ? "mine" : "";
  const incidencias = await ejecutar(() => Modelo.listarIncidencias(scope));
  if (!incidencias) return;
  datosPantalla.incidencias = incidencias;
  window.SGRSI_INCIDENCIAS_TOTAL = incidencias;
  renderIncidenciasFiltradas();
}
/** Conecta los eventos de acciones incidencias cuando corresponde a esta página. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function iniciarAccionesIncidencias() {
  obtenerElemento("buscarIncidencia")?.addEventListener("input", renderIncidenciasFiltradas);
  obtenerElemento("filtroEstado")?.addEventListener("change", renderIncidenciasFiltradas);

  obtenerElemento("tablaIncidencias")?.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("[data-accion-incidencia]");
    if (!boton) return;
    const incidencia = datosPantalla.incidencias.find(
      (item) => String(item.id_ticket) === String(boton.dataset.id),
    );
    if (!incidencia) return;

    if (boton.dataset.accionIncidencia === "generar-codigo") {
      const resultado = await ejecutar(() =>
        Modelo.generarCodigoColaboracion(incidencia.id_ticket),
      );
      if (resultado) Vista.mostrarCodigoColaboracion(incidencia, resultado);
      return;
    }

    if (boton.dataset.accionIncidencia === "unirse-codigo") {
      Vista.abrirModalUnirseColaboracion(incidencia);
      return;
    }

    if (boton.dataset.accionIncidencia === "aceptar") {
      const confirmado = await Vista.confirmarAccion({
        titulo: "Confirmar incidencia",
        mensaje: mensajeConfirmacion(
          `${traducir("aceptar la incidencia")} "${incidencia.titulo}"`,
        ),
        textoConfirmar: "Aceptar",
        variante: "success",
      });
      if (!confirmado) return;
      const resultado = await ejecutar(
        () =>
          Modelo.cambiarEstadoIncidencia(incidencia.id_ticket, {
            estado: "en_proceso",
            prioridad: incidencia.prioridad || "sin_asignar",
          }),
        "Incidencia aceptada.",
      );
      if (resultado) cargarIncidencias();
      return;
    }

    if (boton.dataset.accionIncidencia === "denegar") {
      const confirmado = await Vista.confirmarAccion({
        titulo: "Confirmar denegacion",
        mensaje: mensajeConfirmacion(
          `${traducir("denegar la incidencia")} "${incidencia.titulo}"`,
        ),
        textoConfirmar: "Denegar",
        variante: "danger",
      });
      if (!confirmado) return;
      const resultado = await ejecutar(
        () =>
          Modelo.cancelarIncidencia(incidencia.id_ticket),
        "Incidencia denegada.",
      );
      if (resultado) cargarIncidencias();
      return;
    }

    Vista.abrirModalIncidencia(
      incidencia,
      boton.dataset.accionIncidencia === "resolver",
    );
  });

  obtenerElemento("codigoColaboracion")?.addEventListener("input", (evento) => {
    evento.target.value = evento.target.value.replace(/\D/g, "").slice(0, 6);
  });

  obtenerElemento("formUnirseColaboracion")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const resultado = await ejecutar(
      () =>
        Modelo.unirseColaboracionIncidencia(
          form.id_ticket.value,
          form.codigo.value,
        ),
      "Se unió al equipo del ticket.",
    );
    if (resultado) {
      bootstrap.Modal.getInstance(obtenerElemento("modalColaboracionIncidencia"))?.hide();
      cargarIncidencias();
    }
  });

  obtenerElemento("formResolverIncidencia")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const form = evento.target;
    const id = form.id_ticket.value;
    const datos = new FormData();
    datos.append("prioridad", form.prioridad.value);
    datos.append("estado", form.estado.value);
    datos.append("diagnostico", form.diagnostico.value.trim());
    datos.append(
      "solucion_aplicada",
      form.solucion_aplicada?.value.trim() || "",
    );
    // Esta nota no es la resolución final: documenta el avance de un ticket abierto.
    datos.append(
      "nota_seguimiento",
      form.nota_seguimiento?.value.trim() || "",
    );
    const foto = form.foto?.files?.[0];
    if (foto) datos.append("foto", foto);
    const estadoNuevo = form.estado.value;
    const confirmado = await Vista.confirmarAccion({
      titulo:
        estadoNuevo === "resuelta"
          ? "Confirmar resolucion"
          : "Confirmar cambio",
      mensaje:
        estadoNuevo === "resuelta"
          ? "Esta seguro de marcar esta incidencia como resuelta?"
          : "Esta seguro de actualizar esta incidencia?",
      textoConfirmar: estadoNuevo === "resuelta" ? "Resolver" : "Actualizar",
      variante: "primary",
    });
    if (!confirmado) return;

    const resultado =
      estadoNuevo === "resuelta"
        ? await ejecutar(
            () => Modelo.resolverIncidencia(id, datos),
            "Incidencia resuelta.",
          )
        : await ejecutar(
            () =>
              Modelo.cambiarEstadoIncidencia(
                id,
                Object.fromEntries(datos.entries()),
              ),
            "Incidencia actualizada.",
          );
    if (resultado) {
      Vista.cerrarModalIncidencia();
      cargarIncidencias();
    }
  });

  const campoFoto = obtenerElemento("fotoResolucion");
  campoFoto?.addEventListener("change", () => {
    const archivo = campoFoto.files?.[0] || null;
    if (!archivo) {
      Vista.mostrarVistaPreviaFoto(null);
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      campoFoto.value = "";
      Vista.mostrarVistaPreviaFoto(null);
      Vista.mostrarMensaje(
        "La fotografía debe pesar como máximo 5 MB",
        "warning",
      );
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      campoFoto.value = "";
      Vista.mostrarVistaPreviaFoto(null);
      Vista.mostrarMensaje(
        "La fotografía debe estar en formato JPEG, PNG o WebP",
        "warning",
      );
      return;
    }
    Vista.mostrarVistaPreviaFoto(archivo);
  });
  obtenerElemento("quitarFotoResolucion")?.addEventListener("click", () => {
    if (campoFoto) campoFoto.value = "";
    Vista.mostrarVistaPreviaFoto(null);
  });
}
/** Dibuja incidencias filtradas con los datos recibidos. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function renderIncidenciasFiltradas() {
  const texto = (obtenerElemento("buscarIncidencia")?.value || "").toLowerCase();
  const filtro = obtenerElemento("filtroEstado")?.value || "";
  const visibles = datosPantalla.incidencias.filter((item) => {
    const coincideEstado = !filtro || item.estado === filtro;
    const contenido = [
      item.titulo,
      item.solicitante,
      item.equipo,
      item.codigo_inventario,
    ]
      .join(" ")
      .toLowerCase();
    return coincideEstado && contenido.includes(texto);
  });
  Vista.renderIncidencias(visibles, rolDeVista());
}
