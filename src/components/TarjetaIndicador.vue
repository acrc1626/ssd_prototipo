<script setup lang="ts">
import { computed } from 'vue';

import Icono from './Icono.vue';

/** Tarjeta de indicador reutilizada en Inicio, Existencias y Recepción (CLAUDE.md:
 *  paleta restringida, nada de degradados ni sombras decorativas). */
const props = withDefaults(
  defineProps<{
    titulo: string;
    valor: string;
    unidad?: string;
    nota?: string;
    icono?: string;
    tono?: 'normal' | 'alerta' | 'lote';
    progreso?: number;
    /** Variante densa (menos padding, métrica más chica): para pantallas con mucha
     *  tabla donde las 4 tarjetas no deben empujar el contenido hacia abajo. */
    compacto?: boolean;
  }>(),
  { tono: 'normal' },
);

const claseTitulo = computed(() =>
  props.tono === 'alerta' ? 'text-risk-high' : props.tono === 'lote' ? 'text-lot-ink' : 'text-muted',
);
const claseValor = computed(() => (props.tono === 'alerta' ? 'text-risk-high' : 'text-ink'));
</script>

<template>
  <div class="card">
    <div class="card-body" :class="compacto ? 'gap-1! p-3! desk:p-3!' : 'gap-2!'">
      <div class="flex items-center gap-2 text-sm font-medium" :class="claseTitulo">
        <Icono v-if="icono" :nombre="icono" :tamano="compacto ? 16 : 18" />
        <span>{{ titulo }}</span>
      </div>
      <div class="flex items-baseline gap-1">
        <span class="font-display font-semibold tabular-nums" :class="[claseValor, compacto ? 'text-lg' : 'text-xl']">{{ valor }}</span>
        <span v-if="unidad" class="text-sm text-muted">{{ unidad }}</span>
      </div>
      <div v-if="progreso !== undefined" class="h-2 overflow-hidden rounded-full bg-line" role="presentation">
        <div class="h-full bg-brand" :style="{ width: progreso + '%' }"></div>
      </div>
      <p v-if="nota" class="text-xs text-muted" :class="{ 'leading-tight': compacto }">{{ nota }}</p>
    </div>
  </div>
</template>
