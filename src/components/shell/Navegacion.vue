<script setup lang="ts">
import { computed } from 'vue';

import type { ItemMenu } from '../../stores/menu';
import Icono from '../Icono.vue';

interface GrupoMenu {
  nombre: string | null;
  items: ItemMenu[];
}

/** Lista de navegación: se usa tanto en el menú lateral fijo (240, desde 1440 px)
 *  como dentro del cajón que se abre bajo 1440 px (CLAUDE.md regla 6). La etiqueta
 *  siempre es visible en los dos; no hay un estado intermedio solo-ícono. */
const props = defineProps<{
  items: ItemMenu[];
}>();

const grupos = computed<GrupoMenu[]>(() => {
  const resultado: GrupoMenu[] = [];
  for (const item of props.items) {
    const nombreGrupo = item.grupo ?? null;
    const ultimo = resultado.at(-1);
    if (ultimo && ultimo.nombre === nombreGrupo) {
      ultimo.items.push(item);
    } else {
      resultado.push({ nombre: nombreGrupo, items: [item] });
    }
  }
  return resultado;
});
</script>

<template>
  <template v-for="grupo in grupos" :key="grupo.nombre ?? '__sin-grupo__'">
    <p v-if="grupo.nombre" class="nav-section-label">{{ grupo.nombre }}</p>
    <router-link v-for="item in grupo.items" :key="item.id" :to="item.ruta" custom v-slot="{ isActive, navigate, href }">
      <a
        :href="href"
        class="nav-item"
        :aria-current="isActive ? 'page' : undefined"
        :title="item.etiqueta"
        @click="navigate"
      >
        <Icono :nombre="item.icono" :tamano="20" />
        <span class="min-w-0 truncate">{{ item.etiqueta }}</span>
        <span v-if="item.contador" class="nav-badge">{{ item.contador }}</span>
      </a>
    </router-link>
  </template>
</template>
