/*
 * VISTA
 * Contiene funciones de renderizado. Recibe datos ya obtenidos por el Controlador
 * y genera tablas, tarjetas, estados y acciones sin consultar directamente la API.
 */

import { obtenerConfiguracionRegional, traducir } from "../preferencias.js?v=11";

/** Convierte texto en HTML seguro antes de insertarlo. Entradas: valor. Salida: valor calculado o pantalla actualizada. */
export function escapar(valor) {
  const span = document.createElement("span");
  span.textContent = valor ?? "";
  return span.innerHTML;
}
/** Construye una etiqueta de estado con texto escapado. Entradas: valor, mapa, defecto. Salida: valor calculado o pantalla actualizada. */
export function insignia(valor, mapa, defecto = "secondary") {
  const info = mapa[valor] || { texto: valor || "-", clase: defecto };
  return `<span class="badge text-bg-${info.clase}">${escapar(info.texto)}</span>`;
}
/** Convierte el código de tipo de solicitud en una etiqueta legible. Entradas: tipo. Salida: valor calculado o pantalla actualizada. */
export function nombreTipoSolicitud(tipo) {
  const nombres = {
    reserva_sala: "Reserva de sala",
    instalacion_software: "Instalación de software",
    soporte_clase: "Soporte para clase",
  };
  const nombre = nombres[tipo] ||
    String(tipo || "-").replaceAll("_", " ").replace(/^./, (letra) => letra.toUpperCase());
  return traducir(nombre);
}
/** Describe los campos modificados en un registro de auditoría. Entradas: datos. Salida: valor calculado o pantalla actualizada. */
export function formatearCambiosHistorial(datos) {
  const etiquetas = {
    estado: "Estado",
    prioridad: "Prioridad",
    tipo: "Tipo",
    rol: "Rol",
    equipo: "Equipo",
    condicion: "Condición",
    titulo: "Título",
  };
  const valores = {
    en_proceso: "En proceso",
    sin_asignar: "Sin asignar",
    pendiente: "Pendiente",
    resuelta: "Resuelta",
    cancelada: "Cancelada",
    aprobada: "Aprobada",
    aprobado: "Aprobado",
    completada: "Completada",
    entregado: "Entregado",
    devuelto: "Devuelto",
    prestado: "Prestado",
    activo: "Activo",
    rechazado: "Rechazado",
    solicitante: "Solicitante",
    administrador: "Administrador",
    tecnico: "Técnico",
    preventiva: "Preventiva",
    reactiva: "Reactiva",
    danado: "Dañado",
    baja: "Baja",
    media: "Media",
    alta: "Alta",
  };
  let cambios = datos;
  if (typeof cambios === "string") {
    try {
      cambios = JSON.parse(cambios);
    } catch {
      return cambios;
    }
  }
  if (!cambios || typeof cambios !== "object" || Array.isArray(cambios)) {
    return "Sin detalle adicional";
  }
  const partes = Object.entries(cambios).map(([clave, valor]) => {
    const etiqueta =
      etiquetas[clave] ||
      clave.replaceAll("_", " ").replace(/^./, (letra) => letra.toUpperCase());
    const texto =
      typeof valor === "object" && valor !== null
        ? JSON.stringify(valor)
        : valores[String(valor)] || String(valor ?? "-").replaceAll("_", " ");
    return `${etiqueta}: ${texto}`;
  });
  return partes.length ? partes.join(" · ") : "Sin detalle adicional";
}
