/** Interfaces 1:1 con las entidades del modelo de datos v1.1 (docs/modelo-datos-p16.jpg)
 *  que usan las pantallas de esta fase. Las demás entidades del JSON se tipan cuando
 *  se construyan las pantallas que las necesitan (CLAUDE.md regla 1). */

export interface Banco {
  IdBanco: string;
  Nombre: string;
  Esquema: string;
  Activo: boolean;
}

export interface Rol {
  IdRol: string;
  IdBanco: string;
  Nombre: string;
  Descripcion: string;
}

export interface Usuario {
  IdUsuario: string;
  IdBanco: string;
  SubCognito: string;
  Correo: string;
  Nombre: string;
  Activo: boolean;
}

export interface UsuarioRol {
  IdUsuario: string;
  IdRol: string;
}

export interface Categoria {
  IdCategoria: string;
  Nombre: string;
  AplicaVencimiento: boolean;
  VidaUtilDias: number | null;
}

export interface Producto {
  IdProducto: string;
  IdCategoria: string;
  Nombre: string;
}

/** Nombre_PENDIENTE: la pantalla lo usa pero no está en el modelo v1.1 (pregunta abierta en decisiones.md). */
export interface Presentacion {
  IdPresentacion: string;
  IdProducto: string;
  Contenido: number;
  Unidad: 'G' | 'ML';
  Nombre_PENDIENTE: string;
  UnidadConteo_PROTOTIPO: string;
}

export interface Donante {
  IdDonante: string;
  Nombre: string;
  NIT: string | null;
}

export type OrigenRecepcion = 'DONACION' | 'COMPRA';
export type EstadoRecepcion = 'BORRADOR' | 'CONFIRMADA';

/** Numero_PENDIENTE y Estado_PENDIENTE: el modelo no tiene estos campos (pregunta abierta en decisiones.md). */
export interface Recepcion {
  IdRecepcion: string;
  Origen: OrigenRecepcion;
  IdDonante: string;
  Fecha: string;
  NumeroSoporte: string;
  SoporteUrl: string | null;
  IdUsuario: string;
  Numero_PENDIENTE: string;
  Estado_PENDIENTE: EstadoRecepcion;
}

export interface Lote {
  IdLote: string;
  IdRecepcion: string | null;
  IdPresentacion: string;
  IdLoteOrigen: string | null;
  FechaVencimiento: string | null;
  VencimientoEstimado: boolean;
  Codigo_PROTOTIPO: string;
}

export type TipoMovimiento =
  | 'ENTRADA'
  | 'DESECHO_RECEPCION'
  | 'SALIDA_REMISION'
  | 'FRACCIONAMIENTO_SALIDA'
  | 'FRACCIONAMIENTO_ENTRADA'
  | 'COMPOSTAJE'
  | 'BAJA';

export interface MovimientoInventario {
  IdMovimiento: string;
  IdLote: string;
  Tipo: TipoMovimiento;
  Cantidad: number;
  Kg: number;
  Fecha: string;
  IdUsuario: string;
  IdRemision: string | null;
  IdMovimientoCorregido: string | null;
}

export type NivelRiesgo = 'ALTO' | 'MEDIO' | 'BAJO';

export interface RiesgoLote {
  IdLote: string;
  FechaCalculo: string;
  Nivel: NivelRiesgo;
  DiasParaVencer: number;
  KgEnRiesgo: number;
  VersionModelo: string;
}

export interface ReporteMensualCifras {
  name: string;
  prev: string;
  recv: number;
  ent: number;
  recLoss: number;
  bodLoss: number;
  baja: number;
  comp: number;
  recs: number;
  rate: number;
  prevRate: number;
  /** [categoría, kg recibidos, kg perdidos, kg aprovechados] */
  cats: [string, number, number, number][];
  /** [donante, kg recibidos, kg perdidos] */
  donors: [string, number, number][];
  /** [mes abreviado, tasa de desperdicio %] de los últimos 6 meses, el actual al final.
   *  motivos/ev/evList/fefo/progs del JSON no se tipan: no hay pantalla que los use
   *  todavía (motivos y "cuánto se pudo evitar" además están retirados, decisiones.md). */
  trend: [string, number][];
}

