import { escapar, insignia, nombreTipoSolicitud, formatearCambiosHistorial } from "./ayudas.js";
import { obtenerConfiguracionRegional, traducir } from "../preferencias.js?v=11";

/** Presenta los datos de catalogos sin consultar la API. */
export const vistaCatalogos = {
/** Dibuja categorias con los datos recibidos. Entradas: items. Salida: valor calculado o pantalla actualizada. */
renderCategorias(items) {
    const tbody = document.getElementById("tablaCategorias");
    if (!tbody) return;
    tbody.innerHTML = items
      .map(
        (item) =>
          `<tr><td><strong>${escapar(item.nombre)}</strong></td><td>${escapar(item.descripcion || "-")}</td><td>${item.estado === "activa" ? '<span class="badge text-bg-success">Activa</span>' : '<span class="badge text-bg-secondary">Inactiva</span>'}</td><td><button class="btn btn-sm btn-outline-${item.estado === "activa" ? "danger" : "success"}" data-toggle-categoria="${item.id_categoria}">${item.estado === "activa" ? "Desactivar" : "Activar"}</button></td></tr>`,
      )
      .join("");
  },

  /** Dibuja espacios gestion con los datos recibidos. Entradas: items. Salida: valor calculado o pantalla actualizada. */
  renderEspaciosGestion(items) {
    const tbody = document.getElementById("tablaEspaciosGestion");
    if (!tbody) return;

    tbody.innerHTML = items.length
      ? items
          .map(
            (item) => `<tr>
              <td><strong>${escapar(item.nombre)}</strong><br><small class="text-muted text-capitalize">${escapar(item.tipo)}</small></td>
              <td>${escapar(item.ubicacion)}</td>
              <td>${escapar(item.capacidad ?? "-")}</td>
              <td><span class="badge text-bg-${item.estado === "disponible" ? "success" : item.estado === "inactivo" ? "secondary" : "warning"}">${escapar(item.estado.replaceAll("_", " "))}</span></td>
              <td><div class="table-actions">
                <button class="btn btn-outline-primary btn-sm" data-editar-espacio="${item.id_espacio}">Editar</button>
                ${item.estado !== "inactivo" ? `<button class="btn btn-outline-danger btn-sm" data-desactivar-espacio="${item.id_espacio}">Desactivar</button>` : ""}
              </div></td>
            </tr>`,
          )
          .join("")
      : '<tr><td colspan="5" class="text-center text-muted py-4">No hay espacios registrados.</td></tr>';
  },
};
