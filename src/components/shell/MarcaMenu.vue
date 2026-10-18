<script setup lang="ts">
import Icono from '../Icono.vue';

/** Bloque de marca (ícono + nombre de la app + banco) que vive en la parte alta del
 *  menú lateral, tanto en el fijo (≥1440) como en el cajón móvil. Antes vivía en la
 *  cabecera (Cabecera.vue); se movió aquí para dejar la barra superior más liviana,
 *  a pedido explícito de la usuaria tras revisar una referencia de Figma. */
defineProps<{
  nombreBanco: string;
}>();
</script>

<template>
  <div class="flex items-start gap-3 border-b border-line px-1 pb-5">
    <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-brand-ink">
      <Icono nombre="caja" :tamano="20" />
    </span>
    <div class="flex min-w-0 flex-col gap-0.5">
      <span class="font-display text-base leading-tight font-semibold text-ink">SSD Bancos de Alimentos</span>
      <span class="text-xs leading-snug text-muted">{{ nombreBanco }}</span>
    </div>
  </div>
</template>
