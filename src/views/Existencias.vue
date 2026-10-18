<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { usePaginacion } from '../application/paginacion';
import { useExistenciasAplicacion } from '../application/existencias';
import EncabezadoPagina from '../components/EncabezadoPagina.vue';
import EstadoVacio from '../components/EstadoVacio.vue';
import Icono from '../components/Icono.vue';
import Migas from '../components/Migas.vue';
import type { MigaPan } from '../components/migaPan';
import Paginador from '../components/Paginador.vue';
import TarjetaIndicador from '../components/TarjetaIndicador.vue';
import { CLASE_CHIP_RIESGO, ETIQUETA_MOVIMIENTO, ETIQUETA_RIESGO } from '../domain/calculos';
import { formatearFecha, formatearNumero } from '../domain/formato';
import type { NivelRiesgo } from '../domain/modelos';
import { useDatosStore } from '../stores/datos';
import { useSesionStore } from '../stores/sesion';

type FiltroRiesgo = 'TODOS' | NivelRiesgo;
type Orden = 'VENCE' | 'RIESGO' | 'PRODUCTO';

/* Producto con mínimo real (160px) en vez de minmax(0,1fr): sin un piso, esa columna se
   aplastaba a 0-29px entre 1024 y 1440px y el nombre se montaba sobre Presentación. Con
   el mínimo, si no cabe todo, la tabla usa su propio scroll horizontal (.tbl-scroll ya lo
   trae) en vez de volverse ilegible — es el mismo criterio de CLAUDE.md regla 6. */
const COLUMNAS = '68px minmax(150px,1fr) 168px 104px 96px 92px 64px 88px 72px';
const ORDEN_RIESGO: Record<NivelRiesgo, number> = { ALTO: 0, MEDIO: 1, BAJO: 2 };

const aplicacion = useExistenciasAplicacion();
const datos = useDatosStore();
const sesion = useSesionStore();

/** "Registrar baja" es una acción de bodega (CLAUDE.md, sección Roles): coordinadora y
 *  asistente ven Existencias pero no tienen Bajas en su menú. Mostrarles el botón igual
 *  los mandaría a un enlace que el roleGuard del router rebota a /inicio en silencio
 *  (prevención de errores: mejor no mostrar una acción que el rol no puede hacer). */
const puedeRegistrarBaja = computed(() => sesion.itemsMenu.some((item) => item.ruta === '/bajas'));

/** Igual criterio que "Registrar baja": solo la asistente tiene Remisiones en su menú
 *  (CLAUDE.md, Roles). A bodega y coordinadora el roleGuard les rebota /remisiones a
 *  /inicio, así que no se les muestra el botón (no ofrecer una acción que el rol no puede
 *  hacer). */
const puedeNuevaRemision = computed(() => sesion.itemsMenu.some((item) => item.ruta === '/remisiones'));

const etiquetaRiesgo = ETIQUETA_RIESGO;
const claseChipRiesgo = CLASE_CHIP_RIESGO;
const etiquetaMovimiento = ETIQUETA_MOVIMIENTO;
const columnas = COLUMNAS;

const migas: MigaPan[] = [{ etiqueta: 'Inicio', ruta: '/inicio' }, { etiqueta: 'Existencias' }];
const categorias = computed(() => datos.categorias);

const categoriaFiltro = ref('TODAS');
const riesgoFiltro = ref<FiltroRiesgo>('TODOS');
const orden = ref<Orden>('VENCE');
const busqueda = ref('');
const expandidos = ref<Set<string>>(new Set());

/** Llega desde Riesgo de vencimiento con `?lote=<id>`: se filtra por ese lote (su código
 *  queda en el buscador, a la vista, y se puede limpiar) y se abre su trazabilidad, para
 *  que la coordinadora caiga directo en el lote que la preocupaba (cierra el flujo
 *  Inicio → Riesgo → Existencias). */
const route = useRoute();
onMounted(() => {
  const idLote = typeof route.query.lote === 'string' ? route.query.lote : '';
  if (!idLote) return;
  const fila = aplicacion.filas.value.find((f) => f.idLote === idLote);
  if (!fila) return;
  busqueda.value = fila.codigo;
  expandidos.value = new Set([idLote]);
});

const kgEnBodega = computed(() => aplicacion.filas.value.reduce((t, f) => t + f.kg, 0));
const kgRiesgoAlto = computed(() =>
  aplicacion.filas.value.filter((f) => f.nivelRiesgo === 'ALTO').reduce((t, f) => t + f.kg, 0),
);