export type EstadoOrganizacion = 'PERMANENTE' | 'ESPORADICA';
/** Orden del flujo (decisiones.md: "etapas Radicación, Verificación, Contacto, Visita,
 *  Vinculada"). Solo una organización VINCULADA con autorización vigente puede recibir
 *  remisiones (A-03). */
export type EtapaOrganizacion = 'RADICACION' | 'VERIFICACION' | 'CONTACTO' | 'VISITA' | 'VINCULADA';

export interface Organizacion {
  IdOrganizacion: string;
  Nombre: string;
  NIT: string;
  Municipio: string;
  Estado: EstadoOrganizacion;
  Etapa: EtapaOrganizacion;
}

export interface Representante {
  IdRepresentante: string;
  IdOrganizacion: string;
  Nombre: string;
  Documento: string;
  Telefono: string;
}

export interface AutorizacionDatos {
  IdAutorizacion: string;
  IdRepresentante: string;
  Fecha: string;
  Medio: string;
  Finalidades: string;
  VersionPolitica: string;
  SoporteUrl: string | null;
}

export interface PoblacionAtendida {
  IdOrganizacion: string;
  Grupo: string;
  Cantidad: number;
}

export interface Programa {
  IdPrograma: string;
  Nombre: string;
  Activo: boolean;
}

/** Un producto y su cantidad dentro de un kit de un programa. */
export interface ComponenteKit {
  IdPrograma: string;
  IdProducto: string;
  KgPorKit: number;
}

/** Sin estado de borrador (decisiones.md: "estado borrador en Remisión" quedó
 *  retirado) — una Remisión solo existe una vez emitida. */
export interface Remision {
  IdRemision: string;
  Numero: string;
  Fecha: string;
  IdOrganizacion: string;
  IdPrograma: string;
  NumeroKits: number;
  PdfUrl: string | null;
}

/** Qué lote cubrió qué parte de la remisión (asignación FEFO al emitir). No viene
 *  poblado en los datos de ejemplo (las remisiones semilla no tienen detalle), solo
 *  las que se emiten desde el prototipo. */
export interface DetalleRemision {
  IdDetalleRemision: string;
  IdRemision: string;
  IdLote: string;
  Cantidad: number;
  Kg: number;
}

export interface Importacion {
  IdImportacion: string;
  Fecha: string;
  ArchivoUrl: string;
  IdUsuario: string;
  FilasTotales: number;
  FilasImportadas: number;
}

/** Un nombre histórico ya resuelto a un producto del catálogo. Los que faltan por
 *  resolver viven en `_prototipo.equivalenciasSinAsignar` (no son una entidad real
 *  todavía, por eso están ahí y no acá). */
export interface EquivalenciaNombre {
  NombreOrigen: string;
  IdProducto: string;
}

/** Datos _PROTOTIPO: solo ayudas de presentación, no vienen del modelo (CLAUDE.md, sección Datos). */
export interface DatosPrototipo {
  nota: string;
  fechaReferencia: string;
  equivalenciasSinAsignar: string[];
  reporteMensualCifras: Record<string, ReporteMensualCifras>;
  [clave: string]: unknown;
}

/** Forma del JSON completo. Las entidades que esta fase no usa quedan como `unknown[]`
 *  para no inventarles forma hasta construir la pantalla que las necesite. */
export interface DatosEjemplo {
  Banco: Banco[];
  Rol: Rol[];
  Permiso: unknown[];
  RolPermiso: unknown[];
  Usuario: Usuario[];
  UsuarioRol: UsuarioRol[];
  Categoria: Categoria[];
  Producto: Producto[];
  Presentacion: Presentacion[];
  Donante: Donante[];
  Recepcion: Recepcion[];
  Lote: Lote[];
  MovimientoInventario: MovimientoInventario[];
  RiesgoLote: RiesgoLote[];
  Organizacion: Organizacion[];
  Representante: Representante[];
  AutorizacionDatos: AutorizacionDatos[];
  PoblacionAtendida: PoblacionAtendida[];
  Programa: Programa[];
  ComponenteKit: ComponenteKit[];
  MotivoExcepcionFefo: unknown[];
  Remision: Remision[];
  DetalleRemision: DetalleRemision[];
  Importacion: Importacion[];
  ErrorImportacion: unknown[];
  EquivalenciaNombre: EquivalenciaNombre[];
  ReporteMensual: unknown[];
  CambioParametro: unknown[];
  _prototipo: DatosPrototipo;
}
