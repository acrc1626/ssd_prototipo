-- SSD Bancos de Alimentos · Banco Diocesano de Alimentos de Neiva
-- Esquema PostgreSQL según el modelo de datos v1.1 (11-oct-2026), página 16 del documento de arquitectura.
-- Dos esquemas (ADR-002): seguridad (compartido) y uno por banco (banco_neiva).
-- Columnas marcadas PENDIENTE: las usa el prototipo pero NO están en el modelo v1.1 (pregunta abierta al equipo).
-- Columnas marcadas PROTOTIPO: solo ayudan a mostrar datos en pantalla; se pueden quitar.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS seguridad;
CREATE SCHEMA IF NOT EXISTS banco_neiva;

-- ===== seguridad =====
CREATE TABLE seguridad.Banco (IdBanco uuid PRIMARY KEY DEFAULT gen_random_uuid(), Nombre text NOT NULL, Esquema text NOT NULL UNIQUE, Activo boolean NOT NULL DEFAULT true);
CREATE TABLE seguridad.Usuario (IdUsuario uuid PRIMARY KEY DEFAULT gen_random_uuid(), IdBanco uuid NOT NULL REFERENCES seguridad.Banco, SubCognito text NOT NULL UNIQUE, Correo text NOT NULL, Nombre text NOT NULL, Activo boolean NOT NULL DEFAULT true);
CREATE TABLE seguridad.Rol (IdRol uuid PRIMARY KEY DEFAULT gen_random_uuid(), IdBanco uuid NOT NULL REFERENCES seguridad.Banco, Nombre text NOT NULL, Descripcion text);
CREATE TABLE seguridad.Permiso (IdPermiso uuid PRIMARY KEY DEFAULT gen_random_uuid(), Codigo text NOT NULL UNIQUE, Descripcion text);
CREATE TABLE seguridad.UsuarioRol (IdUsuario uuid REFERENCES seguridad.Usuario, IdRol uuid REFERENCES seguridad.Rol, PRIMARY KEY (IdUsuario, IdRol));
CREATE TABLE seguridad.RolPermiso (IdRol uuid REFERENCES seguridad.Rol, IdPermiso uuid REFERENCES seguridad.Permiso, PRIMARY KEY (IdRol, IdPermiso));

-- ===== banco_neiva =====
SET search_path TO banco_neiva;
CREATE TYPE UnidadMedida AS ENUM ('G','ML');
CREATE TYPE OrigenInventario AS ENUM ('DONACION','COMPRA');
CREATE TYPE TipoMovimiento AS ENUM ('ENTRADA','DESECHO_RECEPCION','FRACCIONAMIENTO_SALIDA','FRACCIONAMIENTO_ENTRADA','SALIDA_REMISION','BAJA','COMPOSTAJE','AJUSTE');
CREATE TYPE NivelRiesgo AS ENUM ('BAJO','MEDIO','ALTO','VENCIDO');
CREATE TYPE EtapaVinculacion AS ENUM ('RADICACION','VERIFICACION','CONTACTO','VISITA','VINCULADA');
CREATE TYPE EstadoOrganizacion AS ENUM ('PERMANENTE','ESPORADICA');

CREATE TABLE Categoria (IdCategoria uuid PRIMARY KEY DEFAULT gen_random_uuid(), Nombre text NOT NULL, AplicaVencimiento boolean NOT NULL, VidaUtilDias integer);
CREATE TABLE Producto (IdProducto uuid PRIMARY KEY DEFAULT gen_random_uuid(), IdCategoria uuid NOT NULL REFERENCES Categoria, Nombre text NOT NULL);
CREATE TABLE Presentacion (IdPresentacion uuid PRIMARY KEY DEFAULT gen_random_uuid(), IdProducto uuid NOT NULL REFERENCES Producto, Contenido numeric(12,2) NOT NULL, Unidad UnidadMedida NOT NULL,
  Nombre text,          -- PENDIENTE: "Bolsa 500 g", no está en el modelo
  UnidadConteo text);   -- PROTOTIPO: "bolsas", "cajas"
CREATE TABLE Donante (IdDonante uuid PRIMARY KEY DEFAULT gen_random_uuid(), Nombre text NOT NULL, NIT text);
CREATE TABLE Recepcion (IdRecepcion uuid PRIMARY KEY DEFAULT gen_random_uuid(), Origen OrigenInventario NOT NULL, IdDonante uuid REFERENCES Donante, Fecha date NOT NULL, NumeroSoporte text, SoporteUrl text, IdUsuario uuid NOT NULL,
  Numero text,          -- PENDIENTE: "R-0458"
  Estado text);         -- PENDIENTE: BORRADOR / CONFIRMADA
CREATE TABLE Lote (IdLote uuid PRIMARY KEY DEFAULT gen_random_uuid(), IdRecepcion uuid REFERENCES Recepcion, IdPresentacion uuid NOT NULL REFERENCES Presentacion, IdLoteOrigen uuid REFERENCES Lote, FechaVencimiento date, VencimientoEstimado boolean NOT NULL DEFAULT false,
  Codigo text);         -- PROTOTIPO: "L-104"
CREATE TABLE RiesgoLote (IdLote uuid REFERENCES Lote, FechaCalculo timestamptz, Nivel NivelRiesgo NOT NULL, DiasParaVencer integer, KgEnRiesgo numeric(12,2), VersionModelo text, PRIMARY KEY (IdLote, FechaCalculo));
CREATE TABLE Organizacion (IdOrganizacion uuid PRIMARY KEY DEFAULT gen_random_uuid(), Nombre text NOT NULL, NIT text, Municipio text, Estado EstadoOrganizacion NOT NULL, Etapa EtapaVinculacion NOT NULL);
CREATE TABLE Representante (IdRepresentante uuid PRIMARY KEY DEFAULT gen_random_uuid(), IdOrganizacion uuid NOT NULL REFERENCES Organizacion, Nombre text NOT NULL, Documento text, Telefono text);
CREATE TABLE AutorizacionDatos (IdAutorizacion uuid PRIMARY KEY DEFAULT gen_random_uuid(), IdRepresentante uuid NOT NULL REFERENCES Representante, Fecha date NOT NULL, Medio text, Finalidades text, VersionPolitica text, SoporteUrl text);
CREATE TABLE PoblacionAtendida (IdOrganizacion uuid REFERENCES Organizacion, Grupo text, Cantidad integer NOT NULL, PRIMARY KEY (IdOrganizacion, Grupo));
CREATE TABLE Programa (IdPrograma uuid PRIMARY KEY DEFAULT gen_random_uuid(), Nombre text NOT NULL, Activo boolean NOT NULL DEFAULT true);
CREATE TABLE ComponenteKit (IdPrograma uuid REFERENCES Programa, IdProducto uuid REFERENCES Producto, KgPorKit numeric(10,2) NOT NULL, PRIMARY KEY (IdPrograma, IdProducto));
CREATE TABLE Remision (IdRemision uuid PRIMARY KEY DEFAULT gen_random_uuid(), Numero text NOT NULL, Fecha date NOT NULL, IdOrganizacion uuid NOT NULL REFERENCES Organizacion, IdPrograma uuid NOT NULL REFERENCES Programa, NumeroKits integer NOT NULL, PdfUrl text);
CREATE TABLE MotivoExcepcionFefo (IdMotivo uuid PRIMARY KEY DEFAULT gen_random_uuid(), Descripcion text NOT NULL, Activo boolean NOT NULL DEFAULT true);
CREATE TABLE DetalleRemision (IdRemision uuid REFERENCES Remision, IdLote uuid REFERENCES Lote, Cantidad numeric(12,2) NOT NULL, Kg numeric(12,2) NOT NULL, IdMotivoExcepcion uuid REFERENCES MotivoExcepcionFefo, PRIMARY KEY (IdRemision, IdLote));
CREATE TABLE MovimientoInventario (IdMovimiento uuid PRIMARY KEY DEFAULT gen_random_uuid(), IdLote uuid NOT NULL REFERENCES Lote, Tipo TipoMovimiento NOT NULL, Cantidad numeric(12,2) NOT NULL, Kg numeric(12,2) NOT NULL, Fecha timestamptz NOT NULL, IdUsuario uuid NOT NULL, IdRemision uuid REFERENCES Remision, IdMovimientoCorregido uuid REFERENCES MovimientoInventario);
CREATE TABLE Importacion (IdImportacion uuid PRIMARY KEY DEFAULT gen_random_uuid(), Fecha timestamptz NOT NULL, ArchivoUrl text, IdUsuario uuid NOT NULL, FilasTotales integer, FilasImportadas integer);
CREATE TABLE ErrorImportacion (IdImportacion uuid REFERENCES Importacion, NumeroFila integer, Mensaje text, PRIMARY KEY (IdImportacion, NumeroFila));
CREATE TABLE EquivalenciaNombre (NombreOrigen text PRIMARY KEY, IdProducto uuid NOT NULL REFERENCES Producto);
CREATE TABLE ReporteMensual (IdReporte uuid PRIMARY KEY DEFAULT gen_random_uuid(), Periodo text NOT NULL, Formato text, ArchivoUrl text, FechaGeneracion timestamptz);
CREATE TABLE CambioParametro (IdCambio uuid PRIMARY KEY DEFAULT gen_random_uuid(), Entidad text NOT NULL, Campo text NOT NULL, ValorAnterior text, ValorNuevo text, IdUsuario uuid NOT NULL, Fecha timestamptz NOT NULL);

