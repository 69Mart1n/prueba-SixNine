-- Migración para instalaciones SGRSI existentes.
USE `sgrsi`;

CREATE TABLE IF NOT EXISTS `tokens_recuperacion_contrasena` (
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

ALTER TABLE `resoluciones_incidencia`
  ADD COLUMN IF NOT EXISTS `foto_nombre_interno` varchar(96) DEFAULT NULL AFTER `solucion_aplicada`,
  ADD COLUMN IF NOT EXISTS `foto_nombre_original` varchar(255) DEFAULT NULL AFTER `foto_nombre_interno`,
  ADD COLUMN IF NOT EXISTS `foto_tipo_mime` varchar(50) DEFAULT NULL AFTER `foto_nombre_original`,
  ADD COLUMN IF NOT EXISTS `foto_tamano` int(10) unsigned DEFAULT NULL AFTER `foto_tipo_mime`;
