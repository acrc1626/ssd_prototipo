<script setup lang="ts">
import Icono from '../Icono.vue';

/** Cabecera fija de la app (CLAUDE.md regla 6: la página nunca hace scroll horizontal;
 *  el botón de menú solo aparece bajo 1024 px, donde el menú lateral vive en un cajón). */
withDefaults(
  defineProps<{
    nombreBanco: string;
    nombreUsuario: string;
    nombreRol: string;
    iniciales: string;
    menuAbierto?: boolean;
  }>(),
  { menuAbierto: false },
);

defineEmits<{
  alternarMenu: [];
  salir: [];
}>();
</script>

<template>
  <header class="app-header">
    <button
      type="button"
      class="btn-icon wide:hidden"
      aria-label="Abrir menú"
      :aria-expanded="menuAbierto"
      @click="$emit('alternarMenu')"
    >
      <Icono nombre="menu" :tamano="20" />
    </button>

    <span class="min-w-0 truncate text-sm font-medium text-ink">{{ nombreBanco }}</span>

    <div class="ml-auto flex shrink-0 items-center gap-4">
      <div class="hidden text-right tablet:block">
        <p class="text-sm font-medium leading-tight text-ink">{{ nombreUsuario }}</p>
        <p class="text-xs leading-tight text-muted">{{ nombreRol }}</p>
      </div>
      <span
        class="flex h-10 w-10 items-center justify-center rounded-full bg-mint-soft text-sm font-semibold text-brand-hover"
      >
        {{ iniciales }}
      </span>
      <button type="button" class="btn-icon h-[34px]! w-[34px]! max-desk:h-touch! max-desk:w-touch!" aria-label="Salir" @click="$emit('salir')">
        <Icono nombre="salir" :tamano="18" />
      </button>
    </div>
  </header>
</template>
