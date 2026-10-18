<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useRemisionesAplicacion } from '../../application/remisiones';
import EncabezadoPagina from '../../components/EncabezadoPagina.vue';
import EstadoVacio from '../../components/EstadoVacio.vue';
import Icono from '../../components/Icono.vue';
import Migas from '../../components/Migas.vue';
import type { MigaPan } from '../../components/migaPan';
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

// --- Paso 1: destinatario ---
const tipoDestinatario = ref<'ORGANIZACION' | 'PERSONA'>('ORGANIZACION');
const idOrganizacion = ref('');
const personaNombre = ref('');
const personaDocumento = ref('');
const personaAutoriza = ref(false);

// --- Paso 2: qué se entrega ---
const idPrograma = ref('');
const numeroKits = ref<number | null>(null);
const adhoc = ref<{ idPresentacion: string; cantidad: number }[]>([]);
const adhocPresentacion = ref('');
const adhocCantidad = ref<number | null>(null);
const esEvento = ref(false);

const erroresAdhoc = ref<string[]>([]);
const erroresEmitir = ref<string[]>([]);

// Lo que trae UN kit del programa (independiente del nº de kits), para explicarlo.
const contenidoKit = computed(() => (idPrograma.value ? remisiones.construirRenglones(idPrograma.value, 1, []) : []));
// Todos los renglones finales (kit + sueltos, fusionados por producto).
const renglonesFinales = computed(() => remisiones.construirRenglones(idPrograma.value, numeroKits.value ?? 0, adhoc.value));
const simulacion = computed(() => remisiones.simular(renglonesFinales.value));
const kgTotal = computed(() => renglonesFinales.value.reduce((t, r) => t + r.kgNecesario, 0));
const hayFaltantes = computed(() => simulacion.value.some((s) => !s.suficiente));

const destinatarioNombre = computed(() =>
  tipoDestinatario.value === 'ORGANIZACION'
    ? remisiones.organizacionesElegibles.value.find((o) => o.idOrganizacion === idOrganizacion.value)?.nombre ?? ''
    : personaNombre.value.trim(),
);

function etiquetaPresentacion(id: string): string {
  return remisiones.presentaciones.value.find((p) => p.idPresentacion === id)?.etiqueta ?? '';
}
function unidadPresentacion(id: string): string {
  return remisiones.presentaciones.value.find((p) => p.idPresentacion === id)?.unidadConteo ?? '';
}

function agregarAdhoc(): void {
  erroresAdhoc.value = [];
  if (!adhocPresentacion.value) erroresAdhoc.value.push('Selecciona un producto.');
  if (!adhocCantidad.value || adhocCantidad.value <= 0) erroresAdhoc.value.push('Ingresa una cantidad mayor a 0.');
  if (adhoc.value.some((r) => r.idPresentacion === adhocPresentacion.value)) {
    erroresAdhoc.value.push('Ese producto ya está en la lista. Quítalo y agrégalo de nuevo si cambió la cantidad.');
  }
  if (erroresAdhoc.value.length > 0) return;
  adhoc.value = [...adhoc.value, { idPresentacion: adhocPresentacion.value, cantidad: adhocCantidad.value! }];
  adhocPresentacion.value = '';
  adhocCantidad.value = null;
}

function quitarAdhoc(idPresentacion: string): void {
  adhoc.value = adhoc.value.filter((r) => r.idPresentacion !== idPresentacion);
}

function calcularErroresEmitir(): string[] {
  const mensajes: string[] = [];
  if (tipoDestinatario.value === 'ORGANIZACION') {
    if (!idOrganizacion.value) mensajes.push('Elige a quién se entrega (organización).');
  } else {
    if (!personaNombre.value.trim()) mensajes.push('Escribe el nombre de la persona.');
    if (!personaDocumento.value.trim()) mensajes.push('Escribe el documento de la persona.');
    if (!personaAutoriza.value) mensajes.push('Marca que la persona autoriza el tratamiento de sus datos.');
  }
  if (idPrograma.value && (!numeroKits.value || numeroKits.value <= 0)) {
    mensajes.push('Escribe cuántos kits (o cambia el programa a "Sin kit").');
  }
  if (renglonesFinales.value.length === 0) {
    mensajes.push('Agrega un kit o al menos un producto.');
  } else if (hayFaltantes.value) {
    const faltan = simulacion.value.filter((s) => !s.suficiente).map((s) => s.producto);
    mensajes.push(`No hay suficiente en bodega de: ${faltan.join(', ')}.`);
  }
  return mensajes;
}

watch([tipoDestinatario, idOrganizacion, personaNombre, personaDocumento, personaAutoriza, idPrograma, numeroKits, adhoc], () => {
  if (erroresEmitir.value.length === 0) return;
  erroresEmitir.value = calcularErroresEmitir();
});

