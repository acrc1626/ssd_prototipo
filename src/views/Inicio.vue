<script setup lang="ts">
import { computed } from 'vue';

import { useInicioAplicacion } from '../application/inicio';
import EstadoVacio from '../components/EstadoVacio.vue';
import Icono from '../components/Icono.vue';
import TarjetaIndicador from '../components/TarjetaIndicador.vue';
import { formatearEntero, formatearNumero } from '../domain/formato';
import { useSesionStore } from '../stores/sesion';

const inicio = useInicioAplicacion();
const sesion = useSesionStore();

const primerNombre = computed(() => (sesion.usuario?.Nombre ?? '').split(' ')[0]);

const kgEnBodegaTexto = computed(() => formatearNumero(inicio.kgEnBodega.value));
const lotesVigentesNota = computed(() => `${formatearEntero(inicio.lotesVigentes.value)} lotes vigentes`);
const kgRiesgoAltoTexto = computed(() => formatearNumero(inicio.kgRiesgoAlto.value));
const notaRiesgoAlto = computed(() => {
  const n = inicio.conteoPorNivel.value.alto;
  return n === 0 ? 'Sin lotes en riesgo alto' : `${n} ${n === 1 ? 'lote vence' : 'lotes vencen'} en 2 días o menos`;
});
const mesReporte = computed(() => inicio.reporteDelMes.value?.name.split(' ')[0]?.toLowerCase() ?? '');
const tasaReporteTexto = computed(() => formatearNumero(inicio.reporteDelMes.value?.rate ?? 0));
const notaReporte = computed(() => {
  const r = inicio.reporteDelMes.value;
  if (!r) return '';
  const diferencia = +(r.prevRate - r.rate).toFixed(1);
  return diferencia >= 0
    ? `${formatearNumero(Math.abs(diferencia))} pp frente a ${r.prev}`
    : `+${formatearNumero(Math.abs(diferencia))} pp frente a ${r.prev}`;
});

function porcentaje(nivel: 'alto' | 'medio' | 'bajo'): number {
  const conteo = inicio.conteoPorNivel.value;
  const total = conteo.alto + conteo.medio + conteo.bajo;
  return total === 0 ? 0 : (conteo[nivel] / total) * 100;
}

function textoDias(dias: number): string {
  return dias <= 0 ? 'vence hoy' : dias === 1 ? 'vence en 1 día' : `vence en ${dias} días`;
}

/** "Ver todas" de alertas: Riesgo de vencimiento es la pantalla natural, pero solo la
 *  coordinadora la tiene en su menú (CLAUDE.md, sección Roles) — para los demás roles
 *  se manda a Existencias, que sí ven. */
const destinoAlertas = computed(() => (sesion.itemsMenu.some((i) => i.ruta === '/riesgo') ? '/riesgo' : '/existencias'));
</script>