const filas = computed(() => {
  const texto = busqueda.value.trim().toLowerCase();

  const filtradas = aplicacion.filas.value.filter((f) => {
    if (categoriaFiltro.value !== 'TODAS' && f.categoriaId !== categoriaFiltro.value) return false;
    if (riesgoFiltro.value !== 'TODOS' && f.nivelRiesgo !== riesgoFiltro.value) return false;
    if (texto && !(f.producto.toLowerCase().includes(texto) || f.codigo.toLowerCase().includes(texto))) return false;
    return true;
  });

  return [...filtradas].sort((a, b) => {
    if (orden.value === 'PRODUCTO') return a.producto.localeCompare(b.producto, 'es');
    if (orden.value === 'RIESGO') {
      const pesoA = a.nivelRiesgo ? ORDEN_RIESGO[a.nivelRiesgo] : 3;
      const pesoB = b.nivelRiesgo ? ORDEN_RIESGO[b.nivelRiesgo] : 3;
      return pesoA - pesoB;
    }
    const diasA = a.diasParaVencer ?? Number.POSITIVE_INFINITY;
    const diasB = b.diasParaVencer ?? Number.POSITIVE_INFINITY;
    return diasA - diasB;
  });
});

// --- Paginación de la tabla ---
const { pagina, totalPaginas, filasPagina, rangoDesde, rangoHasta, irPagina } = usePaginacion(filas);

function alternarExpandido(idLote: string): void {
  const copia = new Set(expandidos.value);
  copia.has(idLote) ? copia.delete(idLote) : copia.add(idLote);
  expandidos.value = copia;
}

function estaExpandido(idLote: string): boolean {
  return expandidos.value.has(idLote);
}

function trazabilidad(idLote: string) {
  return aplicacion.trazabilidad(idLote);
}

function textoDias(dias: number | null): string {
  if (dias === null) return 'Sin riesgo calculado';
  if (dias <= 0) return 'vence hoy';
  return dias === 1 ? 'en 1 día' : `en ${dias} días`;
}
</script>

