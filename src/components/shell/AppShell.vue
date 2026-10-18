<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { useConfirmarStore } from '../../stores/confirmar';
import { useDatosStore } from '../../stores/datos';
import { useSesionStore } from '../../stores/sesion';
import DialogoConfirmar from '../DialogoConfirmar.vue';
import ToastDeshacer from '../ToastDeshacer.vue';
import Cabecera from './Cabecera.vue';
import MarcaMenu from './MarcaMenu.vue';
import Navegacion from './Navegacion.vue';

/** App shell: cabecera + menú fijos, contenido con minmax(0,1fr) (CLAUDE.md regla 6).
 *  Bajo 1440 px el menú vive en un cajón detrás del botón de la cabecera: nada de un
 *  estado intermedio solo-íconos, que es lo que se desbordaba en pantallas chicas. */
const sesion = useSesionStore();
const datos = useDatosStore();
const confirmar = useConfirmarStore();
const router = useRouter();

const menuMovilAbierto = ref(false);

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
    <Cabecera
      class="print:hidden"
      :nombreBanco="datos.banco?.Nombre ?? ''"
      :nombreUsuario="sesion.usuario?.Nombre ?? ''"
      :nombreRol="sesion.infoRol?.Nombre ?? ''"
      :iniciales="sesion.iniciales"
      :menuAbierto="menuMovilAbierto"
      @alternarMenu="menuMovilAbierto = !menuMovilAbierto"
      @salir="salir"
    />

    <div class="app-body">
      <nav class="app-nav print:hidden" aria-label="Navegación principal">
        <MarcaMenu :nombreBanco="datos.banco?.Nombre ?? ''" />
        <Navegacion :items="sesion.itemsMenu" />
      </nav>

      <main id="contenido" class="app-main">
        <router-view />
      </main>
    </div>

    <template v-if="menuMovilAbierto">
      <div class="fixed inset-0 z-40 bg-brand-ink/40 backdrop-blur-[2px] wide:hidden" @click="menuMovilAbierto = false"></div>
      <nav
        class="nav-panel fixed inset-y-0 left-0 z-50 w-nav overflow-y-auto shadow-[15px_0_40px_rgba(23,63,40,0.14)] wide:hidden"
        aria-label="Navegación principal"
        @click="menuMovilAbierto = false"
      >
        <MarcaMenu :nombreBanco="datos.banco?.Nombre ?? ''" />
        <Navegacion :items="sesion.itemsMenu" />
      </nav>
    </template>
  </div>

  <DialogoConfirmar />
  <ToastDeshacer />
</template>
