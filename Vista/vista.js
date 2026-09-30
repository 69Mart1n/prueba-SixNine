/* Reúne las funciones de presentación sin mezclar reglas de negocio. */
import { vistaBase } from "./modulos/base.js";
import { vistaPanel } from "./modulos/panel.js";
import { vistaUsuarios } from "./modulos/usuarios.js";
import { vistaIncidencias } from "./modulos/incidencias.js";
import { vistaPrestamosSolicitudes } from "./modulos/prestamos_solicitudes.js";
import { vistaReportes } from "./modulos/reportes.js";
import { vistaInventario } from "./modulos/inventario.js";
import { vistaCatalogos } from "./modulos/catalogos.js";
import { vistaTareasFechas } from "./modulos/tareas_fechas.js";

export const Vista = {
  ...vistaBase,
  ...vistaPanel,
  ...vistaUsuarios,
  ...vistaIncidencias,
  ...vistaPrestamosSolicitudes,
  ...vistaReportes,
  ...vistaInventario,
  ...vistaCatalogos,
  ...vistaTareasFechas,
};