async function emitir(): Promise<void> {
  const mensajes = calcularErroresEmitir();
  erroresEmitir.value = mensajes;
  if (mensajes.length > 0) return;

  const detalle = [
    `Para ${destinatarioNombre.value}`,
    idPrograma.value && numeroKits.value ? `${numeroKits.value} kits + ${adhoc.value.length} productos sueltos` : `${renglonesFinales.value.length} productos`,
    `${formatearNumero(kgTotal.value)} kg en total`,
  ];
  if (esEvento.value) detalle.push('Entrega de evento / extraordinaria');

  const ok = await confirmar.pedir({
    titulo: 'Emitir remisión',
    mensaje: 'Se descuentan estos productos del inventario (por FEFO) y la remisión queda registrada.',
    detalle,
    textoConfirmar: 'Emitir remisión',
  });
  if (!ok) return;

  const resultado = remisiones.emitir({
    destinatario:
      tipoDestinatario.value === 'ORGANIZACION'
        ? { tipo: 'ORGANIZACION', idOrganizacion: idOrganizacion.value }
        : { tipo: 'PERSONA', nombre: personaNombre.value.trim(), documento: personaDocumento.value.trim() },
    renglones: renglonesFinales.value,
    esEvento: esEvento.value,
    idPrograma: idPrograma.value,
    numeroKits: numeroKits.value ?? 0,
  });
  router.push({ path: '/remisiones', query: { emitida: resultado.numero } });
}
</script>

