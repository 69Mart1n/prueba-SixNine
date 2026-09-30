import { Modelo } from "../../Modelo/modelo.js?v=10";
import { Vista } from "../../Vista/vista.js?v=24";
import { traducir } from "../../Vista/preferencias.js?v=12";
import { obtenerElemento, mensajeConfirmacion, ejecutar, datosPantalla } from "./comun.js";
import { cargarCatalogosFormularios } from "./formularios.js";

/** Consulta historial y actualiza la pantalla. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export async function cargarHistorial() {
  if (!obtenerElemento("tablaHistorial")) return;
  const parametros = new URLSearchParams();
  if (obtenerElemento("filtroModuloHistorial")?.value)
    parametros.set("modulo", obtenerElemento("filtroModuloHistorial").value);
  if (obtenerElemento("historialDesde")?.value)
    parametros.set("desde", obtenerElemento("historialDesde").value);
  if (obtenerElemento("historialHasta")?.value)
    parametros.set("hasta", obtenerElemento("historialHasta").value);
  const items = await ejecutar(() =>
    Modelo.listarHistorial(parametros.toString()),
  );
  if (items) Vista.renderHistorial(items);
}
/** Consulta conocimiento y actualiza la pantalla. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export async function cargarConocimiento() {
  if (!obtenerElemento("listaConocimiento")) return;
  const parametros = new URLSearchParams();
  if (obtenerElemento("buscarConocimiento")?.value.trim())
    parametros.set("q", obtenerElemento("buscarConocimiento").value.trim());
  if (obtenerElemento("filtroCategoriaConocimiento")?.value)
    parametros.set("id_categoria", obtenerElemento("filtroCategoriaConocimiento").value);
  const items = await ejecutar(() =>
    Modelo.buscarConocimiento(parametros.toString()),
  );
  if (items) Vista.renderConocimiento(items);
}
/** Consulta categorias gestion y actualiza la pantalla. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export async function cargarCategoriasGestion() {
  if (!obtenerElemento("tablaCategorias")) return;
  const items = await ejecutar(() => Modelo.listarCategorias(true));
  if (!items) return;
  datosPantalla.categorias = items;
  Vista.renderCategorias(items);
}
/** Conecta los eventos de acciones categorias cuando corresponde a esta página. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function iniciarAccionesCategorias() {
  obtenerElemento("formCategoria")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const resultado = await ejecutar(
      () =>
        Modelo.crearCategoria(
          Object.fromEntries(new FormData(evento.currentTarget).entries()),
        ),
      "Categoría registrada.",
    );
    if (resultado) {
      evento.currentTarget.reset();
      cargarCategoriasGestion();
    }
  });
  obtenerElemento("tablaCategorias")?.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("[data-toggle-categoria]");
    if (!boton) return;
    const item = datosPantalla.categorias.find(
      (categoria) =>
        String(categoria.id_categoria) === boton.dataset.toggleCategoria,
    );
    if (!item) return;
    const activar = item.estado !== "activa";
    const resultado = await ejecutar(
      activar
        ? () =>
            Modelo.actualizarCategoria(item.id_categoria, {
              nombre: item.nombre,
              descripcion: item.descripcion,
              estado: "activa",
            })
        : () => Modelo.desactivarCategoria(item.id_categoria),
      activar ? "Categoría activada." : "Categoría desactivada.",
    );
    if (resultado) cargarCategoriasGestion();
  });
}
/** Consulta espacios gestion y actualiza la pantalla. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export async function cargarEspaciosGestion() {
  if (!obtenerElemento('tablaEspaciosGestion')) return;
  const items = await ejecutar(() => Modelo.listarEspacios(true));
  if (!items) return;
  datosPantalla.espacios = items;
  Vista.renderEspaciosGestion(items);
}
/** Conecta los eventos de acciones espacios cuando corresponde a esta página. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function iniciarAccionesEspacios() {
  const seccion = obtenerElemento('gestionEspaciosAdmin');
  const esAdmin = datosPantalla.usuario?.roles_disponibles?.includes('administrador');
  if (!seccion || !esAdmin) return;
  seccion.hidden = false;

  const form = obtenerElemento('formEspacio');
  const titulo = obtenerElemento('tituloFormEspacio');

  form?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const datos = Object.fromEntries(new FormData(form).entries());
    const id = datos.id_espacio;
    delete datos.id_espacio;
    const resultado = await ejecutar(
      id
        ? () => Modelo.actualizarEspacio(id, datos)
        : () => Modelo.crearEspacio(datos),
      id ? 'Espacio actualizado.' : 'Espacio registrado.',
    );

    if (resultado) {
      form.reset();
      form.id_espacio.value = '';
      if (titulo) titulo.textContent = traducir('Nuevo espacio');
      await cargarEspaciosGestion();
      await cargarCatalogosFormularios();
    }
  });

  obtenerElemento('btnCancelarEdicionEspacio')?.addEventListener('click', () => {
    form?.reset();
    if (form) form.id_espacio.value = '';
    if (titulo) titulo.textContent = traducir('Nuevo espacio');
  });

  obtenerElemento('tablaEspaciosGestion')?.addEventListener('click', async (evento) => {
    const editar = evento.target.closest('[data-editar-espacio]');
    const desactivar = evento.target.closest('[data-desactivar-espacio]');

    if (editar) {
      const item = datosPantalla.espacios.find(
        (espacio) => String(espacio.id_espacio) === String(editar.dataset.editarEspacio),
      );
      if (!item || !form) return;
      form.id_espacio.value = item.id_espacio;
      form.tipo.value = item.tipo;
      form.nombre.value = item.nombre;
      form.ubicacion.value = item.ubicacion;
      form.capacidad.value = item.capacidad ?? '';
      form.estado.value = item.estado;
      if (titulo) titulo.textContent = traducir('Editar espacio');
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (desactivar) {
      const confirmado = await Vista.confirmarAccion({
        titulo: 'Desactivar espacio',
        mensaje: mensajeConfirmacion(traducir('desactivar este espacio')),
        textoConfirmar: 'Desactivar',
        variante: 'danger',
      });
      if (!confirmado) return;
      const resultado = await ejecutar(
        () => Modelo.desactivarEspacio(desactivar.dataset.desactivarEspacio),
        'Espacio desactivado.',
      );
      if (resultado) {
        await cargarEspaciosGestion();
        await cargarCatalogosFormularios();
      }
    }
  });
}
