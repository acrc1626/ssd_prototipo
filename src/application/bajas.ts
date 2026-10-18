import { computed } from 'vue';

import { existenciaLote, kgLote } from '../domain/calculos';
import type { MovimientoInventario, TipoMovimiento } from '../domain/modelos';
import { useDatosStore } from '../stores/datos';
import { useSesionStore } from '../stores/sesion';
import { useExistenciasAplicacion } from './existencias';

export type TipoBaja = Extract<TipoMovimiento, 'BAJA' | 'COMPOSTAJE'>;

export interface FilaBaja {
  idMovimiento: string;
  idLote: string;
  codigoLote: string;
  producto: string;
  presentacion: string;
  tipo: TipoBaja;
  cantidad: number;
  kg: number;
  unidadConteo: string;
  fecha: string;
  usuario: string;
}

/** Pantalla Bajas: reusa `useExistenciasAplicacion` para la lista de lotes vigentes
 *  (mismo cálculo de existencia, no se duplica). `registrarBaja` arma un
 *  MovimientoInventario tipo BAJA o COMPOSTAJE y lo empuja al store (CLAUDE.md,
 *  sección Datos: estos tipos ya restan de existenciaLote/kgLote, no están en
 *  TIPOS_QUE_SUMAN). Sin campo de motivo/observación: se retiró del alcance porque
 *  MovimientoInventario no lo tiene en el modelo (decisiones.md). */
export function useBajasAplicacion() {
  const datos = useDatosStore();
  const sesion = useSesionStore();
  const existencias = useExistenciasAplicacion();

  const lotesVigentes = existencias.filas;

  const bajasRecientes = computed<FilaBaja[]>(() => {
    return datos.movimientos
      .filter((m): m is MovimientoInventario & { Tipo: TipoBaja } => m.Tipo === 'BAJA' || m.Tipo === 'COMPOSTAJE')
      .map((m) => {
        const lote = datos.lotes.find((l) => l.IdLote === m.IdLote);
        const presentacion = lote ? datos.presentaciones.find((p) => p.IdPresentacion === lote.IdPresentacion) : undefined;
        const producto = presentacion ? datos.productos.find((p) => p.IdProducto === presentacion.IdProducto) : undefined;
        const usuario = datos.usuarios.find((u) => u.IdUsuario === m.IdUsuario);

        const fila: FilaBaja = {
          idMovimiento: m.IdMovimiento,
          idLote: m.IdLote,
          codigoLote: lote?.Codigo_PROTOTIPO ?? '',
          producto: producto?.Nombre ?? '',
          presentacion: presentacion?.Nombre_PENDIENTE ?? '',
          tipo: m.Tipo,
          cantidad: m.Cantidad,
          kg: m.Kg,
          unidadConteo: presentacion?.UnidadConteo_PROTOTIPO ?? 'unidades',
          fecha: m.Fecha,
          usuario: usuario?.Nombre ?? m.IdUsuario,
        };
        return fila;
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  });

  const totalKgBaja = computed(() =>
    bajasRecientes.value.filter((b) => b.tipo === 'BAJA').reduce((t, b) => t + b.kg, 0),
  );
  const totalKgCompostaje = computed(() =>
    bajasRecientes.value.filter((b) => b.tipo === 'COMPOSTAJE').reduce((t, b) => t + b.kg, 0),
  );
  const lotesAfectados = computed(() => new Set(bajasRecientes.value.map((b) => b.idLote)).size);

  /** Kg proporcionales a la cantidad dada de baja, según el peso promedio por unidad
   *  del lote (kg vigentes ÷ existencia vigente) — mismo criterio que Recepción usa
   *  para ir de cantidad a kg (kgDesdePresentacion), pero aquí no hay presentación
   *  nueva: se parte de lo que el lote ya trae. */
  function registrarBaja(params: { idLote: string; tipo: TipoBaja; cantidad: number }): MovimientoInventario {
    const { idLote, tipo, cantidad } = params;
    const existencia = existenciaLote(idLote, datos.movimientos);
    const kgVigente = kgLote(idLote, datos.movimientos);
    const kgPorUnidad = existencia > 0 ? kgVigente / existencia : 0;
    const kg = Math.round(cantidad * kgPorUnidad * 10) / 10;

    const movimiento: MovimientoInventario = {
      IdMovimiento: `baja-${Date.now()}`,
      IdLote: idLote,
      Tipo: tipo,
      Cantidad: cantidad,
      Kg: kg,
      Fecha: `${datos.fechaReferencia}T09:00:00-05:00`,
      IdUsuario: sesion.usuario?.IdUsuario ?? '',
      IdRemision: null,
      IdMovimientoCorregido: null,
    };
    datos.registrarMovimiento(movimiento);
    return movimiento;
  }

  function deshacerBaja(idMovimiento: string): void {
    datos.quitarMovimiento(idMovimiento);
  }

  return {
    lotesVigentes,
    bajasRecientes,
    totalKgBaja,
    totalKgCompostaje,
    lotesAfectados,
    registrarBaja,
    deshacerBaja,
  };
}
