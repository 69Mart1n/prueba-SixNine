# SGRSI Con XAMPP

Sistema de gestion de recursos, soporte e incidencias para Coordinadores, Tecnicos y Solicitantes/Docentes.

## Requisitos

- XAMPP con Apache, PHP 8.0 o posterior y MySQL.
- Composer, necesario para instalar PHPMailer y enviar recuperaciones por SMTP.
- La base `sgrsi` importada en phpMyAdmin.
- Un archivo `.env` local basado en `.env.example`.

## Iniciar El Sistema

1. Abrir el panel de XAMPP.
2. Iniciar Apache y MySQL.
3. Abrir phpMyAdmin en `http://127.0.0.1/phpmyadmin`.
4. Confirmar que existe la base `sgrsi` y que contiene 21 tablas.
5. Desde la raiz del proyecto, iniciar el servidor de desarrollo:

```powershell
C:\xampp\php\php.exe -S 127.0.0.1:8001 -t C:\ruta\al\proyecto\SixNine-Systems-main
```

6. Abrir la aplicacion en `http://127.0.0.1:8001/Vista/index.html`.

Si el proyecto se copia dentro de `C:\xampp\htdocs`, tambien puede abrirse con Apache en `http://127.0.0.1/SixNine-Systems-main/Vista/index.html`.

El estado de la conexion se comprueba en:

```text
http://127.0.0.1:8001/Controlador/api.php/health
```

La respuesta correcta contiene `"status":"success"` y `"database":"available"`.

## Importar La Base En XAMPP

El repositorio incluye el archivo descargable [database/sgrsi_demo_xampp.sql](database/sgrsi_demo_xampp.sql), preparado con estructura y datos ficticios para la demostracion.

Usar esta opcion solamente para una instalacion nueva o para restablecer el entorno de pruebas. La importacion reemplaza las tablas y sus datos actuales:

1. Entrar a phpMyAdmin en `http://127.0.0.1/phpmyadmin`.
2. Seleccionar la pestana **Importar**. No es necesario crear previamente la base de datos.
3. Elegir el archivo `database/sgrsi_demo_xampp.sql` descargado junto con el proyecto.
4. Mantener el formato SQL y ejecutar la importacion.
5. Seleccionar `sgrsi` en el panel izquierdo y confirmar que contiene 21 tablas.

El archivo crea la base `sgrsi` si no existe, usa `utf8mb4` y deja cada cuenta de prueba con un solo rol. El aviso `#1007 la base de datos ya existe` no impide la importacion. Antes de reemplazar una instalacion con datos reales se debe exportar un respaldo desde phpMyAdmin.

## Configuracion Local

El `.env` de XAMPP utiliza:

```dotenv
APP_ENV=development
APP_DEBUG=false
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=sgrsi
DB_USER=root
DB_PASSWORD=
```

Estas credenciales son solo para desarrollo local. En Ubuntu o produccion se debe usar un usuario MySQL dedicado con una clave segura.

## Recuperacion De Contrasena

1. Instalar las dependencias desde la raiz del proyecto:

```powershell
composer install
```

2. Copiar `.env.example` como `.env` y configurar `APP_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_CIFRADO`, `SMTP_USUARIO`, `SMTP_CONTRASENA`, `SMTP_REMITENTE` y `SMTP_NOMBRE_REMITENTE`.
3. En una instalacion existente, ejecutar una sola vez `database/migrations/20260902_recuperacion_y_fotos.sql`. Una instalacion nueva ya incluye las tablas y columnas necesarias en `database/sgrsi_demo_xampp.sql`.

Los enlaces duran 30 minutos, se consumen una sola vez y se limitan a tres solicitudes cada 15 minutos por cuenta. La API devuelve la misma respuesta tanto para correos registrados como para correos inexistentes.

## Evidencia Fotografica

Configurar `RUTA_ARCHIVOS_RESOLUCIONES` con un directorio persistente que no sea publico y conceder permisos de escritura al proceso de Apache. En XAMPP para Windows se puede usar:

```dotenv
RUTA_ARCHIVOS_RESOLUCIONES=C:\xampp\sgrsi-datos\resoluciones
```

La resolucion de una incidencia admite una imagen opcional JPG, JPEG, PNG o WebP de hasta 5 MB. Los archivos se guardan con nombres aleatorios y solo se entregan mediante un endpoint autenticado al solicitante propietario o al personal tecnico/administrador.

## Idioma Y Accesibilidad

Todas las pantallas incorporan el control **Accesibilidad e idioma**. Permite elegir espanol o ingles, modo oscuro, paleta apta para daltonismo y saturacion entre 0 % y 200 %. Las preferencias se conservan en el navegador mediante `localStorage` y no modifican la cuenta del usuario.

## Credenciales Predeterminadas De Prueba

| Perfil | Correo | Clave | Rol activo en el SQL |
| --- | --- | --- | --- |
| Administrador | `admin@sgrsi.test` | `Admin1234` | Administrador |
| Tecnico | `tecnico@sgrsi.test` | `Tecnico1234` | Tecnico |
| Docente | `docente@sgrsi.test` | `Docente1234` | Solicitante / Docente |

Estas credenciales son ficticias y deben utilizarse unicamente en el entorno local de demostracion.

## Como Se Guardan Los Roles

- `usuarios` conserva una sola cuenta por persona.
- `usuarios_roles` contiene todos sus roles y el estado de cada uno.
- `administradores`, `tecnicos` y `solicitantes` contienen los datos particulares de cada perfil.
- En el SQL de demostracion cada usuario tiene exactamente un rol. El sistema conserva la posibilidad de solicitar otro rol desde la aplicacion para pruebas posteriores.

Los nuevos usuarios, tickets, prestamos y solicitudes deben cargarse normalmente desde la aplicacion. phpMyAdmin queda reservado para respaldo, revision y mantenimiento.
