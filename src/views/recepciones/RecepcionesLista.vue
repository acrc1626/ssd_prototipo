<script setup lang="ts">
import { computed, ref } from 'vue';

import { usePaginacion } from '../../application/paginacion';
import { useRecepcionesAplicacion } from '../../application/recepciones';
import EncabezadoPagina from '../../components/EncabezadoPagina.vue';
import EstadoVacio from '../../components/EstadoVacio.vue';
import Icono from '../../components/Icono.vue';
import Migas from '../../components/Migas.vue';
import type { MigaPan } from '../../components/migaPan';
import Paginador from '../../components/Paginador.vue';
import { formatearFecha, formatearNumero } from '../../domain/formato';
import type { EstadoRecepcion, OrigenRecepcion } from '../../domain/modelos';

type FiltroEstado = 'TODAS' | EstadoRecepcion;
type FiltroOrigen = 'TODOS' | OrigenRecepcion;

const COLUMNAS = '96px 96px minmax(110px,1fr) 96px minmax(100px,1fr) 88px 96px 144px 104px 56px';

const aplicacion = useRecepcionesAplicacion();

const columnas = COLUMNAS;
const registradores = aplicacion.registradores;
const migas: MigaPan[] = [{ etiqueta: 'Inicio', ruta: '/inicio' }, { etiqueta: 'Recepciones' }];

const pestana = ref<FiltroEstado>('TODAS');
const busqueda = ref('');
const origenFiltro = ref<FiltroOrigen>('TODOS');
const registroFiltro = ref('TODOS');
const filaAbiertaId = ref<string | null>(null);

const totalTodas = computed(() => aplicacion.filas.value.length);
const totalBorradores = computed(() => aplicacion.filas.value.filter((f) => f.estado === 'BORRADOR').length);
const totalConfirmadas = computed(() => aplicacion.filas.value.filter((f) => f.estado === 'CONFIRMADA').length);

const filas = computed(() => {
  const texto = busqueda.value.trim().toLowerCase();

  return aplicacion.filas.value.filter((f) => {
    if (pestana.value !== 'TODAS' && f.estado !== pestana.value) return false;
    if (origenFiltro.value !== 'TODOS' && f.origen !== origenFiltro.value) return false;
    if (registroFiltro.value !== 'TODOS' && f.registro !== registroFiltro.value) return false;
    if (
      texto &&
      !(
        f.numero.toLowerCase().includes(texto) ||
        f.donante.toLowerCase().includes(texto) ||
        f.numeroSoporte.toLowerCase().includes(texto)
      )
    ) {
      return false;
    }
    return true;
  });
});

const { pagina, totalPaginas, filasPagina, rangoDesde, rangoHasta, irPagina } = usePaginacion(filas);

function etiquetaOrigen(origen: OrigenRecepcion): string {
  return origen === 'DONACION' ? 'Donación' : 'Compra';
}

function alternarDetalle(idRecepcion: string): void {
  filaAbiertaId.value = filaAbiertaId.value === idRecepcion ? null : idRecepcion;
}
</script>

