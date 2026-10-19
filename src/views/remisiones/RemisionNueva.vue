<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useRemisionesAplicacion } from '../../application/remisiones';
import EncabezadoPagina from '../../components/EncabezadoPagina.vue';
import EstadoVacio from '../../components/EstadoVacio.vue';
import Icono from '../../components/Icono.vue';
import { formatearNumero } from '../../domain/formato';
import { useConfirmarStore } from '../../stores/confirmar';

const router = useRouter();
const remisiones = useRemisionesAplicacion();
const confirmar = useConfirmarStore();

const PASOS = [
  { n: 1, etiqueta: 'Destinatario' },
  { n: 2, etiqueta: 'Qué se entrega' },
  { n: 3, etiqueta: 'Revisar y emitir' },
] as const;

const paso = ref(1);
const errores = ref<string[]>([]);

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
const resumenEntrega = computed(() => {
  if (idPrograma.value && numeroKits.value) {
    const prog = remisiones.programasDisponibles.value.find((p) => p.IdPrograma === idPrograma.value);
    const base = `${numeroKits.value} kits de ${prog?.Nombre ?? ''}`.trim();
    return adhoc.value.length > 0 ? `${base} + ${adhoc.value.length} productos sueltos` : base;
  }
  return `${adhoc.value.length} productos sueltos`;
});

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

function erroresPaso1(): string[] {
  const m: string[] = [];
  if (tipoDestinatario.value === 'ORGANIZACION') {
    if (!idOrganizacion.value) m.push('Elige a quién se entrega (organización).');
  } else {
    if (!personaNombre.value.trim()) m.push('Escribe el nombre de la persona.');
    if (!personaDocumento.value.trim()) m.push('Escribe el documento de la persona.');
    if (!personaAutoriza.value) m.push('Marca que la persona autoriza el tratamiento de sus datos.');
  }
  return m;
}

function erroresPaso2(): string[] {
  const m: string[] = [];
  if (idPrograma.value && (!numeroKits.value || numeroKits.value <= 0)) {
    m.push('Escribe cuántos kits (o cambia el programa a "Sin kit").');
  }
  if (renglonesFinales.value.length === 0) m.push('Agrega un kit o al menos un producto.');
  return m;
}

function erroresEmitir(): string[] {
  const m = [...erroresPaso1(), ...erroresPaso2()];
  if (renglonesFinales.value.length > 0 && hayFaltantes.value) {
    const faltan = simulacion.value.filter((s) => !s.suficiente).map((s) => s.producto);
    m.push(`No hay suficiente en bodega de: ${faltan.join(', ')}.`);
  }
  return m;
}

function siguiente(): void {
  const m = paso.value === 1 ? erroresPaso1() : erroresPaso2();
  errores.value = m;
  if (m.length > 0) return;
  errores.value = [];
  paso.value = Math.min(3, paso.value + 1);
}

function atras(): void {
  errores.value = [];
  paso.value = Math.max(1, paso.value - 1);
}

function irAPaso(n: number): void {
  if (n < paso.value) {
    errores.value = [];
    paso.value = n;
  }
}

// Si el usuario corrige algo mientras hay un error visible, se recalcula en vivo.
watch(
  [tipoDestinatario, idOrganizacion, personaNombre, personaDocumento, personaAutoriza, idPrograma, numeroKits, adhoc],
  () => {
    if (errores.value.length === 0) return;
    errores.value = paso.value === 1 ? erroresPaso1() : paso.value === 2 ? erroresPaso2() : erroresEmitir();
  },
);

