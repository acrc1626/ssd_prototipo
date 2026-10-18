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
      .sort((a, b) => b.perdida - a.perdida),
  );

  const tendencia = computed<PuntoTendencia[]>(() => (cifras.value?.trend ?? []).map(([mes, tasa]) => ({ mes, tasa })));

  const diferenciaTasa = computed(() => (cifras.value ? +(cifras.value.prevRate - cifras.value.rate).toFixed(1) : 0));

  const totalPerdido = computed(() => (cifras.value ? cifras.value.recLoss + cifras.value.bodLoss : 0));

  /** Entradas del mes por origen (donación vs compra). Si el periodo no trae el split,
   *  deja la compra en 0 y toda la entrada como donación. */
  const entradas = computed(() => {
    const c = cifras.value;
    if (!c) return { donacion: 0, compra: 0, total: 0 };
    const compra = c.recvCom ?? 0;
    const donacion = c.recvDon ?? c.recv - compra;
    return { donacion, compra, total: c.recv };
  });

  /** Dónde se pierde: en recepción (selección) vs en bodega; y cómo sale lo de bodega. */
  const perdidaPorFase = computed(() => ({
    recepcion: cifras.value?.recLoss ?? 0,
    bodega: cifras.value?.bodLoss ?? 0,
  }));
  const salidaBodega = computed(() => ({
    baja: cifras.value?.baja ?? 0,
    compostaje: cifras.value?.comp ?? 0,
  }));

  /** CSV del reporte del mes seleccionado, para descargar e incluir en informes. */
  function generarCsv(): string {
    const c = cifras.value;
    if (!c) return '';
    const lineas: string[] = [];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    lineas.push(`Reporte mensual de desperdicio;${c.name}`);
    lineas.push('');
    lineas.push('Indicador;Valor');
    lineas.push(`Kg recibidos;${c.recv}`);
    lineas.push(`Kg recibidos por donación;${entradas.value.donacion}`);
    lineas.push(`Kg recibidos por compra;${entradas.value.compra}`);
    lineas.push(`Kg entregados;${c.ent}`);
    lineas.push(`Kg perdidos en recepción;${c.recLoss}`);
    lineas.push(`Kg perdidos en bodega;${c.bodLoss}`);
    lineas.push(`Kg dados de baja;${c.baja}`);
    lineas.push(`Kg a compostaje;${c.comp}`);
    lineas.push(`Tasa de desperdicio (%);${c.rate}`);
    lineas.push(`Tasa del mes anterior (%);${c.prevRate}`);
    lineas.push('');
    lineas.push('Categoría;Recibido (kg);Perdido (kg);Aprovechado (kg);% pérdida');
    for (const cat of categorias.value) {
      lineas.push([esc(cat.nombre), cat.recibido, cat.perdida, cat.aprovechado, cat.porcentajePerdida.toFixed(1)].join(';'));
    }
    lineas.push('');
    lineas.push('Donante;Recibido (kg);Perdido (kg)');
    for (const don of donantes.value) {
      lineas.push([esc(don.nombre), don.recibido, don.perdida].join(';'));
    }
    return lineas.join('\n');
  }

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
    entradas,
    perdidaPorFase,
    salidaBodega,
    generarCsv,
  };
}
