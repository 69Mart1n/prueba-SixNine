import { Modelo } from "../../Modelo/modelo.js?v=10";
import { Vista } from "../../Vista/vista.js?v=24";
import { traducir } from "../../Vista/preferencias.js?v=12";
import { obtenerElemento, ejecutar, datosPantalla } from "./comun.js";

/** Consulta blacklist y actualiza la pantalla. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export async function cargarBlacklist() {
  if (!obtenerElemento("tablaBlacklist")) return;
  const lista = await ejecutar(() => Modelo.listarBlacklist());
  if (lista) Vista.renderBlacklist(lista);
}
/** Consulta reportes y actualiza la pantalla. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export async function cargarReportes() {
  if (!obtenerElemento("tablaReportesUso")) return;
  const reportes = await ejecutar(() => Modelo.listarReportes());
  if (!reportes) return;

  datosPantalla.reportesUso = reportes.usos_sala || [];
  filtrarReportesUso();
}
/** Realiza la operación «filtrar reportes uso» en este módulo. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function filtrarReportesUso() {
  const texto = (obtenerElemento("buscarReporteUso")?.value || "").trim().toLowerCase();
  const desde = obtenerElemento("reporteDesde")?.value || "";
  const hasta = obtenerElemento("reporteHasta")?.value || "";
  const visibles = datosPantalla.reportesUso.filter((item) => {
    const contenido = [
      item.sala,
      item.tipo_sala,
      item.docente,
      item.registrado_por,
      item.grupo,
      item.asignatura,
    ]
      .join(" ")
      .toLowerCase();
    return (
      (!texto || contenido.includes(texto)) &&
      (!desde || item.fecha >= desde) &&
      (!hasta || item.fecha <= hasta)
    );
  });
  Vista.renderReportesUso(visibles);
}
/** Conecta los eventos de acciones reportes cuando corresponde a esta página. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function iniciarAccionesReportes() {
  ["buscarReporteUso", "reporteDesde", "reporteHasta"].forEach((id) => {
    obtenerElemento(id)?.addEventListener("input", filtrarReportesUso);
  });

  obtenerElemento("btnLimpiarFiltrosReporte")?.addEventListener("click", () => {
    ["buscarReporteUso", "reporteDesde", "reporteHasta"].forEach((id) => {
      obtenerElemento(id).value = "";
    });
    filtrarReportesUso();
  });

  obtenerElemento("tablaReportesUso")?.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-ver-reporte-uso]");
    if (!boton) return;
    const reporte = datosPantalla.reportesUso.find(
      (item) => String(item.id_registro) === boton.dataset.verReporteUso,
    );
    if (reporte) Vista.abrirReporteUso(reporte);
  });

  obtenerElemento("btnImprimirReporteUso")?.addEventListener("click", (evento) => {
    const reporte = datosPantalla.reportesUso.find(
      (item) =>
        String(item.id_registro) === evento.currentTarget.dataset.idRegistro,
    );
    if (reporte) Vista.imprimirReporteUso(reporte);
  });
}
/** Consulta dashboard y actualiza la pantalla. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export async function cargarDashboard() {
  if (!document.body.hasAttribute("data-dashboard")) return;
  const metricas = await ejecutar(() => Modelo.obtenerDashboard());
  if (metricas) Vista.renderDashboard(metricas);
}
