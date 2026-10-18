import type { Lote, MovimientoInventario, NivelRiesgo, Presentacion, Producto, TipoMovimiento } from './modelos';

/** CLAUDE.md, sección Datos: ENTRADA y FRACCIONAMIENTO_ENTRADA suman; el resto resta. */
const TIPOS_QUE_SUMAN = new Set(['ENTRADA', 'FRACCIONAMIENTO_ENTRADA']);

function signo(mov: MovimientoInventario): 1 | -1 {
  return TIPOS_QUE_SUMAN.has(mov.Tipo) ? 1 : -1;
}

/** Existencia de un lote en unidades de la presentación (cajas, bolsas, kg a granel, etc.). */
export function existenciaLote(idLote: string, movimientos: MovimientoInventario[]): number {
  return movimientos
    .filter((m) => m.IdLote === idLote)
    .reduce((total, m) => total + signo(m) * m.Cantidad, 0);
}

/** Kg vigentes de un lote: suma de los Kg de sus movimientos, con el mismo signo. */
export function kgLote(idLote: string, movimientos: MovimientoInventario[]): number {
  return movimientos
    .filter((m) => m.IdLote === idLote)
    .reduce((total, m) => total + signo(m) * m.Kg, 0);
}

/** Kg = Contenido × Cantidad ÷ 1000 (CLAUDE.md, sección Datos). */
export function kgDesdePresentacion(presentacion: Presentacion, cantidad: number): number {
  return (presentacion.Contenido * cantidad) / 1000;
}

export const ETIQUETA_RIESGO: Record<NivelRiesgo, string> = {
  ALTO: 'Alto',
  MEDIO: 'Medio',
  BAJO: 'Bajo',
};

export const CLASE_CHIP_RIESGO: Record<NivelRiesgo, string> = {
  ALTO: 'risk-alto',
  MEDIO: 'risk-medio',
  BAJO: 'risk-bajo',
};

export function diasParaVencer(fechaVencimiento: string, fechaReferencia: string): number {
  const unDia = 1000 * 60 * 60 * 24;
  const vence = new Date(fechaVencimiento + 'T00:00:00');
  const referencia = new Date(fechaReferencia + 'T00:00:00');
  return Math.round((vence.getTime() - referencia.getTime()) / unDia);
}

export function nombrePresentacion(lote: Lote, presentaciones: Presentacion[]): Presentacion | undefined {
  return presentaciones.find((p) => p.IdPresentacion === lote.IdPresentacion);
}

export const ETIQUETA_MOVIMIENTO: Record<TipoMovimiento, string> = {
  ENTRADA: 'Entrada',
  DESECHO_RECEPCION: 'Desecho en recepción',
  SALIDA_REMISION: 'Salida por remisión',
  FRACCIONAMIENTO_SALIDA: 'Fraccionamiento (salida)',
  FRACCIONAMIENTO_ENTRADA: 'Fraccionamiento (entrada)',
  COMPOSTAJE: 'Compostaje',
  BAJA: 'Baja',
};

export function productoDeLote(
  lote: Lote,
  presentaciones: Presentacion[],
  productos: Producto[],
): Producto | undefined {
  const presentacion = nombrePresentacion(lote, presentaciones);
  if (!presentacion) return undefined;
  return productos.find((p) => p.IdProducto === presentacion.IdProducto);
}
