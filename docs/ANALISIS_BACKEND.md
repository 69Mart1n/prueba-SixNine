# Auditoría backend de SGRSI

Fecha de auditoría: 18 de julio de 2026
Repositorio auditado: SixNine-Systems-main

## 1. Alcance y evidencia disponible

Se revisaron completamente los 17 HTML, la hoja de estilos, los 10 archivos JavaScript, la navegación, los formularios, las validaciones, el uso de almacenamiento del navegador y la estructura de carpetas recibida. También se extrajo el texto completo y se verificaron visualmente las páginas relevantes de los dos PDF recibidos:

- LETRA PROYECTO ITI 2026 REV 1.0.pdf (67 páginas), especialmente alcance y roles en páginas PDF 10 a 15 y requisitos de Programación Full Stack para segunda entrega en páginas PDF 43 a 47.
- Material teórico y aplicaciones de ejemplo en PHP.pdf (52 páginas), especialmente ejemplos de MySQL, API REST, verbos HTTP, JSON y login/sesiones en páginas PDF 29 a 51.

No se adjuntaron al repositorio ni al mensaje actual los siguientes insumos citados en el encargo:

- Diagrama de clases.
- Diagrama entidad-relación (DER).
- Primera entrega de Programación como documento independiente.
- Scripts SQL.
- Diseño de Figma.

Por esta ausencia, este análisis no afirma nombres de tablas, claves foráneas ni correspondencias definitivas con diagramas. La columna Tabla usa “por confirmar con DER” cuando no existe evidencia local. Los endpoints sí se proponen cuando están definidos expresamente en el encargo.

## 2. Estado actual del proyecto

El proyecto es una maqueta frontend estática:

- 1 página pública de inicio y 16 páginas en pages/.
- Bootstrap 5.3.3 y Bootstrap Icons desde CDN.
- 1 hoja CSS propia: assets/css/styles.css.
- JavaScript organizado como una aproximación MVC en Modelo, Vista y Controlador.
- No existe todavía PHP, API, conexión a base de datos, archivo de entorno, SQL ni pruebas automatizadas en la copia original auditada.
- No existe un repositorio Git en esta copia; por lo tanto no es posible realizar los commits separados solicitados hasta disponer de .git.
- Todos los HTML pueden permanecer como HTML durante la integración mediante Fetch. No hay una necesidad comprobada de convertirlos a PHP en la Fase 1.

### Estructura simplificada del backend

La implementación de Fase 1 se reorganizó para evitar carpetas técnicas dispersas:

| Ruta | Responsabilidad |
|---|---|
| api/api.php | Enrutador: identifica método y endpoint |
| servidor/configuracion.php | Lee .env y expone la configuración |
| servidor/base_datos.php | Crea la conexión PDO cuando se usa MySQL |
| servidor/funciones_api.php | Sesión, respuestas JSON, lectura del body y rutas |
| servidor/estado_api.php | Lógica del endpoint /health |
| servidor/almacenamiento_json.php | Funciones CRUD del modo simulado |
| servidor/enrutador_local.php | Protege archivos internos cuando se usa php -S |
| servidor/datos_simulados/ | Archivos JSON vacíos hasta confirmar el DER |
| pruebas/prueba_almacenamiento.php | Prueba aislada del almacenamiento simulado |

La carpeta servidor está bloqueada para acceso web mediante .htaccess. Como el servidor integrado de PHP no interpreta .htaccess, en desarrollo se debe iniciar con: php -S localhost:8000 servidor/enrutador_local.php. La API es el único punto de entrada público al backend.

## 3. Matriz página - backend