<template>
  <Migas :items="migas" />

  <EncabezadoPagina icono="remisiones" titulo="Nueva remisión" subtitulo="Entrega de productos a una organización o a una persona" />

  <!-- Paso 1 -->
  <div class="card">
    <div class="card-body">
      <h2 class="flex items-center gap-2">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">1</span>
        ¿A quién se entrega?
      </h2>
      <div class="segmented" role="tablist" aria-label="Tipo de destinatario">
        <button type="button" class="segmented-option" role="tab" :aria-selected="tipoDestinatario === 'ORGANIZACION'" @click="tipoDestinatario = 'ORGANIZACION'">
          Una organización
        </button>
        <button type="button" class="segmented-option" role="tab" :aria-selected="tipoDestinatario === 'PERSONA'" @click="tipoDestinatario = 'PERSONA'">
          Una persona
        </button>
      </div>

      <template v-if="tipoDestinatario === 'ORGANIZACION'">
        <EstadoVacio
          v-if="remisiones.organizacionesElegibles.value.length === 0"
          titulo="No hay organizaciones habilitadas"
          descripcion="Solo las organizaciones vinculadas y con autorización de datos pueden recibir remisiones."
        />
        <label v-else class="label">
          <span class="lbl-cap">Organización <span aria-hidden="true" class="text-error">*</span></span>
          <select v-model="idOrganizacion" class="select max-w-[280px]!" aria-required="true">
            <option value="" disabled>Elige una organización</option>
            <option v-for="o in remisiones.organizacionesElegibles.value" :key="o.idOrganizacion" :value="o.idOrganizacion">{{ o.nombre }}</option>
          </select>
        </label>
      </template>

      <template v-else>
        <div class="flex flex-wrap items-end gap-4">
          <label class="label">
            <span class="lbl-cap">Nombre <span aria-hidden="true" class="text-error">*</span></span>
            <input v-model="personaNombre" type="text" class="input max-w-[220px]" placeholder="Ej. Pedro Pérez" aria-required="true" />
          </label>
          <label class="label">
            <span class="lbl-cap">Documento <span aria-hidden="true" class="text-error">*</span></span>
            <input v-model="personaDocumento" type="text" class="input max-w-[160px]" aria-required="true" />
          </label>
        </div>
        <label class="flex items-start gap-2 text-sm text-ink">
          <input v-model="personaAutoriza" type="checkbox" class="mt-0.5 h-4 w-4 accent-brand" />
          <span>La persona autoriza el tratamiento de sus datos (firma en la entrega). <span aria-hidden="true" class="text-error">*</span></span>
        </label>
      </template>
    </div>
  </div>

  <!-- Paso 2 -->
  <div class="card">
    <div class="card-body">
      <h2 class="flex items-center gap-2">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">2</span>
        ¿Qué se entrega?
      </h2>
      <p class="help">Arma un kit, agrega productos uno por uno, o combina ambos.</p>

      <!-- Opción A: kit -->
      <div class="rounded-md bg-page p-4">
        <p class="pb-3 text-sm font-medium text-ink">Opción A · Un kit armado</p>
        <div class="flex flex-wrap items-end gap-4">
          <label class="label">
            Programa
            <select v-model="idPrograma" class="select max-w-[220px]!">
              <option value="">Sin kit</option>
              <option v-for="p in remisiones.programasDisponibles.value" :key="p.IdPrograma" :value="p.IdPrograma">{{ p.Nombre }}</option>
            </select>
          </label>
          <label v-if="idPrograma" class="label">
            <span class="lbl-cap">¿Cuántos kits? <span aria-hidden="true" class="text-error">*</span></span>
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
        <p v-if="contenidoKit.length > 0" class="pt-3 text-xs text-muted">
          Cada kit incluye: {{ contenidoKit.map((c) => c.producto + ' ' + formatearNumero(c.kgNecesario) + ' kg').join(' · ') }}
        </p>
      </div>

      <!-- Opción B: productos sueltos -->
      <div class="rounded-md bg-page p-4">
        <p class="pb-3 text-sm font-medium text-ink">Opción B · Productos sueltos</p>
        <div v-if="erroresAdhoc.length > 0" role="alert" class="mb-3 flex flex-col gap-1 rounded-md bg-error-bg p-3 text-sm text-error">
          <p v-for="(e, i) in erroresAdhoc" :key="i">{{ e }}</p>
        </div>
        <div class="flex flex-wrap items-end gap-4">
          <label class="label">
            Producto
            <select v-model="adhocPresentacion" class="select max-w-[280px]!">
              <option value="">Elige un producto</option>
              <option v-for="p in remisiones.presentaciones.value" :key="p.idPresentacion" :value="p.idPresentacion">{{ p.etiqueta }}</option>
            </select>
          </label>
          <label class="label">
            Cantidad
            <input
              type="number"
              min="0"
              class="input-num"
              :value="adhocCantidad ?? ''"
              @input="adhocCantidad = ($event.target as HTMLInputElement).value ? +($event.target as HTMLInputElement).value : null"
            />
          </label>
          <button type="button" class="btn-secondary" @click="agregarAdhoc()">
            <Icono nombre="mas" :tamano="16" />
            Agregar
          </button>
        </div>
        <ul v-if="adhoc.length > 0" class="mt-3 flex flex-col divide-y divide-line-row">
          <li v-for="r in adhoc" :key="r.idPresentacion" class="flex items-center justify-between gap-4 py-2 text-sm first:pt-0 last:pb-0">
            <span class="min-w-0 truncate text-ink">{{ etiquetaPresentacion(r.idPresentacion) }}</span>
            <span class="flex items-center gap-3">
              <span class="num text-muted">{{ formatearNumero(r.cantidad, 0) }} {{ unidadPresentacion(r.idPresentacion) }}</span>
              <button type="button" class="btn-icon h-8! w-8!" :aria-label="'Quitar ' + etiquetaPresentacion(r.idPresentacion)" @click="quitarAdhoc(r.idPresentacion)">
                <Icono nombre="quitar" :tamano="16" />
              </button>
            </span>
          </li>
        </ul>
      </div>

      <label class="flex items-center gap-2 text-sm text-ink">
        <input v-model="esEvento" type="checkbox" class="h-4 w-4 accent-brand" />
        Es una entrega de evento / extraordinaria
      </label>
    </div>
  </div>

  <!-- Paso 3 -->
  <div class="card">
    <div class="card-body">
      <h2 class="flex items-center gap-2">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">3</span>
        Revisar y emitir
      </h2>

      <template v-if="renglonesFinales.length > 0">
        <p class="help">Esto es lo que se descontará del inventario (los lotes se eligen solos por FEFO: primero el que vence antes).</p>
        <div class="tbl-scroll" tabindex="0" aria-label="Resumen de la entrega">
          <div class="tbl-head" style="grid-template-columns: minmax(100px,1fr) 110px 110px 96px">
            <span>Producto</span>
            <span class="text-right">Se entrega</span>
            <span class="text-right">En bodega</span>
            <span>¿Alcanza?</span>
          </div>
          <div v-for="s in simulacion" :key="s.idProducto" class="tbl-row" style="grid-template-columns: minmax(100px,1fr) 110px 110px 96px">
            <span class="tbl-cell font-medium text-ink" data-label="Producto">{{ s.producto }}</span>
            <span class="tbl-cell num" data-label="Se entrega">{{ formatearNumero(s.kgNecesario) }} kg</span>
            <span class="tbl-cell num" data-label="En bodega">{{ formatearNumero(s.kgDisponible) }} kg</span>
            <span class="tbl-cell" data-label="¿Alcanza?">
              <span :class="s.suficiente ? 'chip-ok' : 'chip-error'">{{ s.suficiente ? 'Sí' : 'No' }}</span>
            </span>
          </div>
        </div>
      </template>
      <EstadoVacio v-else titulo="Todavía no hay nada que entregar" descripcion="En el paso 2 arma un kit o agrega productos sueltos." />

      <div v-if="erroresEmitir.length > 0" role="alert" class="flex flex-col gap-1 rounded-md bg-error-bg p-3 text-sm text-error">
        <p v-for="(e, i) in erroresEmitir" :key="i">{{ e }}</p>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div class="text-sm">
          <p class="text-muted">Total a entregar</p>
          <p class="font-display text-lg font-semibold text-ink">{{ formatearNumero(kgTotal) }} kg</p>
        </div>
        <button type="button" class="btn-primary" :class="{ 'btn-loading': false }" @click="emitir()">
          <Icono nombre="check" :tamano="18" />
          Emitir remisión
        </button>
      </div>
    </div>
  </div>
</template>