<template>
  <h1>Hola, {{ primerNombre }}</h1>

  <div class="grid grid-cols-2 gap-4 desk:grid-cols-4">
    <TarjetaIndicador
      compacto
      titulo="En bodega"
      :valor="kgEnBodegaTexto"
      unidad="kg"
      :nota="lotesVigentesNota"
      icono="existencias"
    />
    <TarjetaIndicador
      compacto
      titulo="Riesgo alto"
      :valor="kgRiesgoAltoTexto"
      unidad="kg"
      :nota="notaRiesgoAlto"
      icono="riesgo"
      tono="alerta"
    />
    <TarjetaIndicador
      v-if="inicio.mostrarRecepcionesBorrador.value"
      compacto
      titulo="Recepciones en borrador"
      :valor="inicio.recepcionesBorrador.value.toString()"
      nota="Aún no crean lotes"
      icono="recepciones"
    />
    <TarjetaIndicador
      v-else
      compacto
      titulo="Vencimiento estimado"
      :valor="inicio.vencimientoEstimadoCount.value.toString()"
      unidad="lotes"
      nota="Sin fecha impresa"
      icono="historicos"
      tono="lote"
    />
    <TarjetaIndicador
      compacto
      :titulo="'Desperdicio de ' + mesReporte"
      :valor="tasaReporteTexto"
      unidad="%"
      :nota="notaReporte"
      icono="reporte"
      tono="lote"
    />
  </div>

  <div class="grid grid-cols-1 items-start gap-4 desk:grid-cols-[2fr_1fr]">
    <section class="card">
      <div class="card-body">
        <div class="flex items-center gap-2">
          <h2>Pendientes</h2>
          <span v-if="inicio.pendientes.value.length > 0" class="chip-neutral">{{ inicio.pendientes.value.length }}</span>
        </div>

        <EstadoVacio v-if="inicio.pendientes.value.length === 0" titulo="Todo al día" descripcion="No tienes tareas pendientes por ahora." />
        <ul v-else class="flex flex-col divide-y divide-line-row">
          <li
            v-for="p in inicio.pendientes.value"
            :key="p.id"
            class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mint-soft text-brand-hover">
              <Icono :nombre="p.icono" :tamano="18" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-ink">{{ p.titulo }}</p>
              <p class="text-xs text-muted">{{ p.descripcion }}</p>
            </div>
            <router-link v-if="p.accion" :to="p.accion.ruta" class="btn-secondary shrink-0">
              {{ p.accion.etiqueta }}
              <Icono nombre="chevron-derecha" :tamano="16" />
            </router-link>
          </li>
        </ul>
      </div>
    </section>

    <section class="card">
      <div class="card-body">
        <div class="flex items-center justify-between gap-2">
          <h2>Por vencer</h2>
          <router-link :to="destinoAlertas" class="text-sm font-medium text-brand-text hover:underline">
            Ver todas
          </router-link>
        </div>

        <div class="flex items-center gap-4 text-xs text-muted">
          <span class="flex items-center gap-1">
            <span class="h-2 w-2 rounded-full bg-risk-high"></span>Alto {{ inicio.conteoPorNivel.value.alto }}
          </span>
          <span class="flex items-center gap-1">
            <span class="h-2 w-2 rounded-full bg-risk-mid"></span>Medio {{ inicio.conteoPorNivel.value.medio }}
          </span>
          <span class="flex items-center gap-1">
            <span class="h-2 w-2 rounded-full bg-risk-low"></span>Bajo {{ inicio.conteoPorNivel.value.bajo }}
          </span>
        </div>

        <div class="flex h-2 overflow-hidden rounded-full bg-line" role="presentation">
          <div class="h-full bg-risk-high" :style="{ width: porcentaje('alto') + '%' }"></div>
          <div class="h-full bg-risk-mid" :style="{ width: porcentaje('medio') + '%' }"></div>
          <div class="h-full bg-risk-low" :style="{ width: porcentaje('bajo') + '%' }"></div>
        </div>

        <EstadoVacio v-if="inicio.alertas.value.length === 0" titulo="Nada por vencer pronto" />
        <template v-else>
          <ul class="flex flex-col divide-y divide-line-row">
            <li
              v-for="a in inicio.alertas.value"
              :key="a.idLote"
              class="flex items-center gap-4 py-3 first:pt-0"
            >
              <span class="lot">{{ a.codigo }}</span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-ink">{{ a.producto }}</p>
                <p class="text-xs text-muted">{{ formatearNumero(a.kg) }} kg · {{ textoDias(a.diasParaVencer) }}</p>
              </div>
            </li>
          </ul>
          <router-link
            v-if="inicio.accionVencimiento.value"
            :to="inicio.accionVencimiento.value.ruta"
            class="btn-primary"
          >
            <Icono :nombre="inicio.accionVencimiento.value.icono" :tamano="18" />
            {{ inicio.accionVencimiento.value.etiqueta }}
          </router-link>
        </template>
      </div>
    </section>
  </div>
</template>
