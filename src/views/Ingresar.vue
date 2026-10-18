<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import Icono from '../components/Icono.vue';
import { useDatosStore } from '../stores/datos';
import type { RolCodigo } from '../stores/sesion';
import { useSesionStore } from '../stores/sesion';

/** Pantalla de ingreso: CLAUDE.md dice "Ingresar con Google + rol de demostración" y
 *  decisiones.md confirma "solo para la demostración" — no hay backend de autenticación
 *  real en este prototipo (confirmado: no existe Amplify, Cognito SDK, useAuth ni
 *  authStore en el proyecto; Usuario.SubCognito en domain/modelos.ts es un campo del
 *  modelo de datos para cuando exista, no una integración). "Continuar con Google" hace
 *  exactamente lo mismo que el selector de rol: fija el rol de la demo y entra. No se
 *  agregó Microsoft, correo/contraseña, recuperar contraseña ni estados de error de un
 *  proveedor que no existe — habría sido una pantalla que promete algo que no hace. */
interface OpcionRol {
  valor: RolCodigo;
  etiqueta: string;
}

const OPCIONES_ROL: OpcionRol[] = [
  { valor: 'coord', etiqueta: 'Laura Gómez · Coordinadora del banco' },
  { valor: 'asist', etiqueta: 'Diana Ríos · Asistente administrativa' },
  { valor: 'bodega', etiqueta: 'Carlos Perdomo · Personal de bodega' },
];

const sesion = useSesionStore();
const datos = useDatosStore();
const router = useRouter();

const opciones = OPCIONES_ROL;
const rolSeleccionado = ref<RolCodigo>(sesion.rol);

function elegirRol(valor: string): void {
  rolSeleccionado.value = valor as RolCodigo;
}

function continuar(): void {
  sesion.establecerRol(rolSeleccionado.value);
  router.push('/inicio');
}
</script>

<template>
  <div class="ingresar grid min-h-screen grid-cols-1 tablet:grid-cols-[minmax(420px,0.9fr)_minmax(0,1.1fr)]">
    <section class="ingresar-hero relative hidden flex-col justify-between gap-10 p-6 text-white tablet:flex tablet:p-10 desk:p-12" aria-hidden="true">
      <div class="relative flex items-start gap-3">
        <span class="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px_12px_12px_4px] border border-white/25 bg-white/10 text-white">
          <Icono nombre="caja" :tamano="20" />
        </span>
        <div class="flex flex-col gap-0.5 pt-0.5">
          <span class="font-display text-lg leading-tight font-bold">SSD Bancos de Alimentos</span>
          <span class="text-[10px] text-white/70">Gestión de bancos de alimentos</span>
        </div>
      </div>

      <div class="relative flex max-w-[460px] flex-col gap-5">
        <span class="w-fit rounded-full border border-white/25 px-3 py-1 text-[9px] font-bold tracking-[0.14em] text-[#bdf2ae] uppercase">
          Gestión que alimenta
        </span>
        <h1 class="font-display text-[36px] leading-[1.1] font-bold tracking-[-0.01em] text-balance desk:text-[48px]">
          Más control. Más alimentos aprovechados.
        </h1>
        <p class="max-w-[430px] text-sm leading-[1.65] text-white/75">
          Centraliza las recepciones, las existencias y las entregas de tu banco de alimentos en un solo lugar.
        </p>

        <div class="mt-2 flex flex-col gap-4">
          <div class="flex items-start gap-3">
            <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[#bdf2ae]">
              <Icono nombre="check" :tamano="16" />
            </span>
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-bold text-white">Inventario confiable</span>
              <span class="text-[9px] text-white/60">Trazabilidad completa de cada lote</span>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[#bdf2ae]">
              <Icono nombre="check" :tamano="16" />
            </span>
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-bold text-white">Roles por persona</span>
              <span class="text-[9px] text-white/60">Cada quien ve solo lo que su rol necesita</span>
            </div>
          </div>
        </div>
      </div>

      <span class="relative text-xs text-white/60">{{ datos.banco?.Nombre }}</span>
    </section>

    <main class="ingresar-panel flex items-center justify-center p-5 tablet:p-10">
      <div class="flex w-full max-w-[420px] flex-col gap-6">
        <div class="flex flex-col items-start gap-2 tablet:hidden">
          <span class="flex h-10 w-10 items-center justify-center rounded-md bg-brand text-brand-ink">
            <Icono nombre="caja" :tamano="20" />
          </span>
          <span class="font-display text-base font-semibold text-ink">SSD Bancos de Alimentos</span>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-[9px] font-bold tracking-[0.08em] text-brand-text uppercase">Acceso al sistema</span>
          <h1 class="font-display text-[28px] leading-tight font-bold tracking-[-0.01em] text-ink">Bienvenido</h1>
          <p class="text-xs text-muted">Elige tu rol para entrar a la demostración del prototipo.</p>
        </div>

        <label class="label" for="rol-demostracion">
          Rol para la demostración
          <select
            id="rol-demostracion"
            class="select max-w-none"
            :value="rolSeleccionado"
            @change="elegirRol(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="opcion in opciones" :key="opcion.valor" :value="opcion.valor">
              {{ opcion.etiqueta }}
            </option>
          </select>
          <span class="help">Solo en el prototipo: en el sistema el rol sale de la cuenta.</span>
        </label>

        <button type="button" class="btn-secondary w-full justify-center gap-2" @click="continuar()">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M45.1 24.5c0-1.6-.1-2.8-.4-4.1H24v7.7h12.1c-.2 2-1.6 5-4.6 7l7 5.5c4.2-3.9 6.6-9.6 6.6-16.1z"
            />
            <path
              fill="#34A853"
              d="M24 46c6 0 11-2 14.6-5.4l-7-5.5c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.8-3.9-12.5-9.3l-7.2 5.6C7.9 41 15.4 46 24 46z"
            />
            <path
              fill="#FBBC05"
              d="M11.5 28c-.5-1.3-.7-2.6-.7-4s.3-2.7.7-4l-7.2-5.6C2.8 17.3 2 20.6 2 24s.8 6.7 2.3 9.6l7.2-5.6z"
            />
            <path
              fill="#EA4335"
              d="M24 10.7c4.1 0 6.9 1.8 8.5 3.3l6.2-6.1C34.9 4.4 30 2 24 2 15.4 2 7.9 7 4.3 14.4l7.2 5.6c1.7-5.4 6.7-9.3 12.5-9.3z"
            />
          </svg>
          Continuar con Google
        </button>

        <p class="text-center text-xs text-muted">Si no tienes acceso, pídeselo al coordinador del banco.</p>
      </div>
    </main>
  </div>
</template>
