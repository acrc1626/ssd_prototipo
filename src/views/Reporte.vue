<script setup lang="ts">
import { computed } from 'vue';

import { useReporteAplicacion } from '../application/reporte';
import EncabezadoPagina from '../components/EncabezadoPagina.vue';
import Icono from '../components/Icono.vue';
import TarjetaIndicador from '../components/TarjetaIndicador.vue';
import { formatearFecha, formatearNumero } from '../domain/formato';
import { useDatosStore } from '../stores/datos';

const reporte = useReporteAplicacion();
const datos = useDatosStore();

const notaTasa = computed(() => {
  const c = reporte.cifras.value;
  if (!c) return '';
  const dif = reporte.diferenciaTasa.value;
  return dif >= 0 ? `Bajó ${formatearNumero(Math.abs(dif))} pp frente a ${c.prev}` : `Subió ${formatearNumero(Math.abs(dif))} pp frente a ${c.prev}`;
});

// --- Gráfica de tendencia (línea) ---
const CHART = { w: 640, h: 180, padL: 44, padR: 16, padT: 24, padB: 30 };
const tendenciaChart = computed(() => {
  const puntos = reporte.tendencia.value;
  if (puntos.length === 0) return null;
  const tasas = puntos.map((p) => p.tasa);
  const min = Math.max(0, Math.floor(Math.min(...tasas) - 1));
  const max = Math.ceil(Math.max(...tasas) + 1);
  const plotW = CHART.w - CHART.padL - CHART.padR;
  const plotH = CHART.h - CHART.padT - CHART.padB;
  const baseline = CHART.padT + plotH;
  const x = (i: number) => CHART.padL + (puntos.length === 1 ? plotW / 2 : (i * plotW) / (puntos.length - 1));
  const y = (t: number) => CHART.padT + (1 - (t - min) / (max - min || 1)) * plotH;
  const coords = puntos.map((p, i) => ({ x: x(i), y: y(p.tasa), mes: p.mes, tasa: p.tasa, ultimo: i === puntos.length - 1 }));
  const linea = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const area = `M ${coords[0]!.x},${baseline} L ${coords.map((c) => `${c.x},${c.y}`).join(' L ')} L ${coords[coords.length - 1]!.x},${baseline} Z`;
  // líneas guía horizontales (min, medio, max)
  const guias = [min, Math.round((min + max) / 2), max].map((v) => ({ v, y: y(v) }));
  return { coords, linea, area, baseline, guias };
});

const maxPerdidaCat = computed(() => Math.max(1, ...reporte.categorias.value.map((c) => c.perdida)));
const maxPerdidaDon = computed(() => Math.max(1, ...reporte.donantes.value.map((d) => d.perdida)));

function pct(parte: number, total: number): number {
  return total > 0 ? (parte / total) * 100 : 0;
}

function onCambiarPeriodo(event: Event): void {
  reporte.seleccionarPeriodo((event.target as HTMLSelectElement).value);
}