| Página | Rol actual / previsto | Formulario | Datos principales | Endpoint propuesto | Método | Tabla | Cambio necesario |
|---|---|---|---|---|---|---|---|
| index.html | Público | No | Accesos a login y registro | Ninguno | - | - | Mantener HTML sin cambios |
| pages/login.html | Público | formLogin | email, password | /login | POST | Usuario, por confirmar con DER | Sustituir credenciales simuladas por Auth API y sesión PHP; usar correo como nombre JSON |
| pages/registro.html | Público | formRegistro | nombre, apellido, cédula, teléfono, correo, rol solicitado | /usuarios, sujeto a definir flujo de alta pública | POST | Usuario, por confirmar con DER | Definir regla de aprobación y rol inicial; conectar mediante JSON sin permitir autoasignación privilegiada |
| pages/admin.html | Administrador | No | Métricas de usuarios, incidencias, préstamos, laboratorios y equipos | Varios endpoints | GET | Varias, por confirmar con DER | Mantener HTML; cargar métricas desde API; protección real en API y posible envoltorio PHP posterior |
| pages/tecnico.html | Técnico | No | Métricas y accesos técnicos | /tickets, /laboratorios y endpoints futuros | GET | Varias, por confirmar con DER | Mantener HTML; cargar datos; sesión y rol desde servidor |
| pages/solicitante.html | Actualmente solicitante; debe normalizarse a docente | No | Accesos y resumen de solicitudes | /solicitudes y /tickets | GET | Varias, por confirmar con DER | Mantener HTML; reemplazar rol solicitante por docente de forma coordinada |
| pages/usuarios.html | Administrador | No; filtros deshabilitados | usuarios, rol, estado | /usuarios y /usuarios/{id} | GET, POST, PUT | Usuario, por confirmar con DER | Renderizar listado, habilitar filtros y alta/edición; no eliminar físicamente |
| pages/incidencias.html | Administrador y técnico | No; filtros deshabilitados | ticket, laboratorio, equipo, prioridad, estado | /tickets y /tickets/{id} | GET, PUT | Ticket/incidencia, por confirmar con DER | Listar y permitir prioridad/estado/diagnóstico/solución según rol |
| pages/ticket-incidencia.html | Actualmente solicitante; previsto docente | formTicket | título, laboratorio, equipo, fecha, docente, descripción | /tickets | POST | Ticket/incidencia, por confirmar con DER | Obtener docente de sesión; usar IDs reales de laboratorio/equipo; no enviar prioridad docente |
| pages/solicitud-servicio.html | Actualmente solicitante; previsto docente | formSolicitud | tipo de solicitud, tipo/sala, fecha, turno, grupo, asignatura, software, descripción | /solicitudes | POST | Solicitud, sala y relaciones, por confirmar con DER | Reemplazar salas simuladas por API; validar condicional de software y permisos en PHP |
| pages/mis-solicitudes.html | Actualmente solicitante; previsto docente | No | tipo, fecha, detalle, estado | /solicitudes | GET | Solicitud, por confirmar con DER | Listar solo registros del usuario autenticado; el servidor impone el filtro |
| pages/uso-sala.html | Actualmente solicitante; previsto docente | formUsoSala | sala, fecha, horario, grupo, taller, asignatura, docente, turno, observaciones, equipos/alumnos | /registros-sala | POST | Registro de uso y detalles, por confirmar con DER | Enviar cabecera y detalle; obtener docente de sesión; verificar solapamiento en servidor |
| pages/laboratorio.html | Administrador y técnico | No; filtros deshabilitados | laboratorio, capacidad, estado, observaciones | /laboratorios y /laboratorios/{id} | GET; otros métodos por confirmar | Laboratorio/sala, por confirmar con DER | Listar datos reales; no asumir CRUD hasta revisar DER y requisitos |
| pages/equipo.html | Administrador y técnico | No; filtros deshabilitados | equipo, laboratorio, estado, revisión | /laboratorios/{id}/equipos; endpoint de equipos por definir | GET | Equipo, por confirmar con DER | Listar desde API; definir endpoint CRUD después de revisar documentación |
| pages/prestamo.html | Actualmente solicitante; previsto docente según alcance explícito | formPrestamo | recurso, docente, estudiante, cédula, grupo, fechas, motivo | Endpoint de préstamos no definido todavía | Por definir | Préstamo, por confirmar con DER | El módulo es obligatorio según la letra oficial; confirmar entidad/endpoint y la presencia de datos de estudiante antes de implementarlo |
| pages/prestamos-gestion.html | Administrador y técnico | No; filtros deshabilitados | recurso, solicitante, fechas, estado | Endpoint de préstamos no definido todavía | Por definir | Préstamo, por confirmar con DER | El módulo es obligatorio; definir contrato luego de revisar DER/clases y corregir presencia en menú |
| pages/reporte.html | Administrador | No | métricas generales | Endpoint de reportes no definido | GET por definir | Varias, por confirmar con DER | Mantener como vista vacía hasta definir reportes y consultas |

## 4. Formularios, campos y validaciones actuales

### formLogin

- Campos: email y password, ambos obligatorios.
- Estado: AuthController valida contra tres usuarios embebidos en UsuarioModel.
- Problemas: contraseñas en texto plano, valores precargados en HTML y sesión controlada por sessionStorage.
- Backend: validación 422, búsqueda por correo, password_verify, usuario habilitado, session_regenerate_id y respuesta sin hash.

### formRegistro

