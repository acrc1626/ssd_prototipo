<script setup lang="ts">
import { computed, ref } from 'vue';

import { usePaginacion } from '../application/paginacion';
import { useRiesgoAplicacion } from '../application/riesgo';
import EncabezadoPagina from '../components/EncabezadoPagina.vue';
import EstadoVacio from '../components/EstadoVacio.vue';
import Icono from '../components/Icono.vue';
import Migas from '../components/Migas.vue';
import type { MigaPan } from '../components/migaPan';
import Paginador from '../components/Paginador.vue';
import TarjetaIndicador from '../components/TarjetaIndicador.vue';
import { CLASE_CHIP_RIESGO, ETIQUETA_RIESGO } from '../domain/calculos';
import { formatearFecha, formatearNumero } from '../domain/formato';
import type { NivelRiesgo } from '../domain/modelos';
import { useDatosStore } from '../stores/datos';

type FiltroNivel = 'TODOS' | NivelRiesgo;
type Orden = 'VENCE' | 'KG' | 'PRODUCTO';

const COLUMNAS = '88px minmax(160px,1fr) 144px 128px 96px 104px 112px 56px';

const datos = useDatosStore();
const riesgo = useRiesgoAplicacion();

const migas: MigaPan[] = [{ etiqueta: 'Inicio', ruta: '/inicio' }, { etiqueta: 'Riesgo de vencimiento' }];

const nivelFiltro = ref<FiltroNivel>('TODOS');
const orden = ref<Orden>('VENCE');
const busqueda = ref('');

const etiquetaRiesgo = ETIQUETA_RIESGO;
const claseChipRiesgo = CLASE_CHIP_RIESGO;

const filas = computed(() => {
  const texto = busqueda.value.trim().toLowerCase();

  const filtradas = riesgo.filas.value.filter((f) => {
    if (nivelFiltro.value !== 'TODOS' && f.nivelRiesgo !== nivelFiltro.value) return false;
    if (texto && !(f.producto.toLowerCase().includes(texto) || f.codigo.toLowerCase().includes(texto))) return false;
    return true;
  });

  return [...filtradas].sort((a, b) => {
    if (orden.value === 'PRODUCTO') return a.producto.localeCompare(b.producto, 'es');
    if (orden.value === 'KG') return b.kg - a.kg;
    return a.diasParaVencer - b.diasParaVencer;
  });
});

const { pagina, totalPaginas, filasPagina, rangoDesde, rangoHasta, irPagina } = usePaginacion(filas);

function textoDias(dias: number): string {
  if (dias <= 0) return 'vence hoy';
  return dias === 1 ? 'en 1 día' : `en ${dias} días`;
}
</script>

<template>
  <Migas :items="migas" />

  <EncabezadoPagina icono="riesgo" titulo="Riesgo de vencimiento" :subtitulo="'Corte ' + formatearFecha(datos.fechaReferencia)" />

  <div class="grid grid-cols-2 gap-4 desk:grid-cols-4">
    <TarjetaIndicador compacto titulo="Riesgo alto" :valor="riesgo.conteoPorNivel.value.alto.toString()" nota="Lotes" icono="riesgo" tono="alerta" />
    <TarjetaIndicador compacto titulo="Riesgo medio" :valor="riesgo.conteoPorNivel.value.medio.toString()" nota="Lotes" icono="riesgo" />
    <TarjetaIndicador compacto titulo="Riesgo bajo" :valor="riesgo.conteoPorNivel.value.bajo.toString()" nota="Lotes" icono="riesgo" />
    <TarjetaIndicador compacto titulo="Kg en riesgo" :valor="formatearNumero(riesgo.kgTotalRiesgo.value)" unidad="kg" nota="Alto, medio y bajo" icono="existencias" />
  </div>

  <div class="card">
    <div class="card-body">
      <div class="flex flex-wrap items-center gap-4">
        <label class="flex items-center gap-2 text-sm text-label">
          Nivel
          <select v-model="nivelFiltro" class="select max-w-none w-[150px]">
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
            <option value="KG">Mayor kg en riesgo</option>
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
            aria-label="Buscar en riesgo de vencimiento"
          />
        </div>
      </div>

      <EstadoVacio
        v-if="filas.length === 0"
        titulo="No hay lotes con esos filtros"
        descripcion="Prueba a quitar un filtro o a buscar con otras palabras."
      />
      <div v-else class="tbl-scroll tbl-fit" tabindex="0" aria-label="Tabla de riesgo de vencimiento">
        <div class="tbl-head" :style="{ gridTemplateColumns: COLUMNAS }">
          <span>Lote</span>
          <span>Producto</span>
          <span>Presentación</span>
          <span>Vencimiento</span>
          <span class="text-right">Días</span>
          <span class="text-right">Kg</span>
          <span>Nivel</span>
          <span class="sr-only">Acciones</span>
        </div>
        <div v-for="f in filasPagina" :key="f.idLote" class="tbl-row" :style="{ gridTemplateColumns: COLUMNAS }">
          <span class="tbl-cell" data-label="Lote"><span class="lot">{{ f.codigo }}</span></span>
          <span class="tbl-cell" data-label="Producto">
            <span class="block font-medium text-ink">{{ f.producto }}</span>
            <span class="cat">{{ f.categoriaNombre }}</span>
          </span>
          <span class="tbl-cell" data-label="Presentación">{{ f.presentacion }}</span>
          <span
            class="tbl-cell flex flex-wrap items-center gap-1 overflow-visible whitespace-normal"
            data-label="Vencimiento"
          >
            <template v-if="f.fechaVencimiento">
              <span>{{ formatearFecha(f.fechaVencimiento) }}</span>
              <span v-if="f.vencimientoEstimado" class="chip-warn">estimada</span>
            </template>
            <span v-else class="text-muted">Sin fecha</span>
          </span>
          <span class="tbl-cell num" data-label="Días">{{ textoDias(f.diasParaVencer) }}</span>
          <span class="tbl-cell num" data-label="Kg">{{ formatearNumero(f.kg) }}</span>
          <span class="tbl-cell" data-label="Nivel">
            <span :class="claseChipRiesgo[f.nivelRiesgo]">{{ etiquetaRiesgo[f.nivelRiesgo] }}</span>
          </span>
          <span class="tbl-cell">
            <router-link
              :to="`/existencias?lote=${f.idLote}`"
              class="btn-icon h-[34px]! w-[34px]! max-desk:h-touch! max-desk:w-touch!"
              :aria-label="'Ver ' + f.codigo + ' en existencias'"
              title="Ver en existencias"
            >
              <Icono nombre="existencias" :tamano="16" />
            </router-link>
          </span>
        </div>
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
