# Historial de cambios

## 2026-07-14 - Mejoras de formularios, validaciones y navegacion

### Seguridad y validaciones
- Se agrego validacion centralizada para campos requeridos, patrones, correos, fechas y rangos.
- La cedula en registro y prestamo solo acepta numeros.
- Los campos de nombre y apellido validan letras y espacios.
- Las fechas de reservas y prestamos usan formato latino `dd/mm/aaaa`.
- Las fechas de uso de sala, solicitud de laboratorio y prestamo no permiten dias anteriores a la fecha actual.
- El reporte de incidencia solo permite registrar la fecha actual mediante calendario.
- Se agregaron mensajes de error especificos para fechas invalidas o anteriores a hoy.

### Uso de sala
- Se agrego el menu lateral al formulario de uso de sala.
- Se agregaron accesos rapidos de fecha: `Elegir`, `Hoy`, `Manana` y `+7 dias`.
- El boton `Agregar alumno/equipo` ahora agrega registros a la tabla.
- Cada laboratorio tiene 16 equipos cargados por defecto: `Equipo 1` a `Equipo 16`.
- Se evito repetir el mismo equipo en la tabla.
- El estado del equipo ahora solo permite `Libre` u `Ocupado`.
- Se reordeno el formulario para que `Numero de equipo` y `Nombre y apellido del alumno` queden juntos.

### Reporte de incidencia
- Se quito la prioridad del formulario de reporte para que la definan tecnico o administrador.
- Se mantuvo la fecha como dato obligatorio del reporte, limitada al dia actual.
- Se quitaron los accesos rapidos de fecha porque una incidencia no es una reserva futura.

### Prestamos
- Se agregaron campos para `Nombre del estudiante` y `Cedula del estudiante`.
- Se mantiene `Docente responsable`, porque el docente se hace cargo del prestamo.
- Se cambio `Grupo o actividad` por `Grupo`.
- El menu lateral ahora muestra `Prestamo` en lugar de `Prestamo futuro`.

### Dashboards y navegacion
- Se agrego menu lateral a formularios que antes tenian una cabecera simple.
- En el dashboard docente, la primera accion visible ahora es `Registrar uso de sala`.
- Se agrego descripcion breve indicando que alli esta la planilla digital.
- Se quitaron las etiquetas `Rol`, `Maqueta Frontend` y `Sin Backend` de los dashboards.
- Se corrigio el hover de botones en dashboards de administrador y tecnico para que no queden blanco sobre blanco.

### Cache y carga de recursos
- Se versionaron los archivos `main.js`, `uso-sala.js` y `styles.css` para evitar que el navegador use versiones antiguas cacheadas.

### Verificaciones realizadas
- Se ejecutaron validaciones de sintaxis con `node --check` sobre los JavaScript modificados.
- Se verificaron en navegador los flujos principales:
  - registro numerico de cedula;
  - fechas no pasadas;
  - fecha actual en incidencias;
  - agregado de alumno/equipo;
  - dashboard docente;
  - dashboards administrador y tecnico;
  - hover de botones.
