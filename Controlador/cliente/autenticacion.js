import { Modelo } from "../../Modelo/modelo.js?v=10";
import { Vista } from "../../Vista/vista.js?v=24";
import { traducir } from "../../Vista/preferencias.js?v=12";
import { obtenerElemento, datosFormulario, ejecutar, guardarSesion, datosPantalla } from "./comun.js";

/** Conecta los eventos de login cuando corresponde a esta página. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export function iniciarLogin() {
  const form = obtenerElemento("formInicioSesion");
  if (!form) return;

  const botonIngresar = form.querySelector('button[type="submit"]');

  const autenticar = async () => {
    const contenidoBoton = botonIngresar?.innerHTML;
    if (botonIngresar) {
      botonIngresar.disabled = true;
      botonIngresar.setAttribute("aria-busy", "true");
      botonIngresar.innerHTML =
        '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Ingresando';
    }
    const usuario = await ejecutar(() =>
      Modelo.iniciarSesion(datosFormulario(form)),
    );

    if (botonIngresar) {
      botonIngresar.disabled = false;
      botonIngresar.removeAttribute("aria-busy");
      botonIngresar.innerHTML = contenidoBoton;
    }
    if (!usuario) return;
    guardarSesion(usuario);
    window.location.href = usuario.acceso_sistema
      ? Modelo.obtenerPaginaPorRol(usuario.rol)
      : "estado-cuenta.html";
  };

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    await autenticar();
  });

  obtenerElemento("btnMostrarContrasena")?.addEventListener("click", (evento) => {
    const campo = obtenerElemento("contrasena");
    const mostrar = campo.type === "password";
    campo.type = mostrar ? "text" : "password";
    evento.currentTarget.setAttribute("aria-pressed", String(mostrar));
    evento.currentTarget.setAttribute(
      "title",
      mostrar ? "Ocultar contraseña" : "Mostrar contraseña",
    );
    evento.currentTarget.innerHTML = `<i class="bi ${mostrar ? "bi-eye-slash" : "bi-eye"}"></i>`;
  });
}
/** Gestiona la solicitud pública de un enlace de recuperación. */
export function iniciarRecuperacionContrasena() {
  const formulario = obtenerElemento("formRecuperarContrasena");
  if (!formulario) return;
  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const boton = formulario.querySelector('button[type="submit"]');
    boton.disabled = true;
    const resultado = await ejecutar(() =>
      Modelo.solicitarRecuperacion(datosFormulario(formulario)),
    );
    boton.disabled = false;
    if (resultado) {
      Vista.mostrarMensaje(traducir(resultado.mensaje), "success");
      formulario.reset();
    }
  });
}
/** Valida el enlace y procesa la elección de una nueva contraseña. */
export async function iniciarRestablecimientoContrasena() {
  const formulario = obtenerElemento("formRestablecerContrasena");
  if (!formulario) return;
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const estadoToken = await ejecutar(() => Modelo.validarRecuperacion(token));
  if (!estadoToken?.valido) {
    formulario.querySelectorAll("input, button").forEach((control) => {
      control.disabled = true;
    });
    Vista.mostrarMensaje(
      traducir("El enlace de recuperación no es válido o venció"),
      "danger",
    );
    return;
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const datos = datosFormulario(formulario);
    datos.token = token;
    if (datos.contrasena !== datos.confirmar_contrasena) {
      Vista.mostrarMensaje(traducir("Las contraseñas no coinciden"), "danger");
      return;
    }
    const boton = formulario.querySelector('button[type="submit"]');
    boton.disabled = true;
    const resultado = await ejecutar(() => Modelo.restablecerContrasena(datos));
    boton.disabled = false;
    if (resultado) {
      Vista.mostrarMensaje(
        traducir("Contraseña restablecida correctamente"),
        "success",
      );
      formulario.reset();
      formulario.querySelectorAll("input, button").forEach((control) => {
        control.disabled = true;
      });
      obtenerElemento("enlaceVolverLogin")?.classList.remove("d-none");
    }
  });
}
/** Consulta estado cuenta y actualiza la pantalla. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export async function cargarEstadoCuenta() {
  const sesion = await ejecutar(() => Modelo.obtenerSesion());
  if (!sesion) {
    window.location.href = "login.html";
    return;
  }
  guardarSesion(sesion);
  if (sesion.acceso_sistema) {
    window.location.href = Modelo.obtenerPaginaPorRol(sesion.rol);
    return;
  }
  Vista.renderEstadoCuenta(sesion);
}
/** Conecta los eventos de estado cuenta cuando corresponde a esta página. Entradas: ninguna. Salida: resultado de la acción o pantalla actualizada. */
export async function iniciarEstadoCuenta() {
  await cargarEstadoCuenta();
  obtenerElemento("btnActualizarEstadoCuenta")?.addEventListener("click", async (evento) => {
    const boton = evento.currentTarget;
    const contenido = boton.innerHTML;
    boton.disabled = true;
    boton.innerHTML =
      '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Actualizando';
    await cargarEstadoCuenta();
    boton.disabled = false;
    boton.innerHTML = contenido;
  });
  obtenerElemento("btnSalirEstadoCuenta")?.addEventListener("click", async () => {
    const cerrado = await ejecutar(() => Modelo.cerrarSesion());
    if (!cerrado) return;
    sessionStorage.clear();
    window.location.href = "login.html";
  });
}
