import { computed } from 'vue';

import { useDatosStore } from '../stores/datos';

export interface FilaUsuario {
  idUsuario: string;
  nombre: string;
  correo: string;
  activo: boolean;
  idRol: string | null;
  nombreRol: string;
}

/** Usuarios y roles (decisiones.md: "nombre, correo, roles, activo"; A-05: cambiar un
 *  rol pide confirmación — el diálogo vive en Usuarios.vue, aquí solo se arma la fila
 *  y se aplica el cambio una vez confirmado). */
export function useUsuariosAplicacion() {
  const datos = useDatosStore();

  const filas = computed<FilaUsuario[]>(() =>
    [...datos.usuarios]
      .map((u) => {
        const asignacion = datos.usuarioRoles.find((ur) => ur.IdUsuario === u.IdUsuario);
        const rol = asignacion ? datos.roles.find((r) => r.IdRol === asignacion.IdRol) : undefined;
        const fila: FilaUsuario = {
          idUsuario: u.IdUsuario,
          nombre: u.Nombre,
          correo: u.Correo,
          activo: u.Activo,
          idRol: asignacion?.IdRol ?? null,
          nombreRol: rol?.Nombre ?? 'Sin rol asignado',
        };
        return fila;
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  );

  const activos = computed(() => filas.value.filter((f) => f.activo).length);
  const inactivos = computed(() => filas.value.filter((f) => !f.activo).length);

  function cambiarRol(idUsuario: string, idRol: string): void {
    datos.cambiarRolUsuario(idUsuario, idRol);
  }

  function cambiarActivo(idUsuario: string, activo: boolean): void {
    datos.cambiarActivoUsuario(idUsuario, activo);
  }

  return { filas, activos, inactivos, cambiarRol, cambiarActivo };
}
