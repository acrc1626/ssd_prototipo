<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue';
import { useRoute } from 'vue-router';

import type { TipoBaja } from '../application/bajas';
import { useBajasAplicacion } from '../application/bajas';
import { usePaginacion } from '../application/paginacion';
import EncabezadoPagina from '../components/EncabezadoPagina.vue';
import EstadoVacio from '../components/EstadoVacio.vue';
import Icono from '../components/Icono.vue';
import Paginador from '../components/Paginador.vue';
import TarjetaIndicador from '../components/TarjetaIndicador.vue';
import { formatearFecha, formatearNumero } from '../domain/formato';
import { useConfirmarStore } from '../stores/confirmar';
import { useDatosStore } from '../stores/datos';
import { useDeshacerStore } from '../stores/deshacer';

const COLUMNAS = '112px minmax(0,1fr) 112px 112px 96px 128px minmax(0,140px)';

const route = useRoute();
const datos = useDatosStore();
const bajas = useBajasAplicacion();
const confirmar = useConfirmarStore();
const deshacer = useDeshacerStore();

const loteId = ref('');
const tipo = ref<TipoBaja>('BAJA');
const cantidad = ref<number | null>(null);

watchEffect(() => {
  const idDesdeUrl = route.query.lote;
  if (typeof idDesdeUrl === 'string' && idDesdeUrl) loteId.value = idDesdeUrl;
});

const loteSeleccionado = computed(() => bajas.lotesVigentes.value.find((l) => l.idLote === loteId.value) ?? null);

const { pagina, totalPaginas, filasPagina, rangoDesde, rangoHasta, irPagina } = usePaginacion(bajas.bajasRecientes);

const kgEstimado = computed(() => {
  const lote = loteSeleccionado.value;
  if (!lote || !cantidad.value || lote.existencia <= 0) return 0;
  return (cantidad.value * lote.kg) / lote.existencia;
});

const erroresBaja = ref<string[]>([]);
function calcularErroresBaja(): string[] {
  const mensajes: string[] = [];
  const lote = loteSeleccionado.value;
  if (!lote) mensajes.push('Selecciona un lote.');
  if (!cantidad.value || cantidad.value <= 0) mensajes.push('Ingresa una cantidad mayor a 0.');
  else if (lote && cantidad.value > lote.existencia) {
    mensajes.push(`No puedes dar de baja más de ${formatearNumero(lote.existencia, 0)} ${lote.unidadConteo} disponibles.`);
  }
  return mensajes;
}

watch([loteId, cantidad, tipo], () => {
  if (erroresBaja.value.length === 0) return;
  erroresBaja.value = calcularErroresBaja();
});

async function registrar(): Promise<void> {
  const mensajes = calcularErroresBaja();
  erroresBaja.value = mensajes;
  if (mensajes.length > 0) return;

  const lote = loteSeleccionado.value!;
  const cant = cantidad.value!;

  const esBaja = tipo.value === 'BAJA';
  const ok = await confirmar.pedir({
    titulo: esBaja ? 'Registrar baja' : 'Registrar compostaje',
    mensaje: `Se resta del lote y queda en la trazabilidad. ${esBaja ? 'No se puede deshacer una vez confirmado.' : ''}`,
    detalle: [
      `${lote.producto} · ${lote.presentacion}`,
      `Lote ${lote.codigo}`,
      `${formatearNumero(cant, 0)} ${lote.unidadConteo} · ${formatearNumero(kgEstimado.value)} kg aprox.`,
    ],
    textoConfirmar: esBaja ? 'Registrar baja' : 'Registrar compostaje',
    variante: esBaja ? 'peligro' : 'normal',
  });
  if (!ok) return;

  const movimiento = bajas.registrarBaja({ idLote: lote.idLote, tipo: tipo.value, cantidad: cant });
  deshacer.mostrar(`Se registró ${esBaja ? 'la baja' : 'el compostaje'} de ${lote.codigo}`, () => {
    bajas.deshacerBaja(movimiento.IdMovimiento);
  });

  cantidad.value = null;
}
</script>

