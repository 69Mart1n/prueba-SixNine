const CLAVE_PREFERENCIAS = "sgrsi.preferencias";

const PREFERENCIAS_INICIALES = Object.freeze({
  idioma: "es",
  tema: "claro",
  daltonismo: "ninguno",
});

const TIPOS_DALTONISMO = Object.freeze([
  "ninguno",
  "protanopia",
  "deuteranopia",
  "tritanopia",
  "acromatopsia",
]);

const INGLES = {
  "Disponible para préstamo": "Available for loan",
  "Solo se pueden prestar laptops o notebooks. Las PC de los salones son fijas.":
    "Only laptops or notebooks can be loaned. Classroom PCs stay in place.",
  "Laptop disponible": "Available laptop",
  "Solo aparecen laptops y notebooks habilitadas para préstamo, identificadas por su código de inventario.":
    "Only laptops and notebooks enabled for loans are shown, identified by inventory code.",
  "Seleccionar laptop disponible": "Select an available laptop",
  "No hay laptops disponibles": "No laptops are available",
  "No hay laptops disponibles para solicitar en este momento.":
    "No laptops are available to request right now.",
  Prestable: "Loanable",
  "No prestable": "Not loanable",
  "Accesibilidad e idioma": "Accessibility and language",
  "Ajustes de visualización": "Display settings",
  Idioma: "Language",
  Español: "Spanish",
  Inglés: "English",
  "Modo oscuro": "Dark mode",
  "Tipo de daltonismo": "Colour vision type",
  "Sin ajuste de color": "No colour adjustment",
  "Protanopía (tonos rojos)": "Protanopia (red tones)",
  "Deuteranopía (tonos verdes)": "Deuteranopia (green tones)",
  "Tritanopía (tonos azul y amarillo)": "Tritanopia (blue and yellow tones)",
  "Acromatopsia (sin color)": "Achromatopsia (no colour)",
  "Restablecer preferencias": "Reset preferences",
  Cerrar: "Close",
  "Cerrar sesión": "Sign out",
  Salir: "Sign out",
  Menú: "Menu",
  Menu: "Menu",
  "Abrir menú": "Open menu",
  Inicio: "Home",
  Cuenta: "Account",
  Usuario: "User",
  Usuarios: "Users",
  Administrador: "Administrator",
  Técnico: "Technician",
  Tecnico: "Technician",
  Solicitante: "Requester",
  Docente: "Teacher",
  "Solicitante / Docente": "Requester / Teacher",
  "Gestiones personales": "Personal requests",
  "Acceso institucional": "Institutional access",
  "Ingreso al sistema": "Sign in",
  "Iniciar sesión": "Sign in",
  Ingresar: "Sign in",
  Correo: "Email",
  "Correo electrónico": "Email address",
  Contraseña: "Password",
  "Mostrar contraseña": "Show password",
  "Ocultar contraseña": "Hide password",
  "Mostrar u ocultar contraseña": "Show or hide password",
  "¿Olvidó su contraseña?": "Forgot your password?",
  "Recuperar contraseña": "Recover password",
  "Restablecer contraseña": "Reset password",
  "Nueva contraseña": "New password",
  "Confirmar contraseña": "Confirm password",
  "Enviar enlace": "Send link",
  "Guardar nueva contraseña": "Save new password",
  "Volver al inicio de sesión": "Back to sign in",
  "Volver al inicio": "Back to home",
  "Crear una cuenta": "Create an account",
  "¿Ya tiene una cuenta?": "Already have an account?",
  "Use las credenciales de su cuenta institucional.":
    "Use your institutional account credentials.",
  "Escriba el correo de su cuenta y le enviaremos un enlace seguro.":
    "Enter your account email and we will send you a secure link.",
  "Elija una nueva contraseña de al menos 8 caracteres.":
    "Choose a new password with at least 8 characters.",
  "Si el correo está registrado, recibirá un enlace para restablecer la contraseña.":
    "If the email is registered, you will receive a password reset link.",
  "El enlace de recuperación no es válido o venció":
    "The recovery link is invalid or has expired",
  "La contraseña debe tener al menos 8 caracteres":
    "The password must contain at least 8 characters",
  "Las contraseñas no coinciden": "Passwords do not match",
  "Contraseña restablecida correctamente": "Password reset successfully",
  "Correo y contraseña son obligatorios": "Email and password are required",
  "Usuario o contraseña incorrectos": "Incorrect email or password",
  "Debe iniciar sesión": "You must sign in",
  "No tiene permisos para realizar esta acción":
    "You do not have permission to perform this action",
  "No se pudo completar la operación": "The operation could not be completed",
  "No se pudo completar la operacion": "The operation could not be completed",
  Nombre: "First name",
  Apellido: "Last name",
  Cédula: "Identity number",
  "Cédula de identidad": "Identity number",
  Teléfono: "Phone",
  "Rol solicitado": "Requested role",
  "Rol a solicitar": "Role to request",
  "Enviar solicitud": "Send request",
  "Registrar solicitud": "Submit request",
  "Registro institucional": "Institutional registration",
  Registrarse: "Register",
  "Complete sus datos para enviar la solicitud de acceso. La cuenta quedará pendiente de aprobación.":
    "Complete your details to request access. The account will remain pending approval.",
  "Panel de control": "Dashboard",
  Resumen: "Summary",
  Total: "Total",
  Estado: "Status",
  Fecha: "Date",
  Detalle: "Details",
  Acción: "Action",
  Acciones: "Actions",
  Buscar: "Search",
  Filtrar: "Filter",
  "Limpiar filtros": "Clear filters",
  Desde: "From",
  Hasta: "To",
  Pendiente: "Pending",
  Pendientes: "Pending",
  "En proceso": "In progress",
  Resuelta: "Resolved",
  Resueltas: "Resolved",
  Cancelada: "Cancelled",
  Activo: "Active",
  Activos: "Active",
  Bloqueado: "Blocked",
  Rechazado: "Rejected",
  Aprobado: "Approved",
  Aprobada: "Approved",
  Disponible: "Available",
  Prestado: "On loan",
  Devuelto: "Returned",
  Vencido: "Overdue",
  "Sin asignar": "Unassigned",
  "Sin registros": "No records",
  "Sin pendientes": "Nothing pending",
  Consulta: "View only",
  Cerrada: "Closed",
  Cerrado: "Closed",
  Aceptar: "Accept",
  Denegar: "Reject",
  Cancelar: "Cancel",
  Actualizar: "Update",
  Agregar: "Add",
  Seleccionar: "Select",
  "Guardar cambios": "Save changes",
  "Confirmar y registrar": "Confirm and save",
  Incidencia: "Incident",
  Incidencias: "Incidents",
  "Gestión de incidencias": "Incident management",
  "Registro y resolución de tickets.": "Ticket reporting and resolution.",
  "Reportar incidencia": "Report incident",
  "Crear ticket": "Create ticket",
  "Crear ticket de incidencia": "Create incident ticket",
  "Buscar incidencia": "Search incidents",
  "Todos los estados": "All statuses",
  "Incidencias abiertas": "Open incidents",
  "Incidencias resueltas": "Resolved incidents",
  "Incidencias sin resolver": "Unresolved incidents",
  Diagnóstico: "Diagnosis",
  "Solución aplicada": "Applied solution",
  Resolución: "Resolution",
  Resolver: "Resolve",
  "Resolver incidencia": "Resolve incident",
  Responsables: "Assignees",
  "Sin colaborador": "No collaborator",
  "Colaborar en ticket": "Collaborate on ticket",
  "Unirse con código": "Join with code",
  "Generar código": "Generate code",
  "Unirse al ticket": "Join ticket",
  "Código para colaborar": "Collaboration code",
  "Código temporal": "Temporary code",
  "Código temporal de 6 dígitos": "6-digit temporary code",
  "Comparta este código únicamente con la segunda persona que trabajará en el ticket.":
    "Share this code only with the second person who will work on the ticket.",
  "Vence en 10 minutos, admite un solo uso y se invalida después de cinco intentos fallidos.":
    "It expires in 10 minutes, can be used once, and is invalidated after five failed attempts.",
  "Solicite el código al responsable principal del ticket.":
    "Ask the ticket owner for the code.",
  Prioridad: "Priority",
  "Prioridad asignada": "Assigned priority",
  Alta: "High",
  Media: "Medium",
  Baja: "Low",
  Categoría: "Category",
  "Tipo de incidencia": "Incident type",
  "Cargando tipos de incidencia...": "Loading incident types...",
  "Seleccionar tipo de incidencia": "Select incident type",
  "Todas las categorías": "All categories",
  Espacio: "Room",
  Equipo: "Equipment",
  "Equipo afectado": "Affected equipment",
  Título: "Title",
  Titulo: "Title",
  Descripción: "Description",
  "Fecha reportada": "Reported date",
  "Fotografía de la resolución": "Resolution photo",
  "Elegir o tomar fotografía": "Choose or take photo",
  "Quitar fotografía": "Remove photo",
  "Evidencia fotográfica": "Photo evidence",
  "Ver fotografía": "View photo",
  "La fotografía es opcional. Formatos JPEG, PNG o WebP; máximo 5 MB.":
    "The photo is optional. JPEG, PNG or WebP; maximum 5 MB.",
  "La fotografía debe pesar como máximo 5 MB":
    "The photo must be no larger than 5 MB",
  "El archivo recibido no es una imagen válida":
    "The uploaded file is not a valid image",
  "La fotografía debe estar en formato JPEG, PNG o WebP":
    "The photo must be a JPEG, PNG or WebP image",
  Préstamos: "Loans",
  "Gestión de préstamos": "Loan management",
  "Solicitar préstamo": "Request a loan",
  "Solicitud de préstamo": "Loan request",
  "Buscar préstamo": "Search loans",
  "Fecha de préstamo": "Loan date",
  "Fecha de devolución prevista": "Expected return date",
  "Registrar devolución": "Register return",
  Inventario: "Inventory",
  Equipos: "Equipment",
  "Código de inventario": "Inventory code",
  Ubicación: "Location",
  "Última revisión": "Last inspection",
  "Nuevo equipo": "New equipment",
  "Guardar equipo": "Save equipment",
  "Categorías de incidencia": "Incident categories",
  "Nueva categoría": "New category",
  "Base de conocimiento": "Knowledge base",
  "Historial del sistema": "System history",
  Auditoría: "Audit log",
  Módulo: "Module",
  Entidad: "Entity",
  Cambios: "Changes",
  "Todos los módulos": "All modules",
  Tareas: "Tasks",
  "Tareas de soporte": "Support tasks",
  "Programar tarea": "Schedule task",
  "Completar tarea": "Complete task",
  "Resultado técnico": "Technical result",
  Programar: "Schedule",
  Completar: "Complete",
  "Mis solicitudes": "My requests",
  "Estado de solicitudes": "Request status",
  Solicitudes: "Requests",
  "Solicitud recibida": "Request received",
  "Uso de sala": "Room use",
  "Registrar uso de sala": "Register room use",
  "Planilla digital de uso de sala": "Digital room-use form",
  Sala: "Room",
  "Tipo de sala": "Room type",
  "Sala solicitada": "Requested room",
  Horario: "Schedule",
  Entrada: "Start time",
  Salida: "End time",
  Alumno: "Student",
  Estudiante: "Student",
  Grupo: "Group",
  Asignatura: "Subject",
  Laboratorio: "Laboratory",
  Laboratorios: "Laboratories",
  "Salones comunes": "Classrooms",
  Talleres: "Workshops",
  "PC de alumnos": "Student PCs",
  "Mostrar puestos": "Show workstations",
  "Ocultar puestos": "Hide workstations",
  "Equipos para préstamo": "Loan equipment",
  "Otros equipos": "Other equipment",
  "Buscar equipo": "Search equipment",
  Sección: "Section",
  "Todas las secciones": "All sections",
  "Todas las salas": "All rooms",
  "Código, nombre o espacio": "Code, name or room",
  "Los equipos prestables se guardan fuera de salones, talleres y laboratorios.":
    "Loanable equipment is stored outside classrooms, workshops, and laboratories.",
  "Solo se pueden prestar laptops o notebooks. Los equipos prestables se guardan fuera de salones, talleres y laboratorios.":
    "Only laptops or notebooks can be loaned. Loanable equipment is stored outside classrooms, workshops, and laboratories.",
  equipos: "items",
  "Equipos fijos por espacio y laptops disponibles para préstamo.":
    "Fixed equipment by room and laptops available for loan.",
  "Solicitar laboratorio": "Request laboratory",
  "Software requerido": "Required software",
  "Soporte técnico": "Technical support",
  Reportes: "Reports",
  "Ver reportes": "View reports",
  "Black list": "Block list",
  "No hay registros disponibles.": "No records are available.",
  "No hay solicitudes disponibles.": "No requests are available.",
  "No hay tareas programadas.": "No tasks are scheduled.",
  "Cargando categorías...": "Loading categories...",
  "Cargando inventario...": "Loading inventory...",
  "Cargando reportes...": "Loading reports...",
  Hoy: "Today",
  "Fecha y hora": "Date and time",
  "Última actualización": "Last update",
  "Use solo letras y espacios.": "Use letters and spaces only.",
  "Use el formato dd/mm/aaaa.": "Use the dd/mm/yyyy format.",
  "Seleccione la fecha actual del reporte.":
    "Select today's date for the report.",
  "Préstamos activos": "Active loans",
  Tipo: "Type",
  Observaciones: "Notes",
  "Observaciones del salón": "Room notes",
  "Observaciones del equipo": "Equipment notes",
  "Solicitudes abiertas": "Open requests",
  "laboratorios disponibles": "available labs",
  "La informacion se cargara desde la base de datos.":
    "Information will be loaded from the database.",
  "Rol adicional": "Additional role",
  Seguimiento: "Tracking",
  "En reparación": "Under repair",
  Motivo: "Reason",
  "Docente asociado": "Associated teacher",
  "Docente / Solicitante": "Teacher / Requester",
  "Sin equipo específico": "No specific equipment",
  "Sin espacio específico": "No specific space",
  "Consultar actividad personal": "View personal activity",
  "Seleccione primero un tipo de sala": "Select a room type first",
  "Resumen personal": "Personal summary",
  "Fuera de servicio": "Out of service",
  "Funciones como Solicitante / Docente": "Requester / Teacher features",
  "Registrar una falla propia": "Report an issue",
  "Guardar grupo, horario y equipos": "Save group, schedule and equipment",
  "Imprimir planilla": "Print record",
  Recurso: "Resource",
  "Ingrese solo números, entre 7 y 8 dígitos.":
    "Enter digits only, between 7 and 8 digits.",
  Matutino: "Morning",
  "Pendientes o en proceso": "Pending or in progress",
  "Pedir un recurso tecnológico": "Request a technology resource",
  Vespertino: "Afternoon",
  Nocturno: "Evening",
  Operación: "Operation",
  "Reserva, software o soporte": "Booking, software or support",
  "solicitudes totales": "total requests",
  Salón: "Classroom",
  Taller: "Workshop",
  "Acciones principales": "Main actions",
  "Acceso al sistema": "System access",
  Turno: "Shift",
  "Solicitudes y actividad docente": "Requests and teaching activity",
  "Progreso de habilitación": "Access approval progress",
  "Pueden ingresar": "Can sign in",
  Reactiva: "Corrective",
  "Recuperar contraseña - SGRSI": "Recover password - SGRSI",
  "Usuarios - SGRSI": "Users - SGRSI",
  "Recurso tecnológico temporal": "Temporary technology resource",
  Recursos: "Resources",
  "Usos de sala": "Room usage",
  "Recursos en reparación": "Resources under repair",
  "Registrar un nuevo reporte": "Create a new report",
  "Uso de sala - SGRSI": "Room usage - SGRSI",
  "Registro - SGRSI": "Registration - SGRSI",
  "Registro de estudiantes que no devolvieron equipos. El docente queda asociado como responsable de seguimiento, sin quedar incluido en la restricción.":
    "Students who did not return equipment. The teacher remains associated for follow-up without being included in the restriction.",
  Registros: "Records",
  "Registros en black list": "Block-list records",
  "Registros realizados": "Completed records",
  "Reporte de uso de sala": "Room usage report",
  "Usar la fecha de hoy": "Use today's date",
  "Recursos disponibles": "Available resources",
  "Usuarios activos": "Active users",
  Preventiva: "Preventive",
  "Préstamos solicitados": "Requested loans",
  Ocupado: "In use",
  "Ver laboratorios": "View labs",
  "Operación al día": "Operations up to date",
  "Ver incidencias": "View incidents",
  "Panel de seguimiento para laboratorios y servicios asociados.":
    "Tracking dashboard for labs and related services.",
  "Panel operativo": "Operations dashboard",
  "Ver historial": "View history",
  "Panel para revisar solicitudes de préstamo recibidas, devoluciones y estudiantes con atraso.":
    "Dashboard for reviewing loan requests, returns and overdue students.",
  Vencidos: "Overdue",
  "Usuarios y roles": "Users and roles",
  "Pendientes personales": "My pending items",
  "Planillas de uso de sala": "Room usage records",
  "Préstamo - SGRSI": "Loan - SGRSI",
  "Usuarios registrados": "Registered users",
  "Usuarios pendientes": "Pending users",
  "Préstamos atrasados": "Overdue loans",
  "Préstamos pendientes": "Pending loans",
  "Préstamos recibidos": "Received loans",
  "Préstamos recibidos - SGRSI": "Received loans - SGRSI",
  Programada: "Scheduled",
  "Reportes - SGRSI": "Reports - SGRSI",
  "Reportes de planillas": "Record reports",
  "reportes totales": "total reports",
  "Ticket de incidencia - SGRSI": "Incident ticket - SGRSI",
  "Técnico - SGRSI": "Technician - SGRSI",
  "SGRSI - Acceso al sistema": "SGRSI - System access",
  "SGRSI - Ingreso al sistema": "SGRSI - Sign in",
  "Sin acceso": "No access",
  "Tareas preventivas y reactivas con seguimiento técnico.":
    "Preventive and corrective tasks with technical tracking.",
  "Tareas de soporte - SGRSI": "Support tasks - SGRSI",
  "Sin ubicación asignada": "No assigned location",
  "Sin vencimientos": "No overdue items",
  "Servicios y laboratorios": "Services and labs",
  Tarea: "Task",
  "Solicitante / Docente - SGRSI": "Requester / Teacher - SGRSI",
  "Solicitar otro rol": "Request another role",
  "Solicitar rol - SGRSI": "Request role - SGRSI",
  "Solicitud de sala o servicio": "Room or service request",
  "Solicitud de servicio - SGRSI": "Service request - SGRSI",
  "Supervisar tickets abiertos": "Monitor open tickets",
  "Solicitudes aprobadas": "Approved requests",
  "Solicitudes registradas": "Registered requests",
  "Soporte para clase": "Classroom support",
  "Sistema de Gestión de Recursos y Servicios Informáticos":
    "IT Resources and Services Management System",
  Tickets: "Tickets",
  "Seguimiento visual de solicitudes creadas por el solicitante.":
    "Visual tracking of requests created by the requester.",
  "Tickets pendientes o en proceso": "Tickets pending or in progress",
  "Requiere revisión": "Needs review",
  "Requieren diagnóstico": "Need diagnosis",
  "Reserva de sala": "Room booking",
  "Reserva, software o apoyo": "Booking, software or assistance",
  "Trazabilidad de acciones administrativas y operativas sin exponer identidades responsables.":
    "Traceability of administrative and operational actions without exposing responsible identities.",
  "Restablecer contraseña - SGRSI": "Reset password - SGRSI",
  Resultado: "Result",
  "Resumen de solicitudes": "Request summary",
  "Trabajo pendiente": "Pending work",
  "Revisar equipos": "Inspect equipment",
  "Revisar préstamos vencidos": "Review overdue loans",
  "Revisión administrativa": "Administrative review",
  "Todos los roles": "All roles",
  Roles: "Roles",
  "Sala, docente, grupo o asignatura": "Room, teacher, group or subject",
  "Se guarda el nombre del estudiante porque es quien tiene el equipo. El docente queda asociado para trazabilidad y seguimiento.":
    "The student's name is stored because they hold the equipment. The teacher remains associated for traceability and follow-up.",
  "Se habilitará cuando la cuenta sea aprobada.":
    "It will be enabled when the account is approved.",
  "Tipo de solicitud": "Request type",
  "Seguimiento de incidencias, préstamos y recursos que requieren intervención.":
    "Tracking of incidents, loans and resources that require attention.",
  "Seguimiento tecnico y administrativo de equipos.":
    "Technical and administrative equipment tracking.",
  "Solicitudes y disponibilidad": "Requests and availability",
  Observación: "Note",
  "¿Qué necesita realizar?": "What do you need to do?",
  "Nueva planilla": "New record",
  Código: "Code",
  "Código, nombre o tipo": "Code, name or type",
  "Cola de trabajo": "Work queue",
  "Condición del equipo": "Equipment condition",
  "Conocimiento - SGRSI": "Knowledge base - SGRSI",
  "Consulta y decisiones de alta, rechazo y baja de usuarios.":
    "Review and approval, rejection and deactivation decisions for users.",
  "Consulta y reimpresión de las planillas registradas en el sistema.":
    "Review and reprint records stored in the system.",
  "Consultando estado": "Checking status",
  "Consultando tu solicitud": "Checking your request",
  "Consultar laboratorios": "View labs",
  "Controlar entregas y atrasos": "Manage handovers and overdue items",
  "Coordinador / Administrador": "Coordinator / Administrator",
  "Dañado / fuera de servicio": "Damaged / out of service",
  "Detalle de planilla": "Record details",
  "Detalle de ubicación": "Location details",
  "Devuelto hoy": "Returned today",
  "Diagnósticos y soluciones reutilizables derivados de incidencias resueltas.":
    "Reusable diagnoses and solutions from resolved incidents.",
  "Días de atraso": "Days overdue",
  Disponibilidad: "Availability",
  "Disponibilidad y solicitudes": "Availability and requests",
  "Docentes asociados": "Associated teachers",
  "El recurso queda identificado por su código de inventario.":
    "The resource is identified by its inventory code.",
  "El registro fue guardado correctamente.":
    "The record was saved successfully.",
  "Entregas y devoluciones": "Handovers and returns",
  "Equipo disponible": "Available equipment",
  "Clasificación disponible para los formularios de reporte.":
    "Classification available for reporting forms.",
  "Equipos - SGRSI": "Equipment - SGRSI",
  Cerradas: "Closed",
  "Categorías - SGRSI": "Categories - SGRSI",
  Abiertas: "Open",
  "Acceso rápido a reservas, incidencias, préstamos y registros de sala.":
    "Quick access to bookings, incidents, loans and room records.",
  "Accesos rápidos": "Quick access",
  "Aceptar, clasificar y resolver": "Accept, classify and resolve",
  "Activos e históricos": "Active and historical",
  "Actualizar estado": "Update status",
  "Admin / Coordinador": "Admin / Coordinator",
  "Admin / Coordinador - SGRSI": "Admin / Coordinator - SGRSI",
  "Administración y coordinación": "Administration and coordination",
  "Administrador / Coordinador": "Administrator / Coordinator",
  "Agregar alumno/equipo": "Add student/equipment",
  "Aprobar cuentas y permisos": "Approve accounts and permissions",
  "Asignadas a mí": "Assigned to me",
  "Atención requerida": "Attention required",
  "Baja/Rechazo": "Deactivation/Rejected",
  "Black list - SGRSI": "Block list - SGRSI",
  "Black list de préstamos": "Loan block list",
  "Buen estado": "Good condition",
  "Buscar falla, diagnóstico o solución": "Search issue, diagnosis or solution",
  "Buscar por nombre, cédula o correo": "Search by name, ID or email",
  "Calendario de soporte": "Support calendar",
  Cargador: "Charger",
  "Cédula del estudiante": "Student ID",
  "Número de equipo": "Equipment number",
  "Equipos disponibles": "Available equipment",
  "Equipos en revisión": "Equipment under review",
  "Historial de resoluciones": "Resolution history",
  "Incidencias - SGRSI": "Incidents - SGRSI",
  "Incidencias en proceso": "Incidents in progress",
  "Incidencias generales": "All incidents",
  "Incidencias reportadas": "Reported incidents",
  "Indicadores principales": "Main indicators",
  "Ingrese solo números, entre 8 y 15 dígitos.":
    "Enter digits only, between 8 and 15 digits.",
  "Inicie sesión con su usuario o registre una nueva cuenta.":
    "Sign in with your user account or create a new one.",
  "Instalación de software": "Software installation",
  "Instituto Tecnológico de Informática": "Institute of Information Technology",
  "Inventario y estado técnico": "Inventory and technical status",
  "Inventario y mantenimiento": "Inventory and maintenance",
  "La administración evalúa la solicitud.":
    "Administration reviews the request.",
  "Laboratorios - SGRSI": "Labs - SGRSI",
  Libre: "Available",
  "Listas para ejecución técnica": "Ready for technical execution",
  "Los registros aparecen aquí inmediatamente después de confirmarse.":
    "Records appear here immediately after confirmation.",
  "Mi actividad": "My activity",
  "Mi espacio": "My workspace",
  "Mis solicitudes - SGRSI": "My requests - SGRSI",
  Mouse: "Mouse",
  "No se permite editar datos personales desde este panel.":
    "Personal data cannot be edited from this dashboard.",
  "Nombre del estudiante": "Student name",
  "Nombre y apellido del alumno": "Student's full name",
  Notebook: "Laptop",
  "Historial - SGRSI": "History - SGRSI",
  "Equipos en reparación": "Equipment under repair",
  "Grupo, horario y equipos": "Group, schedule and equipment",
  "Gestiones personales disponibles sin abandonar el panel de coordinación.":
    "Personal actions available without leaving the coordination dashboard.",
  "Equipos retenidos": "Unreturned equipment",
  "Equipos y alumnos incluidos en la planilla de uso de sala":
    "Equipment and students included in the room usage record",
  "Espacio actual": "Current space",
  "Espacios habilitados": "Available spaces",
  "Espacios habilitados para clases y solicitudes.":
    "Spaces available for classes and requests.",
  "Esperan decision": "Awaiting decision",
  "Estado de cuenta - SGRSI": "Account status - SGRSI",
  "Estado del equipo": "Equipment status",
  "Estado del sistema": "System status",
  "Estamos verificando el estado actual de tu cuenta.":
    "We are checking the current status of your account.",
  "Estudiantes observados": "Restricted students",
  "Falla de equipo o servicio": "Equipment or service issue",
  "Fecha de alta": "Registration date",
  "Fecha devolución": "Return date",
  "Fecha ingreso": "Start date",
  "Fecha préstamo": "Loan date",
  "Fecha registro": "Record date",
  "Fecha solicitada": "Requested date",
  Gestión: "Management",
  "Gestión de equipos": "Equipment management",
  "Gestión de laboratorios": "Lab management",
  "Gestión de usuarios": "User management",
  "Gestionar incidencias": "Manage incidents",
  "Gestionar préstamos": "Manage loans",
  "Gestiones personales disponibles sin abandonar el panel técnico.":
    "Personal actions available without leaving the technical dashboard.",
  "Visión general de usuarios, recursos y actividad operativa del sistema.":
    "Overview of users, resources and system operations.",
  "Acción de rol no válida": "Invalid role action",
  "Acción de usuario no válida": "Invalid user action",
  "Cada equipo debe tener un alumno asociado":
    "Each item of equipment must have an associated student",
  "Categoria no encontrada": "Category not found",
  "Cédula o teléfono no válidos": "Invalid ID or phone number",
  "Codigo, nombre, tipo y estado valido son obligatorios":
    "Code, name, type and a valid status are required",
  "Correo electrónico no válido": "Invalid email address",
  "Datos de categoria no validos": "Invalid category data",
  "Datos de préstamo incompletos": "Incomplete loan data",
  "Datos de solicitud incompletos": "Incomplete request data",
  "Datos de tarea incompletos o no validos": "Incomplete or invalid task data",
  "Datos de uso de sala incompletos": "Incomplete room usage data",
  "Debe agregar al menos un equipo a la planilla":
    "Add at least one item of equipment to the record",
  "Debe seleccionar un perfil de acceso": "Select an access profile",
  "Diagnóstico y solución aplicada son obligatorios":
    "Diagnosis and applied solution are required",
  "Nota de seguimiento": "Follow-up note",
  "Sin seguimiento registrado": "No follow-up note recorded",
  "Escriba qué se revisó o qué queda pendiente para continuar el ticket más adelante.":
    "Write what was checked or what remains pending so the ticket can be continued later.",
  "El archivo de la fotografía ya no está disponible":
    "The photo file is no longer available",
  "El cuerpo de la solicitud debe contener JSON válido":
    "The request body must contain valid JSON",
  "El cuerpo debe contener un objeto JSON":
    "The request body must contain a JSON object",
  "El equipo dejó de estar disponible": "The equipment is no longer available",
  "El equipo no está disponible": "The equipment is unavailable",
  "El equipo ya tiene una solicitud o préstamo activo":
    "The equipment already has an active request or loan",
  "El estado de un equipo prestado se actualiza desde el prestamo":
    "The status of loaned equipment is updated from its loan",
  "El estudiante posee una restricción activa en Black list":
    "The student has an active block-list restriction",
  "El nombre de la categoria es obligatorio": "The category name is required",
  "El perfil seleccionado no está disponible":
    "The selected profile is unavailable",
  "El préstamo debe estar aprobado antes de entregarse":
    "The loan must be approved before handover",
  "El préstamo no puede entregarse antes de la fecha solicitada":
    "The loan cannot be handed over before the requested date",
  "El resultado es obligatorio al completar una tarea":
    "A result is required to complete a task",
  "Endpoint de autenticación no encontrado":
    "Authentication endpoint not found",
  "Endpoint de rol no encontrado": "Role endpoint not found",
  "Endpoint no encontrado": "Endpoint not found",
  "Equipo no encontrado": "Equipment not found",
  "Error interno del servidor": "Internal server error",
  "Ese rol ya está activo para este usuario":
    "That role is already active for this user",
  "Estado de incidencia no válido": "Invalid incident status",
  "Estado de préstamo no válido": "Invalid loan status",
  "Estado de solicitud no válido": "Invalid request status",
  "Fecha de alta no valida": "Invalid registration date",
  "Incidencia no encontrada": "Incident not found",
  "El código debe contener exactamente 6 dígitos":
    "The code must contain exactly 6 digits",
  "Código inválido o vencido": "Invalid or expired code",
  "El código solo puede generarse para una incidencia en proceso":
    "A code can only be generated for an incident in progress",
  "Solo el responsable principal puede generar el código":
    "Only the primary assignee can generate the code",
  "El ticket ya tiene dos responsables": "The ticket already has two assignees",
  "Solo puede unirse a una incidencia en proceso":
    "You can only join an incident in progress",
  "Usted ya es el responsable principal del ticket":
    "You are already the primary assignee",
  "Debe unirse al equipo del ticket antes de modificarlo":
    "Join the ticket team before modifying it",
  "Debe unirse al equipo del ticket antes de resolverlo":
    "Join the ticket team before resolving it",
  "Se unió al equipo del ticket.": "You joined the ticket team.",
  "La base de datos no fue configurada.":
    "The database has not been configured.",
  "La condición debe ser bueno, observado o dañado":
    "The condition must be good, noted or damaged",
  "La cuenta todavía no está habilitada para acceder al sistema":
    "The account is not yet enabled to access the system",
  "La cuenta ya no está disponible": "The account is no longer available",
  "La fecha de devolución no puede ser anterior al préstamo":
    "The return date cannot be earlier than the loan date",
  "La fotografía debe tener extensión JPG, JPEG, PNG o WebP":
    "The photo must have a JPG, JPEG, PNG or WebP extension",
  "La hora de salida debe ser posterior a la entrada":
    "The end time must be later than the start time",
  "La incidencia no tiene una fotografía de resolución":
    "The incident has no resolution photo",
  "La incidencia ya existe o contiene referencias no válidas":
    "The incident already exists or contains invalid references",
  "La transición de usuario no está permitida":
    "The user transition is not allowed",
  "Las observaciones son obligatorias si el equipo no vuelve en buen estado":
    "Notes are required when equipment is not returned in good condition",
  "Método HTTP no permitido": "HTTP method not allowed",
  "No se pudo recibir la fotografía": "The photo could not be received",
  "No se puede dar de baja un equipo prestado":
    "Loaned equipment cannot be deactivated",
  "No se puede registrar el mismo equipo mas de una vez":
    "The same equipment cannot be recorded more than once",
  "No tiene permisos para ver esta fotografía":
    "You do not have permission to view this photo",
  "Préstamo no encontrado": "Loan not found",
  "Prioridad de incidencia no válida": "Invalid incident priority",
  "Rol solicitado no válido": "Invalid requested role",
  "Software requerido es obligatorio": "Required software is mandatory",
  "Solicitud de rol no encontrada": "Role request not found",
  "Solicitud no encontrada": "Request not found",
  "Solo un préstamo entregado o atrasado puede devolverse":
    "Only a handed-over or overdue loan can be returned",
  "Solo una incidencia en proceso puede resolverse":
    "Only an incident in progress can be resolved",
  "Tarea no encontrada": "Task not found",
  "Título, descripción, categoría y fecha reportada son obligatorios":
    "Title, description, category and report date are required",
  "Todos los datos de registro son obligatorios":
    "All registration details are required",
  "Transición de incidencia no permitida": "Incident transition not allowed",
  "Transición de préstamo no permitida": "Loan transition not allowed",
  "Transición de solicitud no permitida": "Request transition not allowed",
  "Transicion de tarea no permitida": "Task transition not allowed",
  "Use la acción específica para entregar o devolver":
    "Use the specific handover or return action",
  "Use la acción resolver para cerrar una incidencia":
    "Use the resolve action to close an incident",
  "Usuario no encontrado": "User not found",
  "Ya existe esa categoria": "That category already exists",
  "Ya existe un equipo con ese codigo de inventario":
    "Equipment with that inventory code already exists",
  "Ya existe un usuario con esa cédula o correo":
    "A user with that ID or email already exists",
  "Ya existe una solicitud equivalente": "An equivalent request already exists",
  "0 registros": "0 records",
  "Registro de estudiantes que no devolvieron equipos. El docente queda asociado como responsable de seguimiento, sin cargarle la falta principal.":
    "Students who did not return equipment. The teacher remains associated for follow-up without receiving the primary fault.",
  "Se guarda el nombre del estudiante porque es quien tiene el equipo. El docente queda asociado para trazabilidad y comunicación, pero el registro no lo marca como responsable directo.":
    "The student's name is stored because they hold the equipment. The teacher remains associated for traceability and communication but is not marked as directly responsible.",
  "© 2026 SGRSI - Programación Full Stack · Desarrollado por SixNine Systems.":
    "© 2026 SGRSI - Full Stack Development · Developed by SixNine Systems.",
  "¿Está seguro de que desea cerrar la sesión actual?":
    "Are you sure you want to sign out?",
  "Categoría actualizada.": "Category updated.",
  "Categoría registrada.": "Category created.",
  Categorías: "Categories",
  Condición: "Condition",
  "Confirmar devolución": "Confirm return",
  "Consulte nuevamente el estado o comuníquese con la administración.":
    "Check the status again or contact administration.",
  Dañado: "Damaged",
  "Devolución registrada e inventario actualizado.":
    "Return recorded and inventory updated.",
  "El equipo administrador debe revisar y aprobar tu cuenta antes de que puedas ingresar a los módulos del sistema.":
    "The administration team must review and approve your account before you can access the system modules.",
  "El equipo dejará de estar disponible pero conservará su historial.":
    "The equipment will become unavailable but its history will be preserved.",
  "La cuenta fue bloqueada por seguridad. Comuníquese con la administración para recuperar el acceso.":
    "The account was locked for security reasons. Contact administration to regain access.",
  "La cuenta fue dada de baja por la administración. Comuníquese con el centro si necesita solicitar su reactivación.":
    "The account was deactivated by administration. Contact the centre if you need to request reactivation.",
  "La devolución actualizará el inventario y regularizará la Black list asociada.":
    "The return will update the inventory and clear the related block-list entry.",
  "La solicitud fue rechazada. Si considera que se trata de un error, comuníquese con la administración para solicitar una revisión.":
    "The request was rejected. If you believe this is an error, contact administration to request a review.",
  "No es posible ingresar todavía": "Access is not available yet",
  "Pendiente de aprobación": "Pending approval",
  "Seleccionar categoría": "Select category",
  "Sin categoría": "No category",
  "Sin información": "No information",
  "Solicitud creada. Ya puede iniciar sesión para consultar su estado de aprobación.":
    "Request created. You can now sign in to check its approval status.",
  "Tu acceso está deshabilitado": "Your access is disabled",
  "Tu solicitud está en revisión": "Your request is under review",
  "Agregue al menos un alumno y su equipo antes de registrar el uso.":
    "Add at least one student and their equipment before recording usage.",
  "Confirmar planilla de uso": "Confirm room usage record",
  "Registrar planilla": "Save record",
  "Uso de sala registrado correctamente. La planilla quedo disponible para imprimir.":
    "Room usage saved successfully. The record is now available to print.",
  "Confirmar aprobacion": "Confirm approval",
  "Confirmar rechazo": "Confirm rejection",
  "Confirmar baja": "Confirm deactivation",
  "Confirmar reactivacion": "Confirm reactivation",
  "Confirmar rol": "Confirm role",
  "Confirmar prestamo": "Confirm loan",
  "Confirmar denegacion": "Confirm rejection",
  "Confirmar entrega": "Confirm handover",
  "Confirmar devolucion": "Confirm return",
  "Confirmar toma": "Confirm assignment",
  "Confirmar cierre": "Confirm completion",
  "Confirmar cancelacion": "Confirm cancellation",
  "Confirmar incidencia": "Confirm incident",
  "Confirmar resolucion": "Confirm resolution",
  "Confirmar cambio": "Confirm change",
  "Aprobar usuario": "Approve user",
  "Rechazar usuario": "Reject user",
  Reactivar: "Reactivate",
  "aprobar usuario": "approve user",
  "rechazar usuario": "reject user",
  "dar de baja": "deactivate",
  reactivar: "reactivate",
  "aprobar este rol": "approve this role",
  "rechazar este rol": "reject this role",
  "aprobar este prestamo": "approve this loan",
  "denegar este prestamo": "reject this loan",
  "marcar este prestamo como entregado": "mark this loan as handed over",
  "registrar la devolucion del prestamo": "record this loan's return",
  "aprobar esta solicitud": "approve this request",
  "rechazar esta solicitud": "reject this request",
  "tomar esta solicitud": "take this request",
  "marcar esta solicitud como completada": "mark this request as completed",
  "cancelar esta solicitud": "cancel this request",
  "aceptar la incidencia": "accept the incident",
  "denegar la incidencia": "reject the incident",
  "¿Está seguro de que desea {accion}?": "Are you sure you want to {accion}?",
  "Estado de usuario actualizado.": "User status updated.",
  "Rol actualizado.": "Role updated.",
  "Prestamo actualizado.": "Loan updated.",
  "Solicitud actualizada.": "Request updated.",
  "Incidencia aceptada.": "Incident accepted.",
  "Incidencia denegada.": "Incident rejected.",
  "Incidencia actualizada.": "Incident updated.",
  "Incidencia resuelta.": "Incident resolved.",
  "Equipo dado de baja.": "Equipment deactivated.",
  "Ese equipo ya fue agregado a la planilla.":
    "That equipment has already been added to the record.",
  "Seleccionar equipo disponible": "Select available equipment",
  "Sin detalle adicional": "No additional details",
  "Sin movimientos": "No activity",
  "Solicitud de prestamo registrada.": "Loan request created.",
  "Solicitud de rol enviada. Queda pendiente de aprobacion.":
    "Role request sent. It is pending approval.",
  "Solicitud enviada correctamente.": "Request sent successfully.",
  "Tarea completada.": "Task completed.",
  "Tarea iniciada.": "Task started.",
  "Tarea programada.": "Task scheduled.",
  "Tu solicitud no fue aprobada": "Your request was not approved",
  "Quitar equipo": "Remove equipment",
  "Esta seguro de marcar esta incidencia como resuelta?":
    "Are you sure you want to mark this incident as resolved?",
  "Esta seguro de actualizar esta incidencia?":
    "Are you sure you want to update this incident?",
  "Cuenta dada de baja": "Account deactivated",
  "Incidencia creada en estado pendiente.":
    "Incident created with pending status.",
  "Registrar devolucion": "Record return",
  "Solicitud rechazada": "Request rejected",
  "Se registrará {cantidad} equipo para {sala}, grupo {grupo}, el {fecha}. Verifique los datos antes de continuar.":
    "{cantidad} item of equipment will be recorded for {sala}, group {grupo}, on {fecha}. Check the details before continuing.",
  "Se registrarán {cantidad} equipos para {sala}, grupo {grupo}, el {fecha}. Verifique los datos antes de continuar.":
    "{cantidad} items of equipment will be recorded for {sala}, group {grupo}, on {fecha}. Check the details before continuing.",
  "Se registrará el uso de {sala}, grupo {grupo}, el {fecha}. Verifique los datos antes de continuar.":
    "Use of {sala} will be recorded for group {grupo} on {fecha}. Check the details before continuing.",
  "Espacios del instituto": "Institute spaces",
  "CRUD simple de salones, talleres y laboratorios. La baja es lógica para conservar el historial.":
    "Simple CRUD for classrooms, workshops and laboratories. Deactivation is logical to preserve history.",
  "Nuevo espacio": "New space",
  "Editar espacio": "Edit space",
  Tipo: "Type",
  Laboratorio: "Laboratory",
  Taller: "Workshop",
  Salón: "Classroom",
  Ubicación: "Location",
  Capacidad: "Capacity",
  Ocupado: "Occupied",
  Mantenimiento: "Maintenance",
  Inactivo: "Inactive",
  Guardar: "Save",
  Limpiar: "Clear",
  Espacio: "Space",
  Desactivar: "Deactivate",
  "Desactivar espacio": "Deactivate space",
  "desactivar este espacio": "deactivate this space",
  "cancelar esta tarea": "cancel this task",
  "Espacio registrado.": "Space registered.",
  "Espacio actualizado.": "Space updated.",
  "Espacio desactivado.": "Space deactivated.",
  "Tarea cancelada.": "Task cancelled.",
};

