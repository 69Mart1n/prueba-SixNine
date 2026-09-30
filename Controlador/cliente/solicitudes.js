import { Modelo } from "../../Modelo/modelo.js?v=10";
import { Vista } from "../../Vista/vista.js?v=24";
import { traducir } from "../../Vista/preferencias.js?v=12";
import { obtenerElemento, mensajeConfirmacion, ejecutar, rolDeVista, datosPantalla } from "./comun.js";

/** Consulta solicitudes y actualiza la pantalla. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export async function cargarSolicitudes() {
  if (!obtenerElemento("tablaSolicitudes")) return;
  const scope = document.body.dataset.scope === "mine" ? "mine" : "";
  const solicitudes = await ejecutar(() => Modelo.listarSolicitudes(scope));
  if (solicitudes) {
    datosPantalla.solicitudes = solicitudes;
    Vista.renderSolicitudes(solicitudes, rolDeVista());
  }
}
/** Conecta los eventos de acciones solicitudes cuando corresponde a esta página. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function iniciarAccionesSolicitudes() {
  obtenerElemento("tablaSolicitudes")?.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("[data-accion-solicitud]");
    if (!boton) return;

    const textos = {
      aprobada: [
        "Confirmar aprobacion",
        "aprobar esta solicitud",
        "Aprobar",
        "success",
      ],
      rechazada: [
        "Confirmar rechazo",
        "rechazar esta solicitud",
        "Rechazar",
        "danger",
      ],
      en_proceso: [
        "Confirmar toma",
        "tomar esta solicitud",
        "Tomar",
        "primary",
      ],
      completada: [
        "Confirmar cierre",
        "marcar esta solicitud como completada",
        "Completar",
        "success",
      ],
      cancelada: [
        "Confirmar cancelacion",
        "cancelar esta solicitud",
        "Cancelar",
        "danger",
      ],
    };
    const [titulo, mensaje, textoConfirmar, variante] =
      textos[boton.dataset.accionSolicitud];
    const confirmado = await Vista.confirmarAccion({
      titulo,
      mensaje: mensajeConfirmacion(traducir(mensaje)),
      textoConfirmar,
      variante,
    });
    if (!confirmado) return;

    const tarea =
      boton.dataset.accionSolicitud === "cancelada"
        ? () => Modelo.cancelarSolicitud(boton.dataset.id)
        : () =>
            Modelo.cambiarEstadoSolicitud(
              boton.dataset.id,
              boton.dataset.accionSolicitud,
            );
    const resultado = await ejecutar(tarea, "Solicitud actualizada.");
    if (resultado) cargarSolicitudes();
  });
}