-- MovimientoInventario es de solo inserción (QA-02)
CREATE FUNCTION solo_insercion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'MovimientoInventario es de solo inserción; registre un AJUSTE'; END $$;
CREATE TRIGGER mov_solo_insercion BEFORE UPDATE OR DELETE ON MovimientoInventario FOR EACH ROW EXECUTE FUNCTION solo_insercion();

-- Existencias de un lote = suma de sus movimientos
CREATE VIEW ExistenciaLote AS
SELECT l.IdLote, l.Codigo,
  SUM(CASE WHEN m.Tipo IN ('ENTRADA','FRACCIONAMIENTO_ENTRADA') THEN m.Cantidad
           WHEN m.Tipo = 'AJUSTE' THEN m.Cantidad ELSE -m.Cantidad END) AS Cantidad,
  SUM(CASE WHEN m.Tipo IN ('ENTRADA','FRACCIONAMIENTO_ENTRADA') THEN m.Kg
           WHEN m.Tipo = 'AJUSTE' THEN m.Kg ELSE -m.Kg END) AS Kg
FROM Lote l JOIN MovimientoInventario m ON m.IdLote = l.IdLote
GROUP BY l.IdLote, l.Codigo;


-- ===== Datos de ejemplo (fecha de referencia del prototipo: 10-nov-2026) =====
INSERT INTO seguridad.Banco (IdBanco, Nombre, Esquema, Activo) VALUES
  ('4478fdef-5636-542c-9996-9fd5455bc26f', 'Banco Diocesano de Alimentos de Neiva', 'banco_neiva', true);
INSERT INTO seguridad.Rol (IdRol, IdBanco, Nombre, Descripcion) VALUES
  ('e66adb95-614c-5fad-9a60-ca0fbb811c5c', '4478fdef-5636-542c-9996-9fd5455bc26f', 'Coordinador del banco', 'Consulta existencias y riesgo; gestiona catálogo, kits, históricos y usuarios.'),
  ('e2d9e3fc-81f8-5d6f-b237-f040c23c5832', '4478fdef-5636-542c-9996-9fd5455bc26f', 'Asistente administrativa', 'Arma kits y emite remisiones, vincula organizaciones y genera el reporte mensual.'),
  ('8ea0017f-dff9-5a26-808a-25f2b89c4ffd', '4478fdef-5636-542c-9996-9fd5455bc26f', 'Personal de bodega', 'Registra recepciones, bajas y compostaje.');
INSERT INTO seguridad.Permiso (IdPermiso, Codigo, Descripcion) VALUES
  ('ca10270d-835d-559d-b509-7f735d86d28b', 'REGISTRAR_RECEPCION', 'Registrar recepción'),
  ('62651f4f-1966-5a63-b032-d34c2aeb7812', 'CONFIRMAR_RECEPCION', 'Confirmar recepción y crear lotes'),
  ('79e191ac-a152-533c-acd5-05eda3e372d2', 'REGISTRAR_BAJA', 'Registrar baja o compostaje'),
  ('458ffb28-eb44-5f6d-afca-d8058fcb1acd', 'CONSULTAR_EXISTENCIAS', 'Consultar existencias y trazabilidad'),
  ('4d6e8045-caa3-5bdd-a40a-7f040ae47fa5', 'EMITIR_REMISION', 'Emitir remisión'),
  ('57461a1b-a5e7-5533-8388-3d3b86ea279b', 'REASIGNAR_FUERA_DE_FEFO', 'Reasignar lote fuera de FEFO'),
  ('55cc6137-e12e-5177-b426-083a765ca285', 'GESTIONAR_ORGANIZACIONES', 'Gestionar organizaciones y autorizaciones'),
  ('bfed4edf-37f8-530b-aef6-f668846dd5fd', 'VER_REPRESENTANTES', 'Ver representantes de organizaciones'),
  ('e5d0f502-6736-5881-b8ca-54e78b28346b', 'EDITAR_KITS', 'Editar composición de kits'),
  ('4bd5b8f9-7485-53b8-87ab-b228092b303f', 'CONSULTAR_RIESGO', 'Consultar riesgo de vencimiento'),
  ('069e28ba-675d-5b33-be93-8a9a74cc0922', 'GENERAR_REPORTE_RED', 'Generar reporte para la red de bancos'),
  ('a3cf8067-a1a3-54cd-925b-e7291fb2ad19', 'EDITAR_CATALOGO', 'Editar catálogo, categorías y vida útil'),
  ('ebef4032-9ad4-5285-9848-d366e075b5dd', 'IMPORTAR_HISTORICOS', 'Importar históricos'),
  ('7a687eb1-550c-59ad-869f-5055a4096790', 'GESTIONAR_USUARIOS', 'Gestionar usuarios y roles');
INSERT INTO seguridad.Usuario (IdUsuario, IdBanco, SubCognito, Correo, Nombre, Activo) VALUES
  ('8356b1aa-ee4e-5ca4-985e-a8f93861d521', '4478fdef-5636-542c-9996-9fd5455bc26f', 'google-oauth2|laura-gomez', 'coordinacion@bancoalimentosneiva.org', 'Laura Gómez', true),
  ('888bbff9-b3e6-55ae-b4e7-96cd54ab3753', '4478fdef-5636-542c-9996-9fd5455bc26f', 'google-oauth2|diana-rios', 'asistente@bancoalimentosneiva.org', 'Diana Ríos', true),
  ('46c2ec28-1bcf-5fed-b82f-513880ed5a84', '4478fdef-5636-542c-9996-9fd5455bc26f', 'google-oauth2|carlos-perdomo', 'bodega1@bancoalimentosneiva.org', 'Carlos Perdomo', true),
  ('fcc08889-2aff-5b04-8678-b1ccf1a74d77', '4478fdef-5636-542c-9996-9fd5455bc26f', 'google-oauth2|andres-cuellar', 'bodega2@bancoalimentosneiva.org', 'Andrés Cuéllar', true),
  ('2dc3509e-85ae-5c95-aa4b-f12bc43c3a39', '4478fdef-5636-542c-9996-9fd5455bc26f', 'google-oauth2|sofia-trujillo', 'voluntario.recepcion@bancoalimentosneiva.org', 'Sofía Trujillo', false);
INSERT INTO seguridad.UsuarioRol (IdUsuario, IdRol) VALUES
  ('8356b1aa-ee4e-5ca4-985e-a8f93861d521', 'e66adb95-614c-5fad-9a60-ca0fbb811c5c'),
  ('888bbff9-b3e6-55ae-b4e7-96cd54ab3753', 'e2d9e3fc-81f8-5d6f-b237-f040c23c5832'),
  ('46c2ec28-1bcf-5fed-b82f-513880ed5a84', '8ea0017f-dff9-5a26-808a-25f2b89c4ffd'),
  ('fcc08889-2aff-5b04-8678-b1ccf1a74d77', '8ea0017f-dff9-5a26-808a-25f2b89c4ffd'),
  ('2dc3509e-85ae-5c95-aa4b-f12bc43c3a39', '8ea0017f-dff9-5a26-808a-25f2b89c4ffd');
