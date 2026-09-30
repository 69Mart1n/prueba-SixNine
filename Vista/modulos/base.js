import { escapar, insignia, nombreTipoSolicitud, formatearCambiosHistorial } from "./ayudas.js";
import { obtenerConfiguracionRegional, traducir } from "../preferencias.js?v=11";

/** Presenta los datos de base sin consultar la API. */
export const vistaBase = {
/** Realiza la operación «escapar texto» en este módulo. Entradas: escapar. Salida: valor calculado o pantalla actualizada. */
escaparTexto: escapar,
  /** Dibuja estado cuenta con los datos recibidos. Entradas: sesion. Salida: valor calculado o pantalla actualizada. */
  renderEstadoCuenta(sesion) {
    const configuracion = {
      pendiente: {
        etiqueta: "Pendiente de aprobación",
        titulo: "Tu solicitud está en revisión",
        mensaje:
          "El equipo administrador debe revisar y aprobar tu cuenta antes de que puedas ingresar a los módulos del sistema.",
        icono: "bi-hourglass-split",
        tono: "warning",
        pasoRevision: "current",
        pasoAcceso: "pending",
      },
      rechazado: {
        etiqueta: "Solicitud rechazada",
        titulo: "Tu solicitud no fue aprobada",
        mensaje:
          "La solicitud fue rechazada. Si considera que se trata de un error, comuníquese con la administración para solicitar una revisión.",
        icono: "bi-x-circle-fill",
        tono: "danger",
        pasoRevision: "rejected",
        pasoAcceso: "pending",
      },
      bloqueado: {
        etiqueta: "Cuenta dada de baja",
        titulo: "Tu acceso está deshabilitado",
        mensaje:
          sesion.motivo_bloqueo === "administrativo"
            ? "La cuenta fue dada de baja por la administración. Comuníquese con el centro si necesita solicitar su reactivación."
            : "La cuenta fue bloqueada por seguridad. Comuníquese con la administración para recuperar el acceso.",
        icono: "bi-lock-fill",
        tono: "danger",
        pasoRevision: "done",
        pasoAcceso: "rejected",
      },
    }[sesion.estado_cuenta] || {
      etiqueta: "Acceso no habilitado",
      titulo: "No es posible ingresar todavía",
      mensaje:
        "Consulte nuevamente el estado o comuníquese con la administración.",
      icono: "bi-info-circle-fill",
      tono: "secondary",
      pasoRevision: "current",
      pasoAcceso: "pending",
    };
    const asignar = (id, texto) => {
      const elemento = document.getElementById(id);
      if (elemento) elemento.textContent = texto;
    };
    const icono = document.getElementById("iconoEstadoCuenta");
    if (icono) icono.className = `bi ${configuracion.icono}`;
    const tarjeta = document.getElementById("tarjetaEstadoCuenta");
    if (tarjeta) tarjeta.dataset.tone = configuracion.tono;
    const insignia = document.getElementById("insigniaEstadoCuenta");
    if (insignia) insignia.className = `badge text-bg-${configuracion.tono}`;
    asignar("insigniaEstadoCuenta", configuracion.etiqueta);
    asignar("tituloEstadoCuenta", configuracion.titulo);
    asignar("mensajeEstadoCuenta", configuracion.mensaje);
    asignar("nombreEstadoCuenta", sesion.nombre || "Usuario");
    asignar("correoEstadoCuenta", sesion.correo || "-");
    asignar("rolEstadoCuenta", this.textoRol(sesion.rol_solicitado));
    asignar(
      "actualizacionEstadoCuenta",
      this.fechaHora(sesion.fecha_actualizacion_cuenta) || "Sin información",
    );
    const revision = document.getElementById("pasoRevisionCuenta");
    const acceso = document.getElementById("pasoAccesoCuenta");
    if (revision) revision.dataset.state = configuracion.pasoRevision;
    if (acceso) acceso.dataset.state = configuracion.pasoAcceso;
  },
  /** Muestra mensaje al usuario. Entradas: texto, tipo. Salida: valor calculado o pantalla actualizada. */
  mostrarMensaje(texto, tipo = "success") {
    const contenedor = document.getElementById("mensaje");
    if (!contenedor) return;

    contenedor.innerHTML = `
      <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${escapar(traducir(texto))}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
      </div>
    `;
  },

  /** Realiza la operación «marcar invalidos» en este módulo. Entradas: formulario, campos. Salida: valor calculado o pantalla actualizada. */
  marcarInvalidos(formulario, campos) {
    this.limpiarInvalidos(formulario);
    campos.forEach((campo) => campo.classList.add("is-invalid"));
  },

  /** Realiza la operación «limpiar invalidos» en este módulo. Entradas: formulario. Salida: valor calculado o pantalla actualizada. */
  limpiarInvalidos(formulario) {
    formulario
      .querySelectorAll(".is-invalid")
      .forEach((campo) => campo.classList.remove("is-invalid"));
  },

  /** Realiza la operación «reiniciar formulario» en este módulo. Entradas: formulario. Salida: valor calculado o pantalla actualizada. */
  reiniciarFormulario(formulario) {
    formulario.reset();
    this.limpiarInvalidos(formulario);
  },

  /** Conecta validaciones de entrada a los campos del formulario. Entradas: formulario. Salida: valor calculado o pantalla actualizada. */
  prepararCampos(formulario) {
    formulario.querySelectorAll("input, select, textarea").forEach((campo) => {
      campo.addEventListener("input", () => {
        if (campo.dataset.soloDigitos === "true")
          campo.value = campo.value.replace(/\D/g, "");
        if (campo.dataset.fechaLatina === "true")
          campo.value = this.formatearEntradaFecha(campo.value);
        campo.classList.remove("is-invalid");
      });
    });

    formulario.querySelectorAll('[data-solo-hoy="true"]').forEach((campo) => {
      const hoy = this.hoyISO();
      campo.min = hoy;
      campo.max = hoy;
      if (!campo.value) campo.value = hoy;
    });
  },

  /** Conecta los eventos de campos sala cuando corresponde a esta página. Entradas: espacios. Salida: valor calculado o pantalla actualizada. */
  iniciarCamposSala(espacios = []) {
    document
      .querySelectorAll("#formSolicitud, #formUsoSala")
      .forEach((formulario) => {
        const tipo = formulario.querySelector("#tipoSala");
        const sala = formulario.querySelector("#salaSolicitada");
        if (tipo && sala) {
          const cargar = () => {
            sala.innerHTML = '<option value="">Seleccionar sala</option>';
            sala.disabled = !tipo.value;
            if (!tipo.value) {
              sala.innerHTML =
                '<option value="">Seleccione primero un tipo de sala</option>';
              return;
            }
            const tipos = { "Salón": "salon", Taller: "taller", Laboratorio: "laboratorio" };
            espacios.filter((espacio) => espacio.tipo === tipos[tipo.value]).forEach((espacio) => {
              const opcion = document.createElement("option");
              opcion.value = espacio.nombre;
              opcion.textContent = espacio.nombre;
              sala.appendChild(opcion);
            });
            if (formulario.id === "formUsoSala") {
              const usaPuestos = tipos[tipo.value] !== "salon";
              formulario.querySelectorAll(".usage-equipment-field, #btnAgregarAlumno").forEach((campo) => {
                campo.hidden = !usaPuestos;
              });
              document.getElementById("planillaUsoSala")?.toggleAttribute("hidden", !usaPuestos);
              if (!usaPuestos) {
                document.getElementById("tablaAlumnos").innerHTML = "";
                document.getElementById("numeroEquipo").value = "";
              }
            }
          };
          tipo.addEventListener("change", cargar);
          cargar();
        }

        const tipoSolicitud = formulario.querySelector("#tipoSolicitud");
        const campoSoftware = formulario.querySelector("#campoSoftware");
        const software = formulario.querySelector("#software");
        if (tipoSolicitud && campoSoftware && software) {
          const actualizar = () => {
            const mostrar =
              tipoSolicitud.value === "Instalacion de software" ||
              tipoSolicitud.value === "Instalación de software";
            campoSoftware.hidden = !mostrar;
            software.required = mostrar;
            if (!mostrar) software.value = "";
          };
          tipoSolicitud.addEventListener("change", actualizar);
          actualizar();
        }
      });
  },

  /** Conecta los eventos de tabla uso sala cuando corresponde a esta página. Entradas: ninguna. Salida: valor calculado o pantalla actualizada. */
  iniciarTablaUsoSala() {
    const boton = document.getElementById("btnAgregarAlumno");
    const tabla = document.getElementById("tablaAlumnos");
    const equipo = document.getElementById("numeroEquipo");
    if (!boton || !tabla || !equipo) return;

    const botonImprimir = document.getElementById("btnImprimirUso");
    const actualizarTabla = () => {
      const equiposSeleccionados = new Set(
        [...tabla.querySelectorAll("tr[data-equipo]")].map(
          (fila) => fila.dataset.equipo,
        ),
      );
      [...equipo.options].forEach((opcion) => {
        opcion.disabled =
          Boolean(opcion.value) && equiposSeleccionados.has(opcion.value);
      });
      if (botonImprimir)
        botonImprimir.disabled = equiposSeleccionados.size === 0;

      if (equiposSeleccionados.size === 0) {
        tabla.innerHTML =
          '<tr class="usage-empty-row"><td colspan="5">Agregue los equipos y alumnos que utilizaran la sala.</td></tr>';
      } else {
        tabla.querySelector(".usage-empty-row")?.remove();
      }
    };

    equipo.innerHTML = '<option value="">Seleccionar equipo</option>';
    for (let numero = 1; numero <= 16; numero += 1) {
      equipo.insertAdjacentHTML(
        "beforeend",
        `<option value="Equipo ${numero}">Equipo ${numero}</option>`,
      );
    }

    boton.addEventListener("click", () => {
      const alumno = document.getElementById("alumno");
      if (!equipo.value || !alumno.value.trim()) {
        equipo.classList.toggle("is-invalid", !equipo.value);
        alumno.classList.toggle("is-invalid", !alumno.value.trim());
        return;
      }

      const repetido = [...tabla.querySelectorAll("tr[data-equipo]")].some(
        (fila) => fila.dataset.equipo === equipo.value,
      );
      if (repetido) {
        equipo.classList.add("is-invalid");
        this.mostrarMensaje(
          "Ese equipo ya fue agregado a la planilla.",
          "warning",
        );
        return;
      }

      const estado = document.getElementById("estadoEquipo").value;
      const observaciones = document.getElementById("obsEquipo").value.trim();
      tabla.querySelector(".usage-empty-row")?.remove();
      tabla.insertAdjacentHTML(
        "beforeend",
        `
        <tr data-equipo="${escapar(equipo.value)}" data-alumno="${escapar(alumno.value.trim())}" data-estado="${escapar(estado)}" data-observaciones="${escapar(observaciones)}">
          <td>${escapar(equipo.value)}</td>
          <td>${escapar(alumno.value.trim())}</td>
          <td>${escapar(estado)}</td>
          <td>${escapar(observaciones || "-")}</td>
          <td class="usage-row-actions"><button type="button" class="btn btn-sm btn-outline-danger" data-quitar-equipo title="Quitar equipo" aria-label="Quitar ${escapar(equipo.value)}"><i class="bi bi-trash" aria-hidden="true"></i></button></td>
        </tr>
      `,
      );
      equipo.value = "";
      equipo.classList.remove("is-invalid");
      alumno.value = "";
      alumno.classList.remove("is-invalid");
      document.getElementById("obsEquipo").value = "";
      document.getElementById("estadoEquipo").value = "Libre";
      actualizarTabla();
    });

    tabla.addEventListener("click", (evento) => {
      const quitar = evento.target.closest("[data-quitar-equipo]");
      if (!quitar) return;
      quitar.closest("tr")?.remove();
      actualizarTabla();
    });

    botonImprimir?.addEventListener("click", () => {
      this.prepararResumenUsoSala();
      window.print();
    });

    document
      .getElementById("btnNuevaPlanilla")
      ?.addEventListener("click", () => {
        const formulario = document.getElementById("formUsoSala");
        if (!formulario) return;
        this.reiniciarFormulario(formulario);
        formulario
          .querySelectorAll("input, select, button")
          .forEach((control) => {
            control.disabled = false;
          });
        formulario.dataset.registrado = "false";
        tabla.innerHTML = "";
        document.getElementById("btnNuevaPlanilla").hidden = true;
        document.getElementById("btnRegistrarUso").innerHTML =
          '<i class="bi bi-check2-circle" aria-hidden="true"></i> Confirmar y registrar';
        document.getElementById("tipoSala")?.dispatchEvent(new Event("change"));
        document.getElementById("btnFechaHoy")?.click();
        actualizarTabla();
        formulario.scrollIntoView({ behavior: "smooth", block: "start" });
      });

    actualizarTabla();
  },

  /** Lee los equipos anotados en la planilla de uso. Entradas: ninguna. Salida: valor calculado o pantalla actualizada. */
  obtenerEquiposUsoSala() {
    return [...document.querySelectorAll("#tablaAlumnos tr[data-equipo]")].map(
      (fila) => ({
        numeroEquipo: fila.dataset.equipo,
        alumno: fila.dataset.alumno,
        estado: fila.dataset.estado,
        observaciones: fila.dataset.observaciones,
      }),
    );
  },

  /** Actualiza el resumen previo al registro de sala. Entradas: ninguna. Salida: valor calculado o pantalla actualizada. */
  prepararResumenUsoSala() {
    const resumen = document.getElementById("resumenImpresionUsoSala");
    if (!resumen) return;

    const valor = (id) => document.getElementById(id)?.value?.trim() || "-";
    resumen.innerHTML = `
      <div class="usage-print-heading">
        <div><strong>SGRSI</strong><span>Planilla de uso de sala</span></div>
      </div>
      <dl>
        <div><dt>Sala</dt><dd>${escapar(valor("salaSolicitada"))} (${escapar(valor("tipoSala"))})</dd></div>
        <div><dt>Fecha y horario</dt><dd>${escapar(valor("fecha"))}, ${escapar(valor("horaEntrada"))} a ${escapar(valor("horaSalida"))}</dd></div>
        <div><dt>Grupo</dt><dd>${escapar(valor("grupo"))}</dd></div>
        <div><dt>Asignatura</dt><dd>${escapar(valor("asignatura"))}</dd></div>
        <div><dt>Docente</dt><dd>${escapar(valor("docente"))}</dd></div>
        <div><dt>Turno</dt><dd>${escapar(valor("turno"))}</dd></div>
        <div class="usage-print-wide"><dt>Observaciones del salón</dt><dd>${escapar(valor("observaciones"))}</dd></div>
      </dl>
    `;
  },

  /** Realiza la operación «marcar uso sala registrado» en este módulo. Entradas: formulario. Salida: valor calculado o pantalla actualizada. */
  marcarUsoSalaRegistrado(formulario) {
    formulario.dataset.registrado = "true";
    formulario.querySelectorAll("input, select").forEach((control) => {
      control.disabled = true;
    });
    document.getElementById("btnAgregarAlumno").disabled = true;
    const registrar = document.getElementById("btnRegistrarUso");
    registrar.disabled = true;
    registrar.innerHTML =
      '<i class="bi bi-check-circle-fill" aria-hidden="true"></i> Planilla registrada';
    document.querySelectorAll("[data-quitar-equipo]").forEach((boton) => {
      boton.disabled = true;
    });
    document.getElementById("btnNuevaPlanilla").hidden = false;
    this.prepararResumenUsoSala();
  },

  /** Pide confirmación antes de una acción importante. Entradas: ninguna. Salida: promesa con confirmación verdadera/falsa. */
  confirmarAccion({
    titulo,
    mensaje,
    textoConfirmar = "Confirmar",
    variante = "primary",
  }) {
    let modal = document.getElementById("modalConfirmacionSgrsi");
    if (!modal) {
      document.body.insertAdjacentHTML(
        "beforeend",
        `
        <div class="modal fade" id="modalConfirmacionSgrsi" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h2 class="modal-title h5" id="modalConfirmacionTitulo"></h2>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
              </div>
              <div class="modal-body" id="modalConfirmacionMensaje"></div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn" id="modalConfirmacionAceptar"></button>
              </div>
            </div>
          </div>
        </div>
      `,
      );
      modal = document.getElementById("modalConfirmacionSgrsi");
    }

    modal.querySelector("#modalConfirmacionTitulo").textContent =
      traducir(titulo);
    modal.querySelector("#modalConfirmacionMensaje").textContent =
      traducir(mensaje);
    const aceptar = modal.querySelector("#modalConfirmacionAceptar");
    aceptar.textContent = traducir(textoConfirmar);
    aceptar.className = `btn btn-${variante}`;

    return new Promise((resolve) => {
      const instancia = bootstrap.Modal.getOrCreateInstance(modal);
      let confirmado = false;
      const confirmar = () => {
        confirmado = true;
        instancia.hide();
      };
      const cerrar = () => {
        aceptar.removeEventListener("click", confirmar);
        modal.removeEventListener("hidden.bs.modal", cerrar);
        resolve(confirmado);
      };
      aceptar.addEventListener("click", confirmar);
      modal.addEventListener("hidden.bs.modal", cerrar);
      instancia.show();
    });
  },

  /** Construye las opciones de navegación según los roles aprobados. Entradas: sesion. Salida: valor calculado o pantalla actualizada. */
  construirMenu(sesion) {
    const menu = document.getElementById("menuRol");
    if (!menu) return;

    const rol = sesion.rol;
    const roles = sesion.roles_disponibles || [];
    const opcionesPrincipales =
      {
        administrador: [
          ["inicio", "administrador.html", "bi-house-door", "Inicio"],
          ["usuarios", "usuarios.html", "bi-people-fill", "Usuarios"],
          [
            "incidencias",
            "incidencias.html",
            "bi-ticket-detailed-fill",
            "Incidencias",
          ],
          [
            "prestamos",
            "prestamos-gestion.html",
            "bi-box-arrow-up-right",
            "Préstamos",
          ],
          [
            "laboratorios",
            "laboratorio.html",
            "bi-display-fill",
            "Laboratorios",
          ],
          ["equipos", "equipo.html", "bi-pc-display", "Inventario"],
          ["blacklist", "blacklist.html", "bi-person-fill-slash", "Black list"],
          [
            "reportes",
            "reporte.html",
            "bi-file-earmark-bar-graph-fill",
            "Reportes",
          ],
          ["categorias", "categorias.html", "bi-tags", "Categorías"],
          ["tareas", "tareas.html", "bi-calendar-check", "Tareas de soporte"],
          [
            "conocimiento",
            "conocimiento.html",
            "bi-journal-check",
            "Conocimiento",
          ],
          ["historial", "historial.html", "bi-clock-history", "Historial"],
        ],
        tecnico: [
          ["inicio", "tecnico.html", "bi-house-door", "Inicio"],
          [
            "incidencias",
            "incidencias.html",
            "bi-ticket-detailed-fill",
            "Incidencias",
          ],
          [
            "prestamos",
            "prestamos-gestion.html",
            "bi-box-arrow-up-right",
            "Préstamos",
          ],
          [
            "laboratorios",
            "laboratorio.html",
            "bi-display-fill",
            "Laboratorios",
          ],
          ["equipos", "equipo.html", "bi-pc-display", "Equipos"],
          ["blacklist", "blacklist.html", "bi-person-fill-slash", "Black list"],
          [
            "reportes",
            "reporte.html",
            "bi-file-earmark-bar-graph-fill",
            "Reportes",
          ],
          ["categorias", "categorias.html", "bi-tags", "Categorías"],
          ["tareas", "tareas.html", "bi-calendar-check", "Tareas de soporte"],
          [
            "conocimiento",
            "conocimiento.html",
            "bi-journal-check",
            "Conocimiento",
          ],
        ],
        solicitante: [
          ["inicio", "solicitante.html", "bi-house-door", "Inicio"],
        ],
      }[rol] || [];
    const opcionesSolicitante = [
      ["uso-sala", "uso-sala.html", "bi-clipboard-data", "Uso de sala"],
      [
        "laboratorio",
        "solicitud-servicio.html",
        "bi-display",
        "Solicitar laboratorio",
      ],
      [
        "incidencia",
        "ticket-incidencia.html",
        "bi-ticket-detailed",
        "Reportar incidencia",
      ],
      [
        "prestamo",
        "prestamo.html",
        "bi-box-arrow-up-right",
        "Solicitar préstamo",
      ],
      [
        "mis-solicitudes",
        "mis-solicitudes.html",
        "bi-folder2-open",
        "Mis solicitudes",
      ],
    ];
    const grupos = [
      { etiqueta: this.textoRol(rol), opciones: opcionesPrincipales },
    ];
    if (roles.includes("solicitante")) {
      grupos.push({
        etiqueta:
          rol === "solicitante"
            ? "Gestiones personales"
            : "Solicitante / Docente",
        opciones: opcionesSolicitante,
      });
    }
    grupos.push({
      etiqueta: "Cuenta",
      opciones: [
        [
          "solicitar-rol",
          "solicitar-rol.html",
          "bi-person-plus",
          "Solicitar otro rol",
        ],
      ],
    });

    const activo = menu.dataset.active || "inicio";
    menu.innerHTML = grupos
      .map(
        ({ etiqueta, opciones }) => `
      <li class="menu-section-label">${escapar(etiqueta)}</li>
      ${opciones
        .map(
          ([id, href, icono, texto]) => `
        <li class="${id === activo ? "active" : ""}"><a href="${href}"><i class="bi ${icono}"></i> ${texto}</a></li>
      `,
        )
        .join("")}
    `,
      )
      .join("");
  },
};
