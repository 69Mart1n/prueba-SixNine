import { escapar, insignia, nombreTipoSolicitud, formatearCambiosHistorial } from "./ayudas.js";
import { obtenerConfiguracionRegional, traducir } from "../preferencias.js?v=11";

/** Presenta los datos de usuarios sin consultar la API. */
export const vistaUsuarios = {
/** Dibuja usuarios con los datos recibidos. Entradas: usuarios, todos. Salida: valor calculado o pantalla actualizada. */
renderUsuarios(usuarios, todos = usuarios) {
    const tbody = document.querySelector("#tablaUsuarios");
    if (!tbody) return;
    this.actualizarResumenUsuarios(todos);
    const hayUsuarios = usuarios.length > 0;
    const contenedorTabla = document.getElementById("tablaUsuariosContenedor");
    const estadoVacio = document.getElementById("usuariosSinRegistros");
    if (contenedorTabla) contenedorTabla.hidden = !hayUsuarios;
    if (estadoVacio) estadoVacio.hidden = hayUsuarios;

    tbody.innerHTML = usuarios
      .map((u) => {
        const acciones = [];
        if (u.estado === "pendiente") {
          acciones.push(
            `<button class="btn btn-success btn-sm" data-accion-usuario="aprobar" data-id="${u.id_usuario}" data-nombre="${escapar(`${u.nombre} ${u.apellido}`)}">Aprobar</button>`,
          );
          acciones.push(
            `<button class="btn btn-outline-danger btn-sm" data-accion-usuario="rechazar" data-id="${u.id_usuario}" data-nombre="${escapar(`${u.nombre} ${u.apellido}`)}">Rechazar</button>`,
          );
        }
        if (u.estado === "activo")
          acciones.push(
            `<button class="btn btn-outline-danger btn-sm" data-accion-usuario="dar_baja" data-id="${u.id_usuario}" data-nombre="${escapar(`${u.nombre} ${u.apellido}`)}">Dar de baja</button>`,
          );
        if (u.estado === "bloqueado")
          acciones.push(
            `<button class="btn btn-outline-primary btn-sm" data-accion-usuario="reactivar" data-id="${u.id_usuario}" data-nombre="${escapar(`${u.nombre} ${u.apellido}`)}">Reactivar</button>`,
          );

        return `<tr>
        <td><strong>${escapar(u.nombre)}</strong></td><td>${escapar(u.apellido)}</td><td><span class="font-monospace">${escapar(u.cedula)}</span></td>
        <td><span class="text-break">${escapar(u.correo)}</span></td><td>${escapar(u.telefono)}</td><td>${this.renderRolesUsuario(u)}</td>
        <td>${this.insigniaUsuario(u.estado)}</td><td>${escapar(this.fecha(u.fecha_creacion))}</td>
        <td><div class="table-actions">${acciones.join("") || '<span class="text-muted small">Sin acciones</span>'}</div></td>
      </tr>`;
      })
      .join("");
  },

  /** Dibuja roles usuario con los datos recibidos. Entradas: usuario. Salida: valor calculado o pantalla actualizada. */
  renderRolesUsuario(usuario) {
    const roles = this.parsearRoles(
      usuario.roles_resumen || `${usuario.rol_solicitado}:${usuario.estado}`,
    );
    return roles
      .map(({ rol, estado }) => {
        const acciones =
          estado === "pendiente" && usuario.estado === "activo"
            ? `<button class="btn btn-success btn-sm ms-1" data-accion-rol="aprobar" data-id="${usuario.id_usuario}" data-rol="${escapar(rol)}">Aprobar rol</button>
           <button class="btn btn-outline-danger btn-sm ms-1" data-accion-rol="rechazar" data-id="${usuario.id_usuario}" data-rol="${escapar(rol)}">Rechazar</button>`
            : "";
        return `<div class="mb-1">${this.insigniaRol(rol)} ${this.insigniaUsuario(estado)}${acciones}</div>`;
      })
      .join("");
  },

  /** Convierte los roles almacenados en una lista utilizable. Entradas: valor. Salida: valor calculado o pantalla actualizada. */
  parsearRoles(valor) {
    return String(valor || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [rol, estado = "pendiente"] = item.split(":");
        return { rol, estado };
      });
  },

  /** Dibuja resumen usuarios con los datos recibidos. Entradas: usuarios. Salida: valor calculado o pantalla actualizada. */
  actualizarResumenUsuarios(usuarios) {
    const escribir = (id, valor) => {
      const elemento = document.getElementById(id);
      if (elemento) elemento.textContent = valor;
    };
    escribir("usuariosTotal", usuarios.length);
    escribir(
      "usuariosPendientes",
      usuarios.filter((u) => u.estado === "pendiente").length,
    );
    escribir(
      "usuariosActivos",
      usuarios.filter((u) => u.estado === "activo").length,
    );
    escribir(
      "usuariosBaja",
      usuarios.filter((u) => ["bloqueado", "rechazado"].includes(u.estado))
        .length,
    );
  },
};
