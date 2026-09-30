import { Modelo } from "../../Modelo/modelo.js?v=10";
import { Vista } from "../../Vista/vista.js?v=24";
import { traducir } from "../../Vista/preferencias.js?v=12";
import { obtenerElemento, mensajeConfirmacion, ejecutar, datosPantalla } from "./comun.js";

/** Consulta usuarios y actualiza la pantalla. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export async function cargarUsuarios() {
  if (!obtenerElemento("tablaUsuarios")) return;
  const usuarios = await ejecutar(() => Modelo.listarUsuarios());
  if (usuarios) {
    datosPantalla.usuarios = usuarios;
    renderUsuariosFiltrados();
  }
}
/** Conecta los eventos de acciones usuarios cuando corresponde a esta página. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function iniciarAccionesUsuarios() {
  obtenerElemento("buscarUsuario")?.addEventListener("input", renderUsuariosFiltrados);
  obtenerElemento("filtroRolUsuario")?.addEventListener("change", renderUsuariosFiltrados);
  obtenerElemento("filtroEstadoUsuario")?.addEventListener("change", renderUsuariosFiltrados);

  obtenerElemento("tablaUsuarios")?.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("[data-accion-usuario]");
    if (!boton) return;

    const textos = {
      aprobar: ["Confirmar aprobacion", "Aprobar usuario", "success"],
      rechazar: ["Confirmar rechazo", "Rechazar usuario", "danger"],
      dar_baja: ["Confirmar baja", "Dar de baja", "danger"],
      reactivar: ["Confirmar reactivacion", "Reactivar", "primary"],
    };
    const [titulo, textoConfirmar, variante] =
      textos[boton.dataset.accionUsuario];
    const confirmado = await Vista.confirmarAccion({
      titulo,
      mensaje: mensajeConfirmacion(
        `${traducir(textoConfirmar.toLowerCase())} ${boton.dataset.nombre}`,
      ),
      textoConfirmar,
      variante,
    });
    if (!confirmado) return;

    const tarea =
      boton.dataset.accionUsuario === "dar_baja"
        ? () => Modelo.darBajaUsuario(boton.dataset.id)
        : () =>
            Modelo.cambiarEstadoUsuario(
              boton.dataset.id,
              boton.dataset.accionUsuario,
            );
    const resultado = await ejecutar(tarea, "Estado de usuario actualizado.");
    if (resultado) cargarUsuarios();
  });

  obtenerElemento("tablaUsuarios")?.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("[data-accion-rol]");
    if (!boton) return;

    const textos = {
      aprobar: ["Confirmar rol", "aprobar este rol", "Aprobar", "success"],
      rechazar: [
        "Confirmar rechazo",
        "rechazar este rol",
        "Rechazar",
        "danger",
      ],
    };
    const [titulo, mensaje, textoConfirmar, variante] =
      textos[boton.dataset.accionRol];
    const confirmado = await Vista.confirmarAccion({
      titulo,
      mensaje: mensajeConfirmacion(traducir(mensaje)),
      textoConfirmar,
      variante,
    });
    if (!confirmado) return;

    const resultado = await ejecutar(
      () =>
        Modelo.cambiarEstadoRolUsuario(
          boton.dataset.id,
          boton.dataset.rol,
          boton.dataset.accionRol,
        ),
      "Rol actualizado.",
    );
    if (resultado) cargarUsuarios();
  });
}
/** Dibuja usuarios filtrados con los datos recibidos. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function renderUsuariosFiltrados() {
  const texto = (obtenerElemento("buscarUsuario")?.value || "").toLowerCase();
  const rol = obtenerElemento("filtroRolUsuario")?.value || "";
  const estadoFiltro = obtenerElemento("filtroEstadoUsuario")?.value || "";
  const visibles = datosPantalla.usuarios.filter((usuario) => {
    const contenido = [
      usuario.nombre,
      usuario.apellido,
      usuario.cedula,
      usuario.correo,
      usuario.telefono,
    ]
      .join(" ")
      .toLowerCase();
    return (
      (!rol ||
        (usuario.roles_resumen || usuario.rol_solicitado || "").includes(
          rol,
        )) &&
      (!estadoFiltro || usuario.estado === estadoFiltro) &&
      contenido.includes(texto)
    );
  });
  Vista.renderUsuarios(visibles, datosPantalla.usuarios);
}