const ESPANOL = Object.fromEntries(
  Object.entries(INGLES).map(([espanol, ingles]) => [ingles, espanol]),
);
const TEXTOS_ORIGINALES = new WeakMap();
const ATRIBUTOS_ORIGINALES = new WeakMap();
const TITULO_ORIGINAL = document.title;

/** Lee preferencias válidas y completa cualquier valor faltante. */
export function obtenerPreferencias() {
  try {
    const guardadas = JSON.parse(
      localStorage.getItem(CLAVE_PREFERENCIAS) || "{}",
    );
    const daltonismoAnterior =
      guardadas.daltonismo === true ? "deuteranopia" : guardadas.daltonismo;
    return {
      idioma: guardadas.idioma === "en" ? "en" : "es",
      tema: guardadas.tema === "oscuro" ? "oscuro" : "claro",
      daltonismo: TIPOS_DALTONISMO.includes(daltonismoAnterior)
        ? daltonismoAnterior
        : "ninguno",
    };
  } catch {
    return { ...PREFERENCIAS_INICIALES };
  }
}

/** Devuelve el idioma activo para vistas y solicitudes HTTP. */
export function obtenerIdioma() {
  return obtenerPreferencias().idioma;
}

/** Devuelve la configuración regional asociada al idioma activo. */
export function obtenerConfiguracionRegional() {
  return obtenerIdioma() === "en" ? "en-GB" : "es-UY";
}

