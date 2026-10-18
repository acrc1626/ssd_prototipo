<script setup lang="ts">
import Icono from './Icono.vue';

/** Estado vacío con mensaje propio del dominio en vez de un "No hay resultados" genérico. */
defineProps<{
  titulo: string;
  descripcion?: string;
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center text-muted">
    <Icono nombre="vacio" :tamano="34" />
    <p class="text-sm font-medium text-ink">{{ titulo }}</p>
    <p v-if="descripcion" class="max-w-[360px] text-xs">{{ descripcion }}</p>
  </div>
</template>
