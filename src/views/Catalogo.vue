<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';

import { useCatalogoAplicacion } from '../application/catalogo';
import { usePaginacion } from '../application/paginacion';
import EncabezadoPagina from '../components/EncabezadoPagina.vue';
import EstadoVacio from '../components/EstadoVacio.vue';
import Icono from '../components/Icono.vue';
import Migas from '../components/Migas.vue';
import type { MigaPan } from '../components/migaPan';
import Paginador from '../components/Paginador.vue';
import TarjetaIndicador from '../components/TarjetaIndicador.vue';
import { formatearNumero } from '../domain/formato';
import { useDatosStore } from '../stores/datos';

type Pestana = 'CATEGORIAS' | 'PRODUCTOS' | 'PRESENTACIONES' | 'EQUIVALENCIAS';

const datos = useDatosStore();
const catalogo = useCatalogoAplicacion();

const migas: MigaPan[] = [{ etiqueta: 'Inicio', ruta: '/inicio' }, { etiqueta: 'Catálogo' }];

const pestana = ref<Pestana>('CATEGORIAS');

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

/** Compara ignorando mayúsculas y espacios de más, para no duplicar "Bebidas" / "bebidas ". */
function mismoNombre(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('es') === b.trim().toLocaleLowerCase('es');
}

// --- Nueva categoría ---
const mostrarNuevaCategoria = ref(false);
const nombreCategoria = ref('');
const aplicaVencimientoCategoria = ref(true);
const vidaUtilCategoria = ref<number | null>(null);
const erroresCategoria = ref<string[]>([]);

function calcularErroresCategoria(): string[] {
  const mensajes: string[] = [];
  const nombre = nombreCategoria.value.trim();
  if (!nombre) mensajes.push('Ingresa el nombre de la categoría.');
  else if (datos.categorias.some((c) => mismoNombre(c.Nombre, nombre))) mensajes.push('Ya existe una categoría con ese nombre.');
  if (aplicaVencimientoCategoria.value && vidaUtilCategoria.value !== null && vidaUtilCategoria.value <= 0) {
    mensajes.push('La vida útil debe ser mayor a 0 días.');
  }
  return mensajes;
}

function crearCategoria(): void {
  const mensajes = calcularErroresCategoria();
  erroresCategoria.value = mensajes;
  if (mensajes.length > 0) return;
  const nombre = nombreCategoria.value.trim();
  catalogo.crearCategoria(nombre, aplicaVencimientoCategoria.value, vidaUtilCategoria.value);
  nombreCategoria.value = '';
  aplicaVencimientoCategoria.value = true;
  vidaUtilCategoria.value = null;
  mostrarNuevaCategoria.value = false;
  mostrarAviso(`Se creó la categoría "${nombre}".`);
}

watch([nombreCategoria, aplicaVencimientoCategoria, vidaUtilCategoria], () => {
  if (erroresCategoria.value.length === 0) return;
  erroresCategoria.value = calcularErroresCategoria();
});

// --- Nuevo producto ---
const mostrarNuevoProducto = ref(false);
const nombreProducto = ref('');
const categoriaProducto = ref('');
const erroresProducto = ref<string[]>([]);

function calcularErroresProducto(): string[] {
  const mensajes: string[] = [];
  const nombre = nombreProducto.value.trim();
  if (!nombre) mensajes.push('Ingresa el nombre del producto.');
  else if (datos.productos.some((p) => mismoNombre(p.Nombre, nombre))) mensajes.push('Ya existe un producto con ese nombre.');
  if (!categoriaProducto.value) mensajes.push('Selecciona una categoría.');
  return mensajes;
}

function crearProducto(): void {
  const mensajes = calcularErroresProducto();
  erroresProducto.value = mensajes;
  if (mensajes.length > 0) return;
  const nombre = nombreProducto.value.trim();
  catalogo.crearProducto(nombre, categoriaProducto.value);
  nombreProducto.value = '';
  categoriaProducto.value = '';
  mostrarNuevoProducto.value = false;
  mostrarAviso(`Se creó el producto "${nombre}".`);
}

watch([nombreProducto, categoriaProducto], () => {
  if (erroresProducto.value.length === 0) return;
  erroresProducto.value = calcularErroresProducto();
});