/** Traduce una frase conocida sin modificar contenido escrito por usuarios. */
export function traducir(texto, idioma = obtenerIdioma()) {
  const valor = String(texto ?? "");
  if (idioma === "en") return INGLES[valor] || valor;
  return ESPANOL[valor] || valor;
}

/** Aplica tema, paleta adaptada e idioma al documento. */
function aplicarPreferencias(preferencias) {
  const raiz = document.documentElement;
  raiz.dataset.tema = preferencias.tema;
  raiz.dataset.daltonismo = preferencias.daltonismo;
  raiz.lang = preferencias.idioma;
  raiz.dataset.preferenciasListas = "true";
}

/** Traduce un nodo de texto conservando sus espacios laterales. */
function traducirNodoTexto(nodo, idioma) {
  if (!TEXTOS_ORIGINALES.has(nodo))
    TEXTOS_ORIGINALES.set(nodo, nodo.nodeValue || "");
  const coincidencia = /^(\s*)(.*?)(\s*)$/s.exec(TEXTOS_ORIGINALES.get(nodo));
  if (!coincidencia || !coincidencia[2]) return;
  const traducido = traducir(coincidencia[2], idioma);
  nodo.nodeValue = `${coincidencia[1]}${traducido}${coincidencia[3]}`;
}

