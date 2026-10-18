<script setup lang="ts">
import { useDeshacerStore } from '../stores/deshacer';
import Icono from './Icono.vue';

/** Toast "Deshacer" (heurística A-01 de decisiones.md). Montado una sola vez en el shell. */
const deshacer = useDeshacerStore();
</script>

<template>
  <div v-if="deshacer.toast" class="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" role="status">
    <div class="flex h-12 items-center gap-4 rounded-md bg-ink-2 px-4 text-sm text-white">
      <span>{{ deshacer.toast.mensaje }}</span>
      <button type="button" class="font-semibold text-mint hover:underline" @click="deshacer.deshacer()">
        Deshacer
      </button>
      <button type="button" class="text-white/70 hover:text-white" aria-label="Cerrar aviso" @click="deshacer.cerrar()">
        <Icono nombre="cerrar" :tamano="16" />
      </button>
    </div>
  </div>
</template>
