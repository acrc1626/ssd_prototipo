<script setup lang="ts">
import { computed } from 'vue';

import { usePaginacion } from '../application/paginacion';
import { useUsuariosAplicacion } from '../application/usuarios';
import type { FilaUsuario } from '../application/usuarios';
import EncabezadoPagina from '../components/EncabezadoPagina.vue';
import Migas from '../components/Migas.vue';
import type { MigaPan } from '../components/migaPan';
import Paginador from '../components/Paginador.vue';
import TarjetaIndicador from '../components/TarjetaIndicador.vue';
import { useConfirmarStore } from '../stores/confirmar';
import { useDatosStore } from '../stores/datos';

const COLUMNAS = 'minmax(0,1fr) minmax(0,1.2fr) 210px 130px';

const datos = useDatosStore();
const usuarios = useUsuariosAplicacion();
const confirmar = useConfirmarStore();

const migas: MigaPan[] = [{ etiqueta: 'Inicio', ruta: '/inicio' }, { etiqueta: 'Usuarios y roles' }];
const roles = computed(() => datos.roles);

const { pagina, totalPaginas, filasPagina, rangoDesde, rangoHasta, irPagina } = usePaginacion(usuarios.filas);

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');
}

async function onCambiarRol(fila: FilaUsuario, event: Event): Promise<void> {
  const select = event.target as HTMLSelectElement;
  const nuevoIdRol = select.value;
  if (nuevoIdRol === fila.idRol) return;

  const nuevoRol = roles.value.find((r) => r.IdRol === nuevoIdRol);
  const ok = await confirmar.pedir({
    titulo: 'Cambiar rol',
    mensaje: `${fila.nombre} pasa de "${fila.nombreRol}" a "${nuevoRol?.Nombre ?? ''}". El menú y los permisos cambian de inmediato.`,
    textoConfirmar: 'Cambiar rol',
  });
  if (!ok) {
    select.value = fila.idRol ?? '';
    return;
  }
  usuarios.cambiarRol(fila.idUsuario, nuevoIdRol);
}

async function onCambiarActivo(fila: FilaUsuario, event: Event): Promise<void> {
  const select = event.target as HTMLSelectElement;
  const nuevoActivo = select.value === '1';
  if (nuevoActivo === fila.activo) return;

  if (!nuevoActivo) {
    const ok = await confirmar.pedir({
      titulo: 'Desactivar usuario',
      mensaje: `${fila.nombre} no va a poder ingresar al sistema mientras esté inactivo.`,
      textoConfirmar: 'Desactivar',
      variante: 'peligro',
    });
    if (!ok) {
      select.value = '1';
      return;
    }
  }
  usuarios.cambiarActivo(fila.idUsuario, nuevoActivo);
}
</script>

<template>
  <Migas :items="migas" />

  <EncabezadoPagina icono="usuarios" titulo="Usuarios y roles" :subtitulo="datos.banco?.Nombre" />

  <div class="grid grid-cols-2 gap-4 desk:grid-cols-3">
    <TarjetaIndicador compacto titulo="Usuarios" :valor="usuarios.filas.value.length.toString()" nota="Con acceso al sistema" icono="usuarios" />
    <TarjetaIndicador compacto titulo="Activos" :valor="usuarios.activos.value.toString()" nota="Pueden ingresar" icono="check" />
    <TarjetaIndicador compacto titulo="Inactivos" :valor="usuarios.inactivos.value.toString()" nota="Acceso bloqueado" icono="usuarios" tono="alerta" />
  </div>

  <div class="card">
    <div class="card-body">
      <h2>Personas</h2>

      <div class="tbl-scroll" tabindex="0" aria-label="Usuarios y roles">
        <div class="tbl-head" :style="{ gridTemplateColumns: COLUMNAS }">
          <span>Nombre</span>
          <span>Correo</span>
          <span>Rol</span>
          <span>Estado</span>
        </div>
        <div v-for="f in filasPagina" :key="f.idUsuario" class="tbl-row" :style="{ gridTemplateColumns: COLUMNAS }">
          <span class="tbl-cell flex items-center gap-3" data-label="Nombre">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint-soft text-xs font-semibold text-brand-hover">
              {{ iniciales(f.nombre) }}
            </span>
            <span class="font-medium text-ink">{{ f.nombre }}</span>
          </span>
          <span class="tbl-cell text-muted" data-label="Correo">{{ f.correo }}</span>
          <span class="tbl-cell" data-label="Rol">
            <select :value="f.idRol ?? ''" class="select max-w-[200px]!" :aria-label="'Rol de ' + f.nombre" @change="onCambiarRol(f, $event)">
              <option value="" disabled>Sin rol</option>
              <option v-for="r in roles" :key="r.IdRol" :value="r.IdRol">{{ r.Nombre }}</option>
            </select>
          </span>
          <span class="tbl-cell" data-label="Estado">
            <select
              :value="f.activo ? '1' : '0'"
              class="select max-w-[130px]!"
              :aria-label="'Estado de ' + f.nombre"
              @change="onCambiarActivo(f, $event)"
            >
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </span>
        </div>
      </div>

      <Paginador
        :pagina="pagina"
        :total-paginas="totalPaginas"
        :rango-desde="rangoDesde"
        :rango-hasta="rangoHasta"
        :total="usuarios.filas.value.length"
        etiqueta="usuarios"
        @ir-pagina="irPagina"
      />
    </div>
  </div>
</template>