INSERT INTO seguridad.RolPermiso (IdRol, IdPermiso) VALUES
  ('8ea0017f-dff9-5a26-808a-25f2b89c4ffd', 'ca10270d-835d-559d-b509-7f735d86d28b'),
  ('8ea0017f-dff9-5a26-808a-25f2b89c4ffd', '62651f4f-1966-5a63-b032-d34c2aeb7812'),
  ('8ea0017f-dff9-5a26-808a-25f2b89c4ffd', '79e191ac-a152-533c-acd5-05eda3e372d2'),
  ('e66adb95-614c-5fad-9a60-ca0fbb811c5c', '458ffb28-eb44-5f6d-afca-d8058fcb1acd'),
  ('e2d9e3fc-81f8-5d6f-b237-f040c23c5832', '458ffb28-eb44-5f6d-afca-d8058fcb1acd'),
  ('8ea0017f-dff9-5a26-808a-25f2b89c4ffd', '458ffb28-eb44-5f6d-afca-d8058fcb1acd'),
  ('e2d9e3fc-81f8-5d6f-b237-f040c23c5832', '4d6e8045-caa3-5bdd-a40a-7f040ae47fa5'),
  ('e2d9e3fc-81f8-5d6f-b237-f040c23c5832', '57461a1b-a5e7-5533-8388-3d3b86ea279b'),
  ('e2d9e3fc-81f8-5d6f-b237-f040c23c5832', '55cc6137-e12e-5177-b426-083a765ca285'),
  ('e66adb95-614c-5fad-9a60-ca0fbb811c5c', 'bfed4edf-37f8-530b-aef6-f668846dd5fd'),
  ('e2d9e3fc-81f8-5d6f-b237-f040c23c5832', 'bfed4edf-37f8-530b-aef6-f668846dd5fd'),
  ('e66adb95-614c-5fad-9a60-ca0fbb811c5c', 'e5d0f502-6736-5881-b8ca-54e78b28346b'),
  ('e66adb95-614c-5fad-9a60-ca0fbb811c5c', '4bd5b8f9-7485-53b8-87ab-b228092b303f'),
  ('e2d9e3fc-81f8-5d6f-b237-f040c23c5832', '069e28ba-675d-5b33-be93-8a9a74cc0922'),
  ('e66adb95-614c-5fad-9a60-ca0fbb811c5c', 'a3cf8067-a1a3-54cd-925b-e7291fb2ad19'),
  ('e66adb95-614c-5fad-9a60-ca0fbb811c5c', 'ebef4032-9ad4-5285-9848-d366e075b5dd'),
  ('e66adb95-614c-5fad-9a60-ca0fbb811c5c', '7a687eb1-550c-59ad-869f-5055a4096790');
INSERT INTO banco_neiva.Categoria (IdCategoria, Nombre, AplicaVencimiento, VidaUtilDias) VALUES
  ('444783e1-0867-56c4-9c2a-7127d1fe0039', 'Cereales', true, NULL),
  ('eed515b3-b2ab-5bd3-b5cf-1525537553c0', 'Frutas y verduras', true, 7),
  ('7cf619b9-52c3-5341-a95a-215ab3d99e24', 'Carnes', true, NULL),
  ('8da4464e-71a0-583d-9326-d69373b77c3c', 'Lácteos', true, NULL),
  ('23a9d051-19d8-50a9-9d94-89483c181f03', 'Panadería', true, 3),
  ('1754f274-6421-56cf-aa0f-f2c645988946', 'Granos', true, NULL),
  ('1a0a401b-973c-5eb4-9dd4-b35b62f2f3d3', 'Aceites', true, NULL),
  ('93d5fe7c-e964-5b8a-a677-76397de2b4bd', 'Aseo', false, NULL),
  ('a6b1131f-dc68-5a85-8848-faa20b6d8724', 'Electrodomésticos', false, NULL),
  ('b20b371b-9b6f-59d1-95ca-2b27dfdc4e38', 'Huevos', true, NULL),
  ('04ba9e9b-adc9-5742-80cc-3b44432b949a', 'Endulzantes', true, NULL),
  ('2ace13d0-f14d-5f41-afa8-21481d4f9498', 'Enlatados', true, NULL);
INSERT INTO banco_neiva.Producto (IdProducto, IdCategoria, Nombre) VALUES
  ('f8f20c86-a81f-5440-bb28-c11fff828fe0', '8da4464e-71a0-583d-9326-d69373b77c3c', 'Leche entera'),
  ('7cdc2ebe-ab7e-54f8-bcae-1b15a5fcad3d', '8da4464e-71a0-583d-9326-d69373b77c3c', 'Yogur'),
  ('0ee1839b-2c8f-5dbc-a164-615184874559', '8da4464e-71a0-583d-9326-d69373b77c3c', 'Queso campesino'),
  ('c88e6219-06be-5fda-b627-0ea983eed45f', '444783e1-0867-56c4-9c2a-7127d1fe0039', 'Arroz'),
  ('687fec2b-658e-551c-939d-4e66831c54b5', '444783e1-0867-56c4-9c2a-7127d1fe0039', 'Pasta'),
  ('0e24f37e-2fd4-5803-9a45-a84ce459e124', '444783e1-0867-56c4-9c2a-7127d1fe0039', 'Avena en hojuelas'),
  ('072b9856-c711-5a62-8ed9-e7b690a5884e', '1754f274-6421-56cf-aa0f-f2c645988946', 'Fríjol'),
  ('54642a2c-5f8c-5095-8836-3fe9b7411fd5', '1754f274-6421-56cf-aa0f-f2c645988946', 'Lenteja'),
  ('505aeab9-185e-5873-bb20-5af60d74dfc7', 'eed515b3-b2ab-5bd3-b5cf-1525537553c0', 'Sandía'),
  ('f5fc42c9-5340-552d-a738-2502b061f215', 'eed515b3-b2ab-5bd3-b5cf-1525537553c0', 'Tomate'),
  ('6008960b-8051-5149-b357-2ff40b78b2bf', 'eed515b3-b2ab-5bd3-b5cf-1525537553c0', 'Banano'),
  ('8ff1248a-2401-509b-9e71-50597f7a1d8f', '23a9d051-19d8-50a9-9d94-89483c181f03', 'Pan tajado'),
  ('1d5d5415-5810-56a9-829f-61c5db74733c', '7cf619b9-52c3-5341-a95a-215ab3d99e24', 'Pechuga de pollo'),
  ('feb8d8ed-bd16-51fc-aa57-8ae00565960d', 'b20b371b-9b6f-59d1-95ca-2b27dfdc4e38', 'Huevos'),
  ('63e14a84-003f-565d-9ead-6b0078cd6784', '04ba9e9b-adc9-5742-80cc-3b44432b949a', 'Panela'),
  ('d67b9e66-f729-560a-b648-cf819d2c554e', '1a0a401b-973c-5eb4-9dd4-b35b62f2f3d3', 'Aceite vegetal'),
  ('5841e571-25f1-5e3e-9463-b0268035bf65', '2ace13d0-f14d-5f41-afa8-21481d4f9498', 'Atún en lata'),
  ('f60fa8e3-1af2-5bd0-88ee-ae4c082d0b94', '93d5fe7c-e964-5b8a-a677-76397de2b4bd', 'Jabón de loza');