async function emitir(): Promise<void> {
  const m = erroresEmitir();
  errores.value = m;
  if (m.length > 0) return;

  const detalle = [
    `Para ${destinatarioNombre.value}`,
    resumenEntrega.value,
    `${formatearNumero(kgTotal.value)} kg en total`,
  ];
  if (esEvento.value) detalle.push('Entrega de evento / extraordinaria');

  const ok = await confirmar.pedir({
    titulo: 'Emitir remisión',
    mensaje: 'Se descuentan estos productos del inventario (por FEFO) y la remisión queda registrada. Si fue un error, puedes anularla después desde la lista de remisiones.',
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
  <EncabezadoPagina icono="remisiones" titulo="Nueva remisión" />

  <div class="card">
    <div class="card-body">
      <!-- Barra de progreso -->
      <p class="text-sm font-medium text-ink tablet:hidden">Paso {{ paso }} de 3 · {{ PASOS[paso - 1]?.etiqueta }}</p>
      <ol class="flex items-center" aria-label="Progreso de la remisión">
        <template v-for="(s, i) in PASOS" :key="s.n">
          <li>
            <button
              type="button"
              class="flex items-center gap-2 disabled:cursor-default"
              :disabled="s.n > paso"
              :aria-current="s.n === paso ? 'step' : undefined"
              @click="irAPaso(s.n)"
            >
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                :class="s.n < paso ? 'bg-brand text-white' : s.n === paso ? 'bg-brand text-white' : 'border border-line bg-page text-muted'"
              >
                <Icono v-if="s.n < paso" nombre="check" :tamano="16" />
                <template v-else>{{ s.n }}</template>
              </span>
              <span class="hidden text-sm tablet:inline" :class="s.n === paso ? 'font-semibold text-ink' : 'text-muted'">{{ s.etiqueta }}</span>
            </button>
          </li>
          <li v-if="i < PASOS.length - 1" class="mx-3 h-px flex-1" :class="s.n < paso ? 'bg-brand' : 'bg-line'" aria-hidden="true"></li>
        </template>
      </ol>

      <hr class="border-line" />

      <!-- Paso 1: destinatario -->
      <div v-if="paso === 1" class="flex flex-col gap-4">
        <h2>¿A quién se entrega?</h2>
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
            <select v-model="idOrganizacion" class="select max-w-[300px]!" aria-required="true">
              <option value="" disabled>Elige una organización</option>
              <option v-for="o in remisiones.organizacionesElegibles.value" :key="o.idOrganizacion" :value="o.idOrganizacion">{{ o.nombre }}</option>
            </select>
          </label>
        </template>

        <template v-else>
          <div class="flex flex-wrap items-end gap-4">
            <label class="label">
              <span class="lbl-cap">Nombre <span aria-hidden="true" class="text-error">*</span></span>
              <input v-model="personaNombre" type="text" class="input max-w-[240px]" placeholder="Ej. Pedro Pérez" aria-required="true" />
            </label>
            <label class="label">
              <span class="lbl-cap">Documento <span aria-hidden="true" class="text-error">*</span></span>
              <input v-model="personaDocumento" type="text" class="input max-w-[180px]" aria-required="true" />
            </label>
          </div>
          <label class="flex items-start gap-2 text-sm text-ink">
            <input v-model="personaAutoriza" type="checkbox" class="mt-0.5 h-4 w-4 accent-brand" />
            <span>La persona autoriza el tratamiento de sus datos (firma en la entrega). <span aria-hidden="true" class="text-error">*</span></span>
          </label>
        </template>
      </div>

      <!-- Paso 2: qué se entrega (dos columnas para que quepa sin scroll) -->
      <div v-else-if="paso === 2" class="flex flex-col gap-4">
        <div>
          <h2>¿Qué se entrega?</h2>
          <p class="help">Arma un kit, agrega productos uno por uno, o combina ambos.</p>
        </div>

        <div class="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <!-- Opción A · kit -->
          <div class="flex flex-col gap-3 rounded-md bg-page p-4">
            <p class="text-sm font-medium text-ink">Opción A · Un kit armado</p>
            <label class="label">
              Programa
              <select v-model="idPrograma" class="select w-full">
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
            <p v-if="contenidoKit.length > 0" class="text-xs text-muted">
              Cada kit incluye: {{ contenidoKit.map((c) => c.producto + ' ' + formatearNumero(c.kgNecesario) + ' kg').join(' · ') }}
            </p>
          </div>

          <!-- Opción B · productos sueltos -->
          <div class="flex flex-col gap-3 rounded-md bg-page p-4">
            <p class="text-sm font-medium text-ink">Opción B · Productos sueltos</p>
            <div v-if="erroresAdhoc.length > 0" role="alert" class="flex flex-col gap-1 rounded-md bg-error-bg p-3 text-sm text-error">
              <p v-for="(e, i) in erroresAdhoc" :key="i">{{ e }}</p>
            </div>
            <label class="label">
              Producto
              <select v-model="adhocPresentacion" class="select w-full">
                <option value="">Elige un producto</option>
                <option v-for="p in remisiones.presentaciones.value" :key="p.idPresentacion" :value="p.idPresentacion">{{ p.etiqueta }}</option>
              </select>
            </label>
            <div class="flex items-end gap-3">
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
            <ul v-if="adhoc.length > 0" class="flex flex-col divide-y divide-line-row">
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
        </div>

        <label class="flex items-center gap-2 text-sm text-ink">
          <input v-model="esEvento" type="checkbox" class="h-4 w-4 accent-brand" />
          Es una entrega de evento / extraordinaria
        </label>
      </div>

      <!-- Paso 3: revisar y emitir -->
      <div v-else class="flex flex-col gap-4">
        <h2>Revisar y emitir</h2>
        <div class="grid grid-cols-1 gap-3 rounded-md bg-page p-4 text-sm tablet:grid-cols-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.06em] text-muted">Destinatario</p>
            <p class="font-medium text-ink">{{ destinatarioNombre || 'Sin elegir' }}</p>
            <p v-if="tipoDestinatario === 'PERSONA'" class="text-xs text-muted">Persona natural</p>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.06em] text-muted">Entrega</p>
            <p class="font-medium text-ink">{{ resumenEntrega }}</p>
            <p v-if="esEvento" class="text-xs text-lot-ink">Entrega de evento</p>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.06em] text-muted">Total</p>
            <p class="font-display text-lg font-semibold text-ink">{{ formatearNumero(kgTotal) }} kg</p>
          </div>
        </div>

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
        <EstadoVacio v-else titulo="No hay nada que entregar" descripcion="Vuelve al paso 2 para armar un kit o agregar productos." />
      </div>

      <!-- Errores del paso -->
      <div v-if="errores.length > 0" role="alert" class="flex flex-col gap-1 rounded-md bg-error-bg p-3 text-sm text-error">
        <p v-for="(e, i) in errores" :key="i">{{ e }}</p>
      </div>

      <!-- Navegación -->
      <div class="flex items-center justify-between gap-4 border-t border-line pt-4">
        <button v-if="paso > 1" type="button" class="btn-secondary" @click="atras()">
          <Icono nombre="chevron-izquierda" :tamano="16" />
          Atrás
        </button>
        <span v-else></span>

        <button v-if="paso < 3" type="button" class="btn-primary" @click="siguiente()">
          Siguiente
          <Icono nombre="chevron-derecha" :tamano="16" />
        </button>
        <button v-else type="button" class="btn-primary" @click="emitir()">
          <Icono nombre="check" :tamano="18" />
          Emitir remisión
        </button>
      </div>
    </div>
  </div>
</template>