/** Recorre contenido estático y dinámico para traducir textos de interfaz. */
function traducirInterfaz(raiz = document.body) {
  if (!raiz) return;
  const idioma = obtenerIdioma();
  const elementos =
    raiz.nodeType === Node.ELEMENT_NODE
      ? [raiz, ...raiz.querySelectorAll("*")]
      : [];
  elementos.forEach((elemento) => {
    if (
      ["SCRIPT", "STYLE", "CODE"].includes(elemento.tagName) ||
      elemento.closest("[data-no-traducir]")
    )
      return;
    [...elemento.childNodes]
      .filter((nodo) => nodo.nodeType === Node.TEXT_NODE)
      .forEach((nodo) => traducirNodoTexto(nodo, idioma));
    ["placeholder", "title", "aria-label"].forEach((atributo) => {
      if (elemento.hasAttribute(atributo)) {
        if (!ATRIBUTOS_ORIGINALES.has(elemento))
          ATRIBUTOS_ORIGINALES.set(elemento, new Map());
        const originales = ATRIBUTOS_ORIGINALES.get(elemento);
        if (!originales.has(atributo))
          originales.set(atributo, elemento.getAttribute(atributo));
        elemento.setAttribute(
          atributo,
          traducir(originales.get(atributo), idioma),
        );
      }
    });
  });
  document.title = traducir(TITULO_ORIGINAL, idioma);
}

