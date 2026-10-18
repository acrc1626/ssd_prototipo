import { computed } from 'vue';

import type { NivelRiesgo } from '../domain/modelos';
import type { FilaExistencia } from './existencias';
import { useExistenciasAplicacion } from './existencias';

export interface FilaRiesgo extends FilaExistencia {
  nivelRiesgo: NivelRiesgo;
  diasParaVencer: number;
}

/** Pantalla Riesgo de vencimiento: no recalcula nada propio, reusa
 *  `useExistenciasAplicacion().filas` (ya trae nivelRiesgo/diasParaVencer de
 *  RiesgoLote) y se queda solo con los lotes que sí tienen riesgo calculado.
 *  Mismo criterio que decisiones.md: solo Alto/Medio/Bajo, sin VENCIDO (no aparece
 *  en los datos de ejemplo, pero si apareciera no tiene chip propio todavía). */
export function useRiesgoAplicacion() {
  const existencias = useExistenciasAplicacion();

  const filas = computed<FilaRiesgo[]>(() =>
    existencias.filas.value
      .filter((f): f is FilaRiesgo => f.nivelRiesgo !== null && f.diasParaVencer !== null)
      .sort((a, b) => a.diasParaVencer - b.diasParaVencer),
  );

  const conteoPorNivel = computed(() => ({
    alto: filas.value.filter((f) => f.nivelRiesgo === 'ALTO').length,
    medio: filas.value.filter((f) => f.nivelRiesgo === 'MEDIO').length,
    bajo: filas.value.filter((f) => f.nivelRiesgo === 'BAJO').length,
  }));

  const kgTotalRiesgo = computed(() => filas.value.reduce((t, f) => t + f.kg, 0));
  const kgRiesgoAlto = computed(() => filas.value.filter((f) => f.nivelRiesgo === 'ALTO').reduce((t, f) => t + f.kg, 0));

  return { filas, conteoPorNivel, kgTotalRiesgo, kgRiesgoAlto };
}
