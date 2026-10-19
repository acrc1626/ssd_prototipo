<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';

import { useKitsAplicacion } from '../application/kits';
import { usePaginacion } from '../application/paginacion';
import EncabezadoPagina from '../components/EncabezadoPagina.vue';
import EstadoVacio from '../components/EstadoVacio.vue';
import Icono from '../components/Icono.vue';
import Migas from '../components/Migas.vue';
import type { MigaPan } from '../components/migaPan';
import Paginador from '../components/Paginador.vue';
import TarjetaIndicador from '../components/TarjetaIndicador.vue';
import { formatearFecha, formatearNumero } from '../domain/formato';
import { useConfirmarStore } from '../stores/confirmar';
import { useDatosStore } from '../stores/datos';
import { useDeshacerStore } from '../stores/deshacer';

type FiltroEstado = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';
const COLUMNAS = 'minmax(180px,1fr) 108px 100px 132px 56px';

const datos = useDatosStore();
const kits = useKitsAplicacion();
const confirmar = useConfirmarStore();
const deshacer = useDeshacerStore();

const migas: MigaPan[] = [{ etiqueta: 'Inicio', ruta: '/inicio' }, { etiqueta: 'Programas y kits' }];

const kgTotalRonda = computed(() => kits.programas.value.filter((p) => p.activo).reduce((t, p) => t + p.kgTotalPorKit, 0));

// --- Aviso de confirmación (patrón de RecepcionDetalle.vue / Organizaciones.vue) ---
const aviso = ref('');
let avisoTimeout: ReturnType<typeof setTimeout> | null = null;
function mostrarAviso(mensaje: string): void {
  aviso.value = mensaje;
  if (avisoTimeout) clearTimeout(avisoTimeout);
  avisoTimeout = setTimeout(() => {
    aviso.value = '';
  }, 4000);
}

const mostrarNuevo = ref(false);
const nombreNuevo = ref('');
const erroresNuevo = ref<string[]>([]);

function calcularErroresNuevo(): string[] {
  const mensajes: string[] = [];
  const nombre = nombreNuevo.value.trim();
  if (!nombre) mensajes.push('Ingresa el nombre del programa.');
  else if (kits.programas.value.some((p) => p.nombre.trim().toLocaleLowerCase('es') === nombre.toLocaleLowerCase('es'))) {
    mensajes.push('Ya existe un programa con ese nombre.');
  }
  return mensajes;
}

function crearPrograma(): void {
  const mensajes = calcularErroresNuevo();
  erroresNuevo.value = mensajes;
  if (mensajes.length > 0) return;
  const nombre = nombreNuevo.value.trim();
  kits.crearPrograma(nombre);
  nombreNuevo.value = '';
  mostrarNuevo.value = false;
  mostrarAviso(`Se creó el programa "${nombre}".`);
}

watch(nombreNuevo, () => {
  if (erroresNuevo.value.length === 0) return;
  erroresNuevo.value = calcularErroresNuevo();
});

async function cambiarActivo(idPrograma: string, nombre: string, event: Event): Promise<void> {
  const select = event.target as HTMLSelectElement;
  const nuevoActivo = select.value === '1';
  const actual = kits.programas.value.find((p) => p.idPrograma === idPrograma);
  if (!actual || nuevoActivo === actual.activo) return;

  if (!nuevoActivo) {
    const ok = await confirmar.pedir({
      titulo: 'Desactivar programa',
      mensaje: `"${nombre}" no se va a poder usar para armar kits nuevos mientras esté inactivo.`,
      textoConfirmar: 'Desactivar',
      variante: 'peligro',
    });
    if (!ok) {
      select.value = '1';
      return;
    }
  }
  kits.cambiarActivo(idPrograma, nuevoActivo);
}

const formularios = reactive<Record<string, { idProducto: string; kg: number | null }>>({});

function formularioDe(idPrograma: string) {
  return (formularios[idPrograma] ??= { idProducto: '', kg: null });
}

const erroresComponente = reactive<Record<string, string[]>>({});
function calcularErroresComponente(idPrograma: string): string[] {
  const form = formularioDe(idPrograma);
  const mensajes: string[] = [];
  if (!form.idProducto) mensajes.push('Selecciona un producto.');
  else {
    const programa = kits.programas.value.find((p) => p.idPrograma === idPrograma);
    if (programa?.componentes.some((c) => c.idProducto === form.idProducto)) mensajes.push('Ese producto ya está en el kit.');
  }
  if (!form.kg || form.kg <= 0) mensajes.push('Ingresa los kg por kit (mayor a 0).');
  return mensajes;
}

function agregarComponente(idPrograma: string): void {
  const mensajes = calcularErroresComponente(idPrograma);
  erroresComponente[idPrograma] = mensajes;
  if (mensajes.length > 0) return;
  const form = formularioDe(idPrograma);
  kits.agregarComponente(idPrograma, form.idProducto, form.kg!);
  form.idProducto = '';
  form.kg = null;
  mostrarAviso('Se agregó el producto al kit.');
}

