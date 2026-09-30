# Historial de cambios

## 2026-09-29 - Tercera entrega: aplicación completa con arquitectura MVC

### Resumen

Esta entrega reemplaza la maqueta inicial y su almacenamiento JSON por una aplicación funcional conectada a MariaDB/MySQL. El proyecto se reorganizó en `Vista/`, `Controlador/` y `Modelo/`, con una API PHP única, permisos por rol, persistencia relacional y páginas específicas para cada proceso del instituto.

### Reorganización del proyecto

- `Vista/` contiene las páginas HTML, los estilos, las imágenes y los módulos que presentan datos en el navegador.
- `Controlador/cliente/` contiene eventos, validaciones y coordinación de los formularios.
- `Modelo/cliente/modelo.js` centraliza las solicitudes `fetch` y el contrato con la API.
- `Controlador/api.php` es el único punto público del backend y deriva las solicitudes al despachador.
- `Controlador/servidor/rutas/` separa los endpoints por recurso.
- `Controlador/servidor/comun/` reúne sesión, CSRF, permisos, lectura de peticiones y respuestas JSON.
- `Modelo/servidor/servicios/dominio/` implementa los procesos principales del sistema.
- `Modelo/servidor/servicios/operativos/` contiene inventario, catálogos, auditoría, correo, tareas y consultas auxiliares.
- Se retiraron las carpetas anteriores `api/`, `assets/` y `servidor/`, además de las páginas antiguas de la raíz, porque sus responsabilidades quedaron cubiertas por la nueva estructura.

### Base de datos

- Se agregó `database/Sgrsi.sql` como instalación completa de demostración en UTF-8 (`utf8mb4`).
- El esquema incluye 24 tablas para usuarios, roles y perfiles; espacios y equipos; solicitudes; préstamos; incidencias, seguimiento y colaboración; registros de uso de sala; tareas; reportes; auditoría; recuperación de contraseña y lista de estudiantes restringidos.
- Se incluyeron relaciones, restricciones y datos ficticios listos para probar los perfiles administrador, técnico y solicitante/docente.
- Los equipos fijos de salones, laboratorios y taller se distinguen de las notebooks habilitadas para préstamo.
- Las bajas que necesitan trazabilidad son lógicas: se conserva el historial en vez de borrar físicamente los registros relacionados.

### Autenticación, usuarios y permisos

- Se implementaron registro, inicio y cierre de sesión, consulta del estado de sesión y selección de perfil activo.
- Una persona puede tener más de un rol y solicitar roles adicionales sujetos a aprobación.
- Administración puede aprobar, rechazar, bloquear, dar de baja o reactivar cuentas y roles.
- Las sesiones se renuevan al iniciar sesión y expiran tras 30 minutos de inactividad.
- Cada solicitud protegida vuelve a validar el usuario, la contraseña vigente, el estado de la cuenta y los roles activos.
- Se agregó recuperación de contraseña mediante tokens de un solo uso con vencimiento de 30 minutos e integración opcional con Google Apps Script/Gmail.

### Procesos funcionales

- **Incidencias:** alta, consulta, aceptación o rechazo, asignación de técnicos, seguimiento, resolución y evidencia fotográfica opcional.
- **Colaboración técnica:** códigos temporales de seis dígitos para que un segundo técnico se una a un ticket, con vencimiento, un solo uso y límite de intentos.
- **Préstamos:** solicitud de notebooks disponibles, aprobación, entrega, devolución, actualización del inventario, detección de atrasos y control de blacklist.
- **Solicitudes de servicio:** creación, consulta personal, asignación, cambio de estado, finalización y cancelación.
- **Uso de sala:** planilla digital por espacio, grupo, docente, estudiantes y equipos utilizados.
- **Inventario:** búsqueda, alta, edición, disponibilidad para préstamo, ubicación, condición e historial de movimientos.
- **Administración:** mantenimiento de espacios y categorías de incidencia, gestión de usuarios y consulta de auditoría.
- **Soporte:** tareas técnicas, reportes, base de conocimiento y paneles con indicadores según el rol activo.

### Interfaz y accesibilidad

- Se añadieron paneles diferenciados para administrador, técnico y solicitante/docente.
- La navegación y las acciones se adaptan al rol y a los permisos de la sesión.
- La interfaz admite español e inglés, tema claro u oscuro y paletas para protanopía, deuteranopía, tritanopía y acromatopsia.
- Las preferencias se guardan localmente en el navegador y también se aplican al contenido cargado de forma dinámica.
- Se incorporaron estados vacíos, filtros, búsquedas, confirmaciones y mensajes de respuesta para los procesos principales.

### Seguridad

