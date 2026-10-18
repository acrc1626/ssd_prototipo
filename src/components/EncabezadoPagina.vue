<script setup lang="ts">
import Icono from './Icono.vue';

/** Encabezado compacto de pantalla (una sola fila): ícono 40, título, chip opcional y
 *  subtítulo en línea, con las acciones a la derecha. Reemplaza el encabezado alto que
 *  tenían todas las pantallas para que la tabla/el contenido suba y quede más denso
 *  (mismo criterio aplicado primero en Existencias). */
defineProps<{
  icono: string;
  titulo: string;
  subtitulo?: string;
}>();
</script>

<template>
  <div class="card">
    <div class="card-body flex-row flex-wrap items-center justify-between gap-4 p-4! desk:p-4!">
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-mint-soft text-brand-hover">
          <Icono :nombre="icono" :tamano="20" />
        </span>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1>{{ titulo }}</h1>
          <slot name="chip" />
          <span v-if="subtitulo" class="text-xs text-muted">{{ subtitulo }}</span>
        </div>
      </div>
      <div v-if="$slots.acciones" class="flex shrink-0 flex-wrap items-center gap-4">
        <slot name="acciones" />
      </div>
    </div>
  </div>
</template>
