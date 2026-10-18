import { computed } from 'vue';

import { kgLote } from '../domain/calculos';
import { useDatosStore } from '../stores/datos';
import { useSesionStore } from '../stores/sesion';
import { useOrganizacionesAplicacion } from './organizaciones';

export interface FilaRemision {
  idRemision: string;
  numero: string;
  fecha: string;
  organizacion: string;
  programa: string;
  numeroKits: number;
  kgTotal: number;
  tieneDetalle: boolean;
}

export interface DetalleLoteRemision {
  codigoLote: string;
  producto: string;
  cantidad: number;
  kg: number;
}

export interface SimulacionComponente {
  producto: string;
  kgPorKit: number;
  kgNecesario: number;
  kgDisponible: number;
  suficiente: boolean;
}

/** Remisiones: lista de emitidas y "Nueva remisión" (decisiones.md). Sin borrador — se
 *  emite directo (A-02: pide confirmación y muestra el comprobante). A-03: solo
 *  organizaciones VINCULADA + con autorización pueden recibir. */
export function useRemisionesAplicacion() {
  const datos = useDatosStore();
  const sesion = useSesionStore();
  const organizacionesApp = useOrganizacionesAplicacion();

  const filas = computed<FilaRemision[]>(() =>
    [...datos.remisiones]
      .sort((a, b) => b.Fecha.localeCompare(a.Fecha) || b.Numero.localeCompare(a.Numero))
      .map((r) => {
        const detalle = datos.detallesRemision.filter((d) => d.IdRemision === r.IdRemision);
        const kgPorDetalle = detalle.reduce((t, d) => t + d.Kg, 0);
        const kgEstimado = kgPorDetalle > 0 ? kgPorDetalle : estimarKgPrograma(r.IdPrograma, r.NumeroKits);
        return {
          idRemision: r.IdRemision,
          numero: r.Numero,
          fecha: r.Fecha,
          organizacion: datos.organizaciones.find((o) => o.IdOrganizacion === r.IdOrganizacion)?.Nombre ?? '',
          programa: datos.programas.find((p) => p.IdPrograma === r.IdPrograma)?.Nombre ?? '',
          numeroKits: r.NumeroKits,
          kgTotal: kgEstimado,
          tieneDetalle: detalle.length > 0,
        };
      }),
  );

  function estimarKgPrograma(idPrograma: string, numeroKits: number): number {
    return datos.componentesKit.filter((c) => c.IdPrograma === idPrograma).reduce((t, c) => t + c.KgPorKit * numeroKits, 0);
  }

  function detalleLotes(idRemision: string): DetalleLoteRemision[] {
    return datos.detallesRemision
      .filter((d) => d.IdRemision === idRemision)
      .map((d) => {
        const lote = datos.lotes.find((l) => l.IdLote === d.IdLote);
        const presentacion = lote ? datos.presentaciones.find((p) => p.IdPresentacion === lote.IdPresentacion) : undefined;
        const producto = presentacion ? datos.productos.find((p) => p.IdProducto === presentacion.IdProducto) : undefined;
        return {
          codigoLote: lote?.Codigo_PROTOTIPO ?? '',
          producto: producto?.Nombre ?? '',
          cantidad: d.Cantidad,
          kg: d.Kg,
        };
      });
  }

  /** Solo VINCULADA + autorizada pueden recibir remisión (A-03). */
  const organizacionesElegibles = computed(() => organizacionesApp.filas.value.filter((o) => o.etapa === 'VINCULADA' && o.autorizada));

  const programasDisponibles = computed(() =>
    [...datos.programas].filter((p) => p.Activo && datos.componentesKit.some((c) => c.IdPrograma === p.IdPrograma)).sort((a, b) => a.Nombre.localeCompare(b.Nombre, 'es')),
  );

  /** Simula cuánto necesita cada componente del kit y cuánto hay disponible, sumando
   *  los kg vigentes de todos los lotes del producto (mismo criterio FEFO que usará
   *  emitirRemision, solo que de solo lectura). */
  function simularFefo(idPrograma: string, numeroKits: number): SimulacionComponente[] {
    if (!idPrograma || numeroKits <= 0) return [];
    return datos.componentesKit
      .filter((c) => c.IdPrograma === idPrograma)
      .map((c) => {
        const producto = datos.productos.find((p) => p.IdProducto === c.IdProducto);
        const lotesDelProducto = datos.lotes.filter((l) => {
          const presentacion = datos.presentaciones.find((p) => p.IdPresentacion === l.IdPresentacion);
          return presentacion?.IdProducto === c.IdProducto;
        });
        const kgDisponible = lotesDelProducto.reduce((t, l) => t + Math.max(0, kgLote(l.IdLote, datos.movimientos)), 0);
        const kgNecesario = c.KgPorKit * numeroKits;
        return {
          producto: producto?.Nombre ?? '',
          kgPorKit: c.KgPorKit,
          kgNecesario,
          kgDisponible,
          suficiente: kgDisponible >= kgNecesario,
        };
      })
      .sort((a, b) => a.producto.localeCompare(b.producto, 'es'));
  }

  function emitir(idOrganizacion: string, idPrograma: string, numeroKits: number): { idRemision: string; numero: string } {
    return datos.emitirRemision(idOrganizacion, idPrograma, numeroKits, sesion.usuario?.IdUsuario ?? '');
  }

  return {
    filas,
    detalleLotes,
    organizacionesElegibles,
    programasDisponibles,
    simularFefo,
    emitir,
  };
}