- Todas las operaciones `POST`, `PUT`, `PATCH` y `DELETE` exigen un token CSRF asociado a la sesión.
- Las contraseñas se almacenan mediante las funciones seguras de hash de PHP y las consultas a la base usan sentencias preparadas.
- Las cookies de sesión usan `HttpOnly`, `SameSite=Lax` y `Secure` cuando la conexión es HTTPS.
- Apache bloquea la descarga de `.env`, SQL, documentación, copias de seguridad, integraciones y archivos PHP internos.
- Se agregaron CSP, protección contra *framing*, `nosniff`, política de referencia, restricciones de permisos y HSTS bajo HTTPS.
- Las fotografías de resolución se validan por tipo y tamaño y se guardan en una ruta privada configurable fuera de la carpeta pública.
- La API devuelve un contrato JSON consistente y evita exponer errores internos al cliente.

### Configuración y despliegue

- Se agregó `.env.example` con conexión de base de datos, URL pública, integración de correo y almacenamiento privado de fotografías.
- `.env` permanece excluido de Git para no publicar configuración local ni secretos.
- El README documenta la instalación con XAMPP, la importación del único SQL requerido, las cuentas ficticias y el endpoint de salud.
- La aplicación debe probarse con Apache porque el servidor integrado de PHP no procesa las reglas de `.htaccess`.

### Pruebas y verificación

- Se validó la sintaxis de los 28 archivos JavaScript/CommonJS con `node --check`.
- Se validó la sintaxis de los 45 archivos PHP con `C:\xampp\php\php.exe -l`.
- La prueba de acceso se integró como `pruebas/prueba_login_e2e.cjs`; usa Chrome en modo *headless* y permite configurar URL, credenciales y ejecutable mediante variables de entorno.
- Se ejecutó esa prueba contra Apache y MariaDB/MySQL: el inicio de sesión administrador redirigió correctamente a `Vista/pages/administrador.html`.

### Consideraciones para actualizar una instalación anterior

- Esta versión cambia las rutas públicas: la entrada pasa a ser `Vista/index.html` y la API, `Controlador/api.php`.
- `database/Sgrsi.sql` recrea las tablas y sus datos. Antes de importarlo sobre una base existente debe realizarse un respaldo.
- El SQL está pensado para instalaciones nuevas o para reiniciar la demostración; no es una migración conservadora de datos anteriores.
- Las configuraciones reales deben copiarse a `.env` y nunca escribirse directamente en los archivos versionados.

## 2026-07-14 - Mejoras de formularios, validaciones y navegación

### Seguridad y validaciones

- Se agregó validación centralizada para campos requeridos, patrones, correos, fechas y rangos.
- La cédula en registro y préstamo solo acepta números.
- Los campos de nombre y apellido validan letras y espacios.
- Las fechas de reservas y préstamos usan formato latino `dd/mm/aaaa`.
- Las fechas de uso de sala, solicitud de laboratorio y préstamo no permiten días anteriores a la fecha actual.
- El reporte de incidencia solo permite registrar la fecha actual mediante calendario.
- Se agregaron mensajes de error específicos para fechas inválidas o anteriores a hoy.

### Uso de sala

- Se agregó el menú lateral al formulario de uso de sala.
- Se agregaron accesos rápidos de fecha: `Elegir`, `Hoy`, `Mañana` y `+7 días`.
- El botón `Agregar alumno/equipo` ahora agrega registros a la tabla.
- Cada laboratorio tiene 16 equipos cargados por defecto: `Equipo 1` a `Equipo 16`.
- Se evitó repetir el mismo equipo en la tabla.
- El estado del equipo ahora solo permite `Libre` u `Ocupado`.
- Se reordenó el formulario para que `Número de equipo` y `Nombre y apellido del alumno` queden juntos.

### Reporte de incidencia

- Se quitó la prioridad del formulario de reporte para que la definan técnico o administrador.
- Se mantuvo la fecha como dato obligatorio del reporte, limitada al día actual.
- Se quitaron los accesos rápidos de fecha porque una incidencia no es una reserva futura.

### Préstamos

- Se agregaron campos para `Nombre del estudiante` y `Cédula del estudiante`.
- Se mantiene `Docente responsable`, porque el docente se hace cargo del préstamo.
- Se cambió `Grupo o actividad` por `Grupo`.
- El menú lateral ahora muestra `Préstamo` en lugar de `Préstamo futuro`.

### Paneles y navegación

- Se agregó menú lateral a formularios que antes tenían una cabecera simple.
- En el panel docente, la primera acción visible ahora es `Registrar uso de sala`.
- Se agregó una descripción breve indicando que allí está la planilla digital.
- Se quitaron las etiquetas `Rol`, `Maqueta Frontend` y `Sin Backend` de los paneles.
- Se corrigió el estado *hover* de botones en los paneles de administrador y técnico.

### Caché y carga de recursos

- Se versionaron los archivos `main.js`, `uso-sala.js` y `styles.css` para evitar que el navegador utilizara versiones antiguas almacenadas en caché.

### Verificaciones realizadas

- Se ejecutaron validaciones de sintaxis con `node --check` sobre los JavaScript modificados.
- Se verificaron en navegador los flujos principales de registro, fechas, uso de sala, panel docente y paneles de administrador y técnico.
