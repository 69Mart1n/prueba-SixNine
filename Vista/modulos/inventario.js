import { escapar, insignia, nombreTipoSolicitud, formatearCambiosHistorial } from "./ayudas.js";
import { obtenerConfiguracionRegional, traducir } from "../preferencias.js?v=11";

/** Presenta los datos de inventario sin consultar la API. */
export const vistaInventario = {
/** Presenta el nombre visible de un rol. Entradas: rol. Salida: valor calculado o pantalla actualizada. */
textoRol(rol) {
    return (
      {
        administrador: "Admin / Coordinador",
        tecnico: "Técnico",
        solicitante: "Solicitante / Docente",
      }[rol] || rol
    );
  },

  /** Dibuja inventario con los datos recibidos. Entradas: items, roles. Salida: valor calculado o pantalla actualizada. */
  renderInventario(items, roles) {
    const tbody = document.getElementById("tablaInventario");
    if (!tbody) return;
    if (items.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="8" class="text-center text-muted py-5">No hay equipos que coincidan con los filtros.</td></tr>';
      return;
    }
    const administra = roles.includes("administrador");
    const filaEquipo = (item, atributos = "") => `<tr ${atributos}>
      <td><strong class="font-monospace">${escapar(item.codigo_inventario)}</strong></td>
      <td>${escapar(item.nombre)}</td><td>${escapar(item.tipo)}</td>
      <td>${escapar(item.espacio || item.ubicacion_detalle || "Sin asignar")}</td>
      <td>${this.insigniaEquipo(item.estado)}</td>
      <td><span class="badge text-bg-${Number(item.es_prestable) === 1 ? "success" : "secondary"}">${escapar(traducir(Number(item.es_prestable) === 1 ? "Prestable" : "No prestable"))}</span></td>
      <td>${escapar(this.fecha(item.ultima_revision) || "Sin movimientos")}</td>
      <td>${administra && item.estado !== "baja" ? `<div class="table-actions"><button class="btn btn-outline-primary btn-sm" data-editar-equipo="${item.id_equipo}"><i class="bi bi-pencil"></i> Editar</button><button class="btn btn-outline-danger btn-sm" data-baja-equipo="${item.id_equipo}" ${item.estado === "prestado" ? "disabled" : ""}><i class="bi bi-archive"></i> Baja</button></div>` : '<span class="text-muted small">Consulta</span>'}</td>
    </tr>`;
    const esPrestable = (item) =>
      Number(item.es_prestable) === 1 && /^(notebook|laptop)$/i.test(item.tipo);
    const secciones = [
      ["salon", "Salones comunes"],
      ["taller", "Talleres"],
      ["laboratorio", "Laboratorios"],
    ];
    const partes = [];
    for (const [tipo, titulo] of secciones) {
      const grupos = new Map();
      items.filter((item) => item.tipo_espacio === tipo && !esPrestable(item))
        .forEach((item) => {
          const clave = String(item.id_espacio_actual);
          if (!grupos.has(clave)) grupos.set(clave, { nombre: item.espacio, items: [] });
          grupos.get(clave).items.push(item);
        });
      if (grupos.size === 0) continue;
      partes.push(`<tr class="inventory-section-row"><th colspan="8" scope="row">${escapar(traducir(titulo))}</th></tr>`);
      for (const [idEspacio, grupo] of [...grupos.entries()].sort((a, b) => a[1].nombre.localeCompare(b[1].nombre, "es", { numeric: true }))) {
        const puestos = grupo.items.filter((item) => item.tipo === "PC" && /^Puesto \d{2}$/.test(item.ubicacion_detalle || ""));
        const otros = grupo.items.filter((item) => !puestos.includes(item));
        partes.push(`<tr class="inventory-room-row"><th colspan="8" scope="row">${escapar(grupo.nombre)} <span class="inventory-room-count">${grupo.items.length} ${escapar(traducir("equipos"))}</span></th></tr>`);
        if (puestos.length) {
          const etiqueta = `${puestos.length} ${traducir("PC de alumnos")}`;
          partes.push(`<tr class="inventory-pc-summary"><td colspan="8"><button type="button" class="btn btn-sm btn-outline-primary" data-grupo-pc="${idEspacio}" aria-expanded="false" aria-label="${escapar(etiqueta)}. ${escapar(traducir("Mostrar puestos"))}"><i class="bi bi-chevron-right me-1" aria-hidden="true"></i>${escapar(etiqueta)}</button><span class="text-muted small ms-2">${escapar(traducir("Mostrar puestos"))}</span></td></tr>`);
          puestos.sort((a, b) => (a.ubicacion_detalle || "").localeCompare(b.ubicacion_detalle || "", "es", { numeric: true }))
            .forEach((item) => partes.push(filaEquipo(item, `class="inventory-pc-row d-none" data-puesto-espacio="${idEspacio}"`)));
        }
        otros.forEach((item) => partes.push(filaEquipo(item)));
      }
    }
    const prestables = items.filter(esPrestable);
    if (prestables.length) {
      partes.push(`<tr class="inventory-section-row"><th colspan="8" scope="row">${escapar(traducir("Equipos para préstamo"))}</th></tr>`);
      prestables.forEach((item) => partes.push(filaEquipo(item)));
    }
    tbody.innerHTML = partes.join("");
  },

  /** Dibuja historial con los datos recibidos. Entradas: items. Salida: valor calculado o pantalla actualizada. */
  renderHistorial(items) {
    const tbody = document.getElementById("tablaHistorial");
    if (!tbody) return;
    tbody.innerHTML = items.length
      ? items
          .map(
            (item) =>
              `<tr><td>${escapar(this.fechaHora(item.fecha))}</td><td class="text-capitalize">${escapar(item.modulo)}</td><td class="text-capitalize">${escapar(item.accion.replaceAll("_", " "))}</td><td>${escapar(item.entidad)}${item.id_entidad ? ` #${item.id_entidad}` : ""}</td><td>${escapar(formatearCambiosHistorial(item.datos_nuevos))}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="5" class="text-center text-muted py-5">No hay acciones para los filtros elegidos.</td></tr>';
  },

  /** Dibuja conocimiento con los datos recibidos. Entradas: items. Salida: valor calculado o pantalla actualizada. */
  renderConocimiento(items) {
    const lista = document.getElementById("listaConocimiento");
    if (!lista) return;
    lista.innerHTML = items.length
      ? items
          .map(
            (item) =>
              `<article class="knowledge-entry"><header><div><span>${escapar(item.categoria || "Sin categoría")}</span><h2>${escapar(item.titulo)}</h2></div><small>${escapar(item.codigo_inventario || "General")}</small></header><dl><div><dt>Diagnóstico</dt><dd>${escapar(item.diagnostico)}</dd></div><div><dt>Solución aplicada</dt><dd>${escapar(item.solucion_aplicada)}</dd></div></dl></article>`,
          )
          .join("")
      : '<div class="empty-state"><p class="fw-bold">Sin soluciones coincidentes</p><p>La base se completa automáticamente al resolver incidencias.</p></div>';
  },
};
