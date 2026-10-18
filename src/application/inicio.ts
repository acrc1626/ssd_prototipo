import { computed } from 'vue';

import { existenciaLote, kgLote, productoDeLote } from '../domain/calculos';
import { formatearNumero, unirConY } from '../domain/formato';
import type { NivelRiesgo } from '../domain/modelos';
import { useDatosStore } from '../stores/datos';
import { useSesionStore } from '../stores/sesion';
import { useExistenciasAplicacion } from './existencias';

export interface PendienteInicio {
  id: string;
  etiqueta: string;
  titulo: string;
  descripcion: string;
  accion?: { etiqueta: string; ruta: string };
}

export interface AlertaVencimiento {
  idLote: string;
  codigo: string;
  producto: string;
  kg: number;
  diasParaVencer: number;
  nivel: NivelRiesgo;
}

/** Orquesta los datos de Inicio: indicadores, pendientes por rol y alertas de
 *  vencimiento (CLAUDE.md). No tiene reglas de negocio propias, solo arma el
 *  view-model a partir de domain/calculos.ts y los stores. */
export function useInicioAplicacion() {
  const datos = useDatosStore();
  const sesion = useSesionStore();
  const existencias = useExistenciasAplicacion();

  /** Solo bodega tiene Recepciones en su menú: la tarjeta de "Recepciones en borrador"
   *  no debería verse para quien no puede abrir esa pantalla (informe de accesibilidad,
   *  heurística H8 — "cada quien ve solo lo que su rol necesita"). */
  const mostrarRecepcionesBorrador = computed(() => sesion.rol === 'bodega');
  const vencimientoEstimadoCount = existencias.vencimientoEstimadoCount;

  const kgEnBodega = computed(() =>
    datos.lotes
      .map((l) => kgLote(l.IdLote, datos.movimientos))
      .filter((kg) => kg > 0)
      .reduce((total, kg) => total + kg, 0),
  );

  const lotesVigentes = computed(
    () => datos.lotes.filter((l) => existenciaLote(l.IdLote, datos.movimientos) > 0).length,
  );

  const kgRiesgoAlto = computed(() =>
    datos.riesgoLotes.filter((r) => r.Nivel === 'ALTO').reduce((total, r) => total + r.KgEnRiesgo, 0),
  );

  const recepcionesBorrador = computed(
    () => datos.recepciones.filter((r) => r.Estado_PENDIENTE === 'BORRADOR').length,
  );

  const reporteDelMes = computed(() => Object.values(datos.prototipo.reporteMensualCifras)[0]);

  const conteoPorNivel = computed(() => {
    const riesgo = datos.riesgoLotes;
    return {
      alto: riesgo.filter((r) => r.Nivel === 'ALTO').length,
      medio: riesgo.filter((r) => r.Nivel === 'MEDIO').length,
      bajo: riesgo.filter((r) => r.Nivel === 'BAJO').length,
    };
  });

  const alertas = computed<AlertaVencimiento[]>(() => {
    const lotes = datos.lotes;
    const presentaciones = datos.presentaciones;
    const productos = datos.productos;
    return [...datos.riesgoLotes]
      .sort((a, b) => a.DiasParaVencer - b.DiasParaVencer)
      .slice(0, 3)
      .map((r) => {
        const lote = lotes.find((l) => l.IdLote === r.IdLote);
        const producto = lote ? productoDeLote(lote, presentaciones, productos) : undefined;
        return {
          idLote: r.IdLote,
          codigo: lote?.Codigo_PROTOTIPO ?? r.IdLote,
          producto: producto?.Nombre ?? '',
          kg: r.KgEnRiesgo,
          diasParaVencer: r.DiasParaVencer,
          nivel: r.Nivel,
        };
      });
  });

  const pendientes = computed<PendienteInicio[]>(() => {
    const rutasDisponibles = new Set(sesion.itemsMenu.map((i) => i.ruta));
    const resultado: PendienteInicio[] = [];

    const altas = alertas.value.filter((a) => a.nivel === 'ALTO');
    if (altas.length > 0) {
      const kgTotal = altas.reduce((t, a) => t + a.kg, 0);
      const nombres = altas.map((a) => `${a.codigo} ${a.producto}`);
      resultado.push({
        id: 'riesgo',
        etiqueta: `${altas[0]!.diasParaVencer}d`,
        titulo: `${altas.length} lotes en riesgo alto`,
        descripcion: `${unirConY(nombres)} · ${formatearNumero(kgTotal)} kg`,
        accion: rutasDisponibles.has('/riesgo') ? { etiqueta: 'Ver riesgo', ruta: '/riesgo' } : undefined,
      });
    }

    const equivalencias = datos.prototipo.equivalenciasSinAsignar;
    if (equivalencias.length > 0 && rutasDisponibles.has('/historicos')) {
      resultado.push({
        id: 'equivalencias',
        etiqueta: String(equivalencias.length),
        titulo: `${equivalencias.length} ${equivalencias.length === 1 ? 'nombre' : 'nombres'} de producto sin equivalencia`,
        descripcion: 'Vienen de los históricos; asígnales un producto del catálogo',
        accion: { etiqueta: 'Asignar', ruta: '/historicos' },
      });
    }

    const reporte = reporteDelMes.value;
    if (reporte) {
      const diferencia = +(reporte.prevRate - reporte.rate).toFixed(1);
      const mes = reporte.name.split(' ')[0]!;
      resultado.push({
        id: 'reporte',
        etiqueta: mes.slice(0, 3),
        titulo: `Desperdicio de ${mes.toLowerCase()}: ${formatearNumero(reporte.rate)} %`,
        descripcion:
          diferencia >= 0
            ? `Bajó ${formatearNumero(Math.abs(diferencia))} puntos frente a ${reporte.prev}`
            : `Subió ${formatearNumero(Math.abs(diferencia))} puntos frente a ${reporte.prev}`,
        accion: rutasDisponibles.has('/reporte') ? { etiqueta: 'Ver reporte', ruta: '/reporte' } : undefined,
      });
    }

    if (sesion.rol === 'bodega' && recepcionesBorrador.value > 0) {
      resultado.unshift({
        id: 'borradores',
        etiqueta: String(recepcionesBorrador.value),
        titulo: `${recepcionesBorrador.value} recepciones en borrador`,
        descripcion: 'Aún no crean lotes en existencias',
        accion: rutasDisponibles.has('/recepciones') ? { etiqueta: 'Ver recepciones', ruta: '/recepciones' } : undefined,
      });
    }

    return resultado;
  });

  return {
    kgEnBodega,
    lotesVigentes,
    kgRiesgoAlto,
    recepcionesBorrador,
    reporteDelMes,
    conteoPorNivel,
    alertas,
    pendientes,
    mostrarRecepcionesBorrador,
    vencimientoEstimadoCount,
  };
}
