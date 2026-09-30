const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const urlBase = (process.env.SGRSI_BASE_URL || "http://127.0.0.1/sgrsi").replace(
  /\/$/,
  "",
);
const correo = process.env.SGRSI_TEST_EMAIL || "admin@sgrsi.test";
const contrasena = process.env.SGRSI_TEST_PASSWORD || "Admin1234";
const puerto = 9238;
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "sgrsi-final-"));
const rutaChrome =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chrome = spawn(rutaChrome, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--disable-extensions",
  `--remote-debugging-port=${puerto}`, `--user-data-dir=${perfil}`, "about:blank",
], { stdio: "ignore", windowsHide: true });
const pausa = tiempo => new Promise(resolver => setTimeout(resolver, tiempo));
let socket;
let numero = 0;
const pendientes = new Map();
async function iniciar() {
  for (let intento = 0; intento < 50; intento++) {
    try {
      const paginas = await (await fetch(`http://127.0.0.1:${puerto}/json`)).json();
      socket = new WebSocket(paginas.find(p => p.type === "page").webSocketDebuggerUrl);
      await new Promise((resolver, rechazar) => { socket.onopen = resolver; socket.onerror = rechazar; });
      socket.onmessage = evento => {
        const mensaje = JSON.parse(evento.data);
        if (pendientes.has(mensaje.id)) {
          pendientes.get(mensaje.id)(mensaje);
          pendientes.delete(mensaje.id);
        }
      };
      return;
    } catch { await pausa(200); }
  }
  throw Error("Chrome no inició");
}
function enviar(method, params = {}) {
  const id = ++numero;
  return new Promise((resolver, rechazar) => {
    pendientes.set(id, mensaje => mensaje.error ? rechazar(Error(mensaje.error.message)) : resolver(mensaje.result));
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluar(expression) {
  const resultado = await enviar("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (resultado.exceptionDetails) throw Error(resultado.exceptionDetails.text);
  return resultado.result.value;
}
async function esperar(expression) {
  for (let intento = 0; intento < 50; intento++) {
    const valor = await evaluar(expression);
    if (valor) return valor;
    await pausa(200);
  }
  throw Error(`Tiempo agotado: ${expression}`);
}
(async () => {
  try {
    await iniciar();
    await enviar("Page.enable");
    await enviar("Runtime.enable");
    await enviar("Page.navigate", {
      url: `${urlBase}/Vista/pages/login.html`,
    });
    await esperar("document.querySelector('input[name=csrf_token]')?.value");
    await evaluar(
      `document.querySelector('#correo').value=${JSON.stringify(correo)};` +
        `document.querySelector('#contrasena').value=${JSON.stringify(contrasena)};` +
        "document.querySelector('#formInicioSesion').requestSubmit();true",
    );
    await esperar("location.pathname.endsWith('/administrador.html')");
    const menu = await esperar("document.querySelector('#menuRol')?.textContent.trim()");
    console.log(JSON.stringify({ pagina: await evaluar("location.pathname"), menu: menu.slice(0, 75) }));
  } finally {
    socket?.close();
    chrome.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