- Campos: nombre, apellido, cédula, teléfono, correo y rolSolicitado.
- Validaciones HTML/JS: obligatorios, longitudes, patrones de letras/dígitos y correo.
- Riesgo: permite solicitar administrador o técnico desde una pantalla pública. El backend no debe aceptar una autoasignación privilegiada sin aprobación administrativa.
- Backend pendiente: duplicados de correo/cédula, normalización, estado pendiente y política de aprobación.

### formTicket

- Campos: título, laboratorio, equipo, fecha, docente y descripción.
- Validación actual: obligatorios; fecha limitada al día actual.
- Acierto: el docente no elige prioridad.
- Cambios: laboratorio/equipo deben ser selectores con IDs de API; docente debe derivarse de sesión y no confiarse al cliente.

### formSolicitud

- Campos: tipoSolicitud, tipoSala, salaSolicitada, fechaSolicitada, turno, grupo, asignatura, software y descripción.
- Validación actual: obligatorios y fecha no pasada; software se muestra para instalación, pero no se vuelve required.
- Datos simulados: cinco salas por cada tipo generadas en uso-sala.js.
- Cambios: cargar salas reales; validación condicional en PHP; definir si una solicitud de software necesita sala/fecha en todos los casos.

### formUsoSala

- Campos: tipoSala, salaSolicitada, fecha, horaEntrada, horaSalida, grupo, taller, asignatura, docente, turno, observaciones, número de equipo, alumno, estado y observación del equipo.
- Validación actual: fecha no pasada, salida posterior a entrada y no repetir equipo en la tabla visible.
- Datos simulados: 16 equipos generados en JavaScript; la tabla de alumnos/equipos solo vive en el DOM y se pierde al recargar.
- Cambios: modelo cabecera/detalle por confirmar con DER, IDs reales, docente de sesión y control de reservas superpuestas con HTTP 409.

### formPrestamo

- Campos: recurso, docente, estudiante, cédula, grupo, fecha de préstamo, devolución y motivo.
- Validación actual: obligatorios, patrones, fechas no pasadas y devolución no anterior al préstamo.
- La letra oficial confirma que inventario, préstamos, devoluciones, disponibilidad y trazabilidad son obligatorios, pero aún faltan el DER, el diagrama de clases y el contrato de endpoint.

## 5. Navegación y roles

Roles presentes en el código:

- admin.
- tecnico.
- solicitante.

Roles de la letra oficial:

- Administrador/Coordinador.
- Técnico/Soporte.
- Solicitante, que en el PDF abarca docentes, funcionarios administrativos o estudiantes.

El alcance explícito entregado para esta implementación restringe los roles a administrador, tecnico y docente, e indica que no debe crearse un rol alumno. Esto diverge de la letra oficial, que usa el rol más amplio solicitante e incluye estudiantes. Se seguirá la instrucción explícita del proyecto actual: la API normalizará admin a administrador y solicitante a docente, sin crear alumno. La migración debe hacerse de forma coordinada en sesión, data-roles, menús y redirecciones para no romper navegación.

Hallazgos:

- No se encontraron enlaces href/src locales rotos.
- No se encontraron IDs repetidos dentro de una misma página.
- MenuView construye navegación con innerHTML a partir de constantes internas; no usa todavía datos del usuario.
- prestamos-gestion.html declara data-active="prestamos", pero MenuView no incluye préstamos para técnico ni administrador. Se llega desde los dashboards, pero no queda opción lateral ni estado activo.
- Las páginas protegidas se controlan únicamente mediante data-roles y sessionStorage; esto no brinda seguridad real.
- No existe página calendario.html en el proyecto recibido, aunque se menciona en el encargo.

## 6. Almacenamiento y datos simulados

- localStorage: no se utiliza.
- sessionStorage: usuarioSGRSI, rolSGRSI y nombreSGRSI.
- Credenciales simuladas: tres cuentas en assets/js/Modelo/UsuarioModel.js con contraseñas en texto plano.
- Salas simuladas: cinco salones, cinco talleres y cinco laboratorios generados por uso-sala.js.
- Equipos simulados: 16 por laboratorio, sin persistencia.
- Formularios: solo muestran un mensaje y se reinician; ningún registro persiste.
- Listados y métricas: vacíos o en cero.
- Fetch/XMLHttpRequest: no existe ninguna solicitud al servidor.

## 7. Código duplicado y mantenibilidad

