<script setup lang="ts">
import { ref } from 'vue';

import { useHistoricosAplicacion } from '../application/historicos';
import EncabezadoPagina from '../components/EncabezadoPagina.vue';
import EstadoVacio from '../components/EstadoVacio.vue';
import Icono from '../components/Icono.vue';
import TarjetaIndicador from '../components/TarjetaIndicador.vue';
import { formatearEntero, formatearFecha } from '../domain/formato';
import { useConfirmarStore } from '../stores/confirmar';
import { useDatosStore } from '../stores/datos';

const datos = useDatosStore();
const historicos = useHistoricosAplicacion();
const confirmar = useConfirmarStore();

const seleccionPorNombre = ref<Record<string, string>>({});

async function asignar(nombreOrigen: string): Promise<void> {
  const idProducto = seleccionPorNombre.value[nombreOrigen];
  if (!idProducto) return;
  const producto = historicos.productos.value.find((p) => p.IdProducto === idProducto);

  const ok = await confirmar.pedir({
    titulo: 'Asignar equivalencia',
    mensaje: `Cada vez que un histórico traiga "${nombreOrigen}", se va a entender como "${producto?.Nombre ?? ''}".`,
    textoConfirmar: 'Asignar',
  });
  if (!ok) return;

  historicos.asignar(nombreOrigen, idProducto);
  const copia = { ...seleccionPorNombre.value };
  delete copia[nombreOrigen];
  seleccionPorNombre.value = copia;
}
</script>

<template>
  <EncabezadoPagina icono="historicos" titulo="Importar históricos" />

  <div class="grid grid-cols-2 gap-4 desk:grid-cols-4">
    <TarjetaIndicador compacto titulo="Importaciones" :valor="historicos.importaciones.value.length.toString()" nota="Archivos cargados" icono="historicos" />
    <TarjetaIndicador compacto titulo="Filas importadas" :valor="formatearEntero(historicos.totalFilasImportadas.value)" nota="De todas las importaciones" icono="recepciones" />
    <TarjetaIndicador
      compacto
      titulo="Nombres sin equivalencia"
      :valor="historicos.nombresSinAsignar.value.length.toString()"
      nota="Pendientes de asignar"
      icono="catalogo"
      :tono="historicos.nombresSinAsignar.value.length > 0 ? 'alerta' : 'normal'"
    />
    <TarjetaIndicador compacto titulo="Equivalencias resueltas" :valor="historicos.equivalenciasResueltas.value.length.toString()" nota="Ya asignadas" icono="check" />
  </div>

  <div class="card">
    <div class="card-body">
      <h2>Nombres sin equivalencia</h2>

      <EstadoVacio
        v-if="historicos.nombresSinAsignar.value.length === 0"
        titulo="No hay nombres pendientes"
        descripcion="Todos los nombres de los históricos ya tienen un producto asignado."
      />
      <ul v-else class="flex flex-col divide-y divide-line-row">
        <li
          v-for="nombre in historicos.nombresSinAsignar.value"
          :key="nombre"
          class="flex flex-wrap items-end gap-4 py-4 first:pt-0 last:pb-0"
        >
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="text-xs font-bold uppercase tracking-[0.06em] text-muted">Nombre en el histórico</span>
            <span class="font-mono text-sm text-ink">{{ nombre }}</span>
          </div>
          <label class="label">
            Producto
            <select v-model="seleccionPorNombre[nombre]" class="select max-w-[240px]!">
              <option value="" disabled>Seleccione un producto</option>
              <option v-for="p in historicos.productos.value" :key="p.IdProducto" :value="p.IdProducto">{{ p.Nombre }}</option>
            </select>
          </label>
          <button type="button" class="btn-primary" :disabled="!seleccionPorNombre[nombre]" @click="asignar(nombre)">
            <Icono nombre="check" :tamano="18" />
            Asignar
          </button>
        </li>
      </ul>
    </div>
  </div>

  <div class="grid grid-cols-1 gap-4 desk:grid-cols-2">
    <div class="card">
      <div class="card-body">
        <h2>Equivalencias resueltas</h2>
        <EstadoVacio v-if="historicos.equivalenciasResueltas.value.length === 0" titulo="Todavía no hay equivalencias asignadas" />
        <ul v-else class="flex flex-col divide-y divide-line-row">
          <li
            v-for="e in historicos.equivalenciasResueltas.value"
            :key="e.nombreOrigen"
            class="flex items-center justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0"
          >
            <span class="min-w-0 truncate font-mono text-xs text-muted" :title="e.nombreOrigen">{{ e.nombreOrigen }}</span>
            <Icono nombre="chevron-derecha" :tamano="16" class="shrink-0 text-muted" />
            <span class="min-w-0 truncate text-right font-medium text-ink">{{ e.producto }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <h2>Importaciones</h2>
        <div class="tbl-scroll" tabindex="0" aria-label="Importaciones">
          <div class="tbl-head" style="grid-template-columns: minmax(100px,1fr) 88px 96px 96px">
            <span>Archivo</span>
            <span class="text-right">Filas</span>
            <span class="text-right">Importadas</span>
            <span>Fecha</span>
          </div>
          <div v-for="i in historicos.importaciones.value" :key="i.idImportacion" class="tbl-row" style="grid-template-columns: minmax(100px,1fr) 88px 96px 96px">
            <span class="tbl-cell" data-label="Archivo">
              <span class="block truncate font-medium text-ink" :title="i.archivo">{{ i.archivo }}</span>
              <span class="block text-xs text-muted">{{ i.usuario }}</span>
            </span>
            <span class="tbl-cell num" data-label="Filas">{{ formatearEntero(i.filasTotales) }}</span>
            <span class="tbl-cell num" data-label="Importadas">
              <span :class="i.filasConError > 0 ? 'text-lot-ink' : 'text-ink'">{{ formatearEntero(i.filasImportadas) }}</span>
            </span>
            <span class="tbl-cell" data-label="Fecha">{{ formatearFecha(i.fecha) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
