<script setup lang="ts">
import Icono from '../Icono.vue';

/** Nota permanente al pie del menú: deja claro que es un prototipo sin backend y que los
 *  datos viven en memoria, para que un recargado accidental no sorprenda en la demo
 *  (visibilidad del estado del sistema, Nielsen). */
</script>

<template>
  <p class="mt-auto flex items-start gap-1.5 pt-4 text-[11px] leading-snug text-muted">
    <Icono nombre="info" :tamano="16" class="mt-px shrink-0" />
    <span>Prototipo de demostración. Los datos se reinician al recargar la página.</span>
  </p>
</template>
