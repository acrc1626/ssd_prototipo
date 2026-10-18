<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

import { useConfirmarStore } from '../stores/confirmar';

/** Diálogo de confirmación con resumen (heurística A-01 de decisiones.md). Se monta
 *  una sola vez en el shell y se activa vía useConfirmarStore().pedir(...). */
const confirmar = useConfirmarStore();
const botonCancelarRef = ref<HTMLButtonElement | null>(null);

function responder(valor: boolean): void {
  confirmar.responder(valor);
}

/** `autofocus` solo no siempre alcanza a aplicar en un diálogo que se monta con v-if en
 *  el mismo tick — sin nada enfocado adentro, Escape no tiene qué burbujee hasta el
 *  listener del diálogo. Foco explícito tras el render es más confiable. */
watch(
  () => confirmar.solicitud,
  (solicitud) => {
    if (solicitud) nextTick(() => botonCancelarRef.value?.focus());
  },
);
</script>

<template>
  <div
    v-if="confirmar.solicitud"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    @click="responder(false)"
  >
    <div
      class="card w-full max-w-[400px]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dlg-titulo"
      @click.stop
      @keydown.escape="responder(false)"
    >
      <div class="card-body">
        <h2 id="dlg-titulo" class="font-display text-lg font-semibold text-ink">{{ confirmar.solicitud.titulo }}</h2>
        <p class="text-sm text-muted">{{ confirmar.solicitud.mensaje }}</p>
        <ul
          v-if="confirmar.solicitud.detalle?.length"
          class="flex flex-col gap-2 rounded-md bg-page p-4 text-sm text-ink"
        >
          <li v-for="linea in confirmar.solicitud.detalle" :key="linea">{{ linea }}</li>
        </ul>
        <div class="flex justify-end gap-2 pt-2">
          <button ref="botonCancelarRef" type="button" class="btn-secondary" autofocus @click="responder(false)">
            {{ confirmar.solicitud.textoCancelar ?? 'Cancelar' }}
          </button>
          <button
            type="button"
            :class="confirmar.solicitud.variante === 'peligro' ? 'btn-danger' : 'btn-primary'"
            @click="responder(true)"
          >
            {{ confirmar.solicitud.textoConfirmar ?? 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