watch(formularios, () => {
  for (const id of Object.keys(erroresComponente)) {
    if (!erroresComponente[id]?.length) continue;
    erroresComponente[id] = calcularErroresComponente(id);
  }
}, { deep: true });

function quitarComponente(idPrograma: string, idProducto: string, producto: string, kgPorKit: number): void {
  kits.quitarComponente(idPrograma, idProducto);
  deshacer.mostrar(`Se quitó ${producto} del kit`, () => {
    kits.agregarComponente(idPrograma, idProducto, kgPorKit);
  });
}

// --- Lista: buscador + filtro por estado + paginación (escala a muchos programas) ---
const busqueda = ref('');
const estadoFiltro = ref<FiltroEstado>('TODOS');

const programasFiltrados = computed(() => {
  const texto = busqueda.value.trim().toLocaleLowerCase('es');
  return kits.programas.value.filter((p) => {
    if (estadoFiltro.value === 'ACTIVOS' && !p.activo) return false;
    if (estadoFiltro.value === 'INACTIVOS' && p.activo) return false;
    if (texto && !p.nombre.toLocaleLowerCase('es').includes(texto)) return false;
    return true;
  });
});

const { pagina, totalPaginas, filasPagina, rangoDesde, rangoHasta, irPagina } = usePaginacion(programasFiltrados);

const expandidos = ref<Set<string>>(new Set());
function alternarExpandido(id: string): void {
  const copia = new Set(expandidos.value);
  copia.has(id) ? copia.delete(id) : copia.add(id);
  expandidos.value = copia;
}
</script>

