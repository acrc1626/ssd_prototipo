<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

import { usePaginacion } from '../../application/paginacion';
import { useRemisionesAplicacion } from '../../application/remisiones';
import type { FilaRemision } from '../../application/remisiones';
import EncabezadoPagina from '../../components/EncabezadoPagina.vue';
import EstadoVacio from '../../components/EstadoVacio.vue';
import Icono from '../../components/Icono.vue';
import Migas from '../../components/Migas.vue';
import type { MigaPan } from '../../components/migaPan';
import Paginador from '../../components/Paginador.vue';
import TarjetaIndicador from '../../components/TarjetaIndicador.vue';
import { formatearFecha, formatearNumero } from '../../domain/formato';

const COLUMNAS = '96px 96px minmax(120px,1fr) minmax(100px,1fr) 72px 96px 56px';

const remisiones = useRemisionesAplicacion();
const migas: MigaPan[] = [{ etiqueta: 'Inicio', ruta: '/inicio' }, { etiqueta: 'Remisiones' }];

const expandidaId = ref<string | null>(null);
function alternarDetalle(id: string): void {
  expandidaId.value = expandidaId.value === id ? null : id;
}

const comprobante = ref<FilaRemision | null>(null);
const botonCerrarComprobanteRef = ref<HTMLButtonElement | null>(null);
function verComprobante(f: FilaRemision): void {
  comprobante.value = f;
  // `autofocus` solo no siempre alcanza a aplicar en un modal que se monta con v-if en
  // el mismo tick — sin foco adentro, Escape no tiene qué burbujee hasta el listener
  // (mismo bug que ya se corrigió en el visor de soporte de Recepción).
  nextTick(() => botonCerrarComprobanteRef.value?.focus());
}

function imprimir(): void {
  window.print();
}

const totalKits = computed(() => remisiones.filas.value.reduce((t, f) => t + f.numeroKits, 0));
const totalKg = computed(() => remisiones.filas.value.reduce((t, f) => t + f.kgTotal, 0));
const destinatariosAtendidos = computed(() => new Set(remisiones.filas.value.map((f) => f.destinatario)).size);

const { pagina, totalPaginas, filasPagina, rangoDesde, rangoHasta, irPagina } = usePaginacion(remisiones.filas);
</script>

