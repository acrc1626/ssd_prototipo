import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import { useDatosStore } from './datos';
import { ITEMS_MENU } from './menu';

export type RolCodigo = 'coord' | 'asist' | 'bodega';

const CLAVE_LOCALSTORAGE = 'ssd.rol';

/** Un solo usuario de sesión por rol, para la demostración (decisiones.md, "Flujo y pantallas"). */
const USUARIO_POR_ROL: Record<RolCodigo, string> = {
  coord: 'usr-laura-gomez',
  asist: 'usr-diana-rios',
  bodega: 'usr-carlos-perdomo',
};

const ID_ROL_POR_CODIGO: Record<RolCodigo, string> = {
  coord: 'rol-coord',
  asist: 'rol-asist',
  bodega: 'rol-bodega',
};

function leerRolGuardado(): RolCodigo {
  try {
    const guardado = localStorage.getItem(CLAVE_LOCALSTORAGE) as RolCodigo | null;
    if (guardado && guardado in USUARIO_POR_ROL) return guardado;
  } catch {
    /* localStorage no disponible (por ejemplo, en pruebas) */
  }
  return 'coord';
}

/** Rol activo de la demostración (CLAUDE.md, sección Roles): se guarda en
 *  localStorage `ssd.rol` y determina qué usuario y qué menú ve la persona. */
export const useSesionStore = defineStore('sesion', () => {
  const datos = useDatosStore();
  const rol = ref<RolCodigo>(leerRolGuardado());

  const usuario = computed(() => {
    const idUsuario = USUARIO_POR_ROL[rol.value];
    return datos.usuarios.find((u) => u.IdUsuario === idUsuario);
  });

  const infoRol = computed(() => {
    const idRol = ID_ROL_POR_CODIGO[rol.value];
    return datos.roles.find((r) => r.IdRol === idRol);
  });

  const iniciales = computed(() => {
    const nombre = usuario.value?.Nombre ?? '';
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join('');
  });

  const itemsMenu = computed(() => {
    const lotesRiesgoAlto = datos.riesgoLotes.filter((r) => r.Nivel === 'ALTO').length;
    return ITEMS_MENU.filter((item) => item.roles.includes(rol.value)).map((item) =>
      item.id === 'riesgo' && lotesRiesgoAlto > 0
        ? { ...item, contador: lotesRiesgoAlto }
        : { ...item, contador: undefined },
    );
  });

  function establecerRol(nuevo: RolCodigo): void {
    rol.value = nuevo;
    try {
      localStorage.setItem(CLAVE_LOCALSTORAGE, nuevo);
    } catch {
      /* localStorage no disponible */
    }
  }

  function cerrarSesion(): void {
    try {
      localStorage.removeItem(CLAVE_LOCALSTORAGE);
    } catch {
      /* localStorage no disponible */
    }
  }

  return { rol, usuario, infoRol, iniciales, itemsMenu, establecerRol, cerrarSesion };
});