<template>
  <Migas :items="migas" />

  <EncabezadoPagina icono="recepciones" titulo="Recepciones">
    <template #acciones>
      <router-link to="/recepciones/nueva" class="btn-primary">
        <Icono nombre="mas" :tamano="18" />
        Nueva recepción
      </router-link>
    </template>
  </EncabezadoPagina>

  <div class="card">
    <div class="card-body gap-0!">
      <div class="p-4">
        <div class="segmented" role="tablist" aria-label="Filtrar por estado">
          <button
            type="button"
            class="segmented-option"
            role="tab"
            :aria-selected="pestana === 'TODAS'"
            @click="pestana = 'TODAS'"
          >
            Todas
            <span class="chip-neutral ml-1.5">{{ totalTodas }}</span>
          </button>
          <button
            type="button"
            class="segmented-option"
            role="tab"
            :aria-selected="pestana === 'BORRADOR'"
            @click="pestana = 'BORRADOR'"
          >
            Borradores
            <span class="chip-neutral ml-1.5">{{ totalBorradores }}</span>
          </button>
          <button
            type="button"
            class="segmented-option"
            role="tab"
            :aria-selected="pestana === 'CONFIRMADA'"
            @click="pestana = 'CONFIRMADA'"
          >
            Confirmadas
            <span class="chip-neutral ml-1.5">{{ totalConfirmadas }}</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 p-4 tablet:grid-cols-2 desk:grid-cols-[minmax(260px,1.5fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto] desk:items-end">
        <label class="label">
          Buscar
          <div class="relative">
            <Icono
              nombre="buscar"
              :tamano="16"
              class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              v-model="busqueda"
              type="search"
              class="input w-full max-w-none pl-10"
              placeholder="Buscar por número, donante o soporte"
              aria-label="Buscar recepciones"
            />
          </div>
        </label>
        <label class="label">
          Origen
          <select v-model="origenFiltro" class="select w-full max-w-none">
            <option value="TODOS">Todos</option>
            <option value="DONACION">Donación</option>
            <option value="COMPRA">Compra</option>
          </select>
        </label>
        <label class="label">
          Registró
          <select v-model="registroFiltro" class="select w-full max-w-none">
            <option value="TODOS">Todos</option>
            <option v-for="r in registradores" :key="r" :value="r">{{ r }}</option>
          </select>
        </label>
        <span class="text-sm text-muted desk:pb-[11px]">
          {{ filas.length }} {{ filas.length === 1 ? 'recepción' : 'recepciones' }}
        </span>
      </div>

      <EstadoVacio
        v-if="filas.length === 0"
        titulo="No hay recepciones con esos filtros"
        descripcion="Prueba a quitar un filtro o a buscar con otras palabras."
      />
      <div v-else class="tbl-scroll" tabindex="0" aria-label="Tabla de recepciones">
        <div class="rcp-head" :style="{ gridTemplateColumns: columnas }">
          <span>Número</span>
          <span>Fecha</span>
          <span>Donante</span>
          <span>Origen</span>
          <span>Número de soporte</span>
          <span class="text-right">Renglones</span>
          <span class="text-right">Kg recibidos</span>
          <span>Registró</span>
          <span>Estado</span>
          <span class="sr-only">Detalle</span>
        </div>
        <template v-for="f in filasPagina" :key="f.idRecepcion">
          <div
            class="rcp-row"
            :data-abierta="filaAbiertaId === f.idRecepcion ? 'true' : null"
            :style="{ gridTemplateColumns: columnas }"
          >
            <span class="tbl-cell font-mono font-semibold text-ink" data-label="Número">{{ f.numero }}</span>
            <span class="tbl-cell" data-label="Fecha">{{ formatearFecha(f.fecha) }}</span>
            <span class="tbl-cell text-muted" data-label="Donante" :title="f.donante">{{ f.donante }}</span>
            <span class="tbl-cell text-muted" data-label="Origen">{{ etiquetaOrigen(f.origen) }}</span>
            <span class="tbl-cell text-muted" data-label="Número de soporte" :title="f.numeroSoporte">{{ f.numeroSoporte }}</span>
            <span class="tbl-cell num" data-label="Renglones">{{ f.renglones }}</span>
            <span class="tbl-cell num" data-label="Kg recibidos">{{ formatearNumero(f.kgRecibidos) }}</span>
            <span class="tbl-cell text-muted" data-label="Registró">{{ f.registro }}</span>
            <span class="tbl-cell" data-label="Estado">
              <span :class="f.estado === 'BORRADOR' ? 'chip-warn' : 'chip-ok'">
                {{ f.estado === 'BORRADOR' ? 'Borrador' : 'Confirmada' }}
              </span>
            </span>
            <span class="tbl-cell tablet:flex tablet:justify-end">
              <button
                type="button"
                class="rcp-chevron"
                :aria-expanded="filaAbiertaId === f.idRecepcion"
                :aria-controls="`detalle-${f.idRecepcion}`"
                :aria-label="(filaAbiertaId === f.idRecepcion ? 'Ocultar detalle de ' : 'Ver detalle de ') + f.numero"
                @click="alternarDetalle(f.idRecepcion)"
              >
                <Icono nombre="chevron-derecha" :tamano="18" />
              </button>
            </span>
          </div>

          <div
            v-if="filaAbiertaId === f.idRecepcion"
            :id="`detalle-${f.idRecepcion}`"
            class="rcp-detalle"
            role="region"
            :aria-label="'Detalle de la recepción ' + f.numero"
          >
            <div class="rcp-detalle-grid">
              <div>
                <p class="rcp-detalle-label">Número de recepción</p>
                <p class="rcp-detalle-valor font-mono">{{ f.numero }}</p>
              </div>
              <div>
                <p class="rcp-detalle-label">Donante</p>
                <p class="rcp-detalle-valor">{{ f.donante }}</p>
              </div>
              <div>
                <p class="rcp-detalle-label">Origen</p>
                <p class="rcp-detalle-valor">{{ etiquetaOrigen(f.origen) }}</p>
              </div>
              <div>
                <p class="rcp-detalle-label">Número de soporte</p>
                <p class="rcp-detalle-valor">{{ f.numeroSoporte }}</p>
              </div>
              <div>
                <p class="rcp-detalle-label">Renglones</p>
                <p class="rcp-detalle-valor">{{ f.renglones }}</p>
              </div>
              <div>
                <p class="rcp-detalle-label">Peso total recibido</p>
                <p class="rcp-detalle-valor">{{ formatearNumero(f.kgRecibidos) }} kg</p>
              </div>
              <div>
                <p class="rcp-detalle-label">Registrado por</p>
                <p class="rcp-detalle-valor">{{ f.registro }}</p>
              </div>
              <div>
                <p class="rcp-detalle-label">Fecha de registro</p>
                <p class="rcp-detalle-valor">{{ formatearFecha(f.fecha) }}</p>
              </div>
              <div>
                <p class="rcp-detalle-label">Estado</p>
                <p class="rcp-detalle-valor">
                  <span :class="f.estado === 'BORRADOR' ? 'chip-warn' : 'chip-ok'">
                    {{ f.estado === 'BORRADOR' ? 'Borrador' : 'Confirmada' }}
                  </span>
                </p>
              </div>
            </div>
            <div class="mt-4">
              <router-link :to="`/recepciones/${f.numero}`" class="btn-primary">
                <Icono :nombre="f.estado === 'BORRADOR' ? 'lapiz' : 'ojo'" :tamano="16" />
                {{ f.estado === 'BORRADOR' ? 'Editar recepción' : 'Ver recepción' }}
              </router-link>
            </div>
          </div>
        </template>
      </div>

      <div class="p-4 pt-0">
        <Paginador
          :pagina="pagina"
          :total-paginas="totalPaginas"
          :rango-desde="rangoDesde"
          :rango-hasta="rangoHasta"
          :total="filas.length"
          etiqueta="recepciones"
          @ir-pagina="irPagina"
        />
      </div>
    </div>
  </div>
</template>