INSERT INTO banco_neiva.Presentacion (IdPresentacion, IdProducto, Contenido, Unidad, Nombre, UnidadConteo) VALUES
  ('feb96855-dc17-5584-aeb6-dc7cffe53904', 'f8f20c86-a81f-5440-bb28-c11fff828fe0', 1100, 'ML', 'Caja 1.100 ml', 'cajas'),
  ('16cd725f-f3c0-5179-8c99-26a93b7f3c88', 'f8f20c86-a81f-5440-bb28-c11fff828fe0', 6600, 'ML', 'Paca 6 × 1.100 ml', 'pacas'),
  ('22f6905d-a41a-5d86-a985-c392f10d411c', '7cdc2ebe-ab7e-54f8-bcae-1b15a5fcad3d', 1000, 'ML', 'Botella 1.000 ml', 'botellas'),
  ('88d701d3-18f6-57e5-9f2e-4ebe6140659d', '0ee1839b-2c8f-5dbc-a164-615184874559', 500, 'G', 'Bloque 500 g', 'bloques'),
  ('331f0a42-f291-5cf4-b72f-ad933130a31b', 'c88e6219-06be-5fda-b627-0ea983eed45f', 50000, 'G', 'Bulto 50 kg', 'bultos'),
  ('8024eea5-b25e-5b54-95b6-52adfd6b8df2', 'c88e6219-06be-5fda-b627-0ea983eed45f', 1000, 'G', 'Bolsa 1 kg', 'bolsas'),
  ('dfca0798-1811-591b-ac5a-aa48d5161873', '687fec2b-658e-551c-939d-4e66831c54b5', 500, 'G', 'Bolsa 500 g', 'bolsas'),
  ('62f770bc-9373-50d9-8dad-ba761d5ca9f8', '0e24f37e-2fd4-5803-9a45-a84ce459e124', 500, 'G', 'Bolsa 500 g', 'bolsas'),
  ('24de1d18-0ad9-5888-a896-4a0b283ee599', '072b9856-c711-5a62-8ed9-e7b690a5884e', 500, 'G', 'Bolsa 500 g', 'bolsas'),
  ('6341db14-f9f6-5e67-98ea-680a13bfa3da', '54642a2c-5f8c-5095-8836-3fe9b7411fd5', 500, 'G', 'Bolsa 500 g', 'bolsas'),
  ('3d95f0e7-ab9c-586b-8f82-425b6324a86b', '505aeab9-185e-5873-bb20-5af60d74dfc7', 1000, 'G', 'Granel, por kg', 'kg'),
  ('fc01e030-eb47-5913-bf3e-7b28d92d43b8', 'f5fc42c9-5340-552d-a738-2502b061f215', 1000, 'G', 'Granel, por kg', 'kg'),
  ('21ad5863-d9f9-50fa-8c06-4c478730051a', '6008960b-8051-5149-b357-2ff40b78b2bf', 1000, 'G', 'Granel, por kg', 'kg'),
  ('bc007f6d-4b09-5dba-ab0e-275f4f5da0d1', '8ff1248a-2401-509b-9e71-50597f7a1d8f', 500, 'G', 'Bolsa 500 g', 'bolsas'),
  ('d8d36d1c-a11c-5474-afa6-22002fd15f75', '1d5d5415-5810-56a9-829f-61c5db74733c', 2000, 'G', 'Bandeja congelada 2 kg', 'bandejas'),
  ('2cbcc6a0-5259-55fd-806f-6403d3639c5f', 'feb8d8ed-bd16-51fc-aa57-8ae00565960d', 1800, 'G', 'Bandeja 30 unidades', 'bandejas'),
  ('070fb127-abda-5335-b71b-49cbdcb66b82', '63e14a84-003f-565d-9ead-6b0078cd6784', 500, 'G', 'Bloque 500 g', 'bloques'),
  ('0662a8ca-d262-5846-a7ba-515b08e4b09b', 'd67b9e66-f729-560a-b648-cf819d2c554e', 1000, 'ML', 'Botella 1.000 ml', 'botellas'),
  ('32b3aaa3-fb76-5fd4-afbb-7631a4029bfb', '5841e571-25f1-5e3e-9463-b0268035bf65', 170, 'G', 'Lata 170 g', 'latas'),
  ('5205eb64-4c44-5f19-aeed-8edf9cc18121', 'f60fa8e3-1af2-5bd0-88ee-ae4c082d0b94', 300, 'G', 'Barra 300 g', 'barras');
INSERT INTO banco_neiva.Donante (IdDonante, Nombre, NIT) VALUES
  ('f65ca665-5ecf-5e2a-82e1-6fbf96089006', 'Carulla', NULL),
  ('470b0f26-5624-5380-9a28-363e23d5ea4a', 'Plaza Mercado Sur', NULL),
  ('e5c8b238-90a6-582b-bb2a-af7f5719bf5d', 'Almacenes Éxito', NULL),
  ('233f3d9c-1b3b-5cfc-a021-a2103e674834', 'Lácteos del Huila', NULL),
  ('2bcd88e6-74a0-589e-ad27-73ba1f7a6cbf', 'Olímpica', NULL);
