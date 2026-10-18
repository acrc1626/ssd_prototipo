import type { RolCodigo } from './sesion';

export interface ItemMenu {
  id: string;
  etiqueta: string;
  ruta: string;
  icono: string;
  grupo?: string;
  roles: RolCodigo[];
  contador?: number;
}

/** Rutas y visibilidad por rol: tabla de pantallas y sección "Roles" de CLAUDE.md,
 *  confirmadas en docs/decisiones.md ("Flujo y pantallas"). */
export const ITEMS_MENU: ItemMenu[] = [
  { id: 'inicio', etiqueta: 'Inicio', ruta: '/inicio', icono: 'inicio', roles: ['coord', 'asist', 'bodega'] },

  { id: 'recepciones', etiqueta: 'Recepciones', ruta: '/recepciones', icono: 'recepciones', grupo: 'Inventario', roles: ['bodega'] },
  { id: 'existencias', etiqueta: 'Existencias', ruta: '/existencias', icono: 'existencias', grupo: 'Inventario', roles: ['coord', 'asist', 'bodega'] },
  { id: 'bajas', etiqueta: 'Bajas', ruta: '/bajas', icono: 'bajas', grupo: 'Inventario', roles: ['bodega'] },

  { id: 'remisiones', etiqueta: 'Remisiones', ruta: '/remisiones', icono: 'remisiones', grupo: 'Distribución', roles: ['asist'] },
  { id: 'organizaciones', etiqueta: 'Organizaciones', ruta: '/organizaciones', icono: 'organizaciones', grupo: 'Distribución', roles: ['asist'] },
  { id: 'kits', etiqueta: 'Programas y kits', ruta: '/kits', icono: 'kits', grupo: 'Distribución', roles: ['coord'] },

  { id: 'riesgo', etiqueta: 'Riesgo de vencimiento', ruta: '/riesgo', icono: 'riesgo', grupo: 'Análisis', roles: ['coord'] },
  { id: 'reporte', etiqueta: 'Reporte mensual', ruta: '/reporte', icono: 'reporte', grupo: 'Análisis', roles: ['coord', 'asist'] },

  { id: 'catalogo', etiqueta: 'Catálogo', ruta: '/catalogo', icono: 'catalogo', grupo: 'Administración', roles: ['coord'] },
  { id: 'historicos', etiqueta: 'Importar históricos', ruta: '/historicos', icono: 'historicos', grupo: 'Administración', roles: ['coord'] },
  { id: 'usuarios', etiqueta: 'Usuarios y roles', ruta: '/usuarios', icono: 'usuarios', grupo: 'Administración', roles: ['coord'] },
];