<template>
  <Migas :items="migas" />

  <EncabezadoPagina icono="existencias" titulo="Existencias">
    <template v-if="puedeNuevaRemision" #acciones>
      <router-link to="/remisiones" class="btn-primary">
        <Icono nombre="mas" :tamano="18" />
        Nueva remisión
      </router-link>
    </template>
  </EncabezadoPagina>

  <div class="grid grid-cols-2 gap-4 desk:grid-cols-4">
    <TarjetaIndicador compacto titulo="Lotes vigentes" :valor="aplicacion.filas.value.length.toString()" icono="existencias" />
    <TarjetaIndicador compacto titulo="En bodega" :valor="formatearNumero(kgEnBodega)" unidad="kg" icono="caja" />
    <TarjetaIndicador
      compacto
      titulo="Riesgo alto"
      :valor="formatearNumero(kgRiesgoAlto)"
      unidad="kg"
      icono="riesgo"
      tono="alerta"
    />
    <TarjetaIndicador
      compacto
      titulo="Vencimiento estimado"
      :valor="aplicacion.vencimientoEstimadoCount.value.toString()"
      unidad="lotes"
      icono="historicos"
      tono="lote"
    />
  </div>

  <div class="card">
    <div class="card-body">
      <div class="flex flex-wrap items-center gap-4">
        <label class="flex items-center gap-2 text-sm text-label">
          Categoría
          <select v-model="categoriaFiltro" class="select max-w-none w-[176px]">
            <option value="TODAS">Todas</option>
            <option v-for="c in categorias" :key="c.IdCategoria" :value="c.IdCategoria">{{ c.Nombre }}</option>
          </select>
        </label>
        <label class="flex items-center gap-2 text-sm text-label">
          Riesgo
          <select v-model="riesgoFiltro" class="select max-w-none w-[176px]">
            <option value="TODOS">Todos</option>
            <option value="ALTO">Alto</option>
            <option value="MEDIO">Medio</option>
            <option value="BAJO">Bajo</option>
          </select>
        </label>
        <label class="flex items-center gap-2 text-sm text-label">
          Ordenar
          <select v-model="orden" class="select max-w-none w-[176px]">
            <option value="VENCE">Vence primero</option>
            <option value="RIESGO">Mayor riesgo</option>
            <option value="PRODUCTO">Producto (A-Z)</option>
          </select>
        </label>
        <div class="relative ml-auto">
          <Icono
            nombre="buscar"
            :tamano="16"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            v-model="busqueda"
            type="search"
            class="input pl-10"
            placeholder="Buscar producto o lote"
            aria-label="Buscar en existencias"
          />
        </div>
      </div>

      <EstadoVacio
        v-if="filas.length === 0"
        titulo="No hay lotes con esos filtros"
        descripcion="Prueba a quitar un filtro o a buscar con otras palabras."
      />
      <div v-else class="tbl-scroll tbl-fit" tabindex="0" aria-label="Tabla de existencias">
        <div class="tbl-head" :style="{ gridTemplateColumns: columnas }">
          <span>Lote</span>
          <span>Producto</span>
          <span>Presentación</span>
          <span>Recepción</span>
          <span>Vencimiento</span>
          <span class="text-right">Existencia</span>
          <span class="text-right">Kg</span>
          <span>Riesgo</span>
          <span class="sr-only">Detalle</span>
        </div>
        <template v-for="f in filasPagina" :key="f.idLote">
          <div class="tbl-row" :style="{ gridTemplateColumns: columnas }">
            <span class="tbl-cell" data-label="Lote"><span class="lot">{{ f.codigo }}</span></span>
            <span class="tbl-cell" data-label="Producto">
              <span class="block font-medium text-ink">{{ f.producto }}</span>
              <span class="cat">{{ f.categoriaNombre }}</span>
            </span>
            <span class="tbl-cell" data-label="Presentación">{{ f.presentacion }}</span>
            <span class="tbl-cell" data-label="Recepción">
              <template v-if="f.numeroRecepcion">
                <span class="block font-mono text-ink">{{ f.numeroRecepcion }}</span>
                <span class="block text-xs text-muted">{{ f.donante }}</span>
              </template>
            </span>
            <span class="tbl-cell" data-label="Vencimiento">
              <span v-if="f.fechaVencimiento">{{ formatearFecha(f.fechaVencimiento) }}</span>
              <span v-else class="text-muted">Sin fecha</span>
            </span>
            <span class="tbl-cell num" data-label="Existencia">{{ formatearNumero(f.existencia, 0) }} {{ f.unidadConteo }}</span>
            <span class="tbl-cell num" data-label="Kg">{{ formatearNumero(f.kg) }}</span>
            <span class="tbl-cell" data-label="Riesgo">
              <span v-if="f.nivelRiesgo" :class="claseChipRiesgo[f.nivelRiesgo]">{{ etiquetaRiesgo[f.nivelRiesgo] }}</span>
              <span v-else class="text-xs text-muted">Sin riesgo</span>
            </span>
            <span class="tbl-cell flex items-center gap-1">
              <router-link
                v-if="puedeRegistrarBaja"
                :to="`/bajas?lote=${f.idLote}`"
                class="btn-icon h-[34px]! w-[34px]! max-desk:h-touch! max-desk:w-touch!"
                :aria-label="'Registrar baja de ' + f.codigo"
                title="Registrar baja"
              >
                <Icono nombre="bajas" :tamano="16" />
              </router-link>
              <button
                type="button"
                class="btn-icon h-[34px]! w-[34px]! max-desk:h-touch! max-desk:w-touch!"
                :aria-expanded="estaExpandido(f.idLote)"
                :aria-label="'Ver trazabilidad de ' + f.codigo"
                @click="alternarExpandido(f.idLote)"
              >
                <Icono
                  nombre="chevron-derecha"
                  :tamano="16"
                  class="transition-transform"
                  :class="{ 'rotate-90': estaExpandido(f.idLote) }"
                />
              </button>
            </span>
          </div>

          <div v-if="estaExpandido(f.idLote)" class="col-span-full rounded-md bg-page p-4 text-sm">
            <div class="mb-2 flex flex-wrap items-center gap-2">
              <p class="font-medium text-ink">Trazabilidad de {{ f.codigo }}</p>
              <span v-if="f.vencimientoEstimado" class="chip-warn">Vencimiento estimado</span>
            </div>
            <ul class="flex flex-col gap-2">
              <li
                v-for="m in trazabilidad(f.idLote)"
                :key="m.fecha + m.tipo"
                class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted"
              >
                <span class="text-ink">{{ etiquetaMovimiento[m.tipo] }}</span>
                <span>{{ formatearFecha(m.fecha) }}</span>
                <span class="num">{{ formatearNumero(m.cantidad, 0) }} uds · {{ formatearNumero(m.kg) }} kg</span>
                <span>{{ m.usuario }}</span>
              </li>
            </ul>
          </div>
        </template>
      </div>

      <Paginador
        :pagina="pagina"
        :total-paginas="totalPaginas"
        :rango-desde="rangoDesde"
        :rango-hasta="rangoHasta"
        :total="filas.length"
        etiqueta="lotes"
        @ir-pagina="irPagina"
      />
    </div>
  </div>
</template>
