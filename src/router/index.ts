import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import AppShell from '../components/shell/AppShell.vue';
import { useSesionStore } from '../stores/sesion';

const routes: RouteRecordRaw[] = [
  {
    path: '/ingresar',
    component: () => import('../views/Ingresar.vue'),
    meta: { titulo: 'Ingresar' },
  },
  {
    path: '/',
    component: AppShell,
    children: [
      { path: '', redirect: '/inicio' },
      { path: 'inicio', component: () => import('../views/Inicio.vue'), meta: { titulo: 'Inicio' } },
      {
        path: 'recepciones',
        component: () => import('../views/recepciones/RecepcionesLista.vue'),
        meta: { requiereRuta: '/recepciones', titulo: 'Recepciones' },
      },
      {
        path: 'recepciones/:id',
        component: () => import('../views/recepciones/RecepcionDetalle.vue'),
        meta: { requiereRuta: '/recepciones', titulo: 'Recepción' },
      },
      { path: 'existencias', component: () => import('../views/Existencias.vue'), meta: { titulo: 'Existencias' } },
      {
        path: 'bajas',
        component: () => import('../views/Bajas.vue'),
        meta: { requiereRuta: '/bajas', titulo: 'Bajas' },
      },
      {
        path: 'riesgo',
        component: () => import('../views/Riesgo.vue'),
        meta: { requiereRuta: '/riesgo', titulo: 'Riesgo de vencimiento' },
      },
      {
        path: 'usuarios',
        component: () => import('../views/Usuarios.vue'),
        meta: { requiereRuta: '/usuarios', titulo: 'Usuarios y roles' },
      },
      {
        path: 'reporte',
        component: () => import('../views/Reporte.vue'),
        meta: { requiereRuta: '/reporte', titulo: 'Reporte mensual' },
      },
      {
        path: 'historicos',
        component: () => import('../views/Historicos.vue'),
        meta: { requiereRuta: '/historicos', titulo: 'Importar históricos' },
      },
      {
        path: 'kits',
        component: () => import('../views/Kits.vue'),
        meta: { requiereRuta: '/kits', titulo: 'Programas y kits' },
      },
      {
        path: 'catalogo',
        component: () => import('../views/Catalogo.vue'),
        meta: { requiereRuta: '/catalogo', titulo: 'Catálogo' },
      },
      {
        path: 'organizaciones',
        component: () => import('../views/Organizaciones.vue'),
        meta: { requiereRuta: '/organizaciones', titulo: 'Organizaciones' },
      },
      {
        path: 'remisiones',
        component: () => import('../views/remisiones/RemisionesLista.vue'),
        meta: { requiereRuta: '/remisiones', titulo: 'Remisiones' },
      },
      {
        path: 'remisiones/nueva',
        component: () => import('../views/remisiones/RemisionNueva.vue'),
        meta: { requiereRuta: '/remisiones', titulo: 'Nueva remisión' },
      },
      { path: ':pathMatch(.*)*', redirect: '/inicio' },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/ingresar' },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // Cada pantalla arranca arriba (al tope), nunca con el scroll heredado de la anterior.
  scrollBehavior() {
    return { top: 0 };
  },
});

/** authGuard: exige que haya un rol de demostración elegido (ssd.rol en localStorage)
 *  antes de entrar a cualquier pantalla protegida. */
function hayRolGuardado(): boolean {
  try {
    return !!localStorage.getItem('ssd.rol');
  } catch {
    return false;
  }
}

router.beforeEach((to) => {
  if (to.path !== '/ingresar' && !hayRolGuardado()) {
    return '/ingresar';
  }

  // roleGuard: la ruta debe estar en el menú del rol activo (CLAUDE.md, sección Roles).
  // Ocultar el enlace no basta, entrar por URL directa debe quedar igual de bloqueado
  // (heurística de prevención de errores).
  const requiereRuta = to.meta.requiereRuta as string | undefined;
  if (requiereRuta) {
    const sesion = useSesionStore();
    const permitido = sesion.itemsMenu.some((item) => item.ruta === requiereRuta);
    if (!permitido) return '/inicio';
  }

  return true;
});

/** Título de la pestaña por ruta (TR-01): antes era el mismo en todas, lo que confunde a
 *  lectores de pantalla y al historial del navegador. El foco se mueve al contenido en el
 *  propio AppShell al cambiar de ruta. */
const NOMBRE_APP = 'SSD Bancos de Alimentos';
router.afterEach((to) => {
  const titulo = to.meta.titulo as string | undefined;
  document.title = titulo ? `${titulo} · ${NOMBRE_APP}` : NOMBRE_APP;
});

export default router;
