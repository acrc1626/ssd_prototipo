import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import AppShell from '../components/shell/AppShell.vue';
import { useSesionStore } from '../stores/sesion';

const routes: RouteRecordRaw[] = [
  {
    path: '/ingresar',
    component: () => import('../views/Ingresar.vue'),
  },
  {
    path: '/',
    component: AppShell,
    children: [
      { path: '', redirect: '/inicio' },
      { path: 'inicio', component: () => import('../views/Inicio.vue') },
      {
        path: 'recepciones',
        component: () => import('../views/recepciones/RecepcionesLista.vue'),
        meta: { requiereRuta: '/recepciones' },
      },
      {
        path: 'recepciones/:id',
        component: () => import('../views/recepciones/RecepcionDetalle.vue'),
        meta: { requiereRuta: '/recepciones' },
      },
      { path: 'existencias', component: () => import('../views/Existencias.vue') },
      {
        path: 'bajas',
        component: () => import('../views/Bajas.vue'),
        meta: { requiereRuta: '/bajas' },
      },
      {
        path: 'riesgo',
        component: () => import('../views/Riesgo.vue'),
        meta: { requiereRuta: '/riesgo' },
      },
      {
        path: 'usuarios',
        component: () => import('../views/Usuarios.vue'),
        meta: { requiereRuta: '/usuarios' },
      },
      {
        path: 'reporte',
        component: () => import('../views/Reporte.vue'),
        meta: { requiereRuta: '/reporte' },
      },
      {
        path: 'historicos',
        component: () => import('../views/Historicos.vue'),
        meta: { requiereRuta: '/historicos' },
      },
      {
        path: 'kits',
        component: () => import('../views/Kits.vue'),
        meta: { requiereRuta: '/kits' },
      },
      {
        path: 'catalogo',
        component: () => import('../views/Catalogo.vue'),
        meta: { requiereRuta: '/catalogo' },
      },
      {
        path: 'organizaciones',
        component: () => import('../views/Organizaciones.vue'),
        meta: { requiereRuta: '/organizaciones' },
      },
      {
        path: 'remisiones',
        component: () => import('../views/remisiones/RemisionesLista.vue'),
        meta: { requiereRuta: '/remisiones' },
      },
      {
        path: 'remisiones/nueva',
        component: () => import('../views/remisiones/RemisionNueva.vue'),
        meta: { requiereRuta: '/remisiones' },
      },
      { path: ':pathMatch(.*)*', redirect: '/inicio' },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/ingresar' },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
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

export default router;