INSERT INTO banco_neiva.Recepcion (IdRecepcion, Origen, IdDonante, Fecha, NumeroSoporte, SoporteUrl, IdUsuario, Numero, Estado) VALUES
  ('66fe1bee-2a6b-5c81-a849-f30bb449d827', 'DONACION', 'f65ca665-5ecf-5e2a-82e1-6fbf96089006', '2026-11-10', 'EatCloud #55188', 'soportes/R-0460.pdf', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', 'R-0460', 'BORRADOR'),
  ('3f06ac62-d91a-5a36-8797-ab797a935f09', 'COMPRA', '470b0f26-5624-5380-9a28-363e23d5ea4a', '2026-11-09', 'Factura 3321', 'soportes/R-0459.pdf', 'fcc08889-2aff-5b04-8678-b1ccf1a74d77', 'R-0459', 'BORRADOR'),
  ('f9254124-7a4e-5cff-bb83-a95c0417c0e9', 'DONACION', 'e5c8b238-90a6-582b-bb2a-af7f5719bf5d', '2026-11-08', 'EatCloud #55120', 'soportes/R-0458.pdf', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', 'R-0458', 'BORRADOR'),
  ('4a386753-2f9a-516d-be49-cfbaf1e29c9d', 'DONACION', '233f3d9c-1b3b-5cfc-a021-a2103e674834', '2026-10-24', 'Remisión 2251', 'soportes/R-0446.pdf', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', 'R-0446', 'CONFIRMADA'),
  ('0bcb47c5-06ca-597d-9539-c3425f15b52a', 'DONACION', 'f65ca665-5ecf-5e2a-82e1-6fbf96089006', '2026-10-23', 'EatCloud #54930', 'soportes/R-0445.pdf', '2dc3509e-85ae-5c95-aa4b-f12bc43c3a39', 'R-0445', 'CONFIRMADA'),
  ('55ee2107-ac0c-57c0-9109-3c654061bda8', 'DONACION', '2bcd88e6-74a0-589e-ad27-73ba1f7a6cbf', '2026-10-20', 'EatCloud #54871', 'soportes/R-0440.pdf', 'fcc08889-2aff-5b04-8678-b1ccf1a74d77', 'R-0440', 'CONFIRMADA'),
  ('21da2e11-78bf-5116-b687-84e9aaf0008b', 'DONACION', 'e5c8b238-90a6-582b-bb2a-af7f5719bf5d', '2026-10-17', 'EatCloud #54820', 'soportes/R-0438.pdf', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', 'R-0438', 'CONFIRMADA'),
  ('7f9f4c57-5d47-5832-93f9-51088ce55793', 'DONACION', '2bcd88e6-74a0-589e-ad27-73ba1f7a6cbf', '2026-10-14', 'EatCloud #54788', 'soportes/R-0435.pdf', 'fcc08889-2aff-5b04-8678-b1ccf1a74d77', 'R-0435', 'CONFIRMADA'),
  ('0754ca42-9acd-5b4a-aa4d-784e4f3288be', 'DONACION', '233f3d9c-1b3b-5cfc-a021-a2103e674834', '2026-10-10', 'Remisión 2210', 'soportes/R-0431.pdf', '2dc3509e-85ae-5c95-aa4b-f12bc43c3a39', 'R-0431', 'CONFIRMADA'),
  ('78c766ac-7406-5afe-8b9e-7da4ffb97811', 'DONACION', 'f65ca665-5ecf-5e2a-82e1-6fbf96089006', '2026-10-02', 'EatCloud #54650', 'soportes/R-0422.pdf', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', 'R-0422', 'CONFIRMADA'),
  ('50745017-03cf-58d4-bcd2-bdbbee140d06', 'DONACION', '2bcd88e6-74a0-589e-ad27-73ba1f7a6cbf', '2026-09-30', 'EatCloud #54612', 'soportes/R-0420.pdf', 'fcc08889-2aff-5b04-8678-b1ccf1a74d77', 'R-0420', 'CONFIRMADA');
INSERT INTO banco_neiva.Lote (IdLote, IdRecepcion, IdPresentacion, IdLoteOrigen, FechaVencimiento, VencimientoEstimado, Codigo) VALUES
  ('8db073c7-8748-59c1-9e0c-29be7dc0c050', 'f9254124-7a4e-5cff-bb83-a95c0417c0e9', 'bc007f6d-4b09-5dba-ab0e-275f4f5da0d1', NULL, '2026-11-11', true, 'L-104'),
  ('e48dce08-e6b5-51f6-89a1-7c4dd1cef1c3', 'f9254124-7a4e-5cff-bb83-a95c0417c0e9', 'd8d36d1c-a11c-5474-afa6-22002fd15f75', NULL, '2026-11-12', false, 'L-105'),
  ('817c47a4-5db0-5288-a289-5d72fb75800c', '55ee2107-ac0c-57c0-9109-3c654061bda8', '22f6905d-a41a-5d86-a985-c392f10d411c', NULL, '2026-11-12', false, 'L-095'),
  ('111186cb-d55f-55f2-8c9e-d378a198f6e0', '0bcb47c5-06ca-597d-9539-c3425f15b52a', 'fc01e030-eb47-5913-bf3e-7b28d92d43b8', NULL, '2026-11-13', true, 'L-097'),
  ('beaa7891-7bf2-5973-ab9a-d7cd17de3063', '4a386753-2f9a-516d-be49-cfbaf1e29c9d', '88d701d3-18f6-57e5-9f2e-4ebe6140659d', NULL, '2026-11-13', false, 'L-099'),
  ('62c48d07-8392-5742-ab4b-10dc39ca1395', '0bcb47c5-06ca-597d-9539-c3425f15b52a', '21ad5863-d9f9-50fa-8c06-4c478730051a', NULL, '2026-11-14', true, 'L-098'),
  ('abc05689-ba0f-5cf6-aaa0-daecdfab0ff4', 'f9254124-7a4e-5cff-bb83-a95c0417c0e9', '3d95f0e7-ab9c-586b-8f82-425b6324a86b', NULL, '2026-11-15', true, 'L-103'),
  ('f5d4eb85-caec-5da4-90f6-8157199b7643', '0754ca42-9acd-5b4a-aa4d-784e4f3288be', 'feb96855-dc17-5584-aeb6-dc7cffe53904', NULL, '2026-11-18', false, 'L-090'),
  ('d9b2a83e-6f81-51c0-a6e6-8cdab9c24ea3', '55ee2107-ac0c-57c0-9109-3c654061bda8', '2cbcc6a0-5259-55fd-806f-6403d3639c5f', NULL, '2026-11-19', false, 'L-096'),
  ('97de4fbc-8f68-5774-8539-fff956572a7d', 'f9254124-7a4e-5cff-bb83-a95c0417c0e9', 'feb96855-dc17-5584-aeb6-dc7cffe53904', NULL, '2026-11-20', false, 'L-101'),
  ('fd565a68-b1b9-59ba-a1a5-88a92812b1d8', '7f9f4c57-5d47-5832-93f9-51088ce55793', 'dfca0798-1811-591b-ac5a-aa48d5161873', NULL, '2026-12-10', false, 'L-091'),
  ('52789e81-17f6-5773-8b1b-71cb5b5dccb8', '7f9f4c57-5d47-5832-93f9-51088ce55793', '62f770bc-9373-50d9-8dad-ba761d5ca9f8', NULL, '2026-12-22', false, 'L-092'),
  ('e185a38b-f8da-57ae-933e-5d425772a9f2', '21da2e11-78bf-5116-b687-84e9aaf0008b', '070fb127-abda-5335-b71b-49cbdcb66b82', NULL, '2027-01-18', false, 'L-093'),
  ('8ac80433-ebd0-51ed-a152-d503176e4a20', '50745017-03cf-58d4-bcd2-bdbbee140d06', '24de1d18-0ad9-5888-a896-4a0b283ee599', NULL, '2027-01-20', false, 'L-085'),
  ('240f5060-3ad5-5909-891a-48b5bccc00ad', '50745017-03cf-58d4-bcd2-bdbbee140d06', '6341db14-f9f6-5e67-98ea-680a13bfa3da', NULL, '2027-02-05', false, 'L-086'),
  ('e7e9bbbf-16a5-5e29-8233-de07effb7a13', 'f9254124-7a4e-5cff-bb83-a95c0417c0e9', '331f0a42-f291-5cf4-b72f-ad933130a31b', NULL, '2027-03-15', false, 'L-102'),
  ('56e9d4b5-6020-52da-8b23-9495ad8a3795', 'f9254124-7a4e-5cff-bb83-a95c0417c0e9', '8024eea5-b25e-5b54-95b6-52adfd6b8df2', 'e7e9bbbf-16a5-5e29-8233-de07effb7a13', '2027-03-15', false, 'L-106'),
  ('cfa3a681-1d8b-5c8e-a980-4976d4389400', '78c766ac-7406-5afe-8b9e-7da4ffb97811', '0662a8ca-d262-5846-a7ba-515b08e4b09b', NULL, '2027-04-30', false, 'L-087'),
  ('2c9040d9-c314-5ef8-8b64-124330a84611', '78c766ac-7406-5afe-8b9e-7da4ffb97811', '32b3aaa3-fb76-5fd4-afbb-7631a4029bfb', NULL, '2027-08-15', false, 'L-088'),
  ('dbc2c837-c163-55c5-aef3-2971734293f6', '21da2e11-78bf-5116-b687-84e9aaf0008b', '5205eb64-4c44-5f19-aeed-8edf9cc18121', NULL, NULL, false, 'L-094'),
  ('b7435b2d-1b13-5a10-b2c7-262ebeaf7463', NULL, '21ad5863-d9f9-50fa-8c06-4c478730051a', NULL, '2026-11-05', true, 'L-082'),
  ('fdc2c0f4-c72f-5277-a50d-62698460bae8', NULL, 'd8d36d1c-a11c-5474-afa6-22002fd15f75', NULL, '2026-11-07', false, 'L-079'),
  ('2b9ee531-8739-503e-9359-752375700a8a', NULL, 'bc007f6d-4b09-5dba-ab0e-275f4f5da0d1', NULL, '2026-11-08', true, 'L-084');
INSERT INTO banco_neiva.RiesgoLote (IdLote, FechaCalculo, Nivel, DiasParaVencer, KgEnRiesgo, VersionModelo) VALUES
  ('8db073c7-8748-59c1-9e0c-29be7dc0c050', '2026-11-10T06:00:00-05:00', 'ALTO', 1, 30, 'reglas-vida-util-v1'),
  ('e48dce08-e6b5-51f6-89a1-7c4dd1cef1c3', '2026-11-10T06:00:00-05:00', 'ALTO', 2, 30, 'reglas-vida-util-v1'),
  ('817c47a4-5db0-5288-a289-5d72fb75800c', '2026-11-10T06:00:00-05:00', 'ALTO', 2, 24, 'reglas-vida-util-v1'),
  ('111186cb-d55f-55f2-8c9e-d378a198f6e0', '2026-11-10T06:00:00-05:00', 'MEDIO', 3, 140, 'reglas-vida-util-v1'),
  ('beaa7891-7bf2-5973-ab9a-d7cd17de3063', '2026-11-10T06:00:00-05:00', 'MEDIO', 3, 15, 'reglas-vida-util-v1'),
  ('62c48d07-8392-5742-ab4b-10dc39ca1395', '2026-11-10T06:00:00-05:00', 'MEDIO', 4, 210, 'reglas-vida-util-v1'),
  ('d9b2a83e-6f81-51c0-a6e6-8cdab9c24ea3', '2026-11-10T06:00:00-05:00', 'BAJO', 9, 21.6, 'reglas-vida-util-v1'),
  ('abc05689-ba0f-5cf6-aaa0-daecdfab0ff4', '2026-11-10T06:00:00-05:00', 'MEDIO', 5, 680, 'reglas-vida-util-v1'),
  ('f5d4eb85-caec-5da4-90f6-8157199b7643', '2026-11-10T06:00:00-05:00', 'MEDIO', 8, 11, 'reglas-vida-util-v1'),
  ('97de4fbc-8f68-5774-8539-fff956572a7d', '2026-11-10T06:00:00-05:00', 'BAJO', 10, 46.2, 'reglas-vida-util-v1');
INSERT INTO banco_neiva.Organizacion (IdOrganizacion, Nombre, NIT, Municipio, Estado, Etapa) VALUES
  ('1950ffda-058d-5748-814f-35a06ba1a559', 'Hogar Feliz', '900.412.336-1', 'Neiva', 'PERMANENTE', 'VINCULADA'),
  ('d0ca66a4-0395-577f-b071-fe49324f99ed', 'Comedor Parroquial San José', '891.180.077-4', 'Neiva', 'PERMANENTE', 'VINCULADA'),
  ('2d65d5dd-e724-535a-b12b-6418b7896f21', 'Fundación Huellas de Vida', '900.877.120-9', 'Pitalito', 'PERMANENTE', 'VINCULADA'),
  ('8e2cf082-ccea-5d0b-8c5a-1a7382466913', 'Asociación Mujeres del Sur', '901.334.508-2', 'Garzón', 'ESPORADICA', 'VISITA'),
  ('2cac6bb5-b208-5c76-ad06-9ae7e27bc6c8', 'JAC Barrio Las Palmas', '900.990.214-7', 'Neiva', 'ESPORADICA', 'CONTACTO'),
  ('e96431a1-7f91-5ee5-b26a-26331380a6b1', 'Hogar Infantil Semillas', '900.551.802-3', 'Campoalegre', 'PERMANENTE', 'RADICACION');
INSERT INTO banco_neiva.Representante (IdRepresentante, IdOrganizacion, Nombre, Documento, Telefono) VALUES
  ('daf1657a-d11f-5d64-adb8-e8e4ec88951b', '1950ffda-058d-5748-814f-35a06ba1a559', 'María Elena Ruiz', '1.075.xxx.214', '310 *** 4471'),
  ('f1d20541-eedd-5084-b70b-e9305deaf096', 'd0ca66a4-0395-577f-b071-fe49324f99ed', 'Jorge Iván Cabrera', '12.130.xxx', '315 *** 2208'),
  ('b450fda2-669a-531c-ab02-9b11b5014a41', '2d65d5dd-e724-535a-b12b-6418b7896f21', 'Diana Patricia Losada', '36.172.xxx', '312 *** 9015'),
  ('a9274747-df9a-58e6-bc78-09bbf0a4b9db', '8e2cf082-ccea-5d0b-8c5a-1a7382466913', 'Luz Marina Perdomo', '26.420.xxx', '318 *** 6630'),
  ('e316bc31-1165-56e6-ab73-00f38d83e38f', '2cac6bb5-b208-5c76-ad06-9ae7e27bc6c8', 'Hernán Darío Trujillo', '7.689.xxx', '311 *** 1187'),
  ('0e51e601-786a-54dc-acfc-2d30cb8db4ac', 'e96431a1-7f91-5ee5-b26a-26331380a6b1', 'Claudia Milena Ortiz', '55.168.xxx', '313 *** 5542');
INSERT INTO banco_neiva.AutorizacionDatos (IdAutorizacion, IdRepresentante, Fecha, Medio, Finalidades, VersionPolitica, SoporteUrl) VALUES
  ('cc3a82f0-9280-5732-b474-de39805828da', 'daf1657a-d11f-5d64-adb8-e8e4ec88951b', '2026-02-10', 'Formato físico firmado', 'Gestión de la vinculación; Programación y entrega de remisiones; Reportes agregados a la red de bancos', 'v2.1', 'autorizaciones/autorizacion_hogar_feliz.pdf'),
  ('5b659336-f171-59ef-bd73-9a33e49877e7', 'f1d20541-eedd-5084-b70b-e9305deaf096', '2026-03-04', 'Formulario digital', 'Gestión de la vinculación; Programación y entrega de remisiones', 'v2.1', 'autorizaciones/autorizacion_san_jose.pdf'),
  ('4cc203fe-9cd8-5c6e-9f27-157203afbd5d', 'b450fda2-669a-531c-ab02-9b11b5014a41', '2024-08-21', 'Formato físico firmado', 'Gestión de la vinculación; Programación y entrega de remisiones', 'v1.0', 'autorizaciones/autorizacion_huellas_2024.pdf');
INSERT INTO banco_neiva.PoblacionAtendida (IdOrganizacion, Grupo, Cantidad) VALUES
  ('1950ffda-058d-5748-814f-35a06ba1a559', 'Niños y niñas', 52),
  ('1950ffda-058d-5748-814f-35a06ba1a559', 'Adultos mayores', 34),
  ('d0ca66a4-0395-577f-b071-fe49324f99ed', 'Adultos mayores', 120),
  ('d0ca66a4-0395-577f-b071-fe49324f99ed', 'Personas en situación de calle', 90),
  ('2d65d5dd-e724-535a-b12b-6418b7896f21', 'Familias desplazadas', 54),
  ('8e2cf082-ccea-5d0b-8c5a-1a7382466913', 'Madres cabeza de hogar', 40),
  ('2cac6bb5-b208-5c76-ad06-9ae7e27bc6c8', 'Niños y niñas', 60),
  ('e96431a1-7f91-5ee5-b26a-26331380a6b1', 'Niños y niñas', 45);
INSERT INTO banco_neiva.Programa (IdPrograma, Nombre, Activo) VALUES
  ('65d390b0-f5e8-50ff-862f-2e83a9fc9c05', 'Mercado solidario', true),
  ('edb1789f-219a-510d-83e1-20655452ad49', 'Comedores comunitarios', true),
  ('b868b256-9ee4-5cf2-9eb6-78b7ac19b3e3', 'Atención de emergencias', true);
INSERT INTO banco_neiva.ComponenteKit (IdPrograma, IdProducto, KgPorKit) VALUES
  ('65d390b0-f5e8-50ff-862f-2e83a9fc9c05', 'c88e6219-06be-5fda-b627-0ea983eed45f', 1),
  ('65d390b0-f5e8-50ff-862f-2e83a9fc9c05', 'f8f20c86-a81f-5440-bb28-c11fff828fe0', 1.1),
  ('65d390b0-f5e8-50ff-862f-2e83a9fc9c05', '505aeab9-185e-5873-bb20-5af60d74dfc7', 3),
  ('65d390b0-f5e8-50ff-862f-2e83a9fc9c05', '8ff1248a-2401-509b-9e71-50597f7a1d8f', 0.5),
  ('edb1789f-219a-510d-83e1-20655452ad49', 'c88e6219-06be-5fda-b627-0ea983eed45f', 2),
  ('edb1789f-219a-510d-83e1-20655452ad49', '072b9856-c711-5a62-8ed9-e7b690a5884e', 1),
  ('edb1789f-219a-510d-83e1-20655452ad49', 'd67b9e66-f729-560a-b648-cf819d2c554e', 0.5),
  ('edb1789f-219a-510d-83e1-20655452ad49', '63e14a84-003f-565d-9ead-6b0078cd6784', 0.5),
  ('b868b256-9ee4-5cf2-9eb6-78b7ac19b3e3', 'c88e6219-06be-5fda-b627-0ea983eed45f', 2),
  ('b868b256-9ee4-5cf2-9eb6-78b7ac19b3e3', '072b9856-c711-5a62-8ed9-e7b690a5884e', 1),
  ('b868b256-9ee4-5cf2-9eb6-78b7ac19b3e3', '5841e571-25f1-5e3e-9463-b0268035bf65', 0.34),
  ('b868b256-9ee4-5cf2-9eb6-78b7ac19b3e3', '63e14a84-003f-565d-9ead-6b0078cd6784', 1),
  ('b868b256-9ee4-5cf2-9eb6-78b7ac19b3e3', 'd67b9e66-f729-560a-b648-cf819d2c554e', 1);
INSERT INTO banco_neiva.Remision (IdRemision, Numero, Fecha, IdOrganizacion, IdPrograma, NumeroKits, PdfUrl) VALUES
  ('edbfaf63-490a-5a05-a6fd-2f423e530d0f', 'S-0911', '2026-11-09', 'd0ca66a4-0395-577f-b071-fe49324f99ed', 'edb1789f-219a-510d-83e1-20655452ad49', 30, 'remisiones/S-0911.pdf'),
  ('115cf1bf-72b3-50aa-96b8-826b5314da61', 'S-0910', '2026-11-08', '1950ffda-058d-5748-814f-35a06ba1a559', '65d390b0-f5e8-50ff-862f-2e83a9fc9c05', 18, 'remisiones/S-0910.pdf'),
  ('c652b4e3-ca4b-5359-9cba-66044746bc03', 'S-0905', '2026-11-05', 'd0ca66a4-0395-577f-b071-fe49324f99ed', 'edb1789f-219a-510d-83e1-20655452ad49', 28, 'remisiones/S-0905.pdf'),
  ('c6a65875-6121-51ec-9166-405d14aa4387', 'S-0901', '2026-11-01', 'd0ca66a4-0395-577f-b071-fe49324f99ed', 'edb1789f-219a-510d-83e1-20655452ad49', 26, 'remisiones/S-0901.pdf'),
  ('a27cdc67-bfbc-5fa8-a138-fc1829d5704d', 'S-0897', '2026-10-29', '1950ffda-058d-5748-814f-35a06ba1a559', '65d390b0-f5e8-50ff-862f-2e83a9fc9c05', 17, 'remisiones/S-0897.pdf'),
  ('f0bc63ab-5d9a-5c57-8870-9efcc1a31f71', 'S-0893', '2026-10-26', '1950ffda-058d-5748-814f-35a06ba1a559', '65d390b0-f5e8-50ff-862f-2e83a9fc9c05', 16, 'remisiones/S-0893.pdf'),
  ('3b9bb57b-ea71-55e3-b7b7-56c064a6e44e', 'S-0889', '2026-10-22', '2d65d5dd-e724-535a-b12b-6418b7896f21', '65d390b0-f5e8-50ff-862f-2e83a9fc9c05', 13, 'remisiones/S-0889.pdf');
INSERT INTO banco_neiva.MotivoExcepcionFefo (IdMotivo, Descripcion, Activo) VALUES
  ('529971dc-e5e9-5d5b-bd93-77c56addb419', 'Lote dañado', true),
  ('bc1d1eb2-5fc5-597e-92f0-1ea2877fb5b7', 'Lote no encontrado en bodega', true);
-- DetalleRemision: sin datos de ejemplo en el prototipo
INSERT INTO banco_neiva.MovimientoInventario (IdMovimiento, IdLote, Tipo, Cantidad, Kg, Fecha, IdUsuario, IdRemision, IdMovimientoCorregido) VALUES
  ('6dd9183e-920a-593b-b95f-8d1454b31e6a', '8db073c7-8748-59c1-9e0c-29be7dc0c050', 'ENTRADA', 60, 30.0, '2026-11-08T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('83251515-7f3d-5f8a-b6b6-be55e5731e1e', 'e48dce08-e6b5-51f6-89a1-7c4dd1cef1c3', 'ENTRADA', 15, 30.0, '2026-11-08T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('520452fc-81a7-5be9-8748-b05b3fce65ef', '817c47a4-5db0-5288-a289-5d72fb75800c', 'ENTRADA', 30, 30.0, '2026-10-20T08:00:00-05:00', 'fcc08889-2aff-5b04-8678-b1ccf1a74d77', NULL, NULL),
  ('28313a77-03a1-58f7-a000-81895777f3ab', '817c47a4-5db0-5288-a289-5d72fb75800c', 'DESECHO_RECEPCION', 2, 2.0, '2026-10-20T08:00:00-05:00', 'fcc08889-2aff-5b04-8678-b1ccf1a74d77', NULL, NULL),
  ('3be19a4a-1a7d-5cff-9767-8af46f0aa9f4', '817c47a4-5db0-5288-a289-5d72fb75800c', 'SALIDA_REMISION', 4, 4.0, '2026-11-05T08:00:00-05:00', '888bbff9-b3e6-55ae-b4e7-96cd54ab3753', NULL, NULL),
  ('adfd4519-3ba0-58ec-9ffe-d9003c7d4a57', '111186cb-d55f-55f2-8c9e-d378a198f6e0', 'ENTRADA', 160, 160.0, '2026-10-23T08:00:00-05:00', '2dc3509e-85ae-5c95-aa4b-f12bc43c3a39', NULL, NULL),
  ('7086b510-c435-5774-a9ce-9bc647ec9168', '111186cb-d55f-55f2-8c9e-d378a198f6e0', 'DESECHO_RECEPCION', 20, 20.0, '2026-10-23T08:00:00-05:00', '2dc3509e-85ae-5c95-aa4b-f12bc43c3a39', NULL, NULL),
  ('0c5eca43-ba7b-5bd3-9b8c-5ddbf627f488', 'beaa7891-7bf2-5973-ab9a-d7cd17de3063', 'ENTRADA', 30, 15.0, '2026-10-24T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('071e8c2b-3f1f-57cb-8291-73acfe915bde', '62c48d07-8392-5742-ab4b-10dc39ca1395', 'ENTRADA', 230, 230.0, '2026-10-23T08:00:00-05:00', '2dc3509e-85ae-5c95-aa4b-f12bc43c3a39', NULL, NULL),
  ('6c9776f7-e469-5d6f-ac47-cd94b7371236', '62c48d07-8392-5742-ab4b-10dc39ca1395', 'DESECHO_RECEPCION', 20, 20.0, '2026-10-23T08:00:00-05:00', '2dc3509e-85ae-5c95-aa4b-f12bc43c3a39', NULL, NULL),
  ('fb63bfc7-8d8c-5c44-91ec-94f53bc016f2', 'abc05689-ba0f-5cf6-aaa0-daecdfab0ff4', 'ENTRADA', 800, 800.0, '2026-11-08T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('7786952e-ce6b-55ac-bf68-3e46f791849a', 'abc05689-ba0f-5cf6-aaa0-daecdfab0ff4', 'DESECHO_RECEPCION', 120, 120.0, '2026-11-08T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('d5f50e21-f4a9-536e-b078-00c5b4464805', 'f5d4eb85-caec-5da4-90f6-8157199b7643', 'ENTRADA', 30, 33.0, '2026-10-10T08:00:00-05:00', '2dc3509e-85ae-5c95-aa4b-f12bc43c3a39', NULL, NULL),
  ('30e4a9d6-6957-58ba-aa5b-5bdb679ef5ab', 'f5d4eb85-caec-5da4-90f6-8157199b7643', 'SALIDA_REMISION', 20, 22.0, '2026-11-05T08:00:00-05:00', '888bbff9-b3e6-55ae-b4e7-96cd54ab3753', NULL, NULL),
  ('17613a8e-e17a-53db-8487-dccbc26c15f6', 'd9b2a83e-6f81-51c0-a6e6-8cdab9c24ea3', 'ENTRADA', 15, 27.0, '2026-10-20T08:00:00-05:00', 'fcc08889-2aff-5b04-8678-b1ccf1a74d77', NULL, NULL),
  ('83de5919-64b9-52f0-ba84-a07be5b26314', 'd9b2a83e-6f81-51c0-a6e6-8cdab9c24ea3', 'DESECHO_RECEPCION', 1, 1.8, '2026-10-20T08:00:00-05:00', 'fcc08889-2aff-5b04-8678-b1ccf1a74d77', NULL, NULL),
  ('5150253d-699e-5255-bd03-4434f39be3af', 'd9b2a83e-6f81-51c0-a6e6-8cdab9c24ea3', 'SALIDA_REMISION', 2, 3.6, '2026-11-05T08:00:00-05:00', '888bbff9-b3e6-55ae-b4e7-96cd54ab3753', NULL, NULL),
  ('7591390a-f8a8-58a5-ae25-d737f6503b59', '97de4fbc-8f68-5774-8539-fff956572a7d', 'ENTRADA', 48, 52.8, '2026-11-08T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('2e7781f7-6baa-5970-9077-6c10798ff114', '97de4fbc-8f68-5774-8539-fff956572a7d', 'DESECHO_RECEPCION', 6, 6.6, '2026-11-08T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('80b78163-44e9-5941-95bc-ec441ab7edcc', 'fd565a68-b1b9-59ba-a1a5-88a92812b1d8', 'ENTRADA', 120, 60.0, '2026-10-14T08:00:00-05:00', 'fcc08889-2aff-5b04-8678-b1ccf1a74d77', NULL, NULL),
  ('75bb6ee5-cc74-59ec-b31b-a2b36e089370', 'fd565a68-b1b9-59ba-a1a5-88a92812b1d8', 'SALIDA_REMISION', 20, 10.0, '2026-11-05T08:00:00-05:00', '888bbff9-b3e6-55ae-b4e7-96cd54ab3753', NULL, NULL),
  ('41f05ef6-3ea7-5c98-a905-8bf54d6ead1d', '52789e81-17f6-5773-8b1b-71cb5b5dccb8', 'ENTRADA', 40, 20.0, '2026-10-14T08:00:00-05:00', 'fcc08889-2aff-5b04-8678-b1ccf1a74d77', NULL, NULL),
  ('f7022843-33d9-5ecc-905c-6fd5b9b3183d', 'e185a38b-f8da-57ae-933e-5d425772a9f2', 'ENTRADA', 60, 30.0, '2026-10-17T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('4a689d43-6f34-5c13-bb7a-1087c1ccfab5', 'e185a38b-f8da-57ae-933e-5d425772a9f2', 'SALIDA_REMISION', 10, 5.0, '2026-11-05T08:00:00-05:00', '888bbff9-b3e6-55ae-b4e7-96cd54ab3753', NULL, NULL),
  ('2580a6c9-53a1-5131-9164-7acfe2d09954', '8ac80433-ebd0-51ed-a152-d503176e4a20', 'ENTRADA', 100, 50.0, '2026-09-30T08:00:00-05:00', 'fcc08889-2aff-5b04-8678-b1ccf1a74d77', NULL, NULL),
  ('dd4a433b-cb39-53e6-83f7-75ce89cd3883', '8ac80433-ebd0-51ed-a152-d503176e4a20', 'SALIDA_REMISION', 20, 10.0, '2026-11-05T08:00:00-05:00', '888bbff9-b3e6-55ae-b4e7-96cd54ab3753', NULL, NULL),
  ('c68c86a0-827b-5a2c-804f-d978f17f69ba', '240f5060-3ad5-5909-891a-48b5bccc00ad', 'ENTRADA', 60, 30.0, '2026-09-30T08:00:00-05:00', 'fcc08889-2aff-5b04-8678-b1ccf1a74d77', NULL, NULL),
  ('92ca9820-89e1-522b-ae16-dfd13a564396', 'e7e9bbbf-16a5-5e29-8233-de07effb7a13', 'ENTRADA', 4, 200.0, '2026-11-08T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('b97c037b-72f4-5cb0-87d5-da1b5365453b', 'e7e9bbbf-16a5-5e29-8233-de07effb7a13', 'FRACCIONAMIENTO_SALIDA', 1, 50.0, '2026-11-10T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('200893cb-40aa-5ef6-ba5a-ec229bfc547c', '56e9d4b5-6020-52da-8b23-9495ad8a3795', 'FRACCIONAMIENTO_ENTRADA', 50, 50.0, '2026-11-10T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('a668d833-2728-581f-8437-c3201bf34503', 'cfa3a681-1d8b-5c8e-a980-4976d4389400', 'ENTRADA', 40, 40.0, '2026-10-02T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('c0c2dd6c-981a-5eae-9260-33f674a47dfb', 'cfa3a681-1d8b-5c8e-a980-4976d4389400', 'SALIDA_REMISION', 4, 4.0, '2026-11-05T08:00:00-05:00', '888bbff9-b3e6-55ae-b4e7-96cd54ab3753', NULL, NULL),
  ('a21630f5-bcc7-5f0c-bf69-66afffc03f7c', '2c9040d9-c314-5ef8-8b64-124330a84611', 'ENTRADA', 96, 16.32, '2026-10-02T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('dd084a32-43fd-59ec-ac13-e30ef76655bf', 'dbc2c837-c163-55c5-aef3-2971734293f6', 'ENTRADA', 40, 12.0, '2026-10-17T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('69a46a7e-4216-5a3d-a9d6-589c9faedcca', 'b7435b2d-1b13-5a10-b2c7-262ebeaf7463', 'ENTRADA', 35, 35.0, '2026-10-28T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('f5b9d8f8-c1e6-5542-b87b-91cf8c992199', 'b7435b2d-1b13-5a10-b2c7-262ebeaf7463', 'COMPOSTAJE', 35, 35.0, '2026-11-05T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('c2ca3f9b-53ac-51f9-b7b1-c5d3493d29a1', 'fdc2c0f4-c72f-5277-a50d-62698460bae8', 'ENTRADA', 2, 4.0, '2026-10-28T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('4d6e0b2f-4f6c-5db6-95f0-8b831044a155', 'fdc2c0f4-c72f-5277-a50d-62698460bae8', 'BAJA', 2, 4.0, '2026-11-07T08:00:00-05:00', 'fcc08889-2aff-5b04-8678-b1ccf1a74d77', NULL, NULL),
  ('f1e826e8-6286-5714-b9fb-673bf4d2034c', '2b9ee531-8739-503e-9359-752375700a8a', 'ENTRADA', 30, 15.0, '2026-10-28T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL),
  ('a756e60e-ad74-5119-80a9-0c3c9a15b346', '2b9ee531-8739-503e-9359-752375700a8a', 'COMPOSTAJE', 30, 15.0, '2026-11-08T08:00:00-05:00', '46c2ec28-1bcf-5fed-b82f-513880ed5a84', NULL, NULL);
INSERT INTO banco_neiva.Importacion (IdImportacion, Fecha, ArchivoUrl, IdUsuario, FilasTotales, FilasImportadas) VALUES
  ('2d5378d1-53ef-5e59-970c-13400a2581f6', '2026-09-14T10:00:00-05:00', 'importaciones/recepciones_2024.xlsx', '8356b1aa-ee4e-5ca4-985e-a8f93861d521', 1284, 1284),
  ('7c9d8fc8-ce12-5929-a73b-6b35d50115b3', '2026-09-20T10:00:00-05:00', 'importaciones/recepciones_2025_s1.xlsx', '8356b1aa-ee4e-5ca4-985e-a8f93861d521', 713, 702);
-- ErrorImportacion: sin datos de ejemplo en el prototipo
INSERT INTO banco_neiva.EquivalenciaNombre (NombreOrigen, IdProducto) VALUES
  ('LECHE ENTERA X 1100', 'f8f20c86-a81f-5440-bb28-c11fff828fe0'),
  ('arroz blanco bulto', 'c88e6219-06be-5fda-b627-0ea983eed45f'),
  ('PAN TAJADO GDE', '8ff1248a-2401-509b-9e71-50597f7a1d8f'),
  ('Pollo pechuga band', '1d5d5415-5810-56a9-829f-61c5db74733c'),
  ('SANDIA KILOS', '505aeab9-185e-5873-bb20-5af60d74dfc7');
INSERT INTO banco_neiva.ReporteMensual (IdReporte, Periodo, Formato, ArchivoUrl, FechaGeneracion) VALUES
  ('11bf6992-18c1-513d-a682-10bd3205411b', '2026-09', 'PDF', 'reportes/2026-09.pdf', '2026-10-02T09:00:00-05:00'),
  ('17061e55-a9ef-5e20-8383-c3b45b0f693c', '2026-10', 'PDF', 'reportes/2026-10.pdf', '2026-11-03T09:00:00-05:00');
INSERT INTO banco_neiva.CambioParametro (IdCambio, Entidad, Campo, ValorAnterior, ValorNuevo, IdUsuario, Fecha) VALUES
  ('4519dd56-1794-5c55-924d-c1e78ca00990', 'Categoria:Frutas y verduras', 'VidaUtilDias', NULL, '7', '8356b1aa-ee4e-5ca4-985e-a8f93861d521', '2026-09-15T09:00:00-05:00'),
  ('0c486347-1383-5d41-9bfb-d3c0b79d7523', 'Categoria:Panadería', 'VidaUtilDias', '4', '3', '8356b1aa-ee4e-5ca4-985e-a8f93861d521', '2026-10-02T09:00:00-05:00'),
  ('966585ac-d527-5437-bd27-358f936febe8', 'ComponenteKit:Mercado solidario/Sandía', 'KgPorKit', '2', '3', '8356b1aa-ee4e-5ca4-985e-a8f93861d521', '2026-10-20T09:00:00-05:00');
