import { Modelo } from "../../Modelo/modelo.js?v=10";
import { Vista } from "../../Vista/vista.js?v=24";
import { traducir } from "../../Vista/preferencias.js?v=12";
import { obtenerElemento, mensajeConfirmacion, ejecutar, datosPantalla } from "./comun.js";

/** Consulta tareas y actualiza la pantalla. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export async function cargarTareas() {
  if (!obtenerElemento("tablaTareas")) return;
  const items = await ejecutar(() => Modelo.listarTareas());
  if (!items) return;
  datosPantalla.tareas = items;
  Vista.renderTareas(items, datosPantalla.usuario?.roles_disponibles || []);
}
/** Conecta los eventos de acciones tareas cuando corresponde a esta página. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function iniciarAccionesTareas() {
  obtenerElemento("btnNuevaTarea")?.addEventListener("click", () => {
    obtenerElemento("formTarea").reset();
    bootstrap.Modal.getOrCreateInstance(obtenerElemento("modalTarea")).show();
  });
  obtenerElemento("formTarea")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const resultado = await ejecutar(
      () =>
        Modelo.crearTarea(
          Object.fromEntries(new FormData(evento.currentTarget).entries()),
        ),
      "Tarea programada.",
    );
    if (resultado) {
      bootstrap.Modal.getInstance(obtenerElemento("modalTarea"))?.hide();
      cargarTareas();
    }
  });
  obtenerElemento("tablaTareas")?.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("[data-estado-tarea], [data-cancelar-tarea]");
    if (!boton) return;

    if (boton.dataset.cancelarTarea) {
      const confirmado = await Vista.confirmarAccion({
        titulo: "Cancelar tarea",
        mensaje: mensajeConfirmacion(traducir("cancelar esta tarea")),
        textoConfirmar: "Cancelar",
        variante: "danger",
      });
      if (!confirmado) return;
      const resultado = await ejecutar(
        () => Modelo.cancelarTarea(boton.dataset.cancelarTarea),
        "Tarea cancelada.",
      );
      if (resultado) cargarTareas();
      return;
    }

    if (boton.dataset.estadoTarea === "completada") {
      obtenerElemento("formResultadoTarea").reset();
      obtenerElemento("formResultadoTarea").id_tarea.value = boton.dataset.id;
      bootstrap.Modal.getOrCreateInstance(obtenerElemento("modalResultadoTarea")).show();
      return;
    }
    const resultado = await ejecutar(
      () =>
        Modelo.cambiarEstadoTarea(boton.dataset.id, {
          estado: boton.dataset.estadoTarea,
        }),
      "Tarea iniciada.",
    );
    if (resultado) cargarTareas();
  });
  obtenerElemento("formResultadoTarea")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const resultado = await ejecutar(
      () =>
        Modelo.cambiarEstadoTarea(form.id_tarea.value, {
          estado: "completada",
          resultado: form.resultado.value.trim(),
        }),
      "Tarea completada.",
    );
    if (resultado) {
      bootstrap.Modal.getInstance(obtenerElemento("modalResultadoTarea"))?.hide();
      cargarTareas();
    }
  });
}