<template>
  <Migas :items="migas" />

  <EncabezadoPagina icono="kits" titulo="Programas y kits" :subtitulo="'Corte ' + formatearFecha(datos.fechaReferencia)">
    <template #acciones>
      <span v-if="aviso" role="status" class="flex items-center gap-1 text-sm text-brand-hover">
        <Icono nombre="check" :tamano="16" />
        {{ aviso }}
      </span>
      <button type="button" class="btn-primary" @click="mostrarNuevo = !mostrarNuevo">
        <Icono nombre="mas" :tamano="18" />
        Nuevo programa
      </button>
    </template>
  </EncabezadoPagina>

  <div v-if="mostrarNuevo" class="card">
    <div class="card-body">
      <div v-if="erroresNuevo.length > 0" role="alert" class="flex flex-col gap-1 rounded-md bg-error-bg p-3 text-sm text-error">
        <p v-for="(e, i) in erroresNuevo" :key="i">{{ e }}</p>
      </div>
      <div class="flex flex-wrap items-end gap-4">
        <label class="label">
          <span class="lbl-cap">Nombre del programa <span aria-hidden="true" class="text-error">*</span></span>
          <input v-model="nombreNuevo" type="text" class="input" placeholder="Ej. Desayunos escolares" aria-required="true" @keydown.enter="crearPrograma()" />
        </label>
        <button type="button" class="btn-primary" @click="crearPrograma()">
          <Icono nombre="check" :tamano="18" />
          Crear
        </button>
        <button type="button" class="btn-secondary" @click="mostrarNuevo = false; nombreNuevo = ''; erroresNuevo = []">Cancelar</button>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4 desk:grid-cols-4">
    <TarjetaIndicador compacto titulo="Programas" :valor="kits.programas.value.length.toString()" nota="Con composición de kit" icono="kits" />
    <TarjetaIndicador compacto titulo="Activos" :valor="kits.activos.value.toString()" nota="Se pueden armar" icono="check" />
    <TarjetaIndicador compacto titulo="Productos distintos" :valor="kits.productosDistintos.value.toString()" nota="Usados en algún kit" icono="catalogo" />
    <TarjetaIndicador compacto titulo="Kg por ronda" :valor="formatearNumero(kgTotalRonda)" unidad="kg" nota="Suma de kits activos" icono="caja" />
  </div>

  <div class="card">
    <div class="card-body">
      <div class="flex flex-wrap items-center gap-4">
        <label class="flex items-center gap-2 text-sm text-label">
          Estado
          <select v-model="estadoFiltro" class="select max-w-none w-[150px]">
            <option value="TODOS">Todos</option>
            <option value="ACTIVOS">Activos</option>
            <option value="INACTIVOS">Inactivos</option>
          </select>
        </label>
        <div class="relative ml-auto">
          <Icono nombre="buscar" :tamano="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input v-model="busqueda" type="search" class="input pl-10" placeholder="Buscar programa" aria-label="Buscar programa" />
        </div>
      </div>

      <EstadoVacio
        v-if="programasFiltrados.length === 0"
        titulo="No hay programas con esos filtros"
        descripcion="Prueba a quitar un filtro o a buscar con otras palabras."
      />
      <div v-else class="tbl-scroll" tabindex="0" aria-label="Programas y kits">
        <div class="tbl-head" :style="{ gridTemplateColumns: COLUMNAS }">
          <span>Programa</span>
          <span class="text-right">Kg por kit</span>
          <span class="text-right">Productos</span>
          <span>Estado</span>
          <span class="sr-only">Detalle</span>
        </div>
        <template v-for="p in filasPagina" :key="p.idPrograma">
          <div class="tbl-row" :style="{ gridTemplateColumns: COLUMNAS }">
            <span class="tbl-cell font-medium text-ink" data-label="Programa">{{ p.nombre }}</span>
            <span class="tbl-cell num" data-label="Kg por kit">{{ formatearNumero(p.kgTotalPorKit) }}</span>
            <span class="tbl-cell num" data-label="Productos">{{ p.componentes.length }}</span>
            <span class="tbl-cell" data-label="Estado">
              <select :value="p.activo ? '1' : '0'" class="select max-w-[130px]!" :aria-label="'Estado de ' + p.nombre" @change="cambiarActivo(p.idPrograma, p.nombre, $event)">
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </span>
            <span class="tbl-cell">
              <button
                type="button"
                class="btn-icon h-[34px]! w-[34px]! max-desk:h-touch! max-desk:w-touch!"
                :aria-expanded="expandidos.has(p.idPrograma)"
                :aria-label="'Ver composición de ' + p.nombre"
                @click="alternarExpandido(p.idPrograma)"
              >
                <Icono nombre="chevron-derecha" :tamano="16" class="transition-transform" :class="{ 'rotate-90': expandidos.has(p.idPrograma) }" />
              </button>
            </span>
          </div>

          <div v-if="expandidos.has(p.idPrograma)" class="col-span-full rounded-md bg-page p-4">
            <h2 class="text-sm! pb-3">Composición del kit</h2>

            <div v-if="erroresComponente[p.idPrograma]?.length" role="alert" class="mb-3 flex flex-col gap-1 rounded-md bg-error-bg p-3 text-sm text-error">
              <p v-for="(e, i) in erroresComponente[p.idPrograma]" :key="i">{{ e }}</p>
            </div>
            <div class="flex flex-wrap items-end gap-4">
              <label class="label">
                <span class="lbl-cap">Producto <span aria-hidden="true" class="text-error">*</span></span>
                <select v-model="formularioDe(p.idPrograma).idProducto" class="select max-w-[220px]!" aria-required="true">
                  <option value="">Seleccione un producto</option>
                  <option v-for="prod in kits.productos.value" :key="prod.IdProducto" :value="prod.IdProducto">{{ prod.Nombre }}</option>
                </select>
              </label>
              <label class="label">
                <span class="lbl-cap">Kg por kit <span aria-hidden="true" class="text-error">*</span></span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  class="input-num"
                  aria-required="true"
                  :value="formularioDe(p.idPrograma).kg ?? ''"
                  @input="formularioDe(p.idPrograma).kg = ($event.target as HTMLInputElement).value ? +($event.target as HTMLInputElement).value : null"
                />
              </label>
              <button type="button" class="btn-secondary" @click="agregarComponente(p.idPrograma)">
                <Icono nombre="mas" :tamano="16" />
                Agregar
              </button>
            </div>

            <p v-if="p.componentes.length === 0" class="py-4 text-center text-sm text-muted">Este kit todavía no tiene productos.</p>
            <div v-else class="tbl-scroll mt-4" tabindex="0" :aria-label="'Composición de ' + p.nombre">
              <div class="tbl-head" style="grid-template-columns: minmax(100px,1fr) 104px 56px">
                <span>Producto</span>
                <span class="text-right">Kg por kit</span>
                <span class="sr-only">Quitar</span>
              </div>
              <div v-for="c in p.componentes" :key="c.idProducto" class="tbl-row" style="grid-template-columns: minmax(100px,1fr) 104px 56px">
                <span class="tbl-cell font-medium text-ink" data-label="Producto">{{ c.producto }}</span>
                <span class="tbl-cell num" data-label="Kg por kit">{{ formatearNumero(c.kgPorKit) }}</span>
                <span class="tbl-cell" data-label="Quitar">
                  <button
                    type="button"
                    class="btn-icon h-[34px]! w-[34px]! max-desk:h-touch! max-desk:w-touch!"
                    :aria-label="'Quitar ' + c.producto + ' de ' + p.nombre"
                    @click="quitarComponente(p.idPrograma, c.idProducto, c.producto, c.kgPorKit)"
                  >
                    <Icono nombre="quitar" :tamano="16" />
                  </button>
                </span>
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
        :total="programasFiltrados.length"
        etiqueta="programas"
        @ir-pagina="irPagina"
      />
    </div>
  </div>
</template>
