<script setup lang="ts">
import { reactive, ref, watch } from 'vue';

import {
  ETIQUETA_ESTADO,
  ETIQUETA_ETAPA,
  GRUPOS_POBLACION,
  ORDEN_ETAPAS,
  useOrganizacionesAplicacion,
} from '../application/organizaciones';
import type { FilaOrganizacion } from '../application/organizaciones';
import { usePaginacion } from '../application/paginacion';
import EncabezadoPagina from '../components/EncabezadoPagina.vue';
import EstadoVacio from '../components/EstadoVacio.vue';
import Icono from '../components/Icono.vue';
import Paginador from '../components/Paginador.vue';
import TarjetaIndicador from '../components/TarjetaIndicador.vue';
import { formatearFecha, formatearNumero } from '../domain/formato';
import type { EstadoOrganizacion, EtapaOrganizacion } from '../domain/modelos';
import { useConfirmarStore } from '../stores/confirmar';
import { useDatosStore } from '../stores/datos';
import { useDeshacerStore } from '../stores/deshacer';

const COLUMNAS = 'minmax(160px,1fr) 110px 130px minmax(100px,1fr) 100px 56px';

const datos = useDatosStore();
const organizaciones = useOrganizacionesAplicacion();
const confirmar = useConfirmarStore();
const deshacer = useDeshacerStore();

const { pagina, totalPaginas, filasPagina, rangoDesde, rangoHasta, irPagina } = usePaginacion(organizaciones.filas);

const expandidas = ref<Set<string>>(new Set());
function alternarExpandida(id: string): void {
  const copia = new Set(expandidas.value);
  copia.has(id) ? copia.delete(id) : copia.add(id);
  expandidas.value = copia;
}

/** Estilo del círculo de cada paso del flujo de vinculación: completado (verde con check),
 *  actual (borde verde) o pendiente (gris). */
function clasePaso(indice: number, actual: number): string {
  if (indice < actual) return 'bg-brand text-white';
  if (indice === actual) return 'bg-mint-soft text-brand-text border-2 border-brand';
  return 'bg-surface border border-line text-muted';
}

// --- Aviso de confirmación (patrón de RecepcionDetalle.vue) ---
const avisoGuardado = ref('');
let avisoTimeout: ReturnType<typeof setTimeout> | null = null;
function mostrarAviso(mensaje: string): void {
  avisoGuardado.value = mensaje;
  if (avisoTimeout) clearTimeout(avisoTimeout);
  avisoTimeout = setTimeout(() => {
    avisoGuardado.value = '';
  }, 4000);
}

// --- Nueva organización ---
const mostrarNueva = ref(false);
const nombreNueva = ref('');
const nitNueva = ref('');
const municipioNueva = ref('');
const estadoNueva = ref<EstadoOrganizacion>('ESPORADICA');
const erroresNueva = ref<string[]>([]);

function calcularErroresNueva(): string[] {
  const mensajes: string[] = [];
  const nombre = nombreNueva.value.trim();
  const nit = nitNueva.value.trim();
  const municipio = municipioNueva.value.trim();
  if (!nombre) mensajes.push('Ingresa el nombre de la organización.');
  if (!nit) mensajes.push('Ingresa el NIT.');
  else if (nit.replace(/\D/g, '').length < 9) mensajes.push('El NIT no es válido.');
  else if (organizaciones.nitDuplicado(nit)) mensajes.push('Ya existe una organización con ese NIT.');
  if (!municipio) mensajes.push('Ingresa el municipio.');
  return mensajes;
}

function crearOrganizacion(): void {
  const mensajes = calcularErroresNueva();
  erroresNueva.value = mensajes;
  if (mensajes.length > 0) return;

  const nombre = nombreNueva.value.trim();
  const id = organizaciones.crearOrganizacion(nombre, nitNueva.value.trim(), municipioNueva.value.trim(), estadoNueva.value);
  nombreNueva.value = '';
  nitNueva.value = '';
  municipioNueva.value = '';
  estadoNueva.value = 'ESPORADICA';
  mostrarNueva.value = false;
  expandidas.value = new Set([...expandidas.value, id]);
  mostrarAviso(`Se creó "${nombre}".`);
}