<template>
  <Migas class="print:hidden" :items="migas" />

  <EncabezadoPagina class="print:hidden" icono="remisiones" titulo="Remisiones">
    <template #acciones>
      <router-link to="/remisiones/nueva" class="btn-primary">
        <Icono nombre="mas" :tamano="18" />
        Nueva remisión
      </router-link>
    </template>
  </EncabezadoPagina>

  <div class="grid grid-cols-2 gap-4 desk:grid-cols-4 print:hidden">
    <TarjetaIndicador compacto titulo="Remisiones" :valor="remisiones.filas.value.length.toString()" icono="remisiones" />
    <TarjetaIndicador compacto titulo="Kits entregados" :valor="formatearNumero(totalKits, 0)" icono="caja" />
    <TarjetaIndicador compacto titulo="Destinatarios atendidos" :valor="destinatariosAtendidos.toString()" icono="organizaciones" />
    <TarjetaIndicador compacto titulo="Kg entregados" :valor="formatearNumero(totalKg)" unidad="kg" icono="existencias" />
  </div>

  <div class="card print:hidden">
    <div class="card-body">
      <h2>Emitidas</h2>

      <EstadoVacio v-if="remisiones.filas.value.length === 0" titulo="Todavía no se han emitido remisiones" />
      <div v-else class="tbl-scroll" tabindex="0" aria-label="Remisiones">
        <div class="tbl-head" :style="{ gridTemplateColumns: COLUMNAS }">
          <span>Número</span>
          <span>Fecha</span>
          <span>Destinatario</span>
          <span>Programa</span>
          <span class="text-right">Kits</span>
          <span class="text-right">Kg</span>
          <span class="sr-only">Detalle</span>
        </div>
        <template v-for="f in filasPagina" :key="f.idRemision">
          <div class="tbl-row" :style="{ gridTemplateColumns: COLUMNAS }">
            <span class="tbl-cell font-mono font-semibold text-ink" data-label="Número">{{ f.numero }}</span>
            <span class="tbl-cell" data-label="Fecha">{{ formatearFecha(f.fecha) }}</span>
            <span class="tbl-cell" data-label="Destinatario">
              <span class="block text-ink">{{ f.destinatario }}</span>
              <span v-if="f.esPersona || f.esEvento" class="flex flex-wrap gap-1">
                <span v-if="f.esPersona" class="chip-neutral">Persona</span>
                <span v-if="f.esEvento" class="chip-warn">Evento</span>
              </span>
            </span>
            <span class="tbl-cell text-muted" data-label="Programa">{{ f.programa || 'Sin kit' }}</span>
            <span class="tbl-cell num" data-label="Kits">{{ f.numeroKits || '—' }}</span>
            <span class="tbl-cell num" data-label="Kg">{{ formatearNumero(f.kgTotal) }}</span>
            <span class="tbl-cell">
              <button
                type="button"
                class="btn-icon h-[34px]! w-[34px]! max-desk:h-touch! max-desk:w-touch!"
                :aria-expanded="expandidaId === f.idRemision"
                :aria-label="'Ver detalle de ' + f.numero"
                @click="alternarDetalle(f.idRemision)"
              >
                <Icono nombre="chevron-derecha" :tamano="16" class="transition-transform" :class="{ 'rotate-90': expandidaId === f.idRemision }" />
              </button>
            </span>
          </div>

          <div v-if="expandidaId === f.idRemision" class="col-span-full rounded-md bg-page p-4">
            <div class="flex flex-wrap items-center justify-between gap-2 pb-3">
              <p class="text-sm font-medium text-ink">Lotes asignados por FEFO</p>
              <button type="button" class="btn-secondary" @click="verComprobante(f)">
                <Icono nombre="ojo" :tamano="16" />
                Ver comprobante
              </button>
            </div>

            <p v-if="!f.tieneDetalle" class="text-xs text-muted">Detalle de lotes no disponible para esta remisión.</p>
            <ul v-else class="flex flex-col divide-y divide-line-row">
              <li
                v-for="(l, i) in remisiones.detalleLotes(f.idRemision)"
                :key="l.codigoLote + i"
                class="flex items-center justify-between gap-4 py-2 text-sm first:pt-0 last:pb-0"
              >
                <span class="lot">{{ l.codigoLote }}</span>
                <span class="min-w-0 flex-1 truncate text-ink">{{ l.producto }}</span>
                <span class="num text-muted">{{ formatearNumero(l.cantidad) }} uds</span>
                <span class="num font-medium text-ink">{{ formatearNumero(l.kg) }} kg</span>
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
        :total="remisiones.filas.value.length"
        etiqueta="remisiones"
        @ir-pagina="irPagina"
      />
    </div>
  </div>

  <div v-if="comprobante" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:static print:bg-transparent print:p-0" @click="comprobante = null">
    <div
      class="card w-full max-w-[520px] print:max-w-none print:border-0 print:shadow-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comprobante-titulo"
      @click.stop
      @keydown.escape="comprobante = null"
    >
      <div class="card-body">
        <div class="flex items-center justify-between gap-2 print:hidden">
          <h2 id="comprobante-titulo" class="font-display text-base font-semibold text-ink">Comprobante de remisión</h2>
          <button
            ref="botonCerrarComprobanteRef"
            type="button"
            class="btn-icon h-9! w-9!"
            aria-label="Cerrar"
            autofocus
            @click="comprobante = null"
          >
            <Icono nombre="cerrar" :tamano="18" />
          </button>
        </div>

        <div class="flex flex-col gap-1">
          <h1 class="font-display text-xl! font-bold text-ink">Remisión {{ comprobante.numero }}</h1>
          <p class="text-sm text-muted">{{ formatearFecha(comprobante.fecha) }}</p>
        </div>

        <div class="grid grid-cols-2 gap-4 rounded-md bg-page p-4 text-sm">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.06em] text-muted">Destinatario</p>
            <p class="font-medium text-ink">{{ comprobante.destinatario }}</p>
            <p v-if="comprobante.esPersona" class="text-xs text-muted">Persona natural</p>
            <p v-if="comprobante.esEvento" class="text-xs text-lot-ink">Entrega de evento</p>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.06em] text-muted">Programa</p>
            <p class="font-medium text-ink">{{ comprobante.programa || 'Sin kit' }}</p>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.06em] text-muted">Kits entregados</p>
            <p class="font-medium text-ink">{{ comprobante.numeroKits || '—' }}</p>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.06em] text-muted">Peso total</p>
            <p class="font-medium text-ink">{{ formatearNumero(comprobante.kgTotal) }} kg</p>
          </div>
        </div>

        <div v-if="comprobante.tieneDetalle" class="flex flex-col gap-2">
          <p class="text-xs font-bold uppercase tracking-[0.06em] text-muted">Lotes</p>
          <ul class="flex flex-col divide-y divide-line-row text-sm">
            <li
              v-for="(l, i) in remisiones.detalleLotes(comprobante.idRemision)"
              :key="l.codigoLote + i"
              class="flex items-center justify-between gap-4 py-1.5 first:pt-0 last:pb-0"
            >
              <span class="font-mono text-xs text-muted">{{ l.codigoLote }}</span>
              <span class="min-w-0 flex-1 truncate">{{ l.producto }}</span>
              <span class="num">{{ formatearNumero(l.kg) }} kg</span>
            </li>
          </ul>
        </div>

        <button type="button" class="btn-primary print:hidden" @click="imprimir()">
          <Icono nombre="archivo" :tamano="16" />
          Imprimir
        </button>
      </div>
    </div>
  </div>
</template>
