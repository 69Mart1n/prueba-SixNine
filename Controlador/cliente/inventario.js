import { Modelo } from "../../Modelo/modelo.js?v=10";
import { Vista } from "../../Vista/vista.js?v=24";
import { traducir } from "../../Vista/preferencias.js?v=12";
import { obtenerElemento, ejecutar, datosPantalla } from "./comun.js";

/** Consulta inventario y actualiza la pantalla. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export async function cargarInventario() {
  if (!obtenerElemento("tablaInventario")) return;
  const inventario = await ejecutar(() => Modelo.listarInventario());
  if (!inventario) return;
  datosPantalla.inventario = inventario;
  actualizarFiltroEspaciosInventario();
  filtrarInventario();
}
/** Realiza la operación «actualizar filtro espacios inventario» en este módulo. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function actualizarFiltroEspaciosInventario() {
  const selector = obtenerElemento("filtroEspacioInventario");
  if (!selector) return;
  const tipo = obtenerElemento("filtroTipoEspacioEquipo")?.value || "";
  const anterior = selector.value;
  selector.innerHTML = '<option value="">Todas las salas</option>';
  if (tipo === "prestamo") {
    selector.disabled = true;
    return;
  }
  selector.disabled = false;
  const espacios = new Map();
  datosPantalla.inventario.forEach((item) => {
    if (!item.id_espacio_actual || !["salon", "taller", "laboratorio"].includes(item.tipo_espacio)) return;
    if (tipo && item.tipo_espacio !== tipo) return;
    espacios.set(String(item.id_espacio_actual), { nombre: item.espacio, tipo: item.tipo_espacio });
  });
  [...espacios.entries()]
    .sort((a, b) => a[1].tipo.localeCompare(b[1].tipo, "es") || a[1].nombre.localeCompare(b[1].nombre, "es", { numeric: true }))
    .forEach(([id, espacio]) => {
      const opcion = document.createElement("option");
      opcion.value = id;
      opcion.textContent = espacio.nombre;
      selector.appendChild(opcion);
    });
  if (espacios.has(anterior)) selector.value = anterior;
}
/** Realiza la operación «filtrar inventario» en este módulo. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function filtrarInventario() {
  const texto = (obtenerElemento("buscarEquipo")?.value || "").trim().toLowerCase();
  const filtro = obtenerElemento("filtroEstadoEquipo")?.value || "";
  const tipo = obtenerElemento("filtroTipoEspacioEquipo")?.value || "";
  const espacio = obtenerElemento("filtroEspacioInventario")?.value || "";
  const items = datosPantalla.inventario.filter((item) => {
    const esPrestable = Number(item.es_prestable) === 1 && /^(notebook|laptop)$/i.test(item.tipo);
    const coincideTipo = !tipo || (
      tipo === "prestamo" ? esPrestable :
      item.tipo_espacio === tipo && !esPrestable
    );
    const contenido = [
      item.codigo_inventario,
      item.nombre,
      item.tipo,
      item.espacio,
      item.ubicacion_detalle,
    ]
      .join(" ")
      .toLowerCase();
    return coincideTipo && (!espacio || String(item.id_espacio_actual) === espacio)
      && (!filtro || item.estado === filtro) && contenido.includes(texto);
  });
  Vista.renderInventario(items, datosPantalla.usuario?.roles_disponibles || []);
}
/** Conecta los eventos de acciones inventario cuando corresponde a esta página. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function iniciarAccionesInventario() {
  obtenerElemento("buscarEquipo")?.addEventListener("input", filtrarInventario);
  obtenerElemento("filtroEstadoEquipo")?.addEventListener("change", filtrarInventario);
  obtenerElemento("filtroTipoEspacioEquipo")?.addEventListener("change", () => {
    actualizarFiltroEspaciosInventario();
    filtrarInventario();
  });
  obtenerElemento("filtroEspacioInventario")?.addEventListener("change", filtrarInventario);
  const formEquipo = obtenerElemento("formEquipo");
  if (!formEquipo) return;
  const actualizarTipoPrestable = () => {
    const campo = formEquipo.elements.namedItem("es_prestable");
    const esPortatil = /^(notebook|laptop)$/i.test(formEquipo.tipo.value.trim());
    campo.value = esPortatil ? "1" : "0";
    formEquipo.id_espacio.disabled = esPortatil;
    if (esPortatil) formEquipo.id_espacio.value = "";
  };
  formEquipo.tipo.addEventListener("change", actualizarTipoPrestable);
  const abrir = (item = null) => {
    const form = formEquipo;
    form.reset();
    form.id_equipo.value = item?.id_equipo || "";
    form.codigo_inventario.value = item?.codigo_inventario || "";
    form.nombre.value = item?.nombre || "";
    form.tipo.value = item?.tipo || "";
    form.id_espacio.value = item?.id_espacio_actual || "";
    actualizarTipoPrestable();
    form.ubicacion_detalle.value = item?.ubicacion_detalle || "";
    form.estado.value =
      item?.estado === "prestado" || item?.estado === "baja"
        ? "disponible"
        : item?.estado || "disponible";
    form.fecha_alta.value = item?.fecha_alta || Modelo.hoyISO();
    obtenerElemento("tituloModalEquipo").textContent = item
      ? `Editar ${item.codigo_inventario}`
      : "Nuevo equipo";
    bootstrap.Modal.getOrCreateInstance(obtenerElemento("modalEquipo")).show();
  };
  obtenerElemento("btnNuevoEquipo")?.addEventListener("click", () => abrir());
  obtenerElemento("tablaInventario")?.addEventListener("click", async (evento) => {
    const grupo = evento.target.closest("[data-grupo-pc]");
    if (grupo) {
      const abierto = grupo.getAttribute("aria-expanded") !== "true";
      grupo.setAttribute("aria-expanded", String(abierto));
      grupo.querySelector("i")?.classList.toggle("bi-chevron-right", !abierto);
      grupo.querySelector("i")?.classList.toggle("bi-chevron-down", abierto);
      obtenerElemento("tablaInventario").querySelectorAll(`[data-puesto-espacio="${grupo.dataset.grupoPc}"]`)
        .forEach((fila) => fila.classList.toggle("d-none", !abierto));
      grupo.nextElementSibling.textContent = traducir(abierto ? "Ocultar puestos" : "Mostrar puestos");
      return;
    }
    const editar = evento.target.closest("[data-editar-equipo]");
    const baja = evento.target.closest("[data-baja-equipo]");
    if (editar)
      abrir(
        datosPantalla.inventario.find(
          (item) => String(item.id_equipo) === editar.dataset.editarEquipo,
        ),
      );
    if (!baja) return;
    const confirmado = await Vista.confirmarAccion({
      titulo: "Dar de baja",
      mensaje:
        "El equipo dejará de estar disponible pero conservará su historial.",
      textoConfirmar: "Dar de baja",
      variante: "danger",
    });
    if (!confirmado) return;
    const resultado = await ejecutar(
      () => Modelo.darBajaEquipo(baja.dataset.bajaEquipo),
      "Equipo dado de baja.",
    );
    if (resultado) cargarInventario();
  });
  obtenerElemento("formEquipo")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const datos = Object.fromEntries(new FormData(form).entries());
    const id = datos.id_equipo;
    delete datos.id_equipo;
    const resultado = await ejecutar(
      () =>
        id ? Modelo.actualizarEquipo(id, datos) : Modelo.crearEquipo(datos),
      "Inventario actualizado.",
    );
    if (resultado) {
      bootstrap.Modal.getInstance(obtenerElemento("modalEquipo"))?.hide();
      cargarInventario();
    }
  });
}
