import { computed } from 'vue';

import { existenciaLote, kgLote, productoDeLote } from '../domain/calculos';
import { formatearNumero } from '../domain/formato';
import type { NivelRiesgo } from '../domain/modelos';
import { useDatosStore } from '../stores/datos';
import { useSesionStore } from '../stores/sesion';
import { useExistenciasAplicacion } from './existencias';

export interface PendienteInicio {
  id: string;
  icono: string;
  titulo: string;
  descripcion: string;
  accion?: { etiqueta: string; ruta: string };
}

export interface AccionVencimiento {
  etiqueta: string;
  ruta: string;
  icono: string;
}

export interface AlertaVencimiento {
  idLote: string;
  codigo: string;
  producto: string;
  kg: number;
  diasParaVencer: number;
  nivel: NivelRiesgo;
}

/** Orquesta los datos de Inicio: indicadores, pendientes por rol y alertas de
 *  vencimiento (CLAUDE.md). No tiene reglas de negocio propias, solo arma el
 *  view-model a partir de domain/calculos.ts y los stores. */
export function useInicioAplicacion() {
  const datos = useDatosStore();
  const sesion = useSesionStore();
  const existencias = useExistenciasAplicacion();

  /** Solo bodega tiene Recepciones en su menú: la tarjeta de "Recepciones en borrador"
   *  no debería verse para quien no puede abrir esa pantalla (informe de accesibilidad,
   *  heurística H8 — "cada quien ve solo lo que su rol necesita"). */
  const mostrarRecepcionesBorrador = computed(() => sesion.rol === 'bodega');
  const vencimientoEstimadoCount = existencias.vencimientoEstimadoCount;

  const kgEnBodega = computed(() =>
    datos.lotes
      .map((l) => kgLote(l.IdLote, datos.movimientos))
      .filter((kg) => kg > 0)
      .reduce((total, kg) => total + kg, 0),
  );

  const lotesVigentes = computed(
    () => datos.lotes.filter((l) => existenciaLote(l.IdLote, datos.movimientos) > 0).length,
  );

  const kgRiesgoAlto = computed(() =>
    datos.riesgoLotes.filter((r) => r.Nivel === 'ALTO').reduce((total, r) => total + r.KgEnRiesgo, 0),
  );

  const recepcionesBorrador = computed(
    () => datos.recepciones.filter((r) => r.Estado_PENDIENTE === 'BORRADOR').length,
  );

  const reporteDelMes = computed(() => Object.values(datos.prototipo.reporteMensualCifras)[0]);

  const conteoPorNivel = computed(() => {
    const riesgo = datos.riesgoLotes;
    return {
      alto: riesgo.filter((r) => r.Nivel === 'ALTO').length,
      medio: riesgo.filter((r) => r.Nivel === 'MEDIO').length,
      bajo: riesgo.filter((r) => r.Nivel === 'BAJO').length,
    };
  });

  const alertas = computed<AlertaVencimiento[]>(() => {
    const lotes = datos.lotes;
    const presentaciones = datos.presentaciones;
    const productos = datos.productos;
    return [...datos.riesgoLotes]
      .sort((a, b) => a.DiasParaVencer - b.DiasParaVencer)
      .slice(0, 3)
      .map((r) => {
        const lote = lotes.find((l) => l.IdLote === r.IdLote);
        const producto = lote ? productoDeLote(lote, presentaciones, productos) : undefined;
        return {
          idLote: r.IdLote,
          codigo: lote?.Codigo_PROTOTIPO ?? r.IdLote,
          producto: producto?.Nombre ?? '',
          kg: r.KgEnRiesgo,
          diasParaVencer: r.DiasParaVencer,
          nivel: r.Nivel,
        };
      });
  });

  /** Organizaciones que todavía no están vinculadas: no pueden recibir remisiones hasta
   *  completar el proceso (Radicación → … → Vinculada). Es una tarea accionable. */
  const organizacionesEnProceso = computed(
    () => datos.organizaciones.filter((o) => o.Etapa !== 'VINCULADA').length,
  );

  /** Pendientes = tareas accionables de verdad, no información de solo lectura. El riesgo
   *  de vencimiento ya no va aquí (no era accionable ni escalaba: con muchos lotes se
   *  volvía un listado inmanejable); pasó al panel "Por vencer" con su propia acción por
   *  rol (ver accionVencimiento). Cada pendiente se filtra por lo que el rol puede hacer. */
  const pendientes = computed<PendienteInicio[]>(() => {
    const rutasDisponibles = new Set(sesion.itemsMenu.map((i) => i.ruta));
    const resultado: PendienteInicio[] = [];

    if (sesion.rol === 'bodega' && recepcionesBorrador.value > 0) {
      resultado.push({
        id: 'borradores',
        icono: 'recepciones',
        titulo: `${recepcionesBorrador.value} ${recepcionesBorrador.value === 1 ? 'recepción' : 'recepciones'} por confirmar`,
        descripcion: 'En borrador: todavía no crean lotes en existencias',
        accion: rutasDisponibles.has('/recepciones') ? { etiqueta: 'Revisar', ruta: '/recepciones' } : undefined,
      });
    }

    if (organizacionesEnProceso.value > 0 && rutasDisponibles.has('/organizaciones')) {
      resultado.push({
        id: 'organizaciones',
        icono: 'organizaciones',
        titulo: `${organizacionesEnProceso.value} ${organizacionesEnProceso.value === 1 ? 'organización' : 'organizaciones'} por vincular`,
        descripcion: 'En proceso: no pueden recibir remisiones hasta vincularse',
        accion: { etiqueta: 'Gestionar', ruta: '/organizaciones' },
      });
    }

    const equivalencias = datos.prototipo.equivalenciasSinAsignar;
    if (equivalencias.length > 0 && rutasDisponibles.has('/historicos')) {
      resultado.push({
        id: 'equivalencias',
        icono: 'catalogo',
        titulo: `${equivalencias.length} ${equivalencias.length === 1 ? 'nombre' : 'nombres'} sin equivalencia`,
        descripcion: 'De los históricos; asígnales un producto del catálogo',
        accion: { etiqueta: 'Asignar', ruta: '/historicos' },
      });
    }

    return resultado;
  });

  /** Acción del panel "Por vencer", según lo que el rol puede hacer con un lote que está
   *  por vencer: bodega lo da de baja; la asistente lo distribuye en una remisión antes
   *  de perderlo; la coordinadora revisa el detalle de riesgo. */
  const accionVencimiento = computed<AccionVencimiento | undefined>(() => {
    const rutas = new Set(sesion.itemsMenu.map((i) => i.ruta));
    if (rutas.has('/bajas')) return { etiqueta: 'Registrar baja', ruta: '/bajas', icono: 'bajas' };
    if (rutas.has('/remisiones')) return { etiqueta: 'Emitir remisión', ruta: '/remisiones/nueva', icono: 'remisiones' };
    if (rutas.has('/riesgo')) return { etiqueta: 'Ver riesgo', ruta: '/riesgo', icono: 'riesgo' };
    return undefined;
  });

  return {
    kgEnBodega,
    lotesVigentes,
    kgRiesgoAlto,
    recepcionesBorrador,
    reporteDelMes,
    conteoPorNivel,
    alertas,
    pendientes,
    accionVencimiento,
    mostrarRecepcionesBorrador,
    vencimientoEstimadoCount,
  };
}