// --- Nueva presentación ---
const mostrarNuevaPresentacion = ref(false);
const productoPresentacion = ref('');
const nombrePresentacion = ref('');
const contenidoPresentacion = ref<number | null>(null);
const unidadPresentacion = ref<'G' | 'ML'>('G');
const unidadConteoPresentacion = ref('');
const erroresPresentacion = ref<string[]>([]);

function calcularErroresPresentacion(): string[] {
  const mensajes: string[] = [];
  if (!productoPresentacion.value) mensajes.push('Selecciona un producto.');
  if (!nombrePresentacion.value.trim()) mensajes.push('Ingresa el nombre de la presentación.');
  if (!contenidoPresentacion.value || contenidoPresentacion.value <= 0) mensajes.push('Ingresa un contenido mayor a 0.');
  if (!unidadConteoPresentacion.value.trim()) mensajes.push('Indica en qué se cuenta.');
  return mensajes;
}

function crearPresentacion(): void {
  const mensajes = calcularErroresPresentacion();
  erroresPresentacion.value = mensajes;
  if (mensajes.length > 0) return;
  const nombre = nombrePresentacion.value.trim();
  catalogo.crearPresentacion(
    productoPresentacion.value,
    nombre,
    contenidoPresentacion.value!,
    unidadPresentacion.value,
    unidadConteoPresentacion.value.trim(),
  );
  productoPresentacion.value = '';
  nombrePresentacion.value = '';
  contenidoPresentacion.value = null;
  unidadConteoPresentacion.value = '';
  mostrarNuevaPresentacion.value = false;
  mostrarAviso(`Se creó la presentación "${nombre}".`);
}

watch([productoPresentacion, nombrePresentacion, contenidoPresentacion, unidadConteoPresentacion], () => {
  if (erroresPresentacion.value.length === 0) return;
  erroresPresentacion.value = calcularErroresPresentacion();
});

const productosOrdenados = computed(() => [...datos.productos].sort((a, b) => a.Nombre.localeCompare(b.Nombre, 'es')));

const norm = (s: string) => s.toLocaleLowerCase('es');

// --- Buscadores y filtros por pestaña (para que escale con muchos registros) ---
const busquedaCategoria = ref('');
const filtroVencimiento = ref<'TODAS' | 'SI' | 'NO'>('TODAS');
const categoriasFiltradas = computed(() => {
  const t = norm(busquedaCategoria.value.trim());
  return catalogo.categorias.value.filter((c) => {
    if (filtroVencimiento.value === 'SI' && !c.aplicaVencimiento) return false;
    if (filtroVencimiento.value === 'NO' && c.aplicaVencimiento) return false;
    if (t && !norm(c.nombre).includes(t)) return false;
    return true;
  });
});

const busquedaProducto2 = ref('');
const filtroCategoria = ref('TODAS');
const productosFiltrados = computed(() => {
  const t = norm(busquedaProducto2.value.trim());
  return catalogo.productos.value.filter((p) => {
    if (filtroCategoria.value !== 'TODAS' && p.categoria !== filtroCategoria.value) return false;
    if (t && !norm(p.nombre).includes(t)) return false;
    return true;
  });
});

const busquedaPresentacion = ref('');
const filtroProductoPres = ref('TODOS');
const presentacionesFiltradas = computed(() => {
  const t = norm(busquedaPresentacion.value.trim());
  return catalogo.presentaciones.value.filter((p) => {
    if (filtroProductoPres.value !== 'TODOS' && p.producto !== filtroProductoPres.value) return false;
    if (t && !(norm(p.nombre).includes(t) || norm(p.producto).includes(t))) return false;
    return true;
  });
});

const busquedaEquivalencia = ref('');
const equivalenciasFiltradas = computed(() => {
  const t = norm(busquedaEquivalencia.value.trim());
  if (!t) return catalogo.equivalencias.value;
  return catalogo.equivalencias.value.filter((e) => norm(e.nombreOrigen).includes(t) || norm(e.producto).includes(t));
});

// Nombres de categorías/productos para los selects de filtro (ordenados, sin repetir)
const nombresCategorias = computed(() => [...new Set(catalogo.productos.value.map((p) => p.categoria))].sort((a, b) => a.localeCompare(b, 'es')));
const nombresProductosPres = computed(() => [...new Set(catalogo.presentaciones.value.map((p) => p.producto))].sort((a, b) => a.localeCompare(b, 'es')));

