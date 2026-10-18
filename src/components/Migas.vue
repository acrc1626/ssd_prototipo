<script setup lang="ts">
import type { MigaPan } from './migaPan';

/** Migas con enlaces reales (A-11 de decisiones.md), no solo texto. */
defineProps<{
  items: MigaPan[];
}>();
</script>

<template>
  <nav aria-label="Ruta de navegación" class="flex flex-wrap items-center gap-2 text-sm text-muted">
    <template v-for="(item, i) in items" :key="item.etiqueta">
      <template v-if="i !== items.length - 1 && item.ruta">
        <router-link :to="item.ruta" class="text-brand-text hover:underline">{{ item.etiqueta }}</router-link>
        <span aria-hidden="true">/</span>
      </template>
      <span
        v-else
        :aria-current="i === items.length - 1 ? 'page' : undefined"
        :class="i === items.length - 1 ? 'font-medium text-ink' : ''"
      >
        {{ item.etiqueta }}
      </span>
    </template>
  </nav>
</template>
