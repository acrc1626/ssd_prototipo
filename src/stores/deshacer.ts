import { ref } from 'vue';
import { defineStore } from 'pinia';

export interface ToastDeshacer {
  mensaje: string;
  accion: () => void;
}

/** Toast "Deshacer" para acciones destructivas de bajo riesgo (quitar un renglón,
 *  por ejemplo) sin interrumpir con un diálogo. Heurística A-01 de decisiones.md. */
export const useDeshacerStore = defineStore('deshacer', () => {
  const toast = ref<ToastDeshacer | null>(null);
  let temporizador: ReturnType<typeof setTimeout> | undefined;

  function mostrar(mensaje: string, accion: () => void, duracionMs = 6000): void {
    clearTimeout(temporizador);
    toast.value = { mensaje, accion };
    temporizador = setTimeout(() => {
      toast.value = null;
    }, duracionMs);
  }

  function deshacer(): void {
    const actual = toast.value;
    clearTimeout(temporizador);
    toast.value = null;
    actual?.accion();
  }

  function cerrar(): void {
    clearTimeout(temporizador);
    toast.value = null;
  }

  return { toast, mostrar, deshacer, cerrar };
});
