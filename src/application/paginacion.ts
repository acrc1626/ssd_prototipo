import { computed, ref, watch } from 'vue';
import type { Ref } from 'vue';

/** Paginación de una tabla sobre una lista ya filtrada/ordenada.
 *  - `filasPagina` es lo que la vista debe recorrer.
 *  - Vuelve a la página 1 cuando la fuente cambia (al filtrar/buscar la computed se
 *    recalcula y devuelve un arreglo nuevo), y ajusta la página si se queda sin filas.
 *  Se usa junto con el componente Paginador.vue. */
export function usePaginacion<T>(fuente: Ref<T[]>, porPagina = 10) {
  const pagina = ref(1);
  const total = computed(() => fuente.value.length);
  const totalPaginas = computed(() => Math.max(1, Math.ceil(total.value / porPagina)));
  const filasPagina = computed(() => fuente.value.slice((pagina.value - 1) * porPagina, pagina.value * porPagina));
  const rangoDesde = computed(() => (total.value === 0 ? 0 : (pagina.value - 1) * porPagina + 1));
  const rangoHasta = computed(() => Math.min(pagina.value * porPagina, total.value));

  function irPagina(n: number): void {
    pagina.value = Math.min(Math.max(1, n), totalPaginas.value);
  }

  watch(fuente, () => {
    pagina.value = 1;
  });
  watch(totalPaginas, (n) => {
    if (pagina.value > n) pagina.value = n;
  });

  return { pagina, total, totalPaginas, filasPagina, rangoDesde, rangoHasta, irPagina };
}