/** Guarda una preferencia y actualiza inmediatamente toda la interfaz. */
function guardarPreferencia(clave, valor) {
  const preferencias = { ...obtenerPreferencias(), [clave]: valor };
  localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify(preferencias));
  aplicarPreferencias(preferencias);
  traducirInterfaz();
  actualizarControles(preferencias);
}

/** Mantiene sincronizados los valores visibles del panel. */
function actualizarControles(preferencias) {
  const oscuro = document.getElementById("preferenciaTemaOscuro");
  const daltonismo = document.getElementById("preferenciaDaltonismo");
  if (oscuro) oscuro.checked = preferencias.tema === "oscuro";
  if (daltonismo) daltonismo.value = preferencias.daltonismo;
  document.querySelectorAll("[data-cambiar-idioma]").forEach((boton) => {
    boton.setAttribute(
      "aria-pressed",
      String(boton.dataset.cambiarIdioma === preferencias.idioma),
    );
    boton.classList.toggle(
      "activo",
      boton.dataset.cambiarIdioma === preferencias.idioma,
    );
  });
}

/** Crea el panel global accesible sin duplicar marcado en cada página. */
function crearPanelPreferencias() {
  if (document.getElementById("panelPreferencias")) return;
  const barraNavegacion = document.querySelector(
    "#content > .navbar .container-fluid, #content > .navbar .container, .public-navbar-inner",
  );
  const contenedor = barraNavegacion || document.body;
  contenedor.insertAdjacentHTML(
    "beforeend",
    `
    <div class="preferencias-globales${barraNavegacion ? " en-barra" : ""}">
      <button type="button" id="botonPreferencias" class="boton-preferencias" aria-label="Accesibilidad e idioma" aria-expanded="false" aria-controls="panelPreferencias" title="Accesibilidad e idioma">
        <i class="bi bi-universal-access-circle" aria-hidden="true"></i><span>Accesibilidad e idioma</span>
      </button>
      <section id="panelPreferencias" class="panel-preferencias" aria-label="Ajustes de visualización" hidden>
        <div class="panel-preferencias-cabecera"><strong>Ajustes de visualización</strong><button type="button" id="cerrarPreferencias" class="btn-close" aria-label="Cerrar"></button></div>
        <div class="preferencia-fila"><span>Idioma</span><div class="selector-idioma" role="group" aria-label="Idioma"><button type="button" data-cambiar-idioma="es">ES</button><button type="button" data-cambiar-idioma="en">EN</button></div></div>
        <label class="preferencia-fila" for="preferenciaTemaOscuro"><span>Modo oscuro</span><input id="preferenciaTemaOscuro" type="checkbox" class="form-check-input"></label>
        <label class="preferencia-control" for="preferenciaDaltonismo"><span>Tipo de daltonismo</span><select id="preferenciaDaltonismo" class="form-select form-select-sm"><option value="ninguno">Sin ajuste de color</option><option value="protanopia">Protanopía (tonos rojos)</option><option value="deuteranopia">Deuteranopía (tonos verdes)</option><option value="tritanopia">Tritanopía (tonos azul y amarillo)</option><option value="acromatopsia">Acromatopsia (sin color)</option></select></label>
        <button type="button" id="restablecerPreferencias" class="btn btn-outline-secondary btn-sm w-100">Restablecer preferencias</button>
      </section>
    </div>`,
  );

  const panel = document.getElementById("panelPreferencias");
  const boton = document.getElementById("botonPreferencias");
  const alternar = (mostrar) => {
    panel.hidden = !mostrar;
    boton.setAttribute("aria-expanded", String(mostrar));
  };
  boton.addEventListener("click", () => alternar(panel.hidden));
  document
    .getElementById("cerrarPreferencias")
    .addEventListener("click", () => alternar(false));
  document
    .querySelectorAll("[data-cambiar-idioma]")
    .forEach((control) =>
      control.addEventListener("click", () =>
        guardarPreferencia("idioma", control.dataset.cambiarIdioma),
      ),
    );
  document
    .getElementById("preferenciaTemaOscuro")
    .addEventListener("change", (evento) =>
      guardarPreferencia("tema", evento.target.checked ? "oscuro" : "claro"),
    );
  document
    .getElementById("preferenciaDaltonismo")
    .addEventListener("change", (evento) =>
      guardarPreferencia("daltonismo", evento.target.value),
    );
  document
    .getElementById("restablecerPreferencias")
    .addEventListener("click", () => {
      localStorage.setItem(
        CLAVE_PREFERENCIAS,
        JSON.stringify(PREFERENCIAS_INICIALES),
      );
      aplicarPreferencias(PREFERENCIAS_INICIALES);
      traducirInterfaz();
      actualizarControles(PREFERENCIAS_INICIALES);
    });
}

/** Inicializa preferencias, traducción y observación de contenido dinámico. */
export function iniciarPreferencias() {
  const preferencias = obtenerPreferencias();
  aplicarPreferencias(preferencias);
  crearPanelPreferencias();
  traducirInterfaz();
  actualizarControles(preferencias);
  const observador = new MutationObserver((cambios) =>
    cambios.forEach((cambio) =>
      cambio.addedNodes.forEach((nodo) => {
        if (nodo.nodeType === Node.TEXT_NODE)
          traducirNodoTexto(nodo, obtenerIdioma());
        if (nodo.nodeType === Node.ELEMENT_NODE) traducirInterfaz(nodo);
      }),
    ),
  );
  observador.observe(document.body, { childList: true, subtree: true });
}

aplicarPreferencias(obtenerPreferencias());
