import { ref } from 'vue';
import { defineStore } from 'pinia';

export interface SolicitudConfirmacion {
  titulo: string;
  mensaje: string;
  /** Líneas de resumen antes de confirmar (heurística A-01 de decisiones.md). */
  detalle?: string[];
  textoConfirmar?: string;
  textoCancelar?: string;
  variante?: 'normal' | 'peligro';
}

/** Diálogo de confirmación centralizado: toda acción con efecto (confirmar recepción,
 *  etc.) pasa por aquí en vez de aplicarse de inmediato. El componente
 *  <DialogoConfirmar> (montado una vez en el shell) dibuja `solicitud`. */
export const useConfirmarStore = defineStore('confirmar', () => {
  const solicitud = ref<SolicitudConfirmacion | null>(null);
  let resolver: ((valor: boolean) => void) | undefined;

  function pedir(nuevaSolicitud: SolicitudConfirmacion): Promise<boolean> {
    solicitud.value = nuevaSolicitud;
    return new Promise<boolean>((resolve) => {
      resolver = resolve;
    });
  }

  function responder(valor: boolean): void {
    resolver?.(valor);
    resolver = undefined;
    solicitud.value = null;
  }

  return { solicitud, pedir, responder };
});