watch([nombreNueva, nitNueva, municipioNueva], () => {
  if (erroresNueva.value.length === 0) return;
  erroresNueva.value = calcularErroresNueva();
});

// --- Avanzar etapa ---
const erroresEtapa = reactive<Record<string, string>>({});
async function avanzarEtapa(fila: FilaOrganizacion): Promise<void> {
  const indice = ORDEN_ETAPAS.indexOf(fila.etapa);
  const siguiente = ORDEN_ETAPAS[indice + 1];
  if (!siguiente) return;

  if (siguiente === 'VINCULADA' && !fila.autorizada) {
    erroresEtapa[fila.idOrganizacion] = 'No se puede vincular sin una autorización de datos registrada.';
    return;
  }
  erroresEtapa[fila.idOrganizacion] = '';

  const ok = await confirmar.pedir({
    titulo: 'Avanzar etapa',
    mensaje: `"${fila.nombre}" pasa de ${ETIQUETA_ETAPA[fila.etapa]} a ${ETIQUETA_ETAPA[siguiente]}.`,
    textoConfirmar: 'Avanzar',
  });
  if (!ok) return;
  organizaciones.cambiarEtapa(fila.idOrganizacion, siguiente);
  mostrarAviso(`"${fila.nombre}" avanzó a ${ETIQUETA_ETAPA[siguiente]}.`);
}

// --- Representante (formulario por organización) ---
const formRepresentante = reactive<Record<string, { nombre: string; documento: string; telefono: string }>>({});
function repDe(id: string) {
  return (formRepresentante[id] ??= { nombre: '', documento: '', telefono: '' });
}
const erroresRepresentante = reactive<Record<string, string[]>>({});
function calcularErroresRepresentante(f: { nombre: string; documento: string; telefono: string }): string[] {
  const mensajes: string[] = [];
  if (!f.nombre.trim()) mensajes.push('Ingresa el nombre del representante.');
  if (!f.documento.trim()) mensajes.push('Ingresa el documento.');
  if (!f.telefono.trim()) mensajes.push('Ingresa el teléfono.');
  return mensajes;
}
function guardarRepresentante(id: string): void {
  const f = repDe(id);
  const mensajes = calcularErroresRepresentante(f);
  erroresRepresentante[id] = mensajes;
  if (mensajes.length > 0) return;
  organizaciones.guardarRepresentante(id, f.nombre.trim(), f.documento.trim(), f.telefono.trim());
  mostrarAviso('Se guardó el representante.');
}
watch(formRepresentante, () => {
  for (const id of Object.keys(erroresRepresentante)) {
    if (!erroresRepresentante[id]?.length) continue;
    const f = formRepresentante[id];
    if (f) erroresRepresentante[id] = calcularErroresRepresentante(f);
  }
}, { deep: true });

// --- Autorización (formulario por organización) ---
const formAutorizacion = reactive<Record<string, { fecha: string; medio: string; finalidades: string }>>({});
function autDe(id: string) {
  return (formAutorizacion[id] ??= { fecha: datos.fechaReferencia, medio: '', finalidades: 'Gestión de la vinculación; Programación y entrega de remisiones' });
}
const erroresAutorizacion = reactive<Record<string, string[]>>({});
function calcularErroresAutorizacion(f: { fecha: string; medio: string; finalidades: string }): string[] {
  const mensajes: string[] = [];
  if (!f.fecha) mensajes.push('Selecciona la fecha de autorización.');
  else if (f.fecha > datos.fechaReferencia) mensajes.push('La fecha de autorización no puede ser posterior a hoy.');
  if (!f.medio.trim()) mensajes.push('Ingresa el medio de autorización.');
  if (!f.finalidades.trim()) mensajes.push('Ingresa las finalidades.');
  return mensajes;
}
function registrarAutorizacion(id: string): void {
  const f = autDe(id);
  const mensajes = calcularErroresAutorizacion(f);
  erroresAutorizacion[id] = mensajes;
  if (mensajes.length > 0) return;
  organizaciones.registrarAutorizacion(id, f.fecha, f.medio.trim(), f.finalidades.trim());
  mostrarAviso('Se registró la autorización.');
}
watch(formAutorizacion, () => {
  for (const id of Object.keys(erroresAutorizacion)) {
    if (!erroresAutorizacion[id]?.length) continue;
    const f = formAutorizacion[id];
    if (f) erroresAutorizacion[id] = calcularErroresAutorizacion(f);
  }
}, { deep: true });