// Paginación por pestaña (sobre la lista filtrada). reactive() para que las refs
// internas se desenrollen al accederlas como pagX.filasPagina en el template.
const pagCategorias = reactive(usePaginacion(categoriasFiltradas));
const pagProductos = reactive(usePaginacion(productosFiltrados));
const pagPresentaciones = reactive(usePaginacion(presentacionesFiltradas));
</script>

<template>
  <Migas :items="migas" />

  <EncabezadoPagina icono="catalogo" titulo="Catálogo" subtitulo="Productos, presentaciones y categorías">
    <template v-if="aviso" #acciones>
      <span role="status" class="flex items-center gap-1 text-sm text-brand-hover">
        <Icono nombre="check" :tamano="16" />
        {{ aviso }}
      </span>
    </template>
  </EncabezadoPagina>

  <div class="grid grid-cols-2 gap-4 desk:grid-cols-4">
    <TarjetaIndicador compacto titulo="Categorías" :valor="catalogo.categorias.value.length.toString()" icono="catalogo" />
    <TarjetaIndicador compacto titulo="Productos" :valor="catalogo.productos.value.length.toString()" icono="caja" />
    <TarjetaIndicador compacto titulo="Presentaciones" :valor="catalogo.presentaciones.value.length.toString()" icono="existencias" />
    <TarjetaIndicador
      compacto
      titulo="Equivalencias sin asignar"
      :valor="catalogo.nombresSinAsignar.value.toString()"
      nota="Se resuelven en Históricos"
      icono="historicos"
      :tono="catalogo.nombresSinAsignar.value > 0 ? 'alerta' : 'normal'"
    />
  </div>

  <div class="card">
    <div class="card-body gap-0!">
      <div class="p-4">
        <div class="segmented" role="tablist" aria-label="Secciones del catálogo">
          <button type="button" class="segmented-option" role="tab" :aria-selected="pestana === 'CATEGORIAS'" @click="pestana = 'CATEGORIAS'">
            Categorías
          </button>
          <button type="button" class="segmented-option" role="tab" :aria-selected="pestana === 'PRODUCTOS'" @click="pestana = 'PRODUCTOS'">
            Productos
          </button>
          <button type="button" class="segmented-option" role="tab" :aria-selected="pestana === 'PRESENTACIONES'" @click="pestana = 'PRESENTACIONES'">
            Presentaciones
          </button>
          <button type="button" class="segmented-option" role="tab" :aria-selected="pestana === 'EQUIVALENCIAS'" @click="pestana = 'EQUIVALENCIAS'">
            Equivalencias
          </button>
        </div>
      </div>

      <!-- Categorías -->
      <div v-if="pestana === 'CATEGORIAS'" class="flex flex-col gap-4 p-4 pt-0">
        <div class="flex items-center justify-between gap-2">
          <h2>Categorías</h2>
          <button type="button" class="btn-secondary" @click="mostrarNuevaCategoria = !mostrarNuevaCategoria">
            <Icono nombre="mas" :tamano="16" />
            Nueva categoría
          </button>
        </div>

        <div v-if="mostrarNuevaCategoria" class="flex flex-col gap-4 rounded-md bg-page p-4">
          <div v-if="erroresCategoria.length > 0" role="alert" class="flex flex-col gap-1 rounded-md bg-error-bg p-3 text-sm text-error">
            <p v-for="(e, i) in erroresCategoria" :key="i">{{ e }}</p>
          </div>
          <div class="flex flex-wrap items-end gap-4">
            <label class="label">
              <span class="lbl-cap">Nombre <span aria-hidden="true" class="text-error">*</span></span>
              <input v-model="nombreCategoria" type="text" class="input" placeholder="Ej. Bebidas" aria-required="true" />
            </label>
            <label class="flex items-center gap-2 pb-3 text-sm text-ink">
              <input v-model="aplicaVencimientoCategoria" type="checkbox" class="h-4 w-4 accent-brand" />
              Aplica vencimiento
            </label>
            <label class="label">
              Vida útil (días)
              <input
                type="number"
                min="0"
                class="input-num"
                :disabled="!aplicaVencimientoCategoria"
                :value="vidaUtilCategoria ?? ''"
                @input="vidaUtilCategoria = ($event.target as HTMLInputElement).value ? +($event.target as HTMLInputElement).value : null"
              />
            </label>
            <button type="button" class="btn-primary" @click="crearCategoria()">
              <Icono nombre="check" :tamano="18" />
              Crear
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-4">
          <label class="flex items-center gap-2 text-sm text-label">
            Vencimiento
            <select v-model="filtroVencimiento" class="select max-w-none w-[130px]">
              <option value="TODAS">Todas</option>
              <option value="SI">Aplica</option>
              <option value="NO">No aplica</option>
            </select>
          </label>
          <div class="relative ml-auto">
            <Icono nombre="buscar" :tamano="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input v-model="busquedaCategoria" type="search" class="input pl-10" placeholder="Buscar categoría" aria-label="Buscar categoría" />
          </div>
        </div>

        <EstadoVacio v-if="categoriasFiltradas.length === 0" titulo="No hay categorías con esos filtros" descripcion="Prueba a quitar un filtro o a buscar con otras palabras." />
        <div v-else class="tbl-scroll" tabindex="0" aria-label="Categorías">
          <div class="tbl-head" style="grid-template-columns: minmax(100px,1fr) 130px 104px 88px">
            <span>Nombre</span>
            <span>Aplica vencimiento</span>
            <span class="text-right">Vida útil</span>
            <span class="text-right">Productos</span>
          </div>
          <div v-for="c in pagCategorias.filasPagina" :key="c.idCategoria" class="tbl-row" style="grid-template-columns: minmax(100px,1fr) 130px 104px 88px">
            <span class="tbl-cell font-medium text-ink" data-label="Nombre">{{ c.nombre }}</span>
            <span class="tbl-cell" data-label="Aplica vencimiento">
              <span :class="c.aplicaVencimiento ? 'chip-ok' : 'chip-neutral'">{{ c.aplicaVencimiento ? 'Sí' : 'No' }}</span>
            </span>
            <span class="tbl-cell num" data-label="Vida útil">{{ c.vidaUtilDias !== null ? c.vidaUtilDias + ' días' : 'Variable' }}</span>
            <span class="tbl-cell num" data-label="Productos">{{ c.productos }}</span>
          </div>
        </div>

        <Paginador
          :pagina="pagCategorias.pagina"
          :total-paginas="pagCategorias.totalPaginas"
          :rango-desde="pagCategorias.rangoDesde"
          :rango-hasta="pagCategorias.rangoHasta"
          :total="categoriasFiltradas.length"
          etiqueta="categorías"
          @ir-pagina="pagCategorias.irPagina"
        />
      </div>

      <!-- Productos -->
      <div v-else-if="pestana === 'PRODUCTOS'" class="flex flex-col gap-4 p-4 pt-0">
        <div class="flex items-center justify-between gap-2">
          <h2>Productos</h2>
          <button type="button" class="btn-secondary" @click="mostrarNuevoProducto = !mostrarNuevoProducto">
            <Icono nombre="mas" :tamano="16" />
            Nuevo producto
          </button>
        </div>

        <div v-if="mostrarNuevoProducto" class="flex flex-col gap-4 rounded-md bg-page p-4">
          <div v-if="erroresProducto.length > 0" role="alert" class="flex flex-col gap-1 rounded-md bg-error-bg p-3 text-sm text-error">
            <p v-for="(e, i) in erroresProducto" :key="i">{{ e }}</p>
          </div>
          <div class="flex flex-wrap items-end gap-4">
            <label class="label">
              <span class="lbl-cap">Nombre <span aria-hidden="true" class="text-error">*</span></span>
              <input v-model="nombreProducto" type="text" class="input" placeholder="Ej. Harina de trigo" aria-required="true" />
            </label>
            <label class="label">
              <span class="lbl-cap">Categoría <span aria-hidden="true" class="text-error">*</span></span>
              <select v-model="categoriaProducto" class="select max-w-[200px]!" aria-required="true">
                <option value="" disabled>Seleccione una categoría</option>
                <option v-for="c in datos.categorias" :key="c.IdCategoria" :value="c.IdCategoria">{{ c.Nombre }}</option>
              </select>
            </label>
            <button type="button" class="btn-primary" @click="crearProducto()">
              <Icono nombre="check" :tamano="18" />
              Crear
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-4">
          <label class="flex items-center gap-2 text-sm text-label">
            Categoría
            <select v-model="filtroCategoria" class="select max-w-none w-[180px]">
              <option value="TODAS">Todas</option>
              <option v-for="n in nombresCategorias" :key="n" :value="n">{{ n }}</option>
            </select>
          </label>
          <div class="relative ml-auto">
            <Icono nombre="buscar" :tamano="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input v-model="busquedaProducto2" type="search" class="input pl-10" placeholder="Buscar producto" aria-label="Buscar producto" />
          </div>
        </div>

        <EstadoVacio v-if="productosFiltrados.length === 0" titulo="No hay productos con esos filtros" descripcion="Prueba a quitar un filtro o a buscar con otras palabras." />
        <div v-else class="tbl-scroll" tabindex="0" aria-label="Productos">
          <div class="tbl-head" style="grid-template-columns: minmax(100px,1fr) minmax(100px,1fr) 104px">
            <span>Nombre</span>
            <span>Categoría</span>
            <span class="text-right">Presentaciones</span>
          </div>
          <div v-for="p in pagProductos.filasPagina" :key="p.idProducto" class="tbl-row" style="grid-template-columns: minmax(100px,1fr) minmax(100px,1fr) 104px">
            <span class="tbl-cell font-medium text-ink" data-label="Nombre">{{ p.nombre }}</span>
            <span class="tbl-cell"><span class="cat">{{ p.categoria }}</span></span>
            <span class="tbl-cell num" data-label="Presentaciones">{{ p.presentaciones }}</span>
          </div>
        </div>

        <Paginador
          :pagina="pagProductos.pagina"
          :total-paginas="pagProductos.totalPaginas"
          :rango-desde="pagProductos.rangoDesde"
          :rango-hasta="pagProductos.rangoHasta"
          :total="productosFiltrados.length"
          etiqueta="productos"
          @ir-pagina="pagProductos.irPagina"
        />
      </div>

      <!-- Presentaciones -->
      <div v-else-if="pestana === 'PRESENTACIONES'" class="flex flex-col gap-4 p-4 pt-0">
        <div class="flex items-center justify-between gap-2">
          <h2>Presentaciones</h2>
          <button type="button" class="btn-secondary" @click="mostrarNuevaPresentacion = !mostrarNuevaPresentacion">
            <Icono nombre="mas" :tamano="16" />
            Nueva presentación
          </button>
        </div>

        <div v-if="mostrarNuevaPresentacion" class="flex flex-col gap-4 rounded-md bg-page p-4">
          <div v-if="erroresPresentacion.length > 0" role="alert" class="flex flex-col gap-1 rounded-md bg-error-bg p-3 text-sm text-error">
            <p v-for="(e, i) in erroresPresentacion" :key="i">{{ e }}</p>
          </div>
          <div class="flex flex-wrap items-end gap-4">
            <label class="label">
              <span class="lbl-cap">Producto <span aria-hidden="true" class="text-error">*</span></span>
              <select v-model="productoPresentacion" class="select max-w-[200px]!" aria-required="true">
                <option value="" disabled>Seleccione un producto</option>
                <option v-for="p in productosOrdenados" :key="p.IdProducto" :value="p.IdProducto">{{ p.Nombre }}</option>
              </select>
            </label>
            <label class="label">
              <span class="lbl-cap">Nombre <span aria-hidden="true" class="text-error">*</span></span>
              <input v-model="nombrePresentacion" type="text" class="input max-w-[160px]" placeholder="Ej. Bolsa 1 kg" aria-required="true" />
            </label>
            <label class="label">
              <span class="lbl-cap">Contenido <span aria-hidden="true" class="text-error">*</span></span>
              <input
                type="number"
                min="0"
                class="input-num"
                aria-required="true"
                :value="contenidoPresentacion ?? ''"
                @input="contenidoPresentacion = ($event.target as HTMLInputElement).value ? +($event.target as HTMLInputElement).value : null"
              />
            </label>
            <label class="label">
              Unidad
              <select v-model="unidadPresentacion" class="select max-w-[90px]!">
                <option value="G">g</option>
                <option value="ML">ml</option>
              </select>
            </label>
            <label class="label">
              <span class="lbl-cap">Se cuenta en <span aria-hidden="true" class="text-error">*</span></span>
              <input v-model="unidadConteoPresentacion" type="text" class="input max-w-[130px]" placeholder="Ej. bolsas" aria-required="true" />
            </label>
            <button type="button" class="btn-primary" @click="crearPresentacion()">
              <Icono nombre="check" :tamano="18" />
              Crear
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-4">
          <label class="flex items-center gap-2 text-sm text-label">
            Producto
            <select v-model="filtroProductoPres" class="select max-w-none w-[180px]">
              <option value="TODOS">Todos</option>
              <option v-for="n in nombresProductosPres" :key="n" :value="n">{{ n }}</option>
            </select>
          </label>
          <div class="relative ml-auto">
            <Icono nombre="buscar" :tamano="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input v-model="busquedaPresentacion" type="search" class="input pl-10" placeholder="Buscar presentación o producto" aria-label="Buscar presentación" />
          </div>
        </div>

        <EstadoVacio v-if="presentacionesFiltradas.length === 0" titulo="No hay presentaciones con esos filtros" descripcion="Prueba a quitar un filtro o a buscar con otras palabras." />
        <div v-else class="tbl-scroll" tabindex="0" aria-label="Presentaciones">
          <div class="tbl-head" style="grid-template-columns: minmax(100px,1fr) minmax(100px,1fr) 96px 88px">
            <span>Presentación</span>
            <span>Producto</span>
            <span class="text-right">Contenido</span>
            <span>Se cuenta en</span>
          </div>
          <div v-for="p in pagPresentaciones.filasPagina" :key="p.idPresentacion" class="tbl-row" style="grid-template-columns: minmax(100px,1fr) minmax(100px,1fr) 96px 88px">
            <span class="tbl-cell font-medium text-ink" data-label="Presentación">{{ p.nombre }}</span>
            <span class="tbl-cell text-muted" data-label="Producto">{{ p.producto }}</span>
            <span class="tbl-cell num" data-label="Contenido">{{ formatearNumero(p.contenido, 0) }} {{ p.unidad === 'G' ? 'g' : 'ml' }}</span>
            <span class="tbl-cell" data-label="Se cuenta en">{{ p.unidadConteo }}</span>
          </div>
        </div>

        <Paginador
          :pagina="pagPresentaciones.pagina"
          :total-paginas="pagPresentaciones.totalPaginas"
          :rango-desde="pagPresentaciones.rangoDesde"
          :rango-hasta="pagPresentaciones.rangoHasta"
          :total="presentacionesFiltradas.length"
          etiqueta="presentaciones"
          @ir-pagina="pagPresentaciones.irPagina"
        />
      </div>

      <!-- Equivalencias -->
      <div v-else class="flex flex-col gap-4 p-4 pt-0">
        <div class="flex flex-col gap-1">
          <h2>Equivalencias</h2>
          <p class="text-sm text-muted">
            Al importar históricos, los nombres viejos (por ejemplo "SANDIA KILOS") se traducen al producto del catálogo
            ("Sandía") para poder sumarlos en los reportes. Aquí ves las traducciones ya hechas.
            <router-link v-if="catalogo.nombresSinAsignar.value > 0" to="/historicos" class="font-medium text-brand-text hover:underline">
              Hay {{ catalogo.nombresSinAsignar.value }} nombres por asignar en Históricos.
            </router-link>
          </p>
        </div>

        <div v-if="catalogo.equivalencias.value.length > 0" class="flex justify-end">
          <div class="relative">
            <Icono nombre="buscar" :tamano="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input v-model="busquedaEquivalencia" type="search" class="input pl-10" placeholder="Buscar nombre o producto" aria-label="Buscar equivalencia" />
          </div>
        </div>

        <EstadoVacio v-if="catalogo.equivalencias.value.length === 0" titulo="Todavía no hay equivalencias asignadas" />
        <EstadoVacio v-else-if="equivalenciasFiltradas.length === 0" titulo="No hay equivalencias con esa búsqueda" descripcion="Prueba a buscar con otras palabras." />
        <div v-else class="overflow-hidden rounded-md border border-line">
          <div class="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-center gap-3 border-b border-line bg-mint-soft px-4 py-2 text-xs font-bold uppercase tracking-[0.06em] text-table-head">
            <span>Nombre en el histórico</span>
            <span class="sr-only">se traduce a</span>
            <span>Producto</span>
          </div>
          <ul class="flex flex-col divide-y divide-line-row">
            <li
              v-for="e in equivalenciasFiltradas"
              :key="e.nombreOrigen"
              class="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-center gap-3 px-4 py-2.5 text-sm"
            >
              <span class="min-w-0 truncate font-mono text-xs text-muted" :title="e.nombreOrigen">{{ e.nombreOrigen }}</span>
              <Icono nombre="chevron-derecha" :tamano="16" class="justify-self-center text-muted" />
              <span class="min-w-0 truncate font-medium text-ink">{{ e.producto }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
