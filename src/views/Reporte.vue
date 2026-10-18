<script setup lang="ts">
import { computed } from 'vue';

import { useReporteAplicacion } from '../application/reporte';
import EncabezadoPagina from '../components/EncabezadoPagina.vue';
import Migas from '../components/Migas.vue';
import type { MigaPan } from '../components/migaPan';
import TarjetaIndicador from '../components/TarjetaIndicador.vue';
import { formatearNumero } from '../domain/formato';

const reporte = useReporteAplicacion();

const migas: MigaPan[] = [{ etiqueta: 'Inicio', ruta: '/inicio' }, { etiqueta: 'Reporte mensual' }];

const notaTasa = computed(() => {
  const c = reporte.cifras.value;
  if (!c) return '';
  const dif = reporte.diferenciaTasa.value;
  return dif >= 0
    ? `Bajó ${formatearNumero(Math.abs(dif))} puntos frente a ${c.prev}`
    : `Subió ${formatearNumero(Math.abs(dif))} puntos frente a ${c.prev}`;
});

const alturaMaxima = 120;
const tasaMaxima = computed(() => Math.max(1, ...reporte.tendencia.value.map((p) => p.tasa)));

function alturaBarra(tasa: number): number {
  return Math.max(4, (tasa / tasaMaxima.value) * alturaMaxima);
}

function onCambiarPeriodo(event: Event): void {
  reporte.seleccionarPeriodo((event.target as HTMLSelectElement).value);
}
</script>

<template>
  <Migas :items="migas" />

  <EncabezadoPagina icono="reporte" titulo="Reporte mensual" subtitulo="Desperdicio de alimentos">
    <template #acciones>
      <label class="flex items-center gap-2 text-sm text-label">
        Periodo
        <select :value="reporte.claveActual.value" class="select max-w-[200px]!" @change="onCambiarPeriodo">
          <option v-for="p in reporte.periodos.value" :key="p.clave" :value="p.clave">{{ p.etiqueta }}</option>
        </select>
      </label>
    </template>
  </EncabezadoPagina>

  <template v-if="reporte.cifras.value">
    <div class="grid grid-cols-2 gap-4 desk:grid-cols-4">
      <TarjetaIndicador
        compacto
        titulo="Tasa de desperdicio"
        :valor="formatearNumero(reporte.cifras.value.rate)"
        unidad="%"
        :nota="notaTasa"
        icono="reporte"
        tono="lote"
      />
      <TarjetaIndicador compacto titulo="Kg recibidos" :valor="formatearNumero(reporte.cifras.value.recv, 0)" unidad="kg" nota="Total del mes" icono="recepciones" />
      <TarjetaIndicador compacto titulo="Kg entregados" :valor="formatearNumero(reporte.cifras.value.ent, 0)" unidad="kg" nota="A organizaciones" icono="remisiones" />
      <TarjetaIndicador
        compacto
        titulo="Kg perdidos"
        :valor="formatearNumero(reporte.totalPerdido.value, 0)"
        unidad="kg"
        :nota="`${formatearNumero(reporte.cifras.value.recLoss, 0)} kg en recepción · ${formatearNumero(reporte.cifras.value.bodLoss, 0)} kg en bodega`"
        icono="bajas"
        tono="alerta"
      />
    </div>

    <div class="card">
      <div class="card-body">
        <h2>Tendencia de desperdicio</h2>
        <div
          class="rpt-tendencia"
          role="img"
          :aria-label="'Tasa de desperdicio por mes: ' + reporte.tendencia.value.map((p) => p.mes + ' ' + formatearNumero(p.tasa) + '%').join(', ')"
        >
          <div v-for="(p, i) in reporte.tendencia.value" :key="p.mes" class="rpt-tendencia-col">
            <span class="rpt-tendencia-valor">{{ formatearNumero(p.tasa) }}%</span>
            <span
              class="rpt-tendencia-barra"
              :class="{ 'rpt-tendencia-barra-actual': i === reporte.tendencia.value.length - 1 }"
              :style="{ height: alturaBarra(p.tasa) + 'px' }"
              :title="`${p.mes}: ${formatearNumero(p.tasa)}%`"
            ></span>
            <span class="rpt-tendencia-mes">{{ p.mes }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 desk:grid-cols-2">
      <div class="card">
        <div class="card-body">
          <h2>Por categoría</h2>
          <div class="tbl-scroll" tabindex="0" aria-label="Desperdicio por categoría">
            <div class="tbl-head" style="grid-template-columns: minmax(100px,1fr) 88px 88px 72px">
              <span>Categoría</span>
              <span class="text-right">Recibido</span>
              <span class="text-right">Perdido</span>
              <span class="text-right">%</span>
            </div>
            <div v-for="c in reporte.categorias.value" :key="c.nombre" class="tbl-row" style="grid-template-columns: minmax(100px,1fr) 88px 88px 72px">
              <span class="tbl-cell font-medium text-ink" data-label="Categoría">{{ c.nombre }}</span>
              <span class="tbl-cell num" data-label="Recibido">{{ formatearNumero(c.recibido, 0) }}</span>
              <span class="tbl-cell num text-lot-ink" data-label="Perdido">{{ formatearNumero(c.perdida, 0) }}</span>
              <span class="tbl-cell num" data-label="%">{{ formatearNumero(c.porcentajePerdida) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <h2>Por donante</h2>
          <div class="tbl-scroll" tabindex="0" aria-label="Desperdicio por donante">
            <div class="tbl-head" style="grid-template-columns: minmax(100px,1fr) 96px 96px">
              <span>Donante</span>
              <span class="text-right">Recibido</span>
              <span class="text-right">Perdido</span>
            </div>
            <div v-for="d in reporte.donantes.value" :key="d.nombre" class="tbl-row" style="grid-template-columns: minmax(100px,1fr) 96px 96px">
              <span class="tbl-cell font-medium text-ink" data-label="Donante">{{ d.nombre }}</span>
              <span class="tbl-cell num" data-label="Recibido">{{ formatearNumero(d.recibido, 0) }}</span>
              <span class="tbl-cell num text-lot-ink" data-label="Perdido">{{ formatearNumero(d.perdida, 0) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>
