<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useConfirmarStore } from '../../stores/confirmar';
import { useDatosStore } from '../../stores/datos';
import { useSesionStore } from '../../stores/sesion';
import DialogoConfirmar from '../DialogoConfirmar.vue';
import ToastDeshacer from '../ToastDeshacer.vue';
import Cabecera from './Cabecera.vue';
import MarcaMenu from './MarcaMenu.vue';
import Navegacion from './Navegacion.vue';
import NotaPrototipo from './NotaPrototipo.vue';

/** App shell: cabecera + menú fijos, contenido con minmax(0,1fr) (CLAUDE.md regla 6).
 *  Bajo 1440 px el menú vive en un cajón detrás del botón de la cabecera: nada de un
 *  estado intermedio solo-íconos, que es lo que se desbordaba en pantallas chicas. */
const sesion = useSesionStore();
const datos = useDatosStore();
const confirmar = useConfirmarStore();
const router = useRouter();
const route = useRoute();

const menuMovilAbierto = ref(false);
const cajonRef = ref<HTMLElement | null>(null);
const contenidoRef = ref<HTMLElement | null>(null);
let focoPrevioMenu: HTMLElement | null = null;

/** Menú móvil como diálogo (TR-02): al abrir se recuerda el foco y se lleva al cajón; al
 *  cerrar se devuelve. Escape cierra. Así el teclado no queda atrapado al final del DOM. */
function alternarMenu(): void {
  if (menuMovilAbierto.value) {
    cerrarMenu();
  } else {
    focoPrevioMenu = document.activeElement as HTMLElement | null;
    menuMovilAbierto.value = true;
  }
}
function cerrarMenu(): void {
  menuMovilAbierto.value = false;
}

watch(menuMovilAbierto, async (abierto) => {
  if (abierto) {
    await nextTick();
    cajonRef.value?.focus();
  } else {
    focoPrevioMenu?.focus?.();
    focoPrevioMenu = null;
  }
});

/** Al cambiar de pantalla, mover el foco al contenido (TR-01): sin esto el foco queda en
 *  BODY y un lector de pantalla no anuncia la pantalla nueva. */
watch(
  () => route.fullPath,
  async () => {
    await nextTick();
    // preventScroll: mover el foco NO debe desplazar la página (si no, al entrar se baja
    // el scroll y se tapa el título). El scroll al tope lo maneja el router (scrollBehavior).
    contenidoRef.value?.focus({ preventScroll: true });
  },
);

/** Confirmar antes de cerrar sesión: el botón es de solo ícono, pegado al avatar, y como
 *  el prototipo guarda en memoria, un clic accidental perdería los cambios de la sesión
 *  (prevención de errores / control del usuario, Nielsen). */
async function salir(): Promise<void> {
  const ok = await confirmar.pedir({
    titulo: 'Cerrar sesión',
    mensaje: 'Vas a salir de la demostración. En este prototipo los datos de la sesión se reinician al salir o al recargar.',
    textoConfirmar: 'Cerrar sesión',
  });
  if (!ok) return;
  sesion.cerrarSesion();
  router.push('/ingresar');
}
</script>

<template>
  <div class="app">
    <a href="#contenido" class="skip-link">Saltar al contenido</a>

    <Cabecera
      class="print:hidden"
      :nombreBanco="datos.banco?.Nombre ?? ''"
      :nombreUsuario="sesion.usuario?.Nombre ?? ''"
      :nombreRol="sesion.infoRol?.Nombre ?? ''"
      :iniciales="sesion.iniciales"
      :menuAbierto="menuMovilAbierto"
      @alternarMenu="alternarMenu"
      @salir="salir"
    />

    <div class="app-body">
      <nav class="app-nav print:hidden" aria-label="Navegación principal">
        <MarcaMenu :nombreBanco="datos.banco?.Nombre ?? ''" />
        <Navegacion :items="sesion.itemsMenu" />
        <NotaPrototipo />
      </nav>

      <main id="contenido" ref="contenidoRef" tabindex="-1" class="app-main focus:outline-none">
        <router-view />
      </main>
    </div>

    <template v-if="menuMovilAbierto">
      <div class="fixed inset-0 z-40 bg-brand-ink/40 backdrop-blur-[2px] wide:hidden" @click="cerrarMenu()"></div>
      <nav
        id="cajon-menu"
        ref="cajonRef"
        class="nav-panel fixed inset-y-0 left-0 z-50 w-nav overflow-y-auto shadow-[15px_0_40px_rgba(23,63,40,0.14)] focus:outline-none wide:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        tabindex="-1"
        @click="cerrarMenu()"
        @keydown.escape="cerrarMenu()"
      >
        <MarcaMenu :nombreBanco="datos.banco?.Nombre ?? ''" />
        <Navegacion :items="sesion.itemsMenu" />
        <NotaPrototipo />
      </nav>
    </template>
  </div>

  <DialogoConfirmar />
  <ToastDeshacer />
</template>
