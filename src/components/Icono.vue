<script setup lang="ts">
import { computed } from 'vue';

import { ICONOS } from './iconos';

const props = withDefaults(
  defineProps<{
    nombre: string;
    tamano?: 16 | 18 | 20 | 24 | 34;
  }>(),
  { tamano: 20 },
);

const contenido = computed(() => ICONOS[props.nombre] ?? '');
</script>

<template>
  <svg
    :width="tamano"
    :height="tamano"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="shrink-0"
    v-html="contenido"
  />
</template>
