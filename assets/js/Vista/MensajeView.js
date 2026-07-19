/**
 * Vista encargada de mostrar mensajes Bootstrap.
 */
class MensajeView {
  /**
   * Crea una alerta Bootstrap dentro del contenedor de mensajes de la pagina.
   * @param {string} texto Contenido que vera el usuario.
   * @param {string} [tipo="success"] Variante Bootstrap: success, warning o danger.
   */
  mostrar(texto, tipo = "success") {
    const contenedor = document.getElementById("mensaje");
    if (!contenedor) return;

    contenedor.innerHTML = `
      <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${texto}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
      </div>
    `;
  }

  /**
   * Elimina cualquier alerta que exista en el contenedor de mensajes.
   */
  limpiar() {
    const contenedor = document.getElementById("mensaje");
    if (contenedor) contenedor.innerHTML = "";
  }
}

window.MensajeView = MensajeView;
