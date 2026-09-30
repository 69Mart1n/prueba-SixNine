# SGRSI — Instituto Tecnológico de Informática

Sistema de gestión de recursos, préstamos, servicios e incidencias para la UTU. Funciona con PHP 8, Apache y MariaDB/MySQL de XAMPP.

## Instalación local con XAMPP

1. Iniciar **Apache** y **MySQL** en el panel de XAMPP.
2. Colocar el proyecto en `C:\xampp\htdocs\sgrsi` o crear allí un enlace de directorio al proyecto.
3. Copiar `.env.example` como `.env` y ajustar `DB_USER`, `DB_PASSWORD`, `DB_NAME` y `APP_URL` según la instalación. `.env` contiene datos locales y no se publica.
4. Para una instalación nueva, importar **solo** [database/Sgrsi.sql](database/Sgrsi.sql) en phpMyAdmin (`http://127.0.0.1/phpmyadmin`). Crea la base `sgrsi`, sus 24 tablas y los datos ficticios. No hay migraciones adicionales.
5. Abrir `http://127.0.0.1/sgrsi/Vista/index.html`.

La conexión se comprueba en `http://127.0.0.1/sgrsi/Controlador/api.php/health`. Debe devolver `"status":"success"` y `"database":"available"`.

**Importante:** el SQL recrea las tablas de SGRSI y reemplaza sus datos. Antes de importarlo sobre una instalación existente, exportar un respaldo desde phpMyAdmin. Para conservar datos reales de una versión anterior, hay que planificar una actualización específica; este archivo es para instalaciones nuevas o reinicios de la demostración.

El archivo SQL y la conexión usan `utf8mb4`. Si se importa mediante `mysql.exe` en Windows, utilizar `--default-character-set=utf8mb4` para conservar las tildes. No enviar el SQL mediante `Get-Content | mysql.exe`, porque algunas versiones de PowerShell recodifican la entrada.

## Cuentas de prueba

| Perfil | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@sgrsi.test` | `Admin1234` |
| Técnico | `tecnico@sgrsi.test` | `Tecnico1234` |
| Técnico secundario | `tecnico.hardware@sgrsi.local` | `Sgrsi2026!` |
| Docente | `docente@sgrsi.test` | `Docente1234` |

Las cuentas y todos los datos del SQL son ficticios. No usar estas contraseñas en producción.

## Configuración opcional

Para enviar correos de recuperación, copiar `integraciones/google-apps-script/Code.gs` a un proyecto de Google Apps Script. Definir allí `SGRSI_SECRET` y `SGRSI_URL_BASE`, publicar la aplicación web y configurar en `.env` `GMAIL_SCRIPT_URL` y `GMAIL_SCRIPT_SECRET` con la misma clave. Sin esos valores, el envío real de correos no estará disponible. Los enlaces de recuperación duran 30 minutos y se consumen una sola vez.

Las fotos adjuntas a resoluciones se guardan fuera de la carpeta pública. Configurar `RUTA_ARCHIVOS_RESOLUCIONES` con una ruta privada y permisos de escritura; para XAMPP se sugiere `C:\xampp\sgrsi-datos\resoluciones`. Se admiten JPG, PNG y WebP de hasta 5 MB.

## Datos de demostración

El SQL incluye usuarios con distintos estados, incidencias, seguimiento y colaboración técnica, solicitudes, préstamos, auditoría y un inventario de ejemplo. Los laboratorios y el taller tienen 16 PC de alumnos, una PC docente y una TV; los salones tienen una PC docente y una TV. Las notebooks prestables quedan separadas de los equipos fijos. Los equipos históricos fuera de dotación se conservan archivados.

La interfaz permite idioma español o inglés, modo oscuro y paletas de accesibilidad. Las preferencias se guardan en el navegador, no en la base de datos.

## Seguridad de la instalación

Las operaciones `POST`, `PUT`, `PATCH` y `DELETE` requieren un token CSRF de la sesión. El frontend lo obtiene desde `GET /Controlador/api.php/auth/csrf`, lo añade a los formularios y lo envía como `X-CSRF-Token` en `fetch`. Tras un login correcto se renuevan el identificador de sesión y el token; las sesiones inactivas durante más de 30 minutos devuelven HTTP 401 en la API. Cada petición protegida vuelve a comprobar la contraseña vigente, el estado de la cuenta y los roles activos para invalidar sesiones antiguas o permisos revocados.

Apache aplica headers de seguridad y bloquea la descarga de configuración, SQL, documentación y código PHP interno. La CSP permite únicamente los recursos propios y Bootstrap/Bootstrap Icons desde jsDelivr. `style-src 'unsafe-inline'` permanece para los estilos que Bootstrap aplica dinámicamente; JavaScript inline y `unsafe-eval` no están permitidos. HSTS se envía solo mediante HTTPS.

**Usar Apache de XAMPP para las pruebas:** el servidor integrado `php -S` no interpreta `.htaccess` y, por lo tanto, no aplica la protección de archivos ni los headers de las páginas estáticas.

## Cómo leer el código

**Cliente (navegador):** HTML y CSS en `Vista/`, presentación en `Vista/modulos/`, eventos en `Controlador/cliente/` y `fetch` en `Modelo/cliente/modelo.js`.

**Servidor (PHP):** `Controlador/api.php` conserva la URL pública y llama a `Controlador/servidor/despachador.php`. Las rutas están en `Controlador/servidor/rutas/`; sesión, CSRF, permisos, lectura de solicitudes y respuestas JSON están separados en `Controlador/servidor/comun/`. La conexión y las clases están en `Modelo/servidor/`, separadas entre `servicios/dominio/` (procesos del sistema) y `servicios/operativos/` (catálogos, inventario, correo, auditoría y apoyo técnico).

Para estudiar una función, seguí siempre el mismo recorrido: formulario → evento JavaScript → petición `fetch` → ruta PHP → servicio PHP → consulta preparada. Por ejemplo, un préstamo comienza en `Vista/pages/prestamo.html` y termina en `Modelo/servidor/servicios/dominio/prestamos.php`. `Controlador/controlador.js` y `Modelo/modelo.js` son entradas públicas pequeñas que conservan las URL anteriores; no contienen reglas de negocio. Los comentarios de cada método indican su propósito, entradas y salida. Las bajas de recursos con historial son lógicas para conservar trazabilidad.

## Prueba automática de acceso

Con Apache y MySQL iniciados y la base de demostración importada, ejecutar desde la raíz:

```powershell
node pruebas/prueba_login_e2e.cjs
```

La prueba abre Chrome en modo *headless*, inicia sesión con la cuenta administradora de demostración y confirma que la aplicación redirige al panel correcto. Puede apuntarse a otra instalación definiendo `SGRSI_BASE_URL`; también admite `SGRSI_TEST_EMAIL`, `SGRSI_TEST_PASSWORD` y `CHROME_PATH`. Este archivo pertenece a las pruebas y no se carga desde la aplicación.

El detalle completo de esta entrega se encuentra en [HISTORIAL_CAMBIOS.md](HISTORIAL_CAMBIOS.md).