// --- Población (formulario por organización) ---
const formPoblacion = reactive<Record<string, { grupo: string; cantidad: number | null }>>({});
function pobDe(id: string) {
  return (formPoblacion[id] ??= { grupo: '', cantidad: null });
}
function gruposDisponibles(fila: FilaOrganizacion): string[] {
  const usados = new Set(fila.poblacion.map((p) => p.grupo));
  return GRUPOS_POBLACION.filter((g) => !usados.has(g));
}
const erroresPoblacion = reactive<Record<string, string[]>>({});
function calcularErroresPoblacion(f: { grupo: string; cantidad: number | null }): string[] {
  const mensajes: string[] = [];
  if (!f.grupo) mensajes.push('Selecciona un grupo.');
  if (!f.cantidad || f.cantidad <= 0) mensajes.push('Ingresa una cantidad mayor a 0.');
  return mensajes;
}
function agregarPoblacion(fila: FilaOrganizacion): void {
  const f = pobDe(fila.idOrganizacion);
  const mensajes = calcularErroresPoblacion(f);
  erroresPoblacion[fila.idOrganizacion] = mensajes;
  if (mensajes.length > 0) return;
  const grupo = f.grupo;
  organizaciones.agregarPoblacion(fila.idOrganizacion, f.grupo, f.cantidad!);
  f.grupo = '';
  f.cantidad = null;
  mostrarAviso(`Se agregó "${grupo}" a la población atendida.`);
}
watch(formPoblacion, () => {
  for (const id of Object.keys(erroresPoblacion)) {
    if (!erroresPoblacion[id]?.length) continue;
    const f = formPoblacion[id];
    if (f) erroresPoblacion[id] = calcularErroresPoblacion(f);
  }
}, { deep: true });
function quitarPoblacion(fila: FilaOrganizacion, grupo: string): void {
  const cantidad = fila.poblacion.find((p) => p.grupo === grupo)?.cantidad ?? 0;
  organizaciones.quitarPoblacion(fila.idOrganizacion, grupo);
  deshacer.mostrar(`Se quitó ${grupo} de ${fila.nombre}`, () => {
    organizaciones.agregarPoblacion(fila.idOrganizacion, grupo, cantidad);
  });
}
</script>