<template>
  <EncabezadoPagina icono="bajas" titulo="Bajas" />

  <div class="grid grid-cols-2 gap-4 desk:grid-cols-4">
    <TarjetaIndicador compacto titulo="Lotes afectados" :valor="bajas.lotesAfectados.value.toString()" nota="Con baja o compostaje" icono="existencias" />
    <TarjetaIndicador compacto titulo="Kg dados de baja" :valor="formatearNumero(bajas.totalKgBaja.value)" unidad="kg" nota="Pérdida de inventario" icono="bajas" tono="alerta" />
    <TarjetaIndicador compacto titulo="Kg a compostaje" :valor="formatearNumero(bajas.totalKgCompostaje.value)" unidad="kg" nota="Desviado del relleno" icono="caja" />
    <TarjetaIndicador compacto titulo="Registros" :valor="bajas.bajasRecientes.value.length.toString()" nota="Bajas y compostaje totales" icono="historicos" />
  </div>

  <div class="card">
    <div class="card-body">
      <h2>Registrar baja</h2>

      <div v-if="erroresBaja.length > 0" role="alert" class="flex flex-col gap-1 rounded-md bg-error-bg p-3 text-sm text-error">
        <p v-for="(e, i) in erroresBaja" :key="i">{{ e }}</p>
      </div>

      <div class="flex flex-wrap items-end gap-4">
        <label class="label">
          <span class="lbl-cap">Lote <span aria-hidden="true" class="text-error">*</span></span>
          <select v-model="loteId" class="select max-w-[280px]!" aria-required="true">
            <option value="" disabled>Seleccione un lote</option>
            <option v-for="l in bajas.lotesVigentes.value" :key="l.idLote" :value="l.idLote">
              {{ l.codigo }} · {{ l.producto }} ({{ formatearNumero(l.existencia, 0) }} {{ l.unidadConteo }})
            </option>
          </select>
        </label>

        <label class="label">
          Tipo
          <select v-model="tipo" class="select max-w-[150px]!">
            <option value="BAJA">Baja</option>
            <option value="COMPOSTAJE">Compostaje</option>
          </select>
        </label>

        <label class="label">
          <span class="lbl-cap">Cantidad <span aria-hidden="true" class="text-error">*</span></span>
          <input
            type="number"
            min="0"
            :max="loteSeleccionado?.existencia ?? undefined"
            class="input-num"
            aria-required="true"
            :value="cantidad ?? ''"
            @input="
              cantidad = ($event.target as HTMLInputElement).value
                ? +($event.target as HTMLInputElement).value
                : null
            "
          />
        </label>

        <span v-if="loteSeleccionado && cantidad" class="pb-3 text-xs text-muted">
          ≈ {{ formatearNumero(kgEstimado) }} kg de {{ formatearNumero(loteSeleccionado.existencia, 0) }} {{ loteSeleccionado.unidadConteo }} disponibles
        </span>

        <button type="button" class="btn-primary" @click="registrar()">
          <Icono nombre="mas" :tamano="18" />
          Registrar
        </button>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-body">
      <h2>Bajas recientes</h2>

      <EstadoVacio
        v-if="bajas.bajasRecientes.value.length === 0"
        titulo="Todavía no hay bajas registradas"
        descripcion="Las bajas y los compostajes que registres aparecen aquí."
      />
      <div v-else class="tbl-scroll" tabindex="0" aria-label="Bajas recientes">
        <div class="tbl-head" :style="{ gridTemplateColumns: COLUMNAS }">
          <span>Lote</span>
          <span>Producto</span>
          <span>Tipo</span>
          <span class="text-right">Cantidad</span>
          <span class="text-right">Kg</span>
          <span>Fecha</span>
          <span>Registró</span>
        </div>
        <div v-for="b in filasPagina" :key="b.idMovimiento" class="tbl-row" :style="{ gridTemplateColumns: COLUMNAS }">
          <span class="tbl-cell" data-label="Lote"><span class="lot">{{ b.codigoLote }}</span></span>
          <span class="tbl-cell" data-label="Producto">
            <span class="block font-medium text-ink">{{ b.producto }}</span>
            <span class="block text-xs text-muted">{{ b.presentacion }}</span>
          </span>
          <span class="tbl-cell" data-label="Tipo">
            <span :class="b.tipo === 'BAJA' ? 'chip-warn' : 'chip-ok'">{{ b.tipo === 'BAJA' ? 'Baja' : 'Compostaje' }}</span>
          </span>
          <span class="tbl-cell num" data-label="Cantidad">{{ formatearNumero(b.cantidad, 0) }} {{ b.unidadConteo }}</span>
          <span class="tbl-cell num" data-label="Kg">{{ formatearNumero(b.kg) }}</span>
          <span class="tbl-cell" data-label="Fecha">{{ formatearFecha(b.fecha) }}</span>
          <span class="tbl-cell" data-label="Registró">{{ b.usuario }}</span>
        </div>
      </div>

      <Paginador
        :pagina="pagina"
        :total-paginas="totalPaginas"
        :rango-desde="rangoDesde"
        :rango-hasta="rangoHasta"
        :total="bajas.bajasRecientes.value.length"
        etiqueta="registros"
        @ir-pagina="irPagina"
      />
    </div>
  </div>
</template>
