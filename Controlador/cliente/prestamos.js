import { Modelo } from "../../Modelo/modelo.js?v=10";
import { Vista } from "../../Vista/vista.js?v=24";
import { traducir } from "../../Vista/preferencias.js?v=12";
import { obtenerElemento, mensajeConfirmacion, ejecutar, rolDeVista } from "./comun.js";

/** Consulta prestamos y actualiza la pantalla. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export async function cargarPrestamos() {
  if (!obtenerElemento("tablaPrestamos")) return;
  const actualizacion = await ejecutar(() => Modelo.actualizarAtrasosPrestamos());
  if (!actualizacion) return;
  const scope = document.body.dataset.scope === "mine" ? "mine" : "";
  const prestamos = await ejecutar(() => Modelo.listarPrestamos(scope));
  if (prestamos) Vista.renderPrestamos(prestamos, rolDeVista());
}
/** Conecta los eventos de acciones prestamos cuando corresponde a esta página. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function iniciarAccionesPrestamos() {
  obtenerElemento("tablaPrestamos")?.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("[data-accion-prestamo]");
    if (!boton) return;
    const accion = boton.dataset.accionPrestamo;
    if (accion === "devuelto") {
      const form = obtenerElemento("formDevolucionPrestamo");
      if (!form) return;
      form.reset();
      form.id_prestamo.value = boton.dataset.id;
      bootstrap.Modal.getOrCreateInstance(obtenerElemento("modalDevolucionPrestamo")).show();
      return;
    }
    const textos = {
      aprobado: [
        "Confirmar prestamo",
        "aprobar este prestamo",
        "Aceptar",
        "success",
      ],
      rechazado: [
        "Confirmar denegacion",
        "denegar este prestamo",
        "Denegar",
        "danger",
      ],
      entregado: [
        "Confirmar entrega",
        "marcar este prestamo como entregado",
        "Marcar entregado",
        "primary",
      ],
      devuelto: [
        "Confirmar devolucion",
        "registrar la devolucion del prestamo",
        "Registrar devolucion",
        "success",
      ],
      cancelado: [
        "Confirmar cancelacion",
        "cancelar este prestamo",
        "Cancelar",
        "danger",
      ],
    };
    const [titulo, mensaje, textoConfirmar, variante] = textos[accion];
    const confirmado = await Vista.confirmarAccion({
      titulo,
      mensaje: mensajeConfirmacion(traducir(mensaje)),
      textoConfirmar,
      variante,
    });
    if (!confirmado) return;

    const tarea =
      accion === "entregado"
        ? () => Modelo.entregarPrestamo(boton.dataset.id)
        : accion === "cancelado"
          ? () => Modelo.cancelarPrestamo(boton.dataset.id)
          : () => Modelo.cambiarEstadoPrestamo(boton.dataset.id, accion);
    const resultado = await ejecutar(tarea, "Prestamo actualizado.");
    if (resultado) cargarPrestamos();
  });

  obtenerElemento("formDevolucionPrestamo")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const confirmado = await Vista.confirmarAccion({
      titulo: "Confirmar devolución",
      mensaje:
        "La devolución actualizará el inventario y regularizará la Black list asociada.",
      textoConfirmar: "Registrar devolución",
      variante: "success",
    });
    if (!confirmado) return;
    const resultado = await ejecutar(
      () =>
        Modelo.devolverPrestamo(form.id_prestamo.value, {
          condicion: form.condicion.value,
          observaciones: form.observaciones.value.trim(),
        }),
      "Devolución registrada e inventario actualizado.",
    );
    if (resultado) {
      bootstrap.Modal.getInstance(obtenerElemento("modalDevolucionPrestamo"))?.hide();
      cargarPrestamos();
    }
  });
}