<template>
  <EncabezadoPagina icono="organizaciones" titulo="Organizaciones">
    <template #acciones>
      <span v-if="avisoGuardado" role="status" class="flex items-center gap-1 text-sm text-brand-hover">
        <Icono nombre="check" :tamano="16" />
        {{ avisoGuardado }}
      </span>
      <button type="button" class="btn-primary" @click="mostrarNueva = !mostrarNueva">
        <Icono nombre="mas" :tamano="18" />
        Nueva organización
      </button>
    </template>
  </EncabezadoPagina>

  <div v-if="mostrarNueva" class="card">
    <div class="card-body">
      <div
        v-if="erroresNueva.length > 0"
        role="alert"
        class="flex flex-col gap-1 rounded-md bg-error-bg p-3 text-sm text-error"
      >
        <p v-for="(e, i) in erroresNueva" :key="i">{{ e }}</p>
      </div>
      <div class="flex flex-wrap items-end gap-4">
        <label class="label">
          <span class="lbl-cap">Nombre <span aria-hidden="true" class="text-error">*</span></span>
          <input v-model="nombreNueva" type="text" class="input" placeholder="Ej. Comedor La Esperanza" aria-required="true" />
        </label>
        <label class="label">
          <span class="lbl-cap">NIT <span aria-hidden="true" class="text-error">*</span></span>
          <input v-model="nitNueva" type="text" class="input max-w-[160px]" placeholder="900.000.000-0" aria-required="true" />
        </label>
        <label class="label">
          <span class="lbl-cap">Municipio <span aria-hidden="true" class="text-error">*</span></span>
          <input v-model="municipioNueva" type="text" class="input max-w-[160px]" placeholder="Neiva" aria-required="true" />
        </label>
        <label class="label">
          Tipo
          <select v-model="estadoNueva" class="select max-w-[150px]!">
            <option value="ESPORADICA">Esporádica</option>
            <option value="PERMANENTE">Permanente</option>
          </select>
        </label>
        <button type="button" class="btn-primary" @click="crearOrganizacion()">
          <Icono nombre="check" :tamano="18" />
          Crear
        </button>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4 desk:grid-cols-4">
    <TarjetaIndicador compacto titulo="Organizaciones" :valor="organizaciones.filas.value.length.toString()" icono="organizaciones" />
    <TarjetaIndicador compacto titulo="Vinculadas" :valor="organizaciones.vinculadas.value.toString()" icono="check" />
    <TarjetaIndicador compacto titulo="En proceso" :valor="organizaciones.enProceso.value.toString()" nota="Antes de Vinculada" icono="historicos" />
    <TarjetaIndicador
      compacto
      titulo="Elegibles para remisión"
      :valor="organizaciones.elegiblesRemision.value.toString()"
      nota="Vinculadas con autorización"
      icono="remisiones"
      tono="lote"
    />
  </div>

  <div class="card">
    <div class="card-body">
      <h2>Organizaciones</h2>

      <EstadoVacio v-if="organizaciones.filas.value.length === 0" titulo="No hay organizaciones registradas" />
      <div v-else class="tbl-scroll" tabindex="0" aria-label="Organizaciones">
        <div class="tbl-head" :style="{ gridTemplateColumns: COLUMNAS }">
          <span>Organización</span>
          <span>Tipo</span>
          <span>Etapa</span>
          <span>Representante</span>
          <span>Autorización</span>
          <span class="sr-only">Detalle</span>
        </div>
        <template v-for="f in filasPagina" :key="f.idOrganizacion">
          <div class="tbl-row" :style="{ gridTemplateColumns: COLUMNAS }">
            <span class="tbl-cell" data-label="Organización">
              <span class="block font-medium text-ink">{{ f.nombre }}</span>
              <span class="block text-xs text-muted">{{ f.nit }} · {{ f.municipio }}</span>
            </span>
            <span class="tbl-cell" data-label="Tipo">
              <span class="chip-neutral">{{ ETIQUETA_ESTADO[f.estado] }}</span>
            </span>
            <span class="tbl-cell" data-label="Etapa">
              <span :class="f.etapa === 'VINCULADA' ? 'chip-ok' : 'chip-warn'">{{ ETIQUETA_ETAPA[f.etapa] }}</span>
            </span>
            <span class="tbl-cell text-muted" data-label="Representante">{{ f.representanteNombre ?? 'Sin asignar' }}</span>
            <span class="tbl-cell" data-label="Autorización">
              <span :class="f.autorizada ? 'chip-ok' : 'chip-neutral'">{{ f.autorizada ? 'Vigente' : 'Sin registrar' }}</span>
            </span>
            <span class="tbl-cell">
              <button
                type="button"
                class="btn-icon h-[34px]! w-[34px]! max-desk:h-touch! max-desk:w-touch!"
                :aria-expanded="expandidas.has(f.idOrganizacion)"
                :aria-label="'Ver detalle de ' + f.nombre"
                @click="alternarExpandida(f.idOrganizacion)"
              >
                <Icono nombre="chevron-derecha" :tamano="16" class="transition-transform" :class="{ 'rotate-90': expandidas.has(f.idOrganizacion) }" />
              </button>
            </span>
          </div>

          <div v-if="expandidas.has(f.idOrganizacion)" class="col-span-full rounded-md bg-page p-4">
            <!-- Etapa: flujo de vinculación -->
            <div class="flex flex-wrap items-center gap-4 pb-4">
              <ol class="flex min-w-[260px] flex-1 items-start" :aria-label="'Avance de vinculación de ' + f.nombre">
                <li
                  v-for="(etapa, i) in ORDEN_ETAPAS"
                  :key="etapa"
                  class="flex flex-1 flex-col items-center text-center last:flex-none"
                  :aria-current="ORDEN_ETAPAS.indexOf(f.etapa) === i ? 'step' : undefined"
                >
                  <div class="flex w-full items-center">
                    <span class="h-0.5 flex-1" :class="[i === 0 ? 'opacity-0' : '', i <= ORDEN_ETAPAS.indexOf(f.etapa) ? 'bg-brand' : 'bg-line']"></span>
                    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" :class="clasePaso(i, ORDEN_ETAPAS.indexOf(f.etapa))">
                      <Icono v-if="i < ORDEN_ETAPAS.indexOf(f.etapa)" nombre="check" :tamano="16" />
                      <span v-else>{{ i + 1 }}</span>
                    </span>
                    <span class="h-0.5 flex-1" :class="[i === ORDEN_ETAPAS.length - 1 ? 'opacity-0' : '', i < ORDEN_ETAPAS.indexOf(f.etapa) ? 'bg-brand' : 'bg-line']"></span>
                  </div>
                  <span class="mt-1 px-1 text-[11px] leading-tight" :class="i <= ORDEN_ETAPAS.indexOf(f.etapa) ? 'font-semibold text-ink' : 'text-muted'">
                    {{ ETIQUETA_ETAPA[etapa] }}
                  </span>
                </li>
              </ol>
              <button v-if="f.etapa !== 'VINCULADA'" type="button" class="btn-secondary shrink-0" @click="avanzarEtapa(f)">
                Avanzar etapa
                <Icono nombre="chevron-derecha" :tamano="16" />
              </button>
            </div>
            <div
              v-if="erroresEtapa[f.idOrganizacion]"
              role="alert"
              class="mb-4 rounded-md bg-error-bg p-3 text-sm text-error"
            >
              {{ erroresEtapa[f.idOrganizacion] }}
            </div>

            <div class="grid grid-cols-1 gap-4 desk:grid-cols-2">
              <!-- Representante -->
              <div class="card">
                <div class="card-body gap-3!">
                  <h2 class="text-sm!">Representante</h2>
                  <template v-if="f.representanteNombre">
                    <p class="text-sm text-ink">{{ f.representanteNombre }}</p>
                    <p class="text-xs text-muted">Doc. {{ f.representanteDocumento }} · {{ f.representanteTelefono }}</p>
                  </template>
                  <template v-else>
                    <div
                      v-if="erroresRepresentante[f.idOrganizacion]?.length"
                      role="alert"
                      class="flex flex-col gap-1 rounded-md bg-error-bg p-3 text-sm text-error"
                    >
                      <p v-for="(e, i) in erroresRepresentante[f.idOrganizacion]" :key="i">{{ e }}</p>
                    </div>
                    <div class="flex flex-wrap items-end gap-3">
                      <label class="label">
                        <span class="lbl-cap">Nombre <span aria-hidden="true" class="text-error">*</span></span>
                        <input v-model="repDe(f.idOrganizacion).nombre" type="text" class="input max-w-[180px]" aria-required="true" />
                      </label>
                      <label class="label">
                        <span class="lbl-cap">Documento <span aria-hidden="true" class="text-error">*</span></span>
                        <input v-model="repDe(f.idOrganizacion).documento" type="text" class="input max-w-[140px]" aria-required="true" />
                      </label>
                      <label class="label">
                        <span class="lbl-cap">Teléfono <span aria-hidden="true" class="text-error">*</span></span>
                        <input v-model="repDe(f.idOrganizacion).telefono" type="text" class="input max-w-[140px]" aria-required="true" />
                      </label>
                      <button type="button" class="btn-secondary" @click="guardarRepresentante(f.idOrganizacion)">
                        <Icono nombre="check" :tamano="16" />
                        Guardar
                      </button>
                    </div>
                  </template>
                </div>
              </div>

              <!-- Autorización -->
              <div class="card">
                <div class="card-body gap-3!">
                  <h2 class="text-sm!">Autorización de datos</h2>
                  <p class="help">
                    Habeas Data (Ley 1581): no se guardan ni usan los datos del representante sin su autorización. Una organización
                    solo puede recibir remisiones cuando está Vinculada y con la autorización registrada.
                  </p>
                  <template v-if="f.autorizada">
                    <p class="text-sm text-ink">{{ f.medioAutorizacion }}</p>
                    <p class="text-xs text-muted">{{ formatearFecha(f.fechaAutorizacion!) }} · {{ f.finalidadesAutorizacion }}</p>
                  </template>
                  <p v-else-if="!f.representanteNombre" class="text-xs text-muted">Registra primero el representante.</p>
                  <template v-else>
                    <div
                      v-if="erroresAutorizacion[f.idOrganizacion]?.length"
                      role="alert"
                      class="flex flex-col gap-1 rounded-md bg-error-bg p-3 text-sm text-error"
                    >
                      <p v-for="(e, i) in erroresAutorizacion[f.idOrganizacion]" :key="i">{{ e }}</p>
                    </div>
                    <div class="flex flex-wrap items-end gap-3">
                      <label class="label">
                        <span class="lbl-cap">Fecha <span aria-hidden="true" class="text-error">*</span></span>
                        <input v-model="autDe(f.idOrganizacion).fecha" type="date" class="input-date" :max="datos.fechaReferencia" aria-required="true" />
                      </label>
                      <label class="label">
                        <span class="lbl-cap">Medio <span aria-hidden="true" class="text-error">*</span></span>
                        <input v-model="autDe(f.idOrganizacion).medio" type="text" class="input max-w-[160px]" placeholder="Formulario digital" aria-required="true" />
                      </label>
                      <button type="button" class="btn-secondary" @click="registrarAutorizacion(f.idOrganizacion)">
                        <Icono nombre="check" :tamano="16" />
                        Registrar
                      </button>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <!-- Población -->
            <div class="card mt-4">
              <div class="card-body gap-3!">
                <h2 class="text-sm!">Población atendida · {{ formatearNumero(f.totalPoblacion, 0) }} personas</h2>

                <div
                  v-if="erroresPoblacion[f.idOrganizacion]?.length"
                  role="alert"
                  class="flex flex-col gap-1 rounded-md bg-error-bg p-3 text-sm text-error"
                >
                  <p v-for="(e, i) in erroresPoblacion[f.idOrganizacion]" :key="i">{{ e }}</p>
                </div>
                <div v-if="gruposDisponibles(f).length > 0" class="flex flex-wrap items-end gap-3">
                  <label class="label">
                    <span class="lbl-cap">Grupo <span aria-hidden="true" class="text-error">*</span></span>
                    <select v-model="pobDe(f.idOrganizacion).grupo" class="select max-w-[200px]!">
                      <option value="" disabled>Seleccione un grupo</option>
                      <option v-for="g in gruposDisponibles(f)" :key="g" :value="g">{{ g }}</option>
                    </select>
                  </label>
                  <label class="label">
                    <span class="lbl-cap">Cantidad <span aria-hidden="true" class="text-error">*</span></span>
                    <input
                      type="number"
                      min="0"
                      class="input-num"
                      :value="pobDe(f.idOrganizacion).cantidad ?? ''"
                      @input="pobDe(f.idOrganizacion).cantidad = ($event.target as HTMLInputElement).value ? +($event.target as HTMLInputElement).value : null"
                    />
                  </label>
                  <button type="button" class="btn-secondary" @click="agregarPoblacion(f)">
                    <Icono nombre="mas" :tamano="16" />
                    Agregar
                  </button>
                </div>

                <p v-if="f.poblacion.length === 0" class="text-xs text-muted">Todavía no hay grupos registrados.</p>
                <ul v-else class="flex flex-col divide-y divide-line-row">
                  <li v-for="p in f.poblacion" :key="p.grupo" class="flex items-center justify-between gap-4 py-2 text-sm first:pt-0 last:pb-0">
                    <span class="text-ink">{{ p.grupo }}</span>
                    <span class="flex items-center gap-3">
                      <span class="num font-medium text-ink">{{ formatearNumero(p.cantidad, 0) }}</span>
                      <button
                        type="button"
                        class="btn-icon h-8! w-8!"
                        :aria-label="'Quitar ' + p.grupo"
                        @click="quitarPoblacion(f, p.grupo)"
                      >
                        <Icono nombre="quitar" :tamano="16" />
                      </button>
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </template>
      </div>

      <Paginador
        :pagina="pagina"
        :total-paginas="totalPaginas"
        :rango-desde="rangoDesde"
        :rango-hasta="rangoHasta"
        :total="organizaciones.filas.value.length"
        etiqueta="organizaciones"
        @ir-pagina="irPagina"
      />
    </div>
  </div>
</template>
