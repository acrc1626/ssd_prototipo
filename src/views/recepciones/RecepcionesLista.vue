<script setup lang="ts">
import { computed, ref } from 'vue';

import { usePaginacion } from '../../application/paginacion';
import { obtenerRecepcionDetalle } from '../../application/recepcionDetalle';
import { useRecepcionesAplicacion } from '../../application/recepciones';
import EncabezadoPagina from '../../components/EncabezadoPagina.vue';
import EstadoVacio from '../../components/EstadoVacio.vue';
import Icono from '../../components/Icono.vue';
import Paginador from '../../components/Paginador.vue';
import { formatearFecha, formatearNumero } from '../../domain/formato';
import type { EstadoRecepcion, OrigenRecepcion } from '../../domain/modelos';

type FiltroEstado = 'TODAS' | EstadoRecepcion;
type FiltroOrigen = 'TODOS' | OrigenRecepcion;

const COLUMNAS = '80px 88px minmax(120px,1fr) 72px minmax(110px,1fr) 72px 84px 104px 92px 48px';

const aplicacion = useRecepcionesAplicacion();

const columnas = COLUMNAS;
const registradores = aplicacion.registradores;

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

/** Renglones (productos recibidos) de una recepción, para el detalle expandible: es la
 *  información que la fila no muestra. Reusa obtenerRecepcionDetalle. */
function renglonesDe(numero: string) {
  return obtenerRecepcionDetalle(numero)?.renglones ?? [];
}
</script>

<template>
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
      <div v-else class="tbl-scroll tbl-fit" tabindex="0" aria-label="Tabla de recepciones">
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
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p class="rcp-detalle-label">Productos recibidos</p>
              <p class="text-xs text-muted">
                {{ f.renglones }} {{ f.renglones === 1 ? 'renglón' : 'renglones' }} · {{ formatearNumero(f.kgRecibidos) }} kg en total
              </p>
            </div>

            <p v-if="renglonesDe(f.numero).length === 0" class="py-3 text-center text-sm text-muted">
              Esta recepción todavía no tiene renglones.
            </p>
            <div v-else class="tbl-scroll tbl-fit" tabindex="0" :aria-label="'Productos de la recepción ' + f.numero">
              <div class="tbl-head" style="grid-template-columns: minmax(150px,1fr) 120px 96px minmax(120px,1fr) 88px">
                <span>Producto</span>
                <span class="text-right">Cantidad</span>
                <span class="text-right">Kg</span>
                <span>Vencimiento</span>
                <span>Lote</span>
              </div>
              <div
                v-for="r in renglonesDe(f.numero)"
                :key="r.id"
                class="tbl-row"
                style="grid-template-columns: minmax(150px,1fr) 120px 96px minmax(120px,1fr) 88px"
              >
                <span class="tbl-cell" data-label="Producto">
                  <span class="block font-medium text-ink">{{ r.productoNombre }}</span>
                  <span class="block text-xs text-muted">{{ r.presentacionNombre }}</span>
                </span>
                <span class="tbl-cell num" data-label="Cantidad">{{ formatearNumero(r.cantidad, 0) }} {{ r.unidadConteo }}</span>
                <span class="tbl-cell num" data-label="Kg">{{ formatearNumero(r.kgRecibido) }}</span>
                <span class="tbl-cell flex flex-wrap items-center gap-1 overflow-visible whitespace-normal" data-label="Vencimiento">
                  <template v-if="r.fechaVencimiento">
                    <span>{{ formatearFecha(r.fechaVencimiento) }}</span>
                    <span v-if="r.vencimientoEstimado" class="chip-warn">estimada</span>
                  </template>
                  <span v-else class="text-muted">Sin fecha</span>
                </span>
                <span class="tbl-cell" data-label="Lote">
                  <span v-if="r.codigoLote" class="lot">{{ r.codigoLote }}</span>
                  <span v-else class="text-xs text-muted">Sin crear</span>
                </span>
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