function descargarCsv(): void {
  const csv = reporte.generarCsv();
  if (!csv) return;
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-desperdicio-${reporte.claveActual.value}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function imprimir(): void {
  window.print();
}
</script>

<template>
  <EncabezadoPagina class="print:hidden" icono="reporte" titulo="Reporte mensual">
    <template #acciones>
      <label class="flex items-center gap-2 text-sm text-label print:hidden">
        Periodo
        <select :value="reporte.claveActual.value" class="select max-w-[190px]!" @change="onCambiarPeriodo">
          <option v-for="p in reporte.periodos.value" :key="p.clave" :value="p.clave">{{ p.etiqueta }}</option>
        </select>
      </label>
      <button type="button" class="btn-secondary print:hidden" @click="descargarCsv()">
        <Icono nombre="archivo" :tamano="16" />
        Descargar CSV
      </button>
      <button type="button" class="btn-primary print:hidden" @click="imprimir()">
        <Icono nombre="archivo" :tamano="16" />
        Imprimir / PDF
      </button>
    </template>
  </EncabezadoPagina>

  <template v-if="reporte.cifras.value">
    <!-- Encabezado solo para impresión / PDF: deja el reporte autodescrito (qué banco,
         qué mes, cuándo se generó), ya que al imprimir se ocultan el menú y la cabecera. -->
    <div class="hidden print:block">
      <p class="text-sm text-muted">{{ datos.banco?.Nombre }}</p>
      <h1 class="font-display text-xl font-bold text-ink">Reporte mensual de desperdicio</h1>
      <p class="text-sm text-muted">{{ reporte.cifras.value.name }} · generado el {{ formatearFecha(datos.fechaReferencia) }}</p>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 gap-4 desk:grid-cols-4">
      <TarjetaIndicador compacto titulo="Tasa de desperdicio" :valor="formatearNumero(reporte.cifras.value.rate)" unidad="%" :nota="notaTasa" icono="reporte" tono="lote" />
      <TarjetaIndicador compacto titulo="Kg recibidos" :valor="formatearNumero(reporte.cifras.value.recv, 0)" unidad="kg" icono="recepciones" />
      <TarjetaIndicador compacto titulo="Kg entregados" :valor="formatearNumero(reporte.cifras.value.ent, 0)" unidad="kg" icono="remisiones" />
      <TarjetaIndicador compacto titulo="Kg perdidos" :valor="formatearNumero(reporte.totalPerdido.value, 0)" unidad="kg" icono="bajas" tono="alerta" />
    </div>

    <!-- Tendencia -->
    <div class="card">
      <div class="card-body">
        <h2>Tendencia de la tasa de desperdicio</h2>
        <p class="help">Últimos {{ reporte.tendencia.value.length }} meses. Menos es mejor.</p>
        <svg v-if="tendenciaChart" :viewBox="`0 0 ${CHART.w} ${CHART.h}`" class="w-full" role="img" :aria-label="'Tasa de desperdicio por mes: ' + reporte.tendencia.value.map((p) => p.mes + ' ' + formatearNumero(p.tasa) + '%').join(', ')">
          <g>
            <line v-for="g in tendenciaChart.guias" :key="g.v" :x1="CHART.padL" :y1="g.y" :x2="CHART.w - CHART.padR" :y2="g.y" stroke="var(--color-line)" stroke-width="1" />
            <text v-for="g in tendenciaChart.guias" :key="'t' + g.v" :x="CHART.padL - 8" :y="g.y + 3" text-anchor="end" font-size="10" fill="var(--color-muted)">{{ g.v }}%</text>
          </g>
          <path :d="tendenciaChart.area" fill="var(--color-loss)" opacity="0.12" />
          <polyline :points="tendenciaChart.linea" fill="none" stroke="var(--color-loss)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <g v-for="c in tendenciaChart.coords" :key="c.mes">
            <circle :cx="c.x" :cy="c.y" :r="c.ultimo ? 5 : 3.5" fill="var(--color-loss)" :stroke="c.ultimo ? 'var(--color-surface)' : 'none'" :stroke-width="c.ultimo ? 2 : 0" />
            <text :x="c.x" :y="c.y - 10" text-anchor="middle" font-size="10" :font-weight="c.ultimo ? 700 : 500" fill="var(--color-ink)">{{ formatearNumero(c.tasa) }}</text>
            <text :x="c.x" :y="CHART.h - 10" text-anchor="middle" font-size="10" fill="var(--color-muted)">{{ c.mes }}</text>
          </g>
        </svg>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 desk:grid-cols-2">
      <!-- Entradas: donación vs compra -->
      <div class="card">
        <div class="card-body">
          <h2>Entradas por origen</h2>
          <p class="help">De dónde vienen los {{ formatearNumero(reporte.entradas.value.total, 0) }} kg recibidos.</p>
          <div class="flex h-4 overflow-hidden rounded-full bg-line" role="presentation">
            <div class="h-full" :style="{ width: pct(reporte.entradas.value.donacion, reporte.entradas.value.total) + '%', backgroundColor: 'var(--color-brand)' }"></div>
            <div class="h-full" :style="{ width: pct(reporte.entradas.value.compra, reporte.entradas.value.total) + '%', backgroundColor: 'var(--color-info)' }"></div>
          </div>
          <div class="flex flex-col gap-2 text-sm">
            <div class="flex items-center justify-between gap-4">
              <span class="flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full" style="background-color: var(--color-brand)"></span>Donación</span>
              <span class="num font-medium text-ink">{{ formatearNumero(reporte.entradas.value.donacion, 0) }} kg · {{ formatearNumero(pct(reporte.entradas.value.donacion, reporte.entradas.value.total), 0) }}%</span>
            </div>
            <div class="flex items-center justify-between gap-4">
              <span class="flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full" style="background-color: var(--color-info)"></span>Compra</span>
              <span class="num font-medium text-ink">{{ formatearNumero(reporte.entradas.value.compra, 0) }} kg · {{ formatearNumero(pct(reporte.entradas.value.compra, reporte.entradas.value.total), 0) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Dónde se pierde -->
      <div class="card">
        <div class="card-body">
          <h2>Dónde se pierde</h2>
          <p class="help">De los {{ formatearNumero(reporte.totalPerdido.value, 0) }} kg perdidos.</p>
          <div class="flex flex-col gap-3 text-sm">
            <div>
              <div class="flex items-center justify-between gap-4 pb-1">
                <span>En recepción (selección)</span>
                <span class="num font-medium text-ink">{{ formatearNumero(reporte.perdidaPorFase.value.recepcion, 0) }} kg</span>
              </div>
              <div class="h-2.5 overflow-hidden rounded-full bg-line"><div class="h-full" :style="{ width: pct(reporte.perdidaPorFase.value.recepcion, reporte.totalPerdido.value) + '%', backgroundColor: 'var(--color-loss)' }"></div></div>
            </div>
            <div>
              <div class="flex items-center justify-between gap-4 pb-1">
                <span>En bodega</span>
                <span class="num font-medium text-ink">{{ formatearNumero(reporte.perdidaPorFase.value.bodega, 0) }} kg</span>
              </div>
              <div class="h-2.5 overflow-hidden rounded-full bg-line"><div class="h-full" :style="{ width: pct(reporte.perdidaPorFase.value.bodega, reporte.totalPerdido.value) + '%', backgroundColor: 'var(--color-loss)' }"></div></div>
            </div>
          </div>
          <div class="mt-1 flex gap-4 border-t border-line pt-3 text-sm">
            <div class="flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full" style="background-color: var(--color-loss)"></span>Baja <span class="num font-medium text-ink">{{ formatearNumero(reporte.salidaBodega.value.baja, 0) }} kg</span></div>
            <div class="flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full" style="background-color: var(--color-teal)"></span>Compostaje <span class="num font-medium text-ink">{{ formatearNumero(reporte.salidaBodega.value.compostaje, 0) }} kg</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 desk:grid-cols-2">
      <!-- Desperdicio por categoría -->
      <div class="card">
        <div class="card-body">
          <h2>Desperdicio por categoría</h2>
          <ul class="flex flex-col gap-3">
            <li v-for="c in reporte.categorias.value" :key="c.nombre" class="flex flex-col gap-1">
              <div class="flex items-center justify-between gap-4 text-sm">
                <span class="min-w-0 truncate text-ink">{{ c.nombre }}</span>
                <span class="num shrink-0 text-muted">{{ formatearNumero(c.perdida, 0) }} kg · {{ formatearNumero(c.porcentajePerdida) }}%</span>
              </div>
              <div class="h-2.5 overflow-hidden rounded-full bg-line">
                <div class="h-full" :style="{ width: pct(c.perdida, maxPerdidaCat) + '%', backgroundColor: 'var(--color-loss)' }"></div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Desperdicio por donante -->
      <div class="card">
        <div class="card-body">
          <h2>Desperdicio por donante</h2>
          <ul class="flex flex-col gap-3">
            <li v-for="d in reporte.donantes.value" :key="d.nombre" class="flex flex-col gap-1">
              <div class="flex items-center justify-between gap-4 text-sm">
                <span class="min-w-0 truncate text-ink">{{ d.nombre }}</span>
                <span class="num shrink-0 text-muted">{{ formatearNumero(d.perdida, 0) }} kg de {{ formatearNumero(d.recibido, 0) }}</span>
              </div>
              <div class="h-2.5 overflow-hidden rounded-full bg-line">
                <div class="h-full" :style="{ width: pct(d.perdida, maxPerdidaDon) + '%', backgroundColor: 'var(--color-loss)' }"></div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </template>
</template>
