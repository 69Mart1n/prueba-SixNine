/**
 * Web App de Gmail para los correos de recuperación de SGRSI.
 *
 * Propiedades obligatorias del script:
 * - SGRSI_SECRET: clave larga compartida con GMAIL_SCRIPT_SECRET.
 * - SGRSI_URL_BASE: por ejemplo http://127.0.0.1:8001/Vista.
 * Propiedad opcional:
 * - SGRSI_NOMBRE_REMITENTE: por defecto "SGRSI UTU".
 */
function doPost(e) {
  try {
    const datos = JSON.parse((e.postData && e.postData.contents) || "{}");
    const propiedades = PropertiesService.getScriptProperties();
    const secreto = propiedades.getProperty("SGRSI_SECRET");
    const urlBase = (propiedades.getProperty("SGRSI_URL_BASE") || "").replace(
      /\/$/,
      "",
    );

    if (!secreto || datos.secreto !== secreto) return respuesta({ ok: false });
    if (
      !urlBase ||
      typeof datos.enlace !== "string" ||
      !datos.enlace.startsWith(
        urlBase + "/pages/restablecer-contrasena.html?token=",
      )
    ) {
      return respuesta({ ok: false });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(datos.destino || ""))) {
      return respuesta({ ok: false });
    }

    const nombre = String(datos.nombre || "Usuario");
    const nombreSeguro = escaparHtml(nombre);
    const enlaceSeguro = escaparHtml(datos.enlace);
    const cuerpoHtml = `<p>Hola ${nombreSeguro},</p>
      <p>Recibimos una solicitud para cambiar tu contraseña de SGRSI.</p>
      <p><a href="${enlaceSeguro}">Restablecer contraseña</a></p>
      <p>El enlace vence en 30 minutos y puede utilizarse una sola vez. Si no solicitaste el cambio, ignora este correo.</p>`;

    MailApp.sendEmail({
      to: datos.destino,
      subject: "Recuperación de contraseña de SGRSI",
      htmlBody: cuerpoHtml,
      body: `Hola ${nombre}. Restablece tu contraseña en ${datos.enlace}. El enlace vence en 30 minutos y puede utilizarse una sola vez.`,
      name: propiedades.getProperty("SGRSI_NOMBRE_REMITENTE") || "SGRSI UTU",
    });
    return respuesta({ ok: true });
  } catch (error) {
    console.error(error);
    return respuesta({ ok: false });
  }
}

function escaparHtml(valor) {
  return String(valor).replace(
    /[&<>"']/g,
    (caracter) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[caracter],
  );
}

function respuesta(datos) {
  return ContentService.createTextOutput(JSON.stringify(datos)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
