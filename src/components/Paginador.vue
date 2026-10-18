<script setup lang="ts">
import Icono from './Icono.vue';

/** Paginador de tabla: muestra "Mostrando X a Y de N" y las flechas anterior/siguiente.
 *  Solo se renderiza si hay más de una página. Emite `irPagina` con el número destino. */
const props = withDefaults(
  defineProps<{
    pagina: number;
    totalPaginas: number;
    rangoDesde: number;
    rangoHasta: number;
    total: number;
    etiqueta?: string;
  }>(),
  { etiqueta: 'registros' },
);

defineEmits<{ irPagina: [n: number] }>();
void props;
</script>

<template>
  <div v-if="totalPaginas > 1" class="flex flex-wrap items-center justify-between gap-4 pt-2">
    <p class="text-xs text-muted">Mostrando {{ rangoDesde }} a {{ rangoHasta }} de {{ total }} {{ etiqueta }}</p>
    <nav class="flex items-center gap-2" :aria-label="'Paginación de ' + etiqueta">
      <button
        type="button"
        class="btn-icon h-[34px]! w-[34px]! max-desk:h-touch! max-desk:w-touch!"
        :disabled="pagina <= 1"
        aria-label="Página anterior"
        @click="$emit('irPagina', pagina - 1)"
      >
        <Icono nombre="chevron-izquierda" :tamano="16" />
      </button>
      <span class="text-sm text-ink tabular-nums">{{ pagina }} de {{ totalPaginas }}</span>
      <button
        type="button"
        class="btn-icon h-[34px]! w-[34px]! max-desk:h-touch! max-desk:w-touch!"
        :disabled="pagina >= totalPaginas"
        aria-label="Página siguiente"
        @click="$emit('irPagina', pagina + 1)"
      >
        <Icono nombre="chevron-derecha" :tamano="16" />
      </button>
    </nav>
  </div>
</template>
