<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useRemisionesAplicacion } from '../../application/remisiones';
import Icono from '../../components/Icono.vue';
import Migas from '../../components/Migas.vue';
import type { MigaPan } from '../../components/migaPan';
import EstadoVacio from '../../components/EstadoVacio.vue';
import { formatearNumero } from '../../domain/formato';
import { useConfirmarStore } from '../../stores/confirmar';

const router = useRouter();
const remisiones = useRemisionesAplicacion();
const confirmar = useConfirmarStore();

const migas: MigaPan[] = [
  { etiqueta: 'Inicio', ruta: '/inicio' },
  { etiqueta: 'Remisiones', ruta: '/remisiones' },
  { etiqueta: 'Nueva remisión' },
];

const idOrganizacion = ref('');
const idPrograma = ref('');
const numeroKits = ref<number | null>(null);

const simulacion = computed(() => simularSeguro());
function simularSeguro() {
  if (!idPrograma.value || !numeroKits.value || numeroKits.value <= 0) return [];
  return remisiones.simularFefo(idPrograma.value, numeroKits.value);
}

const organizacionNombre = computed(() => remisiones.organizacionesElegibles.value.find((o) => o.idOrganizacion === idOrganizacion.value)?.nombre ?? '');
const programaNombre = computed(() => remisiones.programasDisponibles.value.find((p) => p.IdPrograma === idPrograma.value)?.Nombre ?? '');
const kgTotal = computed(() => simulacion.value.reduce((t, s) => t + s.kgNecesario, 0));

const erroresEmitir = ref<string[]>([]);
function calcularErroresEmitir(): string[] {
  const mensajes: string[] = [];
  if (!idOrganizacion.value) mensajes.push('Selecciona una organización.');
  if (!idPrograma.value) mensajes.push('Selecciona un programa.');
  if (!numeroKits.value || numeroKits.value <= 0) mensajes.push('Ingresa un número de kits mayor a 0.');
  else if (simulacion.value.length > 0 && !simulacion.value.every((s) => s.suficiente)) {
    const faltan = simulacion.value.filter((s) => !s.suficiente).map((s) => s.producto);
    mensajes.push(`No hay existencias suficientes de: ${faltan.join(', ')}.`);
  }
  return mensajes;
}

watch([idOrganizacion, idPrograma, numeroKits], () => {
  if (erroresEmitir.value.length === 0) return;
  erroresEmitir.value = calcularErroresEmitir();
});

async function emitir(): Promise<void> {
  const mensajes = calcularErroresEmitir();
  erroresEmitir.value = mensajes;
  if (mensajes.length > 0 || !numeroKits.value) return;

  const ok = await confirmar.pedir({
    titulo: 'Emitir remisión',
    mensaje: `Se asignan lotes por FEFO y la remisión queda registrada para ${organizacionNombre.value}.`,
    detalle: [
      `${numeroKits.value} kits de ${programaNombre.value}`,
      `${formatearNumero(kgTotal.value)} kg totales`,
    ],
    textoConfirmar: 'Emitir remisión',
  });
  if (!ok) return;

  const resultado = remisiones.emitir(idOrganizacion.value, idPrograma.value, numeroKits.value);
  router.push({ path: '/remisiones', query: { emitida: resultado.numero } });
}
</script>

<template>
  <Migas :items="migas" />

  <div class="card">
    <div class="card-body">
      <div class="flex items-start gap-4">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-mint-soft text-brand-hover">
          <Icono nombre="remisiones" :tamano="24" />
        </span>
        <h1>Nueva remisión</h1>
      </div>

      <div class="h-px bg-line" aria-hidden="true"></div>

      <EstadoVacio
        v-if="remisiones.organizacionesElegibles.value.length === 0"
        titulo="No hay organizaciones elegibles"
        descripcion="Solo las organizaciones vinculadas y con autorización de datos registrada pueden recibir remisiones."
      />
      <div v-else class="flex flex-wrap items-end gap-4">
        <label class="label">
          <span class="lbl-cap">Organización <span aria-hidden="true" class="text-error">*</span></span>
          <select v-model="idOrganizacion" class="select max-w-[240px]!" aria-required="true">
            <option value="" disabled>Seleccione una organización</option>
            <option v-for="o in remisiones.organizacionesElegibles.value" :key="o.idOrganizacion" :value="o.idOrganizacion">{{ o.nombre }}</option>
          </select>
        </label>
        <label class="label">
          <span class="lbl-cap">Programa <span aria-hidden="true" class="text-error">*</span></span>
          <select v-model="idPrograma" class="select max-w-[200px]!" aria-required="true">
            <option value="" disabled>Seleccione un programa</option>
            <option v-for="p in remisiones.programasDisponibles.value" :key="p.IdPrograma" :value="p.IdPrograma">{{ p.Nombre }}</option>
          </select>
        </label>
        <label class="label">
          <span class="lbl-cap">Número de kits <span aria-hidden="true" class="text-error">*</span></span>
          <input
            type="number"
            min="1"
            class="input-num"
            aria-required="true"
            :value="numeroKits ?? ''"
            @input="numeroKits = ($event.target as HTMLInputElement).value ? +($event.target as HTMLInputElement).value : null"
          />
        </label>
      </div>
    </div>
  </div>

  <div v-if="simulacion.length > 0" class="card">
    <div class="card-body">
      <h2>Asignación por FEFO</h2>

      <div class="tbl-scroll" tabindex="0" aria-label="Simulación de asignación">
        <div class="tbl-head" style="grid-template-columns: minmax(100px,1fr) 96px 96px 96px">
          <span>Producto</span>
          <span class="text-right">Necesario</span>
          <span class="text-right">Disponible</span>
          <span>Estado</span>
        </div>
        <div v-for="s in simulacion" :key="s.producto" class="tbl-row" style="grid-template-columns: minmax(100px,1fr) 96px 96px 96px">
          <span class="tbl-cell font-medium text-ink" data-label="Producto">{{ s.producto }}</span>
          <span class="tbl-cell num" data-label="Necesario">{{ formatearNumero(s.kgNecesario) }} kg</span>
          <span class="tbl-cell num" data-label="Disponible">{{ formatearNumero(s.kgDisponible) }} kg</span>
          <span class="tbl-cell" data-label="Estado">
            <span :class="s.suficiente ? 'chip-ok' : 'chip-error'">{{ s.suficiente ? 'Alcanza' : 'No alcanza' }}</span>
          </span>
        </div>
      </div>

      <div v-if="erroresEmitir.length > 0" role="alert" class="flex flex-col gap-1 rounded-md bg-error-bg p-3 text-sm text-error">
        <p v-for="(e, i) in erroresEmitir" :key="i">{{ e }}</p>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-4 pt-2">
        <p class="text-sm text-muted">{{ formatearNumero(kgTotal) }} kg en total para {{ numeroKits }} kits.</p>
        <button type="button" class="btn-primary" @click="emitir()">
          <Icono nombre="check" :tamano="18" />
          Emitir remisión
        </button>
      </div>
    </div>
  </div>
</template>