- FormularioModel y FormularioView duplican conversión y formateo de fechas.
- Sidebar, navbar, scripts y estructura de panel se repiten en la mayoría de HTML. No se modificarán masivamente durante la conexión inicial.
- Muchos campos carecen de atributo name. Para JSON por IDs esto no impide Fetch, pero conviene normalizar nombres al integrar cada formulario.
- MensajeView usa innerHTML. Hoy recibe textos internos; si en el futuro recibe mensajes o datos variables de API deberá construir nodos/textContent o limitar estrictamente el contenido.
- uso-sala.js usa innerHTML solo con opciones constantes y limpieza de tabla; las celdas con datos de usuario sí se crean correctamente con textContent.
- No se detectaron JavaScript, CSS ni imágenes claramente sin uso. Todos los módulos MVC se cargan dinámicamente desde main.js.

## 8. Formularios sin acción y estado funcional

Los seis formularios no tienen action porque JavaScript cancela submit:

- formLogin autentica solo contra el modelo local.
- formRegistro, formTicket, formSolicitud, formUsoSala y formPrestamo validan, muestran éxito simulado y se reinician.

Las tablas de usuarios, incidencias, laboratorios, equipos, préstamos y mis solicitudes tienen tbody vacío. Los filtros están deshabilitados. No hay CRUD real.

## 9. Correspondencia con DER y diagrama de clases

No es verificable porque los diagramas no fueron recibidos. Antes de crear schema.sql, seed.sql o repositorios MySQL se debe confirmar como mínimo:

- nombres exactos de entidades/tablas y claves primarias;
- relación usuario-docente-técnico-administrador;
- si sala es supertipo de salón/taller/laboratorio o un catálogo único;
- relación laboratorio-equipo;
- diferencia o equivalencia entre ticket e incidencia;
- estructura de solicitud de servicio y reserva;
- cabecera/detalle de uso de sala;
- modelo de préstamos e historiales;
- estados y cardinalidades.

No se crearán tablas definitivas ni SQL por inferencia.

## 10. Requisitos confirmados por los PDF

La letra oficial confirma como alcance funcional obligatorio:

- inventario con ABM, catalogación y trazabilidad de activos;
- préstamos y devoluciones con disponibilidad en tiempo real;
- mesa de ayuda con tickets Pendiente, En Proceso y Resuelto;
- diagnóstico, notas de resolución e historial por equipo;
- solicitudes de preparación de laboratorios, software y configuraciones;
- calendarización de tareas preventivas y reactivas;
- dashboard con métricas y reportes;
- control de acceso diferenciado por roles;
- interfaz en español e inglés.

Para la segunda entrega de Programación Full Stack (entrega indicada para el 24 de agosto de 2026; instancia atrasada el 28 de agosto), el PDF exige:

- frontend adaptado a monitores desde 1024 px y pantallas funcionales con datos de prueba;
- conexión frontend-backend y manejo de estados HTTP;
- clases, errores de servidor, conexión a base de datos, POO, patrones y tres capas;
- autenticación/autorización, registro, login/logout, sesiones y protección por rol;
- protección de credenciales y justificación del método;
- validación del lado servidor, sanitización, excepciones y configuración fuera del repositorio;
- esquema relacional normalizado a 3FN, DDL y DML de prueba.

El material teórico confirma el enfoque pedagógico solicitado: archivo api.php, selección por método HTTP, endpoints, lectura de JSON para POST/PUT, JavaScript para consumir la API, GET/POST/PUT/DELETE y login mediante sesiones. Sus ejemplos incluyen mysqli, contraseñas en claro, SQL concatenado y un token MD5 mostrado al cliente. Esos fragmentos se tomarán solo como referencia de flujo; se aplicarán las mejoras de seguridad indicadas en el encargo: PDO preparado, password_hash/password_verify, sesión segura, contrato JSON y control de roles en servidor.

## 11. Seguridad pendiente

Prioridad alta:

- Eliminar autenticación y autorización basada en sessionStorage.
- Quitar credenciales/contraseñas precargadas del HTML y del JavaScript al integrar Fase 2.
- Usar sesiones PHP con cookie HttpOnly, SameSite y session_regenerate_id.
- Usar password_hash/password_verify.
- Validar rol y propiedad del recurso en cada endpoint.
- Usar PDO con consultas preparadas.
- Evitar exponer errores de PDO, DSN, rutas internas o credenciales.
- Mantener .env fuera del control de versiones y bloquear el acceso web a servidor/.

## 12. Decisión sobre HTML y PHP

Fase 1:

- Permanecen como HTML todos los archivos actuales.
- No se renombra ni convierte ninguna pantalla.
- La seguridad se implementará primero en la API.

Evaluación posterior a Fase 2:

- admin.html, tecnico.html y solicitante.html podrían envolverse como PHP únicamente si se requiere redirección antes de renderizar.
- Formularios/listados seguirán como HTML consumiendo la API mientras no necesiten lógica previa.
- Cualquier conversión conservará HTML, clases, IDs, Bootstrap y rutas coordinadas.

## 13. Plan de implementación

### Fase 1 - base ejecutable

1. Crear .env.example, .env ignorado y cargador sin dependencias.
2. Crear una función PDO reutilizable, sin conectar cuando APP_DATA_SOURCE=mock.
3. Crear contrato JSON y router en api/api.php.
4. Crear una función de health y GET /api/api.php/health.
5. Crear funciones de almacenamiento JSON con bloqueo y archivos mock vacíos, sin inventar campos de negocio.
6. Añadir .htaccess para rutas limpias opcionales, Options -Indexes y protección de carpetas sensibles.
7. Validar sintaxis PHP y ejecutar prueba HTTP en modo mock.

Decisión de complejidad: la Fase 1 usa funciones PHP sencillas en lugar de clases técnicas para que el código sea fácil de explicar y mantener en un proyecto estudiantil. En las fases de dominio se incorporarán solamente las clases mínimas necesarias para demostrar POO, controladores y tres capas, porque la segunda entrega los exige expresamente. Sus nombres, atributos, métodos y variables estarán en español. Se conservarán en inglés únicamente los contratos técnicos fijados por el enunciado o por los estándares HTTP, como /health, GET, POST, success/error y las claves de configuración APP_/DB_.

### Fase 2 - autenticación y roles

1. Definir interfaz y repositorios de usuario mock/MySQL.
2. Implementar login, logout y session.
3. Implementar AuthMiddleware y RoleMiddleware.
4. Normalizar roles a administrador, tecnico y docente.
5. Crear cliente Fetch central y conectar login/logout/session.
6. Retirar credenciales locales y sessionStorage como mecanismo de seguridad.

### Fase 3 - tickets

1. Confirmar campos con DER/diagrama.
2. Implementar modelo, interfaz, repositorios, controlador y rutas GET/POST/PUT.
3. Aplicar propiedad por docente y permisos técnicos para prioridad, estado, diagnóstico y solución.
4. Conectar ticket-incidencia.html e incidencias.html.

### Fase 4 - solicitudes, registros y laboratorios

1. Confirmar modelos y cardinalidades.
2. Implementar solicitudes y listados propios.
3. Implementar registros de sala con detección de superposición y HTTP 409.
4. Implementar laboratorios/equipos de consulta y reemplazar catálogos simulados.
5. Conectar calendario cuando exista o sea provisto.

### Fase 4B - inventario, préstamos y reportes

1. Confirmar las entidades y cardinalidades con DER y diagrama de clases.
2. Definir endpoints de equipos/activos, préstamos, devoluciones e historial.
3. Implementar disponibilidad y trazabilidad de activos.
4. Conectar prestamo.html, prestamos-gestion.html, equipo.html y reportes.
5. Planificar la interfaz bilingüe exigida por la letra sin rediseñar pantallas.

### Fase 5 - MySQL

1. Revisar DER, diagrama de clases y scripts existentes.
2. Crear schema.sql y seed.sql respetando nombres/cardinalidades confirmados.
3. Crear repositorios MySQL con PDO y consultas preparadas.
4. Generar hashes reales con script PHP.
5. Ejecutar pruebas de equivalencia mock/MySQL y documentar despliegue.

## 14. Criterios de prueba por fase

- Sintaxis PHP de todos los archivos.
- Contrato JSON estable en éxitos y errores.
- Métodos no permitidos con HTTP 405 y encabezado Allow.
- Endpoint inexistente con HTTP 404.
- Health mock sin requerir MySQL.
- Health MySQL con 200 conectado o 503 seguro.
- Pruebas de sesión y roles en Fase 2.
- CRUD, validaciones y propiedad de recursos en fases de dominio.
- Revisión visual del frontend después de cada integración.

## 15. Bloqueos y decisiones requeridas

Para avanzar de forma definitiva a MySQL y validar el modelo se necesitan los diagramas y SQL ausentes. También debe confirmarse la política del registro público, el modelo exacto de préstamos/inventario y cómo se resolverá la divergencia futura entre el solicitante amplio de la letra oficial y el alcance actual limitado a docentes. Préstamos e inventario sí forman parte obligatoria del proyecto según el PDF, aunque sus endpoints no fueron definidos en el encargo técnico.
