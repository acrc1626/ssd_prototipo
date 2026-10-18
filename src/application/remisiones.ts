import { computed } from 'vue';

import { kgDesdePresentacion, kgLote } from '../domain/calculos';
import { useDatosStore } from '../stores/datos';
import { useSesionStore } from '../stores/sesion';
import { useOrganizacionesAplicacion } from './organizaciones';

export interface FilaRemision {
  idRemision: string;
  numero: string;
  fecha: string;
  destinatario: string;
  esPersona: boolean;
  programa: string;
  numeroKits: number;
  esEvento: boolean;
  kgTotal: number;
  tieneDetalle: boolean;
}

export interface DetalleLoteRemision {
  codigoLote: string;
  producto: string;
  cantidad: number;
  kg: number;
}

/** Un renglón final de la remisión: X kg de un producto (venga del kit o ad-hoc). */
export interface RenglonFinal {
  idProducto: string;
  producto: string;
  kgNecesario: number;
}

export interface FilaSimulacion extends RenglonFinal {
  kgDisponible: number;
  suficiente: boolean;
}

export interface PresentacionOpcion {
  idPresentacion: string;
  idProducto: string;
  producto: string;
  etiqueta: string;
  unidadConteo: string;
}

/** Remisiones (doc v2.0, UC-03/ADR-010): salida a un destinatario (organización o persona
 *  natural). Los renglones finales = plantilla del kit × nº de kits + renglones adicionales
 *  ad-hoc (producto/presentación + cantidad); FEFO asigna lotes a cada renglón. Puede
 *  marcarse como entrega de evento/extraordinaria. */
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
        const esPersona = r.DestinatarioTipo_PROTOTIPO === 'PERSONA';
        const destinatario = esPersona
          ? r.DestinatarioNombre_PROTOTIPO ?? 'Persona'
          : datos.organizaciones.find((o) => o.IdOrganizacion === r.IdOrganizacion)?.Nombre ?? '';
        return {
          idRemision: r.IdRemision,
          numero: r.Numero,
          fecha: r.Fecha,
          destinatario,
          esPersona,
          programa: r.IdPrograma ? datos.programas.find((p) => p.IdPrograma === r.IdPrograma)?.Nombre ?? '' : '',
          numeroKits: r.NumeroKits,
          esEvento: !!r.EsEvento_PROTOTIPO,
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

  /** Presentaciones del catálogo para los renglones ad-hoc (producto + presentación). */
  const presentaciones = computed<PresentacionOpcion[]>(() =>
    datos.presentaciones
      .map((p) => {
        const producto = datos.productos.find((prod) => prod.IdProducto === p.IdProducto);
        return {
          idPresentacion: p.IdPresentacion,
          idProducto: p.IdProducto,
          producto: producto?.Nombre ?? '',
          etiqueta: `${producto?.Nombre ?? ''} · ${p.Nombre_PENDIENTE}`,
          unidadConteo: p.UnidadConteo_PROTOTIPO,
        };
      })
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es')),
  );

  function kgDisponibleProducto(idProducto: string): number {
    return datos.lotes
      .filter((l) => {
        const presentacion = datos.presentaciones.find((p) => p.IdPresentacion === l.IdPresentacion);
        return presentacion?.IdProducto === idProducto;
      })
      .reduce((t, l) => t + Math.max(0, kgLote(l.IdLote, datos.movimientos)), 0);
  }

  /** kg de un renglón ad-hoc (presentación × cantidad). */
  function kgAdhoc(idPresentacion: string, cantidad: number): number {
    const presentacion = datos.presentaciones.find((p) => p.IdPresentacion === idPresentacion);
    return presentacion ? kgDesdePresentacion(presentacion, cantidad) : 0;
  }

  /** Construye los renglones finales fusionando el kit (programa × nº kits) con los
   *  renglones ad-hoc (presentación + cantidad), sumando por producto. */
  function construirRenglones(idPrograma: string, numeroKits: number, adhoc: { idPresentacion: string; cantidad: number }[]): RenglonFinal[] {
    const porProducto = new Map<string, number>();

    if (idPrograma && numeroKits > 0) {
      for (const c of datos.componentesKit.filter((c) => c.IdPrograma === idPrograma)) {
        porProducto.set(c.IdProducto, (porProducto.get(c.IdProducto) ?? 0) + c.KgPorKit * numeroKits);
      }
    }
    for (const r of adhoc) {
      if (!r.idPresentacion || !r.cantidad || r.cantidad <= 0) continue;
      const presentacion = datos.presentaciones.find((p) => p.IdPresentacion === r.idPresentacion);
      if (!presentacion) continue;
      porProducto.set(presentacion.IdProducto, (porProducto.get(presentacion.IdProducto) ?? 0) + kgAdhoc(r.idPresentacion, r.cantidad));
    }

    return [...porProducto.entries()]
      .map(([idProducto, kg]) => ({
        idProducto,
        producto: datos.productos.find((p) => p.IdProducto === idProducto)?.Nombre ?? '',
        kgNecesario: Math.round(kg * 10) / 10,
      }))
      .sort((a, b) => a.producto.localeCompare(b.producto, 'es'));
  }

  function simular(renglones: RenglonFinal[]): FilaSimulacion[] {
    return renglones.map((r) => {
      const kgDisponible = kgDisponibleProducto(r.idProducto);
      return { ...r, kgDisponible, suficiente: kgDisponible >= r.kgNecesario };
    });
  }

  function emitir(payload: {
    destinatario: { tipo: 'ORGANIZACION'; idOrganizacion: string } | { tipo: 'PERSONA'; nombre: string; documento: string };
    renglones: RenglonFinal[];
    esEvento: boolean;
    idPrograma: string;
    numeroKits: number;
  }): { idRemision: string; numero: string } {
    return datos.emitirRemision({
      destinatario: payload.destinatario,
      renglones: payload.renglones.map((r) => ({ idProducto: r.idProducto, kg: r.kgNecesario })),
      esEvento: payload.esEvento,
      idPrograma: payload.idPrograma,
      numeroKits: payload.numeroKits,
      idUsuario: sesion.usuario?.IdUsuario ?? '',
    });
  }

  return {
    filas,
    detalleLotes,
    organizacionesElegibles,
    programasDisponibles,
    presentaciones,
    kgDisponibleProducto,
    kgAdhoc,
    construirRenglones,
    simular,
    emitir,
  };
}
