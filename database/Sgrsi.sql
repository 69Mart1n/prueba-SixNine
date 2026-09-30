-- ============================================================
-- SGRSI - Base de datos de demostración para XAMPP
-- Archivo autónomo para importar desde phpMyAdmin
-- Instalación completa: 24 tablas y datos ficticios de prueba.
-- Importar en una base nueva o después de respaldar la instalación existente:
-- este archivo recrea las tablas de SGRSI y reemplaza sus datos.
--
-- Datos ficticios para pruebas académicas y demostración.
-- Credenciales principales de prueba:
--   Administrador: admin@sgrsi.test / Admin1234
--   Técnico:       tecnico@sgrsi.test / Tecnico1234
--   Docente:       docente@sgrsi.test / Docente1234
-- Las demás cuentas de demostración conservan la contraseña: Sgrsi2026!
--
-- Incluye estados variados para probar:
-- usuarios pendientes/bloqueados/rechazados, con un solo rol por cuenta,
-- incidencias, solicitudes, inventario, préstamos, blacklist,
-- uso de salas, tareas, reportes, historial y auditoría.
-- ============================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `sgrsi`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `sgrsi`;

-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: sgrsi
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `administradores`
--

DROP TABLE IF EXISTS `administradores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `administradores` (
  `id_usuario` int(10) unsigned NOT NULL,
  `nivel_acceso` varchar(50) NOT NULL,
  PRIMARY KEY (`id_usuario`),
  CONSTRAINT `fk_administradores_usuarios` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_administradores_nivel` CHECK (`nivel_acceso` in ('basico','general','superadministrador'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `administradores`
--

LOCK TABLES `administradores` WRITE;
/*!40000 ALTER TABLE `administradores` DISABLE KEYS */;
INSERT INTO `administradores` VALUES
(1,'general');
/*!40000 ALTER TABLE `administradores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auditoria`
--

DROP TABLE IF EXISTS `auditoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auditoria` (
  `id_auditoria` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_usuario` int(10) unsigned DEFAULT NULL,
  `modulo` varchar(40) NOT NULL,
  `accion` varchar(50) NOT NULL,
  `entidad` varchar(50) NOT NULL,
  `id_entidad` bigint(20) unsigned DEFAULT NULL,
  `datos_anteriores` longtext DEFAULT NULL,
  `datos_nuevos` longtext DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_auditoria`),
  KEY `idx_auditoria_modulo_fecha` (`modulo`,`fecha`),
  KEY `idx_auditoria_entidad` (`entidad`,`id_entidad`),
  KEY `idx_auditoria_usuario` (`id_usuario`),
  CONSTRAINT `fk_auditoria_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_auditoria_datos_anteriores` CHECK (`datos_anteriores` is null or json_valid(`datos_anteriores`)),
  CONSTRAINT `chk_auditoria_datos_nuevos` CHECK (`datos_nuevos` is null or json_valid(`datos_nuevos`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auditoria`
--

LOCK TABLES `auditoria` WRITE;
/*!40000 ALTER TABLE `auditoria` DISABLE KEYS */;
INSERT INTO `auditoria` VALUES
(1,1,'usuarios','aprobar','usuario',4,NULL,'{"estado": "activo", "rol": "solicitante"}','2026-08-02 10:00:00'),
(2,1,'usuarios','rechazar','usuario',9,'{"estado": "pendiente"}','{"estado": "rechazado"}','2026-08-20 16:30:00'),
(3,2,'incidencias','cambiar_estado','ticket',2,'{"estado": "pendiente", "prioridad": "sin_asignar"}','{"estado": "en_proceso", "prioridad": "alta"}','2026-08-23 14:20:00'),
(4,3,'incidencias','resolver','ticket',3,'{"estado": "en_proceso"}','{"estado": "resuelta"}','2026-08-20 19:05:00'),
(5,1,'solicitudes','aprobar','solicitud',2,'{"estado": "pendiente"}','{"estado": "aprobada"}','2026-08-22 10:00:00'),
(6,2,'prestamos','entregar','prestamo',3,'{"estado": "aprobado"}','{"estado": "entregado", "equipo": "prestado"}','2026-08-22 09:00:00'),
(7,3,'prestamos','devolver','prestamo',6,'{"estado": "atrasado"}','{"estado": "devuelto", "condicion": "danado"}','2026-08-18 15:30:00'),
(8,1,'tareas','crear','tarea',1,NULL,'{"estado": "pendiente", "tipo": "preventiva"}','2026-08-23 08:30:00');
/*!40000 ALTER TABLE `auditoria` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blacklist_estudiantes`
--

DROP TABLE IF EXISTS `blacklist_estudiantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blacklist_estudiantes` (
  `id_blacklist` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_prestamo` int(10) unsigned NOT NULL,
  `id_solicitante` int(10) unsigned NOT NULL,
  `nombre_estudiante` varchar(120) NOT NULL,
  `cedula_estudiante` varchar(12) NOT NULL,
  `grupo` varchar(50) NOT NULL,
  `docente_asociado` varchar(180) NOT NULL,
  `motivo` text NOT NULL,
  `dias_atraso` smallint(5) unsigned NOT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'activo',
  `fecha_ingreso` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_salida` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_blacklist`),
  UNIQUE KEY `uq_blacklist_prestamo` (`id_prestamo`),
  KEY `idx_blacklist_cedula_estado` (`cedula_estudiante`,`estado`),
  KEY `idx_blacklist_solicitante` (`id_solicitante`),
  CONSTRAINT `fk_blacklist_prestamos` FOREIGN KEY (`id_prestamo`) REFERENCES `prestamos` (`id_prestamo`) ON UPDATE CASCADE,
  CONSTRAINT `fk_blacklist_solicitantes` FOREIGN KEY (`id_solicitante`) REFERENCES `solicitantes` (`id_usuario`) ON UPDATE CASCADE,
  CONSTRAINT `chk_blacklist_estado` CHECK (`estado` in ('activo','regularizado'))
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blacklist_estudiantes`
--

LOCK TABLES `blacklist_estudiantes` WRITE;
/*!40000 ALTER TABLE `blacklist_estudiantes` DISABLE KEYS */;
INSERT INTO `blacklist_estudiantes` VALUES
(1,4,4,'Agustin Sosa','51010004','3BI','Lucia Rodriguez','Préstamo vencido con más de siete días de atraso.',15,'activo','2026-08-15 08:00:00',NULL),
(2,6,6,'Lucas Ferreira','51010006','3BD','Camila Acosta','El equipo permaneció sin devolución durante más de siete días.',11,'regularizado','2026-08-15 08:00:00','2026-08-18 15:30:00');
/*!40000 ALTER TABLE `blacklist_estudiantes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categorias_incidencia`
--

DROP TABLE IF EXISTS `categorias_incidencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categorias_incidencia` (
  `id_categoria` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'activa',
  PRIMARY KEY (`id_categoria`),
  UNIQUE KEY `uq_categorias_nombre` (`nombre`),
  CONSTRAINT `chk_categorias_estado` CHECK (`estado` in ('activa','inactiva'))
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias_incidencia`
--

LOCK TABLES `categorias_incidencia` WRITE;
/*!40000 ALTER TABLE `categorias_incidencia` DISABLE KEYS */;
INSERT INTO `categorias_incidencia` VALUES
(1,'Hardware','Fallas físicas de equipos, periféricos o componentes','activa'),
(2,'Software','Problemas de aplicaciones, controladores o sistema operativo','activa'),
(3,'Red','Problemas de conectividad, cableado o acceso a la red','activa'),
(4,'Acceso','Problemas de usuarios, permisos o credenciales','activa'),
(5,'Periféricos','Fallas en mouse, teclado, monitor, proyector u otros periféricos','activa'),
(6,'Otro','Incidencias que no pertenecen a las categorías anteriores','activa'),
(7,'Impresión','Problemas con impresoras, tóner, colas o documentos atascados','activa'),
(8,'Audio y proyección','Fallas de proyectores, pantallas, parlantes o conexiones HDMI','activa'),
(9,'Energía eléctrica','Falta de alimentación, cargadores, UPS o tomas eléctricas','activa'),
(10,'Seguridad informática','Alertas de malware, accesos sospechosos o equipos comprometidos','activa'),
(11,'Plataformas educativas','Problemas de acceso o funcionamiento de aulas y servicios educativos','activa');
/*!40000 ALTER TABLE `categorias_incidencia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipos`
--

DROP TABLE IF EXISTS `equipos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `equipos` (
  `id_equipo` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_espacio_actual` int(10) unsigned DEFAULT NULL,
  `id_tecnico_responsable` int(10) unsigned DEFAULT NULL,
  `codigo_inventario` varchar(50) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo` varchar(80) NOT NULL,
  `es_prestable` tinyint(1) NOT NULL DEFAULT 0,
  `es_archivado` tinyint(1) NOT NULL DEFAULT 0,
  `estado` varchar(30) NOT NULL DEFAULT 'disponible',
  `ubicacion_detalle` varchar(150) DEFAULT NULL,
  `fecha_alta` date NOT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_equipo`),
  UNIQUE KEY `uq_equipos_codigo_inventario` (`codigo_inventario`),
  KEY `idx_equipos_espacio` (`id_espacio_actual`),
  KEY `idx_equipos_tecnico` (`id_tecnico_responsable`),
  KEY `idx_equipos_estado` (`estado`),
  KEY `idx_equipos_tipo` (`tipo`),
  CONSTRAINT `fk_equipos_espacios` FOREIGN KEY (`id_espacio_actual`) REFERENCES `espacios` (`id_espacio`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_equipos_tecnicos` FOREIGN KEY (`id_tecnico_responsable`) REFERENCES `tecnicos` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_equipos_estado` CHECK (`estado` in ('disponible','prestado','en_reparacion','fuera_de_servicio','baja'))
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipos`
--

LOCK TABLES `equipos` WRITE;
/*!40000 ALTER TABLE `equipos` DISABLE KEYS */;
INSERT INTO `equipos` (`id_equipo`, `id_espacio_actual`, `id_tecnico_responsable`, `codigo_inventario`, `nombre`, `tipo`, `estado`, `ubicacion_detalle`, `fecha_alta`, `fecha_creacion`, `fecha_actualizacion`) VALUES
(1,1,NULL,'LAB1-PC01','PC Laboratorio 1 - 01','PC','disponible','Puesto 01','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(2,1,NULL,'LAB1-PC02','PC Laboratorio 1 - 02','PC','disponible','Puesto 02','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(3,1,NULL,'LAB1-PC03','PC Laboratorio 1 - 03','PC','disponible','Puesto 03','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(4,1,NULL,'LAB1-PC04','PC Laboratorio 1 - 04','PC','disponible','Puesto 04','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(5,2,NULL,'LAB2-PC01','PC Laboratorio 2 - 01','PC','disponible','Puesto 01','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(6,2,NULL,'LAB2-PC02','PC Laboratorio 2 - 02','PC','disponible','Puesto 02','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(7,2,NULL,'LAB2-PC03','PC Laboratorio 2 - 03','PC','disponible','Puesto 03','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(8,2,NULL,'LAB2-PC04','PC Laboratorio 2 - 04','PC','disponible','Puesto 04','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(9,3,NULL,'LAB3-PC01','PC Laboratorio 3 - 01','PC','disponible','Puesto 01','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(10,3,NULL,'LAB3-PC02','PC Laboratorio 3 - 02','PC','disponible','Puesto 02','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(11,3,NULL,'LAB3-PC03','PC Laboratorio 3 - 03','PC','disponible','Puesto 03','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(12,3,NULL,'LAB3-PC04','PC Laboratorio 3 - 04','PC','disponible','Puesto 04','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(13,4,NULL,'LAB4-PC01','PC Laboratorio 4 - 01','PC','disponible','Puesto 01','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(14,4,NULL,'LAB4-PC02','PC Laboratorio 4 - 02','PC','disponible','Puesto 02','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(15,4,NULL,'LAB4-PC03','PC Laboratorio 4 - 03','PC','disponible','Puesto 03','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(16,4,NULL,'LAB4-PC04','PC Laboratorio 4 - 04','PC','disponible','Puesto 04','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(17,5,NULL,'LAB5-PC01','PC Laboratorio 5 - 01','PC','disponible','Puesto 01','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(18,5,NULL,'LAB5-PC02','PC Laboratorio 5 - 02','PC','disponible','Puesto 02','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(19,5,NULL,'LAB5-PC03','PC Laboratorio 5 - 03','PC','disponible','Puesto 03','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(20,5,NULL,'LAB5-PC04','PC Laboratorio 5 - 04','PC','disponible','Puesto 04','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(21,6,NULL,'LAB6-PC01','PC Laboratorio 6 - 01','PC','disponible','Puesto 01','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(22,6,3,'LAB6-PC02','PC Laboratorio 6 - 02','PC','en_reparacion','Puesto 02','2026-08-01','2026-08-01 08:00:00','2026-08-23 16:00:00'),
(23,6,NULL,'LAB6-PC03','PC Laboratorio 6 - 03','PC','disponible','Puesto 03','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(24,6,NULL,'LAB6-PC04','PC Laboratorio 6 - 04','PC','disponible','Puesto 04','2026-08-01','2026-08-01 08:00:00','2026-08-01 08:00:00'),
(25,1,NULL,'LAB1-PROY-01','Proyector Laboratorio 1','Proyector','disponible','Techo - frente del salón','2026-08-01','2026-08-01 08:00:00','2026-08-19 12:00:00'),
(26,3,3,'LAB3-PROY-01','Proyector Laboratorio 3','Proyector','en_reparacion','Taller de Soporte','2026-08-01','2026-08-01 08:00:00','2026-08-23 16:30:00'),
(27,7,NULL,'PREST-NB-01','Notebook de préstamo 01','Notebook','disponible','Armario de préstamos A','2026-08-01','2026-08-01 08:00:00','2026-08-10 17:00:00'),
(28,7,2,'PREST-NB-02','Notebook de préstamo 02','Notebook','prestado','En préstamo','2026-08-01','2026-08-01 08:00:00','2026-08-22 09:00:00'),
(29,7,2,'PREST-NB-03','Notebook de préstamo 03','Notebook','prestado','En préstamo atrasado','2026-08-01','2026-08-01 08:00:00','2026-08-12 09:00:00'),
(30,7,3,'PREST-TAB-01','Tablet de préstamo 01','Tablet','en_reparacion','Taller de Soporte','2026-08-01','2026-08-01 08:00:00','2026-08-18 15:30:00'),
(31,2,2,'LAB2-SW-01','Switch principal Laboratorio 2','Switch','disponible','Rack de comunicaciones','2026-08-01','2026-08-01 08:00:00','2026-08-23 14:20:00'),
(32,5,2,'LAB5-AP-01','Punto de acceso Laboratorio 5','Access Point','disponible','Techo - centro del laboratorio','2026-08-01','2026-08-01 08:00:00','2026-08-16 10:00:00'),
(33,7,NULL,'IMP-LEG-01','Impresora láser antigua','Impresora','baja','Depósito técnico','2025-03-15','2025-03-15 10:00:00','2026-08-12 11:00:00'),
(34,7,NULL,'PREST-NB-04','Notebook de préstamo 04','Notebook','disponible','Armario de préstamos B','2026-08-05','2026-08-05 09:00:00','2026-08-22 15:00:00');
UPDATE `equipos` SET `es_prestable` = 1 WHERE `tipo` = 'Notebook';
/*!40000 ALTER TABLE `equipos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `espacios`
--

DROP TABLE IF EXISTS `espacios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `espacios` (
  `id_espacio` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tipo` varchar(30) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `ubicacion` varchar(150) NOT NULL,
  `capacidad` smallint(5) unsigned DEFAULT NULL,
  `estado` varchar(30) NOT NULL DEFAULT 'disponible',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_espacio`),
  UNIQUE KEY `uq_espacios_tipo_nombre` (`tipo`,`nombre`),
  KEY `idx_espacios_tipo_estado` (`tipo`,`estado`),
  CONSTRAINT `chk_espacios_tipo` CHECK (`tipo` in ('salon','taller','laboratorio')),
  CONSTRAINT `chk_espacios_estado` CHECK (`estado` in ('disponible','ocupado','mantenimiento','inactivo')),
  CONSTRAINT `chk_espacios_capacidad` CHECK (`capacidad` is null or `capacidad` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `espacios`
--

LOCK TABLES `espacios` WRITE;
/*!40000 ALTER TABLE `espacios` DISABLE KEYS */;
INSERT INTO `espacios` VALUES
(1,'laboratorio','Laboratorio 1','Planta baja - ala norte',16,'disponible','2026-08-01 08:00:00','2026-08-23 08:00:00'),
(2,'laboratorio','Laboratorio 2','Planta baja - ala sur',16,'disponible','2026-08-01 08:00:00','2026-08-23 08:00:00'),
(3,'laboratorio','Laboratorio 3','Primer piso - ala norte',16,'disponible','2026-08-01 08:00:00','2026-08-23 08:00:00'),
(4,'laboratorio','Laboratorio 4','Primer piso - ala sur',16,'disponible','2026-08-01 08:00:00','2026-08-23 08:00:00'),
(5,'laboratorio','Laboratorio 5','Segundo piso - ala norte',16,'disponible','2026-08-01 08:00:00','2026-08-23 08:00:00'),
(6,'laboratorio','Laboratorio 6','Segundo piso - ala sur',16,'mantenimiento','2026-08-01 08:00:00','2026-08-23 16:00:00'),
(7,'taller','Taller de Soporte','Planta baja - sector técnico',12,'disponible','2026-08-01 08:00:00','2026-08-23 08:00:00');
/*!40000 ALTER TABLE `espacios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `historial_equipos`
--

DROP TABLE IF EXISTS `historial_equipos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `historial_equipos` (
  `id_historial` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_equipo` int(10) unsigned NOT NULL,
  `id_usuario_responsable` int(10) unsigned DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  `tipo_movimiento` varchar(30) NOT NULL,
  `descripcion` text NOT NULL,
  PRIMARY KEY (`id_historial`),
  KEY `idx_historial_equipo_fecha` (`id_equipo`,`fecha`),
  KEY `idx_historial_usuario` (`id_usuario_responsable`),
  KEY `idx_historial_tipo` (`tipo_movimiento`),
  CONSTRAINT `fk_historial_equipos` FOREIGN KEY (`id_equipo`) REFERENCES `equipos` (`id_equipo`) ON UPDATE CASCADE,
  CONSTRAINT `fk_historial_usuarios` FOREIGN KEY (`id_usuario_responsable`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_historial_tipo` CHECK (`tipo_movimiento` in ('alta','cambio_estado','prestamo','devolucion','diagnostico','mantenimiento','traslado','baja'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_equipos`
--

LOCK TABLES `historial_equipos` WRITE;
/*!40000 ALTER TABLE `historial_equipos` DISABLE KEYS */;
INSERT INTO `historial_equipos` VALUES
(1,27,1,'2026-08-01 08:00:00','alta','Alta de Notebook de préstamo 01 en el inventario.'),
(2,27,2,'2026-08-08 13:30:00','prestamo','Equipo entregado a Martina Costa por préstamo registrado.'),
(3,27,2,'2026-08-10 17:00:00','devolucion','Equipo devuelto en buen estado y marcado nuevamente como disponible.'),
(4,28,2,'2026-08-22 09:00:00','prestamo','Notebook entregada a Valentina Ruiz; estado actualizado a prestado.'),
(5,29,2,'2026-08-05 08:30:00','prestamo','Notebook entregada a Agustin Sosa.'),
(6,29,2,'2026-08-09 08:00:00','cambio_estado','Préstamo vencido; el recurso continúa en estado prestado.'),
(7,30,3,'2026-08-18 15:30:00','devolucion','Tablet devuelta con daño en el conector de carga.'),
(8,30,3,'2026-08-18 15:35:00','cambio_estado','Equipo marcado en reparación después de la devolución.'),
(9,26,3,'2026-08-23 16:30:00','mantenimiento','Proyector trasladado al taller por apagado asociado a temperatura.'),
(10,33,1,'2026-08-12 11:00:00','baja','Impresora dada de baja por obsolescencia y falta de repuestos.');
/*!40000 ALTER TABLE `historial_equipos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `prestamos`
--

DROP TABLE IF EXISTS `prestamos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `prestamos` (
  `id_prestamo` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_solicitante` int(10) unsigned NOT NULL,
  `id_equipo` int(10) unsigned NOT NULL,
  `recurso_solicitado` varchar(150) NOT NULL,
  `nombre_estudiante` varchar(120) NOT NULL,
  `cedula_estudiante` varchar(12) NOT NULL,
  `grupo` varchar(50) NOT NULL,
  `motivo` text NOT NULL,
  `fecha_prestamo` date NOT NULL,
  `fecha_devolucion_prevista` date NOT NULL,
  `fecha_entrega_real` datetime DEFAULT NULL,
  `fecha_devolucion_real` date DEFAULT NULL,
  `id_tecnico_entrega` int(10) unsigned DEFAULT NULL,
  `id_tecnico_devolucion` int(10) unsigned DEFAULT NULL,
  `condicion_devolucion` varchar(20) DEFAULT NULL,
  `observaciones_devolucion` text DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'solicitado',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_prestamo`),
  UNIQUE KEY `uq_prestamos_estudiante_recurso_fecha` (`cedula_estudiante`,`recurso_solicitado`,`fecha_prestamo`),
  KEY `idx_prestamos_solicitante` (`id_solicitante`),
  KEY `idx_prestamos_equipo` (`id_equipo`),
  KEY `idx_prestamos_estado` (`estado`),
  KEY `idx_prestamos_fechas` (`fecha_prestamo`,`fecha_devolucion_prevista`),
  KEY `fk_prestamos_tecnico_entrega` (`id_tecnico_entrega`),
  KEY `fk_prestamos_tecnico_devolucion` (`id_tecnico_devolucion`),
  CONSTRAINT `fk_prestamos_equipos` FOREIGN KEY (`id_equipo`) REFERENCES `equipos` (`id_equipo`) ON UPDATE CASCADE,
  CONSTRAINT `fk_prestamos_solicitantes` FOREIGN KEY (`id_solicitante`) REFERENCES `solicitantes` (`id_usuario`) ON UPDATE CASCADE,
  CONSTRAINT `fk_prestamos_tecnico_devolucion` FOREIGN KEY (`id_tecnico_devolucion`) REFERENCES `tecnicos` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_prestamos_tecnico_entrega` FOREIGN KEY (`id_tecnico_entrega`) REFERENCES `tecnicos` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_prestamos_estado` CHECK (`estado` in ('solicitado','aprobado','entregado','devuelto','atrasado','rechazado','cancelado')),
  CONSTRAINT `chk_prestamos_fechas` CHECK (`fecha_devolucion_prevista` >= `fecha_prestamo`),
  CONSTRAINT `chk_prestamos_devolucion_real` CHECK (`fecha_devolucion_real` is null or `fecha_devolucion_real` >= `fecha_prestamo`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prestamos`
--

LOCK TABLES `prestamos` WRITE;
/*!40000 ALTER TABLE `prestamos` DISABLE KEYS */;
INSERT INTO `prestamos` VALUES
(1,4,27,'Notebook de préstamo 01','Sofia Nunez','51010001','3BI','Presentación de proyecto','2026-08-26','2026-08-28',NULL,NULL,NULL,NULL,NULL,NULL,'solicitado','2026-08-23 09:20:00','2026-08-23 09:20:00'),
(2,5,34,'Notebook de préstamo 04','Mateo Pereira','51010002','2BA','Práctica de redes','2026-08-25','2026-08-27',NULL,NULL,NULL,NULL,NULL,NULL,'aprobado','2026-08-22 14:00:00','2026-08-22 15:00:00'),
(3,6,28,'Notebook de préstamo 02','Valentina Ruiz','51010003','3BD','Trabajo de bases de datos','2026-08-22','2026-08-25','2026-08-22 09:00:00',NULL,2,NULL,NULL,NULL,'entregado','2026-08-21 16:00:00','2026-08-22 09:00:00'),
(4,4,29,'Notebook de préstamo 03','Agustin Sosa','51010004','3BI','Presentación de proyecto','2026-08-05','2026-08-08','2026-08-05 08:30:00',NULL,2,NULL,NULL,NULL,'atrasado','2026-08-04 12:00:00','2026-08-23 08:00:00'),
(5,5,27,'Notebook de préstamo 01','Martina Costa','51010005','2BA','Actividad de aula','2026-08-08','2026-08-10','2026-08-08 13:30:00','2026-08-10',2,2,'bueno','Devuelto completo y sin observaciones.','devuelto','2026-08-07 15:00:00','2026-08-10 17:00:00'),
(6,6,30,'Tablet de préstamo 01','Lucas Ferreira','51010006','3BD','Registro audiovisual de una exposición','2026-08-06','2026-08-07','2026-08-06 17:30:00','2026-08-18',3,3,'danado','Se devolvió con el conector de carga flojo; pasó a reparación.','devuelto','2026-08-05 16:00:00','2026-08-18 15:30:00'),
(7,4,34,'Notebook de préstamo 04','Federico Morales','51010007','3BI','Trabajo práctico fuera del laboratorio','2026-08-12','2026-08-13',NULL,NULL,NULL,NULL,NULL,'Equipo reservado para otra actividad.','rechazado','2026-08-11 10:00:00','2026-08-11 14:00:00');
/*!40000 ALTER TABLE `prestamos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registros_uso_equipos`
--

DROP TABLE IF EXISTS `registros_uso_equipos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `registros_uso_equipos` (
  `id_registro_equipo` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_registro` int(10) unsigned NOT NULL,
  `id_equipo` int(10) unsigned NOT NULL,
  `nombre_alumno` varchar(120) DEFAULT NULL,
  `estado_reportado` varchar(40) NOT NULL,
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id_registro_equipo`),
  UNIQUE KEY `uq_registros_uso_equipos_registro_equipo` (`id_registro`,`id_equipo`),
  KEY `idx_registros_uso_equipos_equipo` (`id_equipo`),
  CONSTRAINT `fk_registros_uso_equipos_equipos` FOREIGN KEY (`id_equipo`) REFERENCES `equipos` (`id_equipo`) ON UPDATE CASCADE,
  CONSTRAINT `fk_registros_uso_equipos_registros` FOREIGN KEY (`id_registro`) REFERENCES `registros_uso_sala` (`id_registro`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_registros_uso_equipos_estado` CHECK (`estado_reportado` in ('libre','ocupado','observado','danado'))
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registros_uso_equipos`
--

LOCK TABLES `registros_uso_equipos` WRITE;
/*!40000 ALTER TABLE `registros_uso_equipos` DISABLE KEYS */;
INSERT INTO `registros_uso_equipos` VALUES
(1,1,1,'Joaquin Perez','ocupado','Sin observaciones'),
(2,1,2,'Sofia Nunez','ocupado','Sin observaciones'),
(3,1,3,'Federico Morales','ocupado','Mouse con desgaste leve, funciona correctamente'),
(4,1,4,'Martina Costa','ocupado',NULL),
(5,2,5,'Mateo Pereira','ocupado','Sin observaciones'),
(6,2,6,'Valentina Ruiz','ocupado','Sin observaciones'),
(7,2,7,'Agustin Sosa','ocupado','Cable de red revisado durante la clase'),
(8,2,8,'Lucas Ferreira','ocupado',NULL),
(9,3,9,'Camila Torres','ocupado','Sin observaciones'),
(10,3,10,'Bruno Garcia','observado','Aplicación MySQL Workbench no iniciaba'),
(11,3,11,'Julieta Mendez','ocupado',NULL),
(12,3,12,'Thiago Rodriguez','ocupado','Sin observaciones'),
(13,4,17,'Sofia Nunez','ocupado','Sin observaciones'),
(14,4,18,'Joaquin Perez','ocupado','Sin observaciones'),
(15,4,19,'Martina Costa','ocupado','Sin observaciones'),
(16,4,20,'Federico Morales','ocupado',NULL),
(17,5,21,'Mateo Pereira','ocupado','Sin observaciones'),
(18,5,22,'Valentina Ruiz','ocupado','Sin observaciones'),
(19,5,23,'Agustin Sosa','ocupado',NULL),
(20,5,24,'Lucas Ferreira','ocupado','Sin observaciones');
/*!40000 ALTER TABLE `registros_uso_equipos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registros_uso_sala`
--

DROP TABLE IF EXISTS `registros_uso_sala`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `registros_uso_sala` (
  `id_registro` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_solicitante` int(10) unsigned NOT NULL,
  `id_espacio` int(10) unsigned NOT NULL,
  `fecha` date NOT NULL,
  `hora_entrada` time NOT NULL,
  `hora_salida` time NOT NULL,
  `grupo` varchar(50) NOT NULL,
  `taller_curso` varchar(100) NOT NULL,
  `asignatura` varchar(100) NOT NULL,
  `docente` varchar(120) NOT NULL,
  `turno` varchar(20) NOT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_registro`),
  KEY `idx_registros_solicitante` (`id_solicitante`),
  KEY `idx_registros_espacio_fecha` (`id_espacio`,`fecha`),
  CONSTRAINT `fk_registros_espacios` FOREIGN KEY (`id_espacio`) REFERENCES `espacios` (`id_espacio`) ON UPDATE CASCADE,
  CONSTRAINT `fk_registros_solicitantes` FOREIGN KEY (`id_solicitante`) REFERENCES `solicitantes` (`id_usuario`) ON UPDATE CASCADE,
  CONSTRAINT `chk_registros_turno` CHECK (`turno` in ('matutino','vespertino','nocturno')),
  CONSTRAINT `chk_registros_horas` CHECK (`hora_salida` > `hora_entrada`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registros_uso_sala`
--

LOCK TABLES `registros_uso_sala` WRITE;
/*!40000 ALTER TABLE `registros_uso_sala` DISABLE KEYS */;
INSERT INTO `registros_uso_sala` VALUES
(1,4,1,'2026-08-18','08:00:00','10:00:00','3BI','Bachillerato de Informática','Programación','Lucia Rodriguez','matutino','Clase práctica de desarrollo web.','2026-08-18 10:05:00'),
(2,5,2,'2026-08-19','14:00:00','16:00:00','2BA','Bachillerato de Informática','Redes','Martin Silva','vespertino','Práctica de configuración de red local.','2026-08-19 16:05:00'),
(3,6,3,'2026-08-20','18:00:00','20:00:00','3BD','Bachillerato de Informática','Bases de Datos','Camila Acosta','nocturno','Ejercicios de consultas SQL.','2026-08-20 20:05:00'),
(4,4,5,'2026-08-21','10:00:00','12:00:00','3BI','Bachillerato de Informática','Proyecto','Lucia Rodriguez','matutino','Presentaciones de avances del proyecto.','2026-08-21 12:10:00'),
(5,5,6,'2026-08-22','13:00:00','15:00:00','2BA','Bachillerato de Informática','Sistemas Operativos','Martin Silva','vespertino','Práctica con máquinas virtuales.','2026-08-22 15:05:00');
/*!40000 ALTER TABLE `registros_uso_sala` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reportes`
--

DROP TABLE IF EXISTS `reportes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reportes` (
  `id_reporte` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_administrador` int(10) unsigned NOT NULL,
  `tipo` varchar(60) NOT NULL,
  `periodo_desde` date DEFAULT NULL,
  `periodo_hasta` date DEFAULT NULL,
  `fecha_generacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `parametros_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`parametros_json`)),
  PRIMARY KEY (`id_reporte`),
  KEY `idx_reportes_administrador` (`id_administrador`),
  KEY `idx_reportes_tipo_fecha` (`tipo`,`fecha_generacion`),
  CONSTRAINT `fk_reportes_administradores` FOREIGN KEY (`id_administrador`) REFERENCES `administradores` (`id_usuario`) ON UPDATE CASCADE,
  CONSTRAINT `chk_reportes_tipo` CHECK (`tipo` in ('incidencias','solicitudes','prestamos','uso_sala','equipos','usuarios')),
  CONSTRAINT `chk_reportes_parametros_json` CHECK (`parametros_json` is null or json_valid(`parametros_json`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reportes`
--

LOCK TABLES `reportes` WRITE;
/*!40000 ALTER TABLE `reportes` DISABLE KEYS */;
INSERT INTO `reportes` VALUES
(1,1,'incidencias','2026-08-01','2026-08-23','2026-08-23 18:00:00','{"estado": "todos", "categoria": "todas"}'),
(2,1,'prestamos','2026-08-01','2026-08-23','2026-08-23 18:05:00','{"incluir_atrasados": true}'),
(3,1,'uso_sala','2026-08-18','2026-08-22','2026-08-23 18:10:00','{"espacio": "todos"}');
/*!40000 ALTER TABLE `reportes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resoluciones_incidencia`
--

DROP TABLE IF EXISTS `resoluciones_incidencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `resoluciones_incidencia` (
  `id_resolucion` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_ticket` int(10) unsigned NOT NULL,
  `id_tecnico` int(10) unsigned DEFAULT NULL,
  `diagnostico` text NOT NULL,
  `solucion_aplicada` text DEFAULT NULL,
  `foto_nombre_interno` varchar(96) DEFAULT NULL,
  `foto_nombre_original` varchar(255) DEFAULT NULL,
  `foto_tipo_mime` varchar(50) DEFAULT NULL,
  `foto_tamano` int(10) unsigned DEFAULT NULL,
  `fecha_resolucion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_resolucion`),
  UNIQUE KEY `uq_resoluciones_ticket` (`id_ticket`),
  KEY `idx_resoluciones_tecnico` (`id_tecnico`),
  CONSTRAINT `fk_resoluciones_tecnicos` FOREIGN KEY (`id_tecnico`) REFERENCES `tecnicos` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_resoluciones_tickets` FOREIGN KEY (`id_ticket`) REFERENCES `tickets_incidencia` (`id_ticket`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resoluciones_incidencia`
--

LOCK TABLES `resoluciones_incidencia` WRITE;
/*!40000 ALTER TABLE `resoluciones_incidencia` DISABLE KEYS */;
INSERT INTO `resoluciones_incidencia`
(`id_resolucion`,`id_ticket`,`id_tecnico`,`diagnostico`,`solucion_aplicada`,`foto_nombre_interno`,`foto_nombre_original`,`foto_tipo_mime`,`foto_tamano`,`fecha_resolucion`) VALUES
(1,3,3,'La configuración local de Workbench estaba dañada y bloqueaba el inicio de la aplicación.','Se regeneró la configuración del perfil y se comprobó la conexión con la base de datos.',NULL,NULL,NULL,NULL,'2026-08-20 19:05:00'),
(2,4,3,'El cable HDMI del puesto docente presentaba un falso contacto.','Se reemplazó el cable HDMI y se verificó imagen estable durante la prueba.',NULL,NULL,NULL,NULL,'2026-08-19 12:00:00');
/*!40000 ALTER TABLE `resoluciones_incidencia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tokens_recuperacion_contrasena`
--

DROP TABLE IF EXISTS `tokens_recuperacion_contrasena`;
CREATE TABLE `tokens_recuperacion_contrasena` (
  `id_token` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_usuario` int(10) unsigned NOT NULL,
  `hash_token` char(64) NOT NULL,
  `fecha_expiracion` datetime NOT NULL,
  `fecha_uso` datetime DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_token`),
  UNIQUE KEY `uq_tokens_recuperacion_hash` (`hash_token`),
  KEY `idx_tokens_recuperacion_usuario_fecha` (`id_usuario`,`fecha_creacion`),
  CONSTRAINT `fk_tokens_recuperacion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id_rol` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(30) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `uq_roles_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES
(1,'administrador','Coordinación, supervisión y gestión administrativa','2026-07-30 17:42:27'),
(2,'tecnico','Atención de incidencias, préstamos y tareas de soporte','2026-07-30 17:42:27'),
(3,'solicitante','Docente o funcionario que registra solicitudes y usos','2026-07-30 17:42:27');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitantes`
--

DROP TABLE IF EXISTS `solicitantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `solicitantes` (
  `id_usuario` int(10) unsigned NOT NULL,
  `sector` varchar(100) NOT NULL,
  PRIMARY KEY (`id_usuario`),
  CONSTRAINT `fk_solicitantes_usuarios` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitantes`
--

LOCK TABLES `solicitantes` WRITE;
/*!40000 ALTER TABLE `solicitantes` DISABLE KEYS */;
INSERT INTO `solicitantes` VALUES
(4,'Docencia'),
(5,'Docencia'),
(6,'Docencia'),
(10,'Docencia');
/*!40000 ALTER TABLE `solicitantes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitudes_servicio`
--

DROP TABLE IF EXISTS `solicitudes_servicio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `solicitudes_servicio` (
  `id_solicitud` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_solicitante` int(10) unsigned NOT NULL,
  `id_espacio` int(10) unsigned NOT NULL,
  `id_tecnico_asignado` int(10) unsigned DEFAULT NULL,
  `id_administrador_aprobador` int(10) unsigned DEFAULT NULL,
  `tipo_solicitud` varchar(40) NOT NULL,
  `descripcion` text NOT NULL,
  `fecha_solicitada` date NOT NULL,
  `turno` varchar(20) NOT NULL,
  `grupo` varchar(50) NOT NULL,
  `asignatura` varchar(100) NOT NULL,
  `software_requerido` varchar(150) DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'pendiente',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_decision` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_solicitud`),
  KEY `idx_solicitudes_solicitante` (`id_solicitante`),
  KEY `idx_solicitudes_espacio_fecha` (`id_espacio`,`fecha_solicitada`,`turno`),
  KEY `idx_solicitudes_tecnico` (`id_tecnico_asignado`),
  KEY `idx_solicitudes_aprobador` (`id_administrador_aprobador`),
  KEY `idx_solicitudes_estado` (`estado`),
  CONSTRAINT `fk_solicitudes_administradores` FOREIGN KEY (`id_administrador_aprobador`) REFERENCES `administradores` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_solicitudes_espacios` FOREIGN KEY (`id_espacio`) REFERENCES `espacios` (`id_espacio`) ON UPDATE CASCADE,
  CONSTRAINT `fk_solicitudes_solicitantes` FOREIGN KEY (`id_solicitante`) REFERENCES `solicitantes` (`id_usuario`) ON UPDATE CASCADE,
  CONSTRAINT `fk_solicitudes_tecnicos` FOREIGN KEY (`id_tecnico_asignado`) REFERENCES `tecnicos` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_solicitudes_tipo` CHECK (`tipo_solicitud` in ('reserva_sala','instalacion_software','soporte_clase')),
  CONSTRAINT `chk_solicitudes_turno` CHECK (`turno` in ('matutino','vespertino','nocturno')),
  CONSTRAINT `chk_solicitudes_estado` CHECK (`estado` in ('pendiente','aprobada','rechazada','en_proceso','completada','cancelada')),
  CONSTRAINT `chk_solicitudes_software` CHECK (`tipo_solicitud` = 'instalacion_software' or `software_requerido` is null)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes_servicio`
--

LOCK TABLES `solicitudes_servicio` WRITE;
/*!40000 ALTER TABLE `solicitudes_servicio` DISABLE KEYS */;
INSERT INTO `solicitudes_servicio` VALUES
(1,4,2,NULL,NULL,'reserva_sala','Uso del laboratorio para evaluación práctica de programación.','2026-08-26','matutino','3BI','Programación',NULL,'pendiente','2026-08-23 09:00:00','2026-08-23 09:00:00',NULL),
(2,5,1,NULL,1,'instalacion_software','Preparar los equipos para una práctica de redes.','2026-08-25','vespertino','2BA','Redes','Cisco Packet Tracer 8.2','aprobada','2026-08-21 13:30:00','2026-08-22 10:00:00','2026-08-22 10:00:00'),
(3,6,3,2,1,'instalacion_software','Instalar herramienta de administración para la clase de bases de datos.','2026-08-24','nocturno','3BD','Bases de Datos','MySQL Workbench','en_proceso','2026-08-20 18:30:00','2026-08-23 16:00:00','2026-08-21 09:30:00'),
(4,4,5,8,1,'soporte_clase','Verificar proyector, audio y conectividad antes de una presentación.','2026-08-21','matutino','3BI','Proyecto',NULL,'completada','2026-08-19 11:00:00','2026-08-21 07:45:00','2026-08-19 12:00:00'),
(5,5,6,NULL,1,'reserva_sala','Solicitud de laboratorio para práctica grupal; no había disponibilidad en el turno solicitado.','2026-08-23','vespertino','2BA','Sistemas Operativos',NULL,'rechazada','2026-08-20 12:15:00','2026-08-20 15:00:00','2026-08-20 15:00:00'),
(6,6,1,NULL,1,'soporte_clase','Preparación del laboratorio para demostración; la actividad fue suspendida por el docente.','2026-08-22','nocturno','3BD','Proyecto',NULL,'cancelada','2026-08-18 17:00:00','2026-08-21 18:00:00','2026-08-21 18:00:00');
/*!40000 ALTER TABLE `solicitudes_servicio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tareas_soporte`
--

DROP TABLE IF EXISTS `tareas_soporte`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tareas_soporte` (
  `id_tarea` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_creador` int(10) unsigned NOT NULL,
  `id_tecnico_asignado` int(10) unsigned DEFAULT NULL,
  `id_equipo` int(10) unsigned DEFAULT NULL,
  `id_espacio` int(10) unsigned DEFAULT NULL,
  `tipo` varchar(20) NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text NOT NULL,
  `fecha_programada` datetime NOT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'pendiente',
  `resultado` text DEFAULT NULL,
  `fecha_inicio` datetime DEFAULT NULL,
  `fecha_finalizacion` datetime DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_tarea`),
  KEY `idx_tareas_estado_fecha` (`estado`,`fecha_programada`),
  KEY `idx_tareas_tecnico` (`id_tecnico_asignado`),
  KEY `idx_tareas_equipo` (`id_equipo`),
  KEY `idx_tareas_espacio` (`id_espacio`),
  KEY `fk_tareas_creador` (`id_creador`),
  CONSTRAINT `fk_tareas_creador` FOREIGN KEY (`id_creador`) REFERENCES `administradores` (`id_usuario`) ON UPDATE CASCADE,
  CONSTRAINT `fk_tareas_equipo` FOREIGN KEY (`id_equipo`) REFERENCES `equipos` (`id_equipo`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tareas_espacio` FOREIGN KEY (`id_espacio`) REFERENCES `espacios` (`id_espacio`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tareas_tecnico` FOREIGN KEY (`id_tecnico_asignado`) REFERENCES `tecnicos` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_tareas_tipo` CHECK (`tipo` in ('preventiva','reactiva')),
  CONSTRAINT `chk_tareas_estado` CHECK (`estado` in ('pendiente','en_proceso','completada','cancelada'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tareas_soporte`
--

LOCK TABLES `tareas_soporte` WRITE;
/*!40000 ALTER TABLE `tareas_soporte` DISABLE KEYS */;
INSERT INTO `tareas_soporte` VALUES
(1,1,3,NULL,1,'preventiva','Revisión preventiva Laboratorio 1','Comprobar periféricos, limpieza básica y estado general de los puestos.','2026-08-26 08:00:00','pendiente',NULL,NULL,NULL,'2026-08-23 08:30:00','2026-08-23 08:30:00'),
(2,1,3,26,3,'reactiva','Revisar sobrecalentamiento del proyector','Diagnosticar el apagado automático del proyector del Laboratorio 3.','2026-08-23 16:30:00','en_proceso',NULL,'2026-08-23 16:30:00',NULL,'2026-08-23 16:10:00','2026-08-23 16:30:00'),
(3,1,2,31,2,'preventiva','Mantenimiento de switch del Laboratorio 2','Revisar enlaces, firmware y errores registrados en los puertos del switch.','2026-08-18 09:00:00','completada','Firmware actualizado, puertos revisados y conectividad estable.','2026-08-18 09:00:00','2026-08-18 10:15:00','2026-08-17 16:00:00','2026-08-18 10:15:00'),
(4,1,NULL,NULL,6,'reactiva','Verificación general Laboratorio 6','Comprobar equipos antes de habilitar nuevamente el laboratorio.','2026-08-24 08:00:00','cancelada','Tarea reemplazada por una revisión técnica más específica.',NULL,'2026-08-23 17:00:00','2026-08-22 12:00:00','2026-08-23 17:00:00');
/*!40000 ALTER TABLE `tareas_soporte` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tecnicos`
--

DROP TABLE IF EXISTS `tecnicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tecnicos` (
  `id_usuario` int(10) unsigned NOT NULL,
  `especialidad` varchar(100) NOT NULL,
  PRIMARY KEY (`id_usuario`),
  CONSTRAINT `fk_tecnicos_usuarios` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tecnicos`
--

LOCK TABLES `tecnicos` WRITE;
/*!40000 ALTER TABLE `tecnicos` DISABLE KEYS */;
INSERT INTO `tecnicos` VALUES
(1,'Administración técnica'),
(2,'Redes y conectividad'),
(3,'Hardware y mantenimiento'),
(8,'Soporte general');
/*!40000 ALTER TABLE `tecnicos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tickets_incidencia`
--

DROP TABLE IF EXISTS `tickets_incidencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tickets_incidencia` (
  `id_ticket` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_solicitante` int(10) unsigned NOT NULL,
  `id_espacio` int(10) unsigned DEFAULT NULL,
  `id_equipo` int(10) unsigned DEFAULT NULL,
  `id_categoria` int(10) unsigned DEFAULT NULL,
  `id_tecnico_asignado` int(10) unsigned DEFAULT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text NOT NULL,
  `fecha_reportada` date NOT NULL,
  `prioridad` varchar(20) NOT NULL DEFAULT 'sin_asignar',
  `estado` varchar(20) NOT NULL DEFAULT 'pendiente',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_cierre` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_ticket`),
  UNIQUE KEY `uq_tickets_solicitante_titulo` (`id_solicitante`,`titulo`),
  KEY `idx_tickets_solicitante` (`id_solicitante`),
  KEY `idx_tickets_equipo` (`id_equipo`),
  KEY `idx_tickets_categoria` (`id_categoria`),
  KEY `idx_tickets_tecnico` (`id_tecnico_asignado`),
  KEY `idx_tickets_estado_prioridad` (`estado`,`prioridad`),
  KEY `idx_tickets_espacio` (`id_espacio`),
  CONSTRAINT `fk_tickets_categorias` FOREIGN KEY (`id_categoria`) REFERENCES `categorias_incidencia` (`id_categoria`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tickets_equipos` FOREIGN KEY (`id_equipo`) REFERENCES `equipos` (`id_equipo`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tickets_espacios` FOREIGN KEY (`id_espacio`) REFERENCES `espacios` (`id_espacio`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tickets_solicitantes` FOREIGN KEY (`id_solicitante`) REFERENCES `solicitantes` (`id_usuario`) ON UPDATE CASCADE,
  CONSTRAINT `fk_tickets_tecnicos` FOREIGN KEY (`id_tecnico_asignado`) REFERENCES `tecnicos` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_tickets_prioridad` CHECK (`prioridad` in ('sin_asignar','baja','media','alta')),
  CONSTRAINT `chk_tickets_estado` CHECK (`estado` in ('pendiente','en_proceso','resuelta','cancelada')),
  CONSTRAINT `chk_tickets_cierre` CHECK (`fecha_cierre` is null or `fecha_cierre` >= `fecha_creacion`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tickets_incidencia`
--

LOCK TABLES `tickets_incidencia` WRITE;
/*!40000 ALTER TABLE `tickets_incidencia` DISABLE KEYS */;
INSERT INTO `tickets_incidencia` VALUES
(1,4,1,2,4,NULL,'No permite iniciar sesión en el equipo','El equipo muestra credenciales inválidas aunque el usuario docente puede ingresar en otros equipos.','2026-08-23','sin_asignar','pendiente','2026-08-23 08:15:00','2026-08-23 08:15:00',NULL),
(2,5,2,31,3,2,'Conectividad intermitente en Laboratorio 2','Varios equipos pierden acceso a la red durante algunos minutos.','2026-08-23','alta','en_proceso','2026-08-23 10:05:00','2026-08-23 14:20:00',NULL),
(3,6,3,10,2,3,'MySQL Workbench no inicia','La aplicación se cierra al intentar abrir una conexión guardada.','2026-08-20','media','resuelta','2026-08-20 18:10:00','2026-08-20 19:05:00','2026-08-20 19:05:00'),
(4,4,1,25,5,3,'Proyector sin imagen','El proyector encendía pero no mostraba la señal HDMI del equipo docente.','2026-08-19','baja','resuelta','2026-08-19 10:30:00','2026-08-19 12:00:00','2026-08-19 12:00:00'),
(5,5,4,NULL,6,2,'Reporte duplicado de teclado','El mismo problema fue reportado dos veces durante la clase.','2026-08-21','sin_asignar','cancelada','2026-08-21 15:10:00','2026-08-21 15:25:00','2026-08-21 15:25:00'),
(6,6,3,26,5,3,'Proyector se apaga a los pocos minutos','El equipo se apaga por temperatura luego de aproximadamente diez minutos de uso.','2026-08-23','alta','en_proceso','2026-08-23 15:40:00','2026-08-23 16:30:00',NULL),
(7,4,5,18,3,NULL,'Sin acceso a Internet en un puesto','El puesto 02 del Laboratorio 5 no obtiene dirección IP.','2026-08-23','sin_asignar','pendiente','2026-08-23 17:10:00','2026-08-23 17:10:00',NULL);
/*!40000 ALTER TABLE `tickets_incidencia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `seguimientos_incidencia`
-- Guarda notas de trabajo mientras el ticket todavía está abierto.
--

DROP TABLE IF EXISTS `seguimientos_incidencia`;
CREATE TABLE `seguimientos_incidencia` (
  `id_seguimiento` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_ticket` int(10) unsigned NOT NULL,
  `id_tecnico` int(10) unsigned DEFAULT NULL,
  `nota` text NOT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_seguimiento`),
  KEY `idx_seguimiento_ticket_fecha` (`id_ticket`,`fecha_creacion`),
  KEY `idx_seguimiento_tecnico` (`id_tecnico`),
  CONSTRAINT `fk_seguimiento_ticket` FOREIGN KEY (`id_ticket`) REFERENCES `tickets_incidencia` (`id_ticket`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_seguimiento_tecnico` FOREIGN KEY (`id_tecnico`) REFERENCES `tecnicos` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `seguimientos_incidencia` WRITE;
INSERT INTO `seguimientos_incidencia` (`id_ticket`,`id_tecnico`,`nota`,`fecha_creacion`) VALUES
(2,2,'Se verificará el switch y el cableado de los puestos afectados antes de cambiar equipos.','2026-08-23 14:25:00'),
(6,3,'Revisar ventilación del proyector y limpiar filtros antes de realizar una prueba prolongada.','2026-08-23 16:35:00');
UNLOCK TABLES;

--
-- Table structure for table `incidencias_colaboradores`
--

DROP TABLE IF EXISTS `incidencias_colaboradores`;
CREATE TABLE `incidencias_colaboradores` (
  `id_ticket` int(10) unsigned NOT NULL,
  `id_usuario` int(10) unsigned NOT NULL,
  `fecha_union` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_ticket`),
  KEY `idx_incidencias_colaboradores_usuario` (`id_usuario`),
  CONSTRAINT `fk_incidencias_colaboradores_ticket` FOREIGN KEY (`id_ticket`) REFERENCES `tickets_incidencia` (`id_ticket`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_incidencias_colaboradores_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `codigos_colaboracion_incidencia`
--

DROP TABLE IF EXISTS `codigos_colaboracion_incidencia`;
CREATE TABLE `codigos_colaboracion_incidencia` (
  `id_codigo` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_ticket` int(10) unsigned NOT NULL,
  `id_generador` int(10) unsigned NOT NULL,
  `hash_codigo` varchar(255) NOT NULL,
  `intentos_fallidos` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `fecha_expiracion` datetime NOT NULL,
  `fecha_uso` datetime DEFAULT NULL,
  `id_usuario_uso` int(10) unsigned DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_codigo`),
  KEY `idx_codigos_colaboracion_ticket_activo` (`id_ticket`,`fecha_uso`,`fecha_expiracion`),
  KEY `idx_codigos_colaboracion_generador` (`id_generador`),
  KEY `idx_codigos_colaboracion_usuario_uso` (`id_usuario_uso`),
  CONSTRAINT `fk_codigos_colaboracion_ticket` FOREIGN KEY (`id_ticket`) REFERENCES `tickets_incidencia` (`id_ticket`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_codigos_colaboracion_generador` FOREIGN KEY (`id_generador`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_codigos_colaboracion_usuario_uso` FOREIGN KEY (`id_usuario_uso`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuarios` (
  `id_usuario` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_rol` int(10) unsigned NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `apellido` varchar(80) NOT NULL,
  `cedula` varchar(12) NOT NULL,
  `telefono` varchar(20) NOT NULL,
  `correo` varchar(120) NOT NULL,
  `hash_contrasena` varchar(255) DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'pendiente',
  `intentos_fallidos` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `ultimo_intento_fallido` datetime DEFAULT NULL,
  `motivo_bloqueo` varchar(30) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `uq_usuarios_cedula` (`cedula`),
  UNIQUE KEY `uq_usuarios_correo` (`correo`),
  KEY `idx_usuarios_rol` (`id_rol`),
  KEY `idx_usuarios_estado` (`estado`),
  KEY `idx_usuarios_nombre_apellido` (`apellido`,`nombre`),
  CONSTRAINT `fk_usuarios_roles` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`) ON UPDATE CASCADE,
  CONSTRAINT `chk_usuarios_estado` CHECK (`estado` in ('pendiente','activo','bloqueado','rechazado')),
  CONSTRAINT `chk_usuarios_hash_contrasena` CHECK (`hash_contrasena` is null or char_length(`hash_contrasena`) >= 55)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES
(1,1,'Ana','Pereira','40010001','099100001','admin@sgrsi.test','$2y$10$719eCXIcARjFhPzdTVl0EeBD82mONy0mlkgEfExe4I90R1YBTlxfO','activo',0,NULL,NULL,'2026-08-01 08:00:00','2026-08-22 17:00:00'),
(2,2,'Diego','Fernandez','40010002','099100002','tecnico@sgrsi.test','$2y$10$3c0acePTcumjvJV9581QhODl8LPka1BlfioUcricEZ5J3mNdl9JOa','activo',0,NULL,NULL,'2026-08-01 08:05:00','2026-08-22 17:00:00'),
(3,2,'Valentina','Mendez','40010003','099100003','tecnico.hardware@sgrsi.local','$2y$12$NHtrcY89x0uWiiFH6kORuei3wyuJzDzUMquVjHbCo4NjpAajlFyhq','activo',0,NULL,NULL,'2026-08-01 08:10:00','2026-08-22 17:00:00'),
(4,3,'Lucia','Rodriguez','40010004','099100004','docente@sgrsi.test','$2y$10$mtn2EKUcZ57LSVSpX58oU.RJdLUKL4EoboTDj4P7highmt6IAMAJu','activo',0,NULL,NULL,'2026-08-02 09:00:00','2026-08-22 17:00:00'),
(5,3,'Martin','Silva','40010005','099100005','docente.martin@sgrsi.local','$2y$12$NHtrcY89x0uWiiFH6kORuei3wyuJzDzUMquVjHbCo4NjpAajlFyhq','activo',0,NULL,NULL,'2026-08-02 09:05:00','2026-08-22 17:00:00'),
(6,3,'Camila','Acosta','40010006','099100006','docente.camila@sgrsi.local','$2y$12$NHtrcY89x0uWiiFH6kORuei3wyuJzDzUMquVjHbCo4NjpAajlFyhq','activo',0,NULL,NULL,'2026-08-02 09:10:00','2026-08-22 17:00:00'),
(7,3,'Bruno','Lopez','40010007','099100007','pendiente@sgrsi.local','$2y$12$NHtrcY89x0uWiiFH6kORuei3wyuJzDzUMquVjHbCo4NjpAajlFyhq','pendiente',0,NULL,NULL,'2026-08-22 11:20:00','2026-08-22 11:20:00'),
(8,2,'Nicolas','Suarez','40010008','099100008','tecnico.mixto@sgrsi.local','$2y$12$NHtrcY89x0uWiiFH6kORuei3wyuJzDzUMquVjHbCo4NjpAajlFyhq','activo',0,NULL,NULL,'2026-08-03 10:00:00','2026-08-22 17:00:00'),
(9,2,'Carla','Gomez','40010009','099100009','rechazado@sgrsi.local','$2y$12$NHtrcY89x0uWiiFH6kORuei3wyuJzDzUMquVjHbCo4NjpAajlFyhq','rechazado',0,NULL,NULL,'2026-08-20 12:00:00','2026-08-20 16:30:00'),
(10,3,'Pedro','Ramos','40010010','099100010','bloqueado@sgrsi.local','$2y$12$NHtrcY89x0uWiiFH6kORuei3wyuJzDzUMquVjHbCo4NjpAajlFyhq','bloqueado',5,'2026-08-23 09:14:00','intentos_fallidos','2026-08-05 11:00:00','2026-08-23 09:14:00');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios_roles`
--

DROP TABLE IF EXISTS `usuarios_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuarios_roles` (
  `id_usuario` int(10) unsigned NOT NULL,
  `id_rol` int(10) unsigned NOT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'pendiente',
  `fecha_solicitud` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_decision` timestamp NULL DEFAULT NULL,
  `id_administrador_decisor` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id_usuario`,`id_rol`),
  KEY `idx_usuarios_roles_rol_estado` (`id_rol`,`estado`),
  KEY `idx_usuarios_roles_decisor` (`id_administrador_decisor`),
  CONSTRAINT `fk_usuarios_roles_roles` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`) ON UPDATE CASCADE,
  CONSTRAINT `fk_usuarios_roles_usuarios` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_usuarios_roles_estado` CHECK (`estado` in ('pendiente','activo','rechazado'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios_roles`
--

LOCK TABLES `usuarios_roles` WRITE;
/*!40000 ALTER TABLE `usuarios_roles` DISABLE KEYS */;
INSERT INTO `usuarios_roles` VALUES
(1,1,'activo','2026-08-01 08:00:00','2026-08-01 08:00:00',NULL),
(2,2,'activo','2026-08-01 08:05:00','2026-08-01 08:05:00',1),
(3,2,'activo','2026-08-01 08:10:00','2026-08-01 08:10:00',1),
(4,3,'activo','2026-08-02 09:00:00','2026-08-02 10:00:00',1),
(5,3,'activo','2026-08-02 09:05:00','2026-08-02 10:05:00',1),
(6,3,'activo','2026-08-02 09:10:00','2026-08-02 10:10:00',1),
(7,3,'pendiente','2026-08-22 11:20:00',NULL,NULL),
(8,2,'activo','2026-08-03 10:00:00','2026-08-03 11:00:00',1),
(9,2,'rechazado','2026-08-20 12:00:00','2026-08-20 16:30:00',1),
(10,3,'activo','2026-08-05 11:00:00','2026-08-05 12:00:00',1);
/*!40000 ALTER TABLE `usuarios_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'sgrsi'
--

--
-- Dumping routines for database 'sgrsi'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dotación fija de espacios de enseñanza
-- Completa la dotación fija de los espacios de enseñanza ya registrados.
-- Se puede ejecutar de nuevo: conserva estados, responsables e historial existentes.
SET NAMES utf8mb4;
USE `sgrsi`;

-- Los cinco salones que ya ofrece la interfaz pasan a ser espacios reales.
INSERT INTO `espacios` (`tipo`, `nombre`, `ubicacion`, `capacidad`, `estado`)
SELECT 'salon', CONCAT('Salón ', n.numero), 'UTU', 30, 'disponible'
FROM (
  SELECT 1 numero UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) n
WHERE NOT EXISTS (
  SELECT 1 FROM `espacios` e WHERE e.tipo = 'salon' AND e.nombre = CONCAT('Salón ', n.numero)
);

-- La capacidad de alumnos coincide con los 16 puestos disponibles.
UPDATE `espacios` SET `capacidad` = 16
WHERE `tipo` IN ('laboratorio', 'taller') AND `estado` <> 'inactivo';

-- Dieciséis puestos de alumnos en cada laboratorio y taller existente.
INSERT INTO `equipos` (`id_espacio_actual`, `codigo_inventario`, `nombre`, `tipo`, `es_prestable`, `estado`, `ubicacion_detalle`, `fecha_alta`)
SELECT e.id_espacio, CONCAT('ESP', e.id_espacio, '-PC', LPAD(n.numero, 2, '0')),
       CONCAT('PC alumno ', LPAD(n.numero, 2, '0'), ' - ', e.nombre),
       'PC', 0, 'disponible', CONCAT('Puesto ', LPAD(n.numero, 2, '0')), CURRENT_DATE
FROM `espacios` e
CROSS JOIN (
  SELECT 1 numero UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8
  UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
  UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16
) n
WHERE e.tipo IN ('laboratorio', 'taller') AND e.estado <> 'inactivo'
  AND NOT EXISTS (
    SELECT 1 FROM `equipos` p
    WHERE p.id_espacio_actual = e.id_espacio AND p.tipo = 'PC'
      AND p.ubicacion_detalle = CONCAT('Puesto ', LPAD(n.numero, 2, '0'))
      AND p.estado <> 'baja'
  )
  AND NOT EXISTS (
    SELECT 1 FROM `equipos` p
    WHERE p.codigo_inventario = CONCAT('ESP', e.id_espacio, '-PC', LPAD(n.numero, 2, '0'))
  );

-- Una PC docente y una TV fija por cada laboratorio, taller y salón.
INSERT INTO `equipos` (`id_espacio_actual`, `codigo_inventario`, `nombre`, `tipo`, `es_prestable`, `estado`, `ubicacion_detalle`, `fecha_alta`)
SELECT e.id_espacio, CONCAT('ESP', e.id_espacio, '-DOC'),
       CONCAT('PC docente - ', e.nombre), 'PC', 0, 'disponible', 'Puesto docente', CURRENT_DATE
FROM `espacios` e
WHERE e.tipo IN ('laboratorio', 'taller', 'salon') AND e.estado <> 'inactivo'
  AND NOT EXISTS (
    SELECT 1 FROM `equipos` p
    WHERE p.id_espacio_actual = e.id_espacio AND p.tipo = 'PC'
      AND p.ubicacion_detalle = 'Puesto docente' AND p.estado <> 'baja'
  )
  AND NOT EXISTS (SELECT 1 FROM `equipos` p WHERE p.codigo_inventario = CONCAT('ESP', e.id_espacio, '-DOC'));

INSERT INTO `equipos` (`id_espacio_actual`, `codigo_inventario`, `nombre`, `tipo`, `es_prestable`, `estado`, `ubicacion_detalle`, `fecha_alta`)
SELECT e.id_espacio, CONCAT('ESP', e.id_espacio, '-TV'),
       CONCAT('TV para proyección - ', e.nombre), 'TV', 0, 'disponible', 'Frente del salón', CURRENT_DATE
FROM `espacios` e
WHERE e.tipo IN ('laboratorio', 'taller', 'salon') AND e.estado <> 'inactivo'
  AND NOT EXISTS (
    SELECT 1 FROM `equipos` p
    WHERE p.id_espacio_actual = e.id_espacio AND p.tipo = 'TV' AND p.estado <> 'baja'
  )
  AND NOT EXISTS (SELECT 1 FROM `equipos` p WHERE p.codigo_inventario = CONCAT('ESP', e.id_espacio, '-TV'));

-- Los recursos de préstamo quedan fuera de las salas de enseñanza.
UPDATE `equipos` e
INNER JOIN `espacios` s ON s.id_espacio = e.id_espacio_actual
SET e.id_espacio_actual = NULL
WHERE s.tipo IN ('salon', 'taller', 'laboratorio')
  AND (e.es_prestable = 1 OR e.codigo_inventario = 'PREST-TAB-01');

-- Se conservan solo para referencias históricas; no aparecen en inventario.
UPDATE `equipos` SET `es_archivado` = 1
WHERE `codigo_inventario` IN (
  'LAB1-PROY-01', 'LAB3-PROY-01', 'PREST-TAB-01',
  'LAB2-SW-01', 'LAB5-AP-01', 'IMP-LEG-01'
);
