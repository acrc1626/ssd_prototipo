import { computed, ref } from 'vue';

import type { ReporteMensualCifras } from '../domain/modelos';
import { useDatosStore } from '../stores/datos';

const ORDEN_MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export interface PeriodoReporte {
  clave: string;
  etiqueta: string;
}

export interface FilaCategoriaReporte {
  nombre: string;
  recibido: number;
  perdida: number;
  aprovechado: number;
  porcentajePerdida: number;
}

export interface FilaDonanteReporte {
  nombre: string;
  recibido: number;
  perdida: number;
}

export interface PuntoTendencia {
  mes: string;
  tasa: number;
}

/** Reporte mensual de desperdicio. Usa `_prototipo.reporteMensualCifras` tal cual está
 *  en el JSON (CLAUDE.md: campos _PROTOTIPO son ayudas de presentación). No muestra
 *  motivos ni "cuánto se pudo evitar" ni botón Exportar: los tres quedaron retirados
 *  en decisiones.md ("En el reporte: motivos y '¿Cuánto se pudo evitar?'. Botones
 *  Exportar..."). */
export function useReporteAplicacion() {
  const datos = useDatosStore();
  const cifrasPorMes = computed(() => datos.prototipo.reporteMensualCifras as Record<string, ReporteMensualCifras>);

  const claves = computed(() =>
    Object.keys(cifrasPorMes.value).sort((a, b) => ORDEN_MESES.indexOf(b) - ORDEN_MESES.indexOf(a)),
  );

  const periodos = computed<PeriodoReporte[]>(() =>
    claves.value.map((clave) => ({ clave, etiqueta: cifrasPorMes.value[clave]!.name })),
  );

  const claveSeleccionada = ref('');

  const claveActual = computed(() =>
    claveSeleccionada.value && cifrasPorMes.value[claveSeleccionada.value] ? claveSeleccionada.value : (claves.value[0] ?? ''),
  );

  function seleccionarPeriodo(clave: string): void {
    claveSeleccionada.value = clave;
  }

  const cifras = computed<ReporteMensualCifras | null>(() => cifrasPorMes.value[claveActual.value] ?? null);

  const categorias = computed<FilaCategoriaReporte[]>(() =>
    (cifras.value?.cats ?? [])
      .map(([nombre, recibido, perdida, aprovechado]) => ({
        nombre,
        recibido,
        perdida,
        aprovechado,
        porcentajePerdida: recibido > 0 ? (perdida / recibido) * 100 : 0,
      }))
      .sort((a, b) => b.perdida - a.perdida),
  );

  const donantes = computed<FilaDonanteReporte[]>(() =>
    [...(cifras.value?.donors ?? [])]
      .map(([nombre, recibido, perdida]) => ({ nombre, recibido, perdida }))
      .sort((a, b) => b.recibido - a.recibido),
  );

  const tendencia = computed<PuntoTendencia[]>(() => (cifras.value?.trend ?? []).map(([mes, tasa]) => ({ mes, tasa })));

  const diferenciaTasa = computed(() => (cifras.value ? +(cifras.value.prevRate - cifras.value.rate).toFixed(1) : 0));

  const totalPerdido = computed(() => (cifras.value ? cifras.value.recLoss + cifras.value.bodLoss : 0));

  return {
    periodos,
    claveActual,
    seleccionarPeriodo,
    cifras,
    categorias,
    donantes,
    tendencia,
    diferenciaTasa,
    totalPerdido,
  };
}
