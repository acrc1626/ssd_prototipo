/** Un solo set de íconos de trazo (24×24, stroke-width 2) para toda la app: evita
 *  mezclar estilos de ícono, que es una de las cosas que más delata una pantalla
 *  armada a las carreras. Se agregan entradas a medida que una pantalla las necesita.
 *  El marcado es estático y propio (no viene de datos de usuario), así que Icono.vue
 *  lo inserta con v-html sin riesgo. */
export const ICONOS: Record<string, string> = {
  inicio: `
    <path d="M4 10.5 12 4l8 6.5" />
    <path d="M6 9.5V20h12V9.5" />
    <path d="M10 20v-6h4v6" />
  `,
  /* Recepciones = recibir/entrada: bandeja de entrada (inbox). Antes era una caja con "+"
     que parecía botiquín médico. */
  recepciones: `
    <path d="M4 13h4l1.5 2.5h5L16 13h4" />
    <path d="M5 5h14l2 8v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4z" />
  `,
  existencias: `
    <path d="M12 4 21 9l-9 5-9-5Z" />
    <path d="M3 14l9 5 9-5" />
  `,
  /* "Bajas" = sacar/reducir inventario (vencido/dañado/compostaje), NO borrar del sistema:
     caja con signo menos. La papelera quedó como `quitar`. */
  bajas: `
    <rect x="4" y="7" width="16" height="13" rx="2" />
    <path d="M4 7l8-4 8 4" />
    <line x1="9" y1="13.5" x2="15" y2="13.5" />
  `,
  /* Papelera: solo para quitar un elemento de una lista en edición (renglón, componente
     de kit, grupo de población), donde sí se está removiendo esa fila. */
  quitar: `
    <path d="M4 7h16" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  `,
  remisiones: `
    <rect x="1" y="7" width="13" height="9" rx="1" />
    <path d="M14 10h4l3 3v3h-7z" />
    <circle cx="6" cy="19" r="1.6" />
    <circle cx="17.5" cy="19" r="1.6" />
  `,
  organizaciones: `
    <rect x="4" y="3" width="10" height="18" />
    <line x1="7.5" y1="7" x2="10.5" y2="7" />
    <line x1="7.5" y1="11" x2="10.5" y2="11" />
    <line x1="7.5" y1="15" x2="10.5" y2="15" />
    <path d="M14 9h6v12h-6" />
  `,
  kits: `
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <rect x="13" y="3" width="8" height="8" rx="1" />
    <rect x="3" y="13" width="8" height="8" rx="1" />
    <rect x="13" y="13" width="8" height="8" rx="1" />
  `,
  riesgo: `
    <path d="M10.6 3.9a1.6 1.6 0 0 1 2.8 0l8.6 14.9a1.6 1.6 0 0 1-1.4 2.4H3.4a1.6 1.6 0 0 1-1.4-2.4Z" />
    <line x1="12" y1="9.5" x2="12" y2="13.5" />
    <circle cx="12" cy="16.7" r="0.8" fill="currentColor" stroke="none" />
  `,
  reporte: `
    <line x1="5" y1="20" x2="5" y2="12" />
    <line x1="12" y1="20" x2="12" y2="6" />
    <line x1="19" y1="20" x2="19" y2="15" />
    <line x1="3" y1="20" x2="21" y2="20" />
  `,
  catalogo: `
    <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2Z" />
    <path d="M5 18a2 2 0 0 1 2-2h11" />
  `,
  historicos: `
    <path d="M3 11a9 9 0 1 1 2.6 6.3" />
    <polyline points="3 16 3 11 8 11" />
    <polyline points="12 7 12 12 15.5 14" />
  `,
  usuarios: `
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17" cy="9" r="2.3" />
    <path d="M15.3 14.3c2.4.5 4.2 2.6 4.2 5.7" />
  `,
  salir: `
    <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
    <polyline points="15 16 20 11 15 6" />
    <line x1="20" y1="11" x2="9" y2="11" />
  `,
  menu: `
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  `,
  'chevron-abajo': `<polyline points="6 9 12 15 18 9" />`,
  'chevron-derecha': `<polyline points="9 6 15 12 9 18" />`,
  'chevron-izquierda': `<polyline points="15 6 9 12 15 18" />`,
  buscar: `
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  `,
  mas: `
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  `,
  check: `<polyline points="5 13 10 18 19 7" />`,
  cerrar: `
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  `,
  adjuntar: `<path d="M8 13.5 15.2 6.3a3.1 3.1 0 1 1 4.4 4.4l-8.7 8.7a5.2 5.2 0 0 1-7.3-7.3L12.8 2.9" />`,
  deshacer: `
    <path d="M4 10h10a5 5 0 0 1 0 10h-3" />
    <polyline points="9 5 4 10 9 15" />
  `,
  filtro: `
    <line x1="4" y1="6" x2="20" y2="6" />
    <circle cx="9" cy="6" r="2" fill="var(--color-surface)" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <circle cx="15" cy="12" r="2" fill="var(--color-surface)" />
    <line x1="4" y1="18" x2="20" y2="18" />
    <circle cx="7" cy="18" r="2" fill="var(--color-surface)" />
  `,
  caja: `
    <path d="M3 8 12 3l9 5-9 5-9-5Z" />
    <path d="M3 8v9l9 5 9-5V8" />
    <path d="M12 13v9" />
  `,
  ojo: `
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  `,
  lapiz: `
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  `,
  archivo: `
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 3v5h5" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="13" y2="17" />
  `,
  advertencia: `
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="13" />
    <circle cx="12" cy="16.2" r="0.8" fill="currentColor" stroke="none" />
  `,
  info: `
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="11" x2="12" y2="16" />
    <circle cx="12" cy="7.8" r="0.8" fill="currentColor" stroke="none" />
  `,
  vacio: `
    <path d="M3 10 7 4h10l4 6" />
    <path d="M3 10v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8" />
    <path d="M3 10h5l1.5 3h5L16 10h5" />
  `,
};
