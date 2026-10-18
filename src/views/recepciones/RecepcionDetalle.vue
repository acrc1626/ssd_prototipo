<script setup lang="ts">
import { computed, nextTick, ref, watch, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { obtenerRecepcionDetalle } from '../../application/recepcionDetalle';
import type { RenglonRecepcion } from '../../application/recepcionDetalle';
import Icono from '../../components/Icono.vue';
import Migas from '../../components/Migas.vue';
import type { MigaPan } from '../../components/migaPan';
import { kgDesdePresentacion } from '../../domain/calculos';
import { formatearFecha, formatearNumero, unirConY } from '../../domain/formato';
import type { OrigenRecepcion } from '../../domain/modelos';
import { useConfirmarStore } from '../../stores/confirmar';
import { useDatosStore } from '../../stores/datos';
import { useDeshacerStore } from '../../stores/deshacer';
import { useSesionStore } from '../../stores/sesion';

const route = useRoute();
const router = useRouter();
const datos = useDatosStore();
const sesion = useSesionStore();
const confirmar = useConfirmarStore();
const deshacer = useDeshacerStore();

const noEncontrada = ref(false);
const idRecepcionActual = ref<string | null>(null);
const numero = ref<string | null>(null);
const donanteId = ref('');
const fecha = ref('');
const origen = ref<OrigenRecepcion>('DONACION');
const numeroSoporte = ref('');
const soporteUrl = ref<string | null>(null);
const inputArchivoRef = ref<HTMLInputElement | null>(null);
const estado = ref<'BORRADOR' | 'CONFIRMADA'>('BORRADOR');
const renglones = ref<RenglonRecepcion[]>([]);
const avisoGuardado = ref(false);

watchEffect(() => {
  const id = (route.params.id as string | undefined) ?? 'nueva';
  const datosRecepcion = obtenerRecepcionDetalle(id);
  if (!datosRecepcion) {
    noEncontrada.value = true;
    return;
  }
  noEncontrada.value = false;
  idRecepcionActual.value = datosRecepcion.idRecepcion;
  numero.value = datosRecepcion.numero;
  donanteId.value = datosRecepcion.donanteId;
  fecha.value = datosRecepcion.fecha;
  origen.value = datosRecepcion.origen;
  numeroSoporte.value = datosRecepcion.numeroSoporte;
  soporteUrl.value = datosRecepcion.soporteUrl;
  estado.value = datosRecepcion.estado;
  renglones.value = datosRecepcion.renglones;
});

const migas = computed<MigaPan[]>(() => [
  { etiqueta: 'Inicio', ruta: '/inicio' },
  { etiqueta: 'Recepciones', ruta: '/recepciones' },
  { etiqueta: numero.value ?? 'Nueva recepción' },
]);

const soloLectura = computed(() => estado.value === 'CONFIRMADA');
const esNueva = computed(() => numero.value === null);

const totalRecibido = computed(() => renglones.value.reduce((t, r) => t + r.kgRecibido, 0));
const totalDesechado = computed(() => renglones.value.reduce((t, r) => t + r.kgDesechado, 0));
const totalAprovechado = computed(() => totalRecibido.value - totalDesechado.value);
const porcentajeAprovechado = computed(() =>
  totalRecibido.value === 0 ? 0 : (totalAprovechado.value / totalRecibido.value) * 100,
);

const donantes = computed(() => datos.donantes);
const presentaciones = computed(() =>
  datos.presentaciones.map((p) => {
    const producto = datos.productos.find((prod) => prod.IdProducto === p.IdProducto);
    return { id: p.IdPresentacion, etiqueta: `${producto?.Nombre ?? ''} · ${p.Nombre_PENDIENTE}` };
  }),
);

const presentacionNuevaId = ref('');
const cantidadNueva = ref<number | null>(null);
const fechaNueva = ref('');
const cantidadInputRef = ref<HTMLInputElement | null>(null);
const donanteSelectRef = ref<HTMLSelectElement | null>(null);

/** Auditoría RC-01/RC-03: Categoria.AplicaVencimiento ya existe en el modelo (CLAUDE.md,
 *  sección Datos) — se usa para exigir vencimiento solo en productos perecederos, no en
 *  todos (aseo, electrodomésticos no vencen). */
function categoriaRequiereVencimiento(idPresentacion: string): boolean {
  const presentacion = datos.presentaciones.find((p) => p.IdPresentacion === idPresentacion);
  const producto = presentacion ? datos.productos.find((p) => p.IdProducto === presentacion.IdProducto) : undefined;
  const categoria = producto ? datos.categorias.find((c) => c.IdCategoria === producto.IdCategoria) : undefined;
  return categoria?.AplicaVencimiento ?? false;
}

const erroresRenglon = ref<string[]>([]);
const erroresRecepcion = ref<string[]>([]);
const erroresBoxRef = ref<HTMLElement | null>(null);
const donanteInvalido = ref(false);

const busquedaProducto = ref('');
const comboAbierto = ref(false);
const resaltado = ref(-1);

const opcionesFiltradas = computed(() => {
  const texto = busquedaProducto.value.trim().toLowerCase();
  if (!texto) return presentaciones.value;
  return presentaciones.value.filter((p) => p.etiqueta.toLowerCase().includes(texto));
});

function abrirCombo(): void {
  busquedaProducto.value = '';
  resaltado.value = -1;
  comboAbierto.value = true;
}

function cerrarCombo(): void {
  comboAbierto.value = false;
}

function alPerderFocoCombo(): void {
  comboAbierto.value = false;
  const actual = presentaciones.value.find((p) => p.id === presentacionNuevaId.value);
  busquedaProducto.value = actual?.etiqueta ?? '';
}

function seleccionarPresentacion(p: { id: string; etiqueta: string }): void {
  presentacionNuevaId.value = p.id;
  busquedaProducto.value = p.etiqueta;
  comboAbierto.value = false;
  cantidadInputRef.value?.focus();
}

function moverResaltado(delta: number): void {
  if (!comboAbierto.value) {
    comboAbierto.value = true;
    return;
  }
  const total = opcionesFiltradas.value.length;
  if (total === 0) return;
  resaltado.value = (resaltado.value + delta + total) % total;
}

function seleccionarResaltado(): void {
  const opcion = opcionesFiltradas.value[resaltado.value];
  if (opcion) seleccionarPresentacion(opcion);
}

function nombreDonante(id: string): string {
  return donantes.value.find((d) => d.IdDonante === id)?.Nombre ?? '';
}

/** Auditoría RC-05: con 0 decimales fijos, un renglón a granel (12,5 kg) se mostraba
 *  redondeado a "13" en la columna Cantidad — el Kg de al lado sí mostraba 12,5, así que
 *  los dos números dejaban de cuadrar. Unidades por pieza (bolsas, bultos) siguen sin
 *  decimales porque de verdad son enteras. */
function decimalesCantidad(cantidad: number): number {
  return Number.isInteger(cantidad) ? 0 : 1;
}

function actualizarDesecho(id: string, valor: string): void {
  const n = Number(valor);
  if (Number.isNaN(n)) return;
  renglones.value = renglones.value.map((r) =>
    r.id === id ? { ...r, kgDesechado: Math.min(Math.max(n, 0), r.kgRecibido) } : r,
  );
}

function quitarRenglon(id: string): void {
  const actual = renglones.value;
  const renglon = actual.find((r) => r.id === id);
  if (!renglon) return;
  const posicion = actual.indexOf(renglon);
  renglones.value = actual.filter((r) => r.id !== id);
  deshacer.mostrar(`Se quitó ${renglon.productoNombre}`, () => {
    const copia = [...renglones.value];
    copia.splice(posicion, 0, renglon);
    renglones.value = copia;
  });
}

function agregarRenglon(): void {
  erroresRenglon.value = [];
  const idPresentacion = presentacionNuevaId.value;
  const cantidad = cantidadNueva.value;

  if (!idPresentacion) erroresRenglon.value.push('Selecciona un producto y presentación.');
  if (!cantidad || cantidad <= 0) erroresRenglon.value.push('Ingresa una cantidad mayor a 0.');
  if (idPresentacion && fechaNueva.value && fecha.value && fechaNueva.value < fecha.value) {
    erroresRenglon.value.push('El vencimiento no puede ser anterior a la fecha de recepción.');
  }
  if (idPresentacion && categoriaRequiereVencimiento(idPresentacion) && !fechaNueva.value) {
    erroresRenglon.value.push('Este producto vence: agrega la fecha de vencimiento.');
  }
  if (erroresRenglon.value.length > 0) return;
  if (!idPresentacion || !cantidad) return;

  const presentacion = datos.presentaciones.find((p) => p.IdPresentacion === idPresentacion);
  if (!presentacion) return;
  const producto = datos.productos.find((p) => p.IdProducto === presentacion.IdProducto);

  const nuevo: RenglonRecepcion = {
    id: `nuevo-${renglones.value.length}-${idPresentacion}`,
    idPresentacion,
    productoNombre: producto?.Nombre ?? '',
    presentacionNombre: presentacion.Nombre_PENDIENTE,
    unidadConteo: presentacion.UnidadConteo_PROTOTIPO,
    cantidad,
    kgRecibido: kgDesdePresentacion(presentacion, cantidad),
    kgDesechado: 0,
    fechaVencimiento: fechaNueva.value || null,
    vencimientoEstimado: false,
    codigoLote: null,
  };

  renglones.value = [...renglones.value, nuevo];
  presentacionNuevaId.value = '';
  busquedaProducto.value = '';
  cantidadNueva.value = null;
  fechaNueva.value = '';
}

function abrirSelectorArchivo(): void {
  inputArchivoRef.value?.click();
}

const mostrarVisorSoporte = ref(false);
const errorVisorSoporte = ref(false);
const botonCerrarSoporteRef = ref<HTMLButtonElement | null>(null);

function abrirVisorSoporte(): void {
  errorVisorSoporte.value = false;
  mostrarVisorSoporte.value = true;
  // `autofocus` en el botón no siempre alcanza a aplicar a tiempo en un elemento recién
  // montado (v-if en el mismo tick) — sin foco adentro del modal, Escape no tiene nada
  // que burbujee hasta el listener. Foco explícito después del render es más confiable.
  nextTick(() => botonCerrarSoporteRef.value?.focus());
}

function cerrarVisorSoporte(): void {
  mostrarVisorSoporte.value = false;
}

function onArchivoSeleccionado(event: Event): void {
  const archivo = (event.target as HTMLInputElement).files?.[0];
  if (!archivo) return;
  if (soporteUrl.value?.startsWith('blob:')) URL.revokeObjectURL(soporteUrl.value);
  soporteUrl.value = URL.createObjectURL(archivo);
  numeroSoporte.value = archivo.name;
  (event.target as HTMLInputElement).value = '';
}

/** Crea o actualiza la cabecera de la recepción y guarda los renglones actuales en el
 *  overlay de borrador. Antes "Guardar borrador" solo mostraba un aviso y no tocaba
 *  nada — por eso al volver a entrar los renglones habían desaparecido. */
function guardarEnStore(): { idRecepcion: string; numero: string } {
  const resultado = datos.guardarRecepcion({
    idRecepcion: idRecepcionActual.value,
    donanteId: donanteId.value,
    fecha: fecha.value,
    origen: origen.value,
    numeroSoporte: numeroSoporte.value,
    soporteUrl: soporteUrl.value,
    idUsuario: sesion.usuario?.IdUsuario ?? '',
  });
  datos.guardarRenglonesBorrador(
    resultado.idRecepcion,
    renglones.value.map((r) => ({
      id: r.id,
      idPresentacion: r.idPresentacion,
      cantidad: r.cantidad,
      kgRecibido: r.kgRecibido,
      kgDesechado: r.kgDesechado,
      fechaVencimiento: r.fechaVencimiento,
      vencimientoEstimado: r.vencimientoEstimado,
    })),
  );
  idRecepcionActual.value = resultado.idRecepcion;
  if (numero.value === null) {
    numero.value = resultado.numero;
    router.replace(`/recepciones/${resultado.numero}`);
  }
  return resultado;
}

function guardarBorrador(): void {
  guardarEnStore();
  avisoGuardado.value = true;
  setTimeout(() => {
    avisoGuardado.value = false;
  }, 2500);
}

/** Auditoría RC-01: antes se podía confirmar sin donante, sin renglones y con
 *  perecederos sin vencimiento — el lote quedaba "Sin riesgo" en Existencias,
 *  contradiciendo la trazabilidad que promete la app. */
function calcularErroresRecepcion(): { mensajes: string[]; donanteInvalido: boolean } {
  const mensajes: string[] = [];
  let donInvalido = false;

  if (!donanteId.value) {
    donInvalido = true;
    mensajes.push('Selecciona un donante.');
  }
  if (renglones.value.length === 0) {
    mensajes.push('Agrega al menos un renglón.');
  }
  const sinVencimiento = renglones.value.filter(
    (r) => categoriaRequiereVencimiento(r.idPresentacion) && !r.fechaVencimiento,
  );
  if (sinVencimiento.length > 0) {
    mensajes.push(`Falta el vencimiento de ${unirConY(sinVencimiento.map((r) => r.productoNombre))}.`);
  }

  return { mensajes, donanteInvalido: donInvalido };
}

/** Si ya se mostraron errores, se recalculan en vivo al corregir un campo — si no, el
 *  mensaje "Agrega al menos un renglón" se quedaba pegado aunque el usuario ya hubiera
 *  agregado uno. Solo revisa mientras el bloque de errores esté visible, para no
 *  adelantarse a corregir antes de que la persona intente confirmar. */
watch([donanteId, renglones], () => {
  if (erroresRecepcion.value.length === 0) return;
  const { mensajes, donanteInvalido: donInvalido } = calcularErroresRecepcion();
  erroresRecepcion.value = mensajes;
  donanteInvalido.value = donInvalido;
});

function validarRecepcion(): boolean {
  const { mensajes, donanteInvalido: donInvalido } = calcularErroresRecepcion();
  erroresRecepcion.value = mensajes;
  donanteInvalido.value = donInvalido;

  if (erroresRecepcion.value.length > 0) {
    nextTick(() => (donanteInvalido.value ? donanteSelectRef.value?.focus() : erroresBoxRef.value?.focus()));
    return false;
  }
  return true;
}

async function confirmarRecepcion(): Promise<void> {
  if (!validarRecepcion()) return;

  const ok = await confirmar.pedir({
    titulo: 'Confirmar recepción',
    mensaje: 'Se crean los lotes con estos renglones y la recepción queda solo para consulta.',
    detalle: [
      `${renglones.value.length} ${renglones.value.length === 1 ? 'renglón' : 'renglones'}`,
      `${formatearNumero(totalRecibido.value)} kg recibidos`,
      `${formatearNumero(totalDesechado.value)} kg desechados`,
    ],
    textoConfirmar: 'Confirmar recepción',
  });
  if (!ok) return;
  const resultado = guardarEnStore();
  datos.confirmarRecepcion(resultado.idRecepcion);
  estado.value = 'CONFIRMADA';
}

function volver(): void {
  router.push('/recepciones');
}
</script>

<template>
  <template v-if="noEncontrada">
    <Migas
      :items="[
        { etiqueta: 'Inicio', ruta: '/inicio' },
        { etiqueta: 'Recepciones', ruta: '/recepciones' },
        { etiqueta: 'No encontrada' },
      ]"
    />
    <div class="card">
      <div class="card-body items-center gap-2 py-16 text-center">
        <h1 class="font-display text-lg font-semibold text-ink">No encontramos esa recepción</h1>
        <p class="text-sm text-muted">Puede que el número no exista o que ya no esté disponible.</p>
        <router-link to="/recepciones" class="btn-secondary">Volver a recepciones</router-link>
      </div>
    </div>
  </template>

  <template v-else>
    <Migas :items="migas" />

    <div class="card">
      <div class="card-body gap-4">
        <div class="flex flex-col gap-4 desk:flex-row desk:items-start desk:justify-between">
          <div class="flex items-start gap-4">
            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-mint-soft text-brand-hover">
              <Icono nombre="recepciones" :tamano="24" />
            </span>
            <div class="flex flex-col gap-1">
              <div class="flex flex-wrap items-center gap-2">
                <h1>{{ esNueva ? 'Nueva recepción' : 'Recepción ' + numero }}</h1>
                <span :class="soloLectura ? 'chip-neutral' : 'chip-ok'">
                  {{ soloLectura ? 'Confirmada · lotes creados' : 'Borrador' }}
                </span>
              </div>
              <p class="text-sm text-muted">Formato FT-ADM-002 · {{ datos.banco?.Nombre }}</p>
            </div>
          </div>

          <button v-if="soloLectura" type="button" class="btn-secondary shrink-0" @click="volver()">
            Volver a recepciones
          </button>
          <div v-else class="flex flex-wrap shrink-0 items-center gap-4">
            <span v-if="avisoGuardado" role="status" class="flex items-center gap-1 text-sm text-brand-hover">
              <Icono nombre="check" :tamano="16" />
              Guardado
            </span>
            <button type="button" class="btn-secondary" @click="guardarBorrador()">Guardar borrador</button>
            <button type="button" class="btn-primary" @click="confirmarRecepcion()">
              Confirmar recepción
            </button>
          </div>
        </div>

        <div class="h-px bg-line" aria-hidden="true"></div>

        <div
          v-if="erroresRecepcion.length > 0"
          ref="erroresBoxRef"
          role="alert"
          tabindex="-1"
          class="flex flex-col gap-1 rounded-md bg-error-bg p-3 text-sm text-error"
        >
          <p v-for="(e, i) in erroresRecepcion" :key="i">{{ e }}</p>
        </div>

        <div class="flex flex-wrap items-start gap-x-8 gap-y-4">
          <label class="label">
            <span class="lbl-cap">Donante <span v-if="!soloLectura" aria-hidden="true" class="text-error">*</span></span>
            <span v-if="soloLectura" class="text-sm text-ink">{{ nombreDonante(donanteId) }}</span>
            <select
              v-else
              ref="donanteSelectRef"
              v-model="donanteId"
              class="select max-w-[220px]!"
              aria-required="true"
              :aria-invalid="donanteInvalido"
              :class="{ 'border-error!': donanteInvalido }"
            >
              <option value="" disabled>Seleccione un donante</option>
              <option v-for="d in donantes" :key="d.IdDonante" :value="d.IdDonante">{{ d.Nombre }}</option>
            </select>
          </label>

          <label class="label">
            Fecha de recepción
            <span v-if="soloLectura" class="text-sm text-ink">{{ formatearFecha(fecha) }}</span>
            <input v-else v-model="fecha" type="date" class="input-date" />
          </label>

          <label class="label">
            Origen
            <span v-if="soloLectura" class="text-sm text-ink">{{ origen === 'DONACION' ? 'Donación' : 'Compra' }}</span>
            <select v-else v-model="origen" class="select max-w-[130px]!">
              <option value="DONACION">Donación</option>
              <option value="COMPRA">Compra</option>
            </select>
          </label>

          <label class="label">
            Soporte del donante
            <input
              ref="inputArchivoRef"
              type="file"
              class="hidden"
              accept="image/*,application/pdf"
              @change="onArchivoSeleccionado"
            />
            <div class="flex flex-wrap items-center gap-2">
              <button v-if="soporteUrl" type="button" class="btn-secondary w-fit" @click="abrirVisorSoporte()">
                <Icono nombre="ojo" :tamano="16" />
                Ver soporte
              </button>
              <span v-else-if="soloLectura" class="text-sm text-muted">Sin soporte adjunto</span>
              <button
                v-if="!soloLectura"
                type="button"
                class="btn-secondary w-fit"
                @click="abrirSelectorArchivo()"
              >
                <Icono nombre="adjuntar" :tamano="16" />
                {{ soporteUrl ? 'Cambiar archivo' : 'Adjuntar foto o PDF' }}
              </button>
            </div>
          </label>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="flex flex-col gap-4 tablet:flex-row tablet:items-start tablet:justify-between">
          <h2>Renglones</h2>

          <div class="rcp-resumen">
            <div class="rcp-resumen-item">
              <span class="rcp-resumen-label">Renglones</span>
              <span class="rcp-resumen-valor">{{ renglones.length }}</span>
            </div>
            <div class="rcp-resumen-item">
              <span class="rcp-resumen-label">Recibido</span>
              <span class="rcp-resumen-valor">{{ formatearNumero(totalRecibido) }} kg</span>
            </div>
            <div class="rcp-resumen-item">
              <span class="rcp-resumen-label text-lot-ink">Desechado</span>
              <span class="rcp-resumen-valor">{{ formatearNumero(totalDesechado) }} kg</span>
            </div>
            <div class="rcp-resumen-item">
              <span class="rcp-resumen-label">Aprovechado</span>
              <span class="rcp-resumen-valor"
                >{{ formatearNumero(totalAprovechado) }} kg
                <span class="text-xs font-normal text-muted">({{ formatearNumero(porcentajeAprovechado, 0) }}%)</span></span
              >
            </div>
          </div>
        </div>

        <div v-if="!soloLectura" class="flex flex-wrap items-end gap-4">
          <label class="label">
            Producto y presentación
            <div class="relative w-[280px]">
              <Icono nombre="buscar" :tamano="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                v-model="busquedaProducto"
                type="text"
                class="input w-full pl-10"
                placeholder="Busca por nombre de producto"
                role="combobox"
                aria-controls="lista-presentaciones"
                :aria-expanded="comboAbierto"
                aria-autocomplete="list"
                :aria-activedescendant="resaltado >= 0 && opcionesFiltradas[resaltado] ? 'opt-' + opcionesFiltradas[resaltado]!.id : undefined"
                @focus="abrirCombo()"
                @keydown.down.prevent="moverResaltado(1)"
                @keydown.up.prevent="moverResaltado(-1)"
                @keydown.enter.prevent="seleccionarResaltado()"
                @keydown.escape="cerrarCombo()"
                @blur="alPerderFocoCombo()"
              />
              <ul v-if="comboAbierto" id="lista-presentaciones" role="listbox" class="rcp-combo-lista">
                <li v-if="opcionesFiltradas.length === 0" class="px-3 py-2 text-xs text-muted">Sin resultados</li>
                <li v-for="(p, i) in opcionesFiltradas" :key="p.id">
                  <button
                    :id="'opt-' + p.id"
                    type="button"
                    role="option"
                    :aria-selected="p.id === presentacionNuevaId"
                    class="rcp-combo-opcion"
                    :class="{ 'rcp-combo-opcion-activa': i === resaltado }"
                    @mousedown.prevent="seleccionarPresentacion(p)"
                  >
                    {{ p.etiqueta }}
                  </button>
                </li>
              </ul>
            </div>
          </label>
          <label class="label">
            Cantidad
            <input
              ref="cantidadInputRef"
              type="number"
              min="0"
              class="input-num"
              :value="cantidadNueva ?? ''"
              @input="
                cantidadNueva = ($event.target as HTMLInputElement).value
                  ? +($event.target as HTMLInputElement).value
                  : null
              "
            />
          </label>
          <label class="label">
            Vencimiento
            <input v-model="fechaNueva" type="date" class="input-date" :min="fecha || undefined" />
          </label>
          <button type="button" class="btn-primary" @click="agregarRenglon()">
            <Icono nombre="mas" :tamano="18" />
            Agregar
          </button>
        </div>
        <div v-if="erroresRenglon.length > 0" role="alert" class="flex flex-col gap-1 rounded-md bg-error-bg p-3 text-sm text-error">
          <p v-for="(e, i) in erroresRenglon" :key="i">{{ e }}</p>
        </div>

        <p v-if="renglones.length === 0" class="py-8 text-center text-sm text-muted">
          Todavía no hay renglones en esta recepción.
        </p>
        <div v-else class="tbl-scroll max-h-[330px] overflow-y-auto" tabindex="0" aria-label="Renglones de la recepción">
          <div class="tbl-head sticky top-0 z-10" style="grid-template-columns: minmax(0,1fr) 96px 88px 112px 112px 96px 96px 56px">
            <span>Producto y presentación</span>
            <span class="text-right">Cantidad</span>
            <span class="text-right">Kg</span>
            <span>Vencimiento</span>
            <span class="text-right">Desechado (kg)</span>
            <span class="text-right">Aprov. kg</span>
            <span>Lote</span>
            <span class="sr-only">Quitar</span>
          </div>
          <div
            v-for="r in renglones"
            :key="r.id"
            class="tbl-row"
            style="grid-template-columns: minmax(0,1fr) 96px 88px 112px 112px 96px 96px 56px"
          >
            <span class="tbl-cell" data-label="Producto y presentación">
              <span class="block font-medium text-ink">{{ r.productoNombre }}</span>
              <span class="block text-xs text-muted">{{ r.presentacionNombre }}</span>
            </span>
            <span class="tbl-cell num" data-label="Cantidad">{{ formatearNumero(r.cantidad, decimalesCantidad(r.cantidad)) }} {{ r.unidadConteo }}</span>
            <span class="tbl-cell num" data-label="Kg">{{ formatearNumero(r.kgRecibido) }}</span>
            <span
              class="tbl-cell flex flex-wrap items-center gap-1 overflow-visible whitespace-normal"
              data-label="Vencimiento"
            >
              <span>{{ r.fechaVencimiento ? formatearFecha(r.fechaVencimiento) : 'Sin fecha' }}</span>
              <span v-if="r.vencimientoEstimado" class="chip-warn">estimada</span>
            </span>
            <span class="tbl-cell" data-label="Desechado (kg)">
              <span v-if="soloLectura" class="num block">{{ formatearNumero(r.kgDesechado) }}</span>
              <input
                v-else
                type="number"
                min="0"
                :max="r.kgRecibido"
                class="input-num"
                :value="r.kgDesechado"
                :aria-label="'Kg desechado de ' + r.productoNombre"
                @change="actualizarDesecho(r.id, ($event.target as HTMLInputElement).value)"
              />
            </span>
            <span class="tbl-cell num text-brand-hover" data-label="Aprov. kg">
              {{ formatearNumero(r.kgRecibido - r.kgDesechado) }}
            </span>
            <span class="tbl-cell" data-label="Lote">
              <span v-if="r.codigoLote" class="lot">{{ r.codigoLote }}</span>
              <span v-else class="text-xs text-muted">Al confirmar</span>
            </span>
            <span class="tbl-cell" data-label="Quitar">
              <button
                v-if="!soloLectura"
                type="button"
                class="btn-icon h-[34px]! w-[34px]! max-desk:h-touch! max-desk:w-touch!"
                :aria-label="'Quitar ' + r.productoNombre"
                @click="quitarRenglon(r.id)"
              >
                <Icono nombre="bajas" :tamano="16" />
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="mostrarVisorSoporte"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click="cerrarVisorSoporte()"
    >
      <div
        class="card w-full max-w-[560px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="soporte-titulo"
        @click.stop
        @keydown.escape="cerrarVisorSoporte()"
      >
        <div class="card-body">
          <div class="flex items-center justify-between gap-2">
            <h2 id="soporte-titulo" class="font-display text-base font-semibold text-ink">Soporte del donante</h2>
            <button
              ref="botonCerrarSoporteRef"
              type="button"
              class="btn-icon h-9! w-9!"
              aria-label="Cerrar"
              autofocus
              @click="cerrarVisorSoporte()"
            >
              <Icono nombre="cerrar" :tamano="18" />
            </button>
          </div>

          <div class="flex max-h-[65vh] min-h-[200px] items-center justify-center overflow-hidden rounded-md bg-page">
            <img
              v-if="soporteUrl && !errorVisorSoporte"
              :src="soporteUrl"
              :alt="'Soporte adjunto' + (numeroSoporte ? ': ' + numeroSoporte : '')"
              class="max-h-[65vh] w-full object-contain"
              @error="errorVisorSoporte = true"
            />
            <div v-else class="flex flex-col items-center gap-2 px-6 py-12 text-center text-muted">
              <Icono nombre="archivo" :tamano="34" />
              <p class="text-sm">No se puede previsualizar este archivo aquí.</p>
            </div>
          </div>

          <a :href="soporteUrl ?? '#'" target="_blank" rel="noopener noreferrer" class="btn-link w-fit self-end">
            <Icono nombre="archivo" :tamano="16" />
            Abrir en pestaña nueva
          </a>
        </div>
      </div>
    </div>
  </template>
</template>
