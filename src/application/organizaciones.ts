import { computed } from 'vue';

import type { EstadoOrganizacion, EtapaOrganizacion } from '../domain/modelos';
import { useDatosStore } from '../stores/datos';

/** Orden del flujo (decisiones.md: "etapas Radicación, Verificación, Contacto, Visita,
 *  Vinculada") — se usa tanto para el stepper visual como para habilitar "avanzar". */
export const ORDEN_ETAPAS: EtapaOrganizacion[] = ['RADICACION', 'VERIFICACION', 'CONTACTO', 'VISITA', 'VINCULADA'];
export const ETIQUETA_ETAPA: Record<EtapaOrganizacion, string> = {
  RADICACION: 'Radicación',
  VERIFICACION: 'Verificación',
  CONTACTO: 'Contacto',
  VISITA: 'Visita',
  VINCULADA: 'Vinculada',
};
export const ETIQUETA_ESTADO: Record<EstadoOrganizacion, string> = {
  PERMANENTE: 'Permanente',
  ESPORADICA: 'Esporádica',
};
/** Catálogo fijo de grupos poblacionales: mismos nombres que ya usa el reporte mensual
 *  (_prototipo.reporteMensualCifras[].progs), para no inventar una taxonomía aparte. */
export const GRUPOS_POBLACION = ['Niños y niñas', 'Adultos mayores', 'Familias desplazadas', 'Madres cabeza de hogar', 'Personas en situación de calle'];

export interface FilaPoblacion {
  grupo: string;
  cantidad: number;
}

export interface FilaOrganizacion {
  idOrganizacion: string;
  nombre: string;
  nit: string;
  municipio: string;
  estado: EstadoOrganizacion;
  etapa: EtapaOrganizacion;
  representanteNombre: string | null;
  representanteDocumento: string | null;
  representanteTelefono: string | null;
  autorizada: boolean;
  fechaAutorizacion: string | null;
  medioAutorizacion: string | null;
  finalidadesAutorizacion: string | null;
  poblacion: FilaPoblacion[];
  totalPoblacion: number;
}

/** Organizaciones, autorización de datos y población (CLAUDE.md, tabla de pantallas).
 *  "Vigente" para elegir en Remisiones (A-03, decisiones.md) = VINCULADA + con
 *  AutorizacionDatos registrada; no hay fecha de vencimiento en el modelo. */
export function useOrganizacionesAplicacion() {
  const datos = useDatosStore();

  const filas = computed<FilaOrganizacion[]>(() =>
    [...datos.organizaciones]
      .sort((a, b) => a.Nombre.localeCompare(b.Nombre, 'es'))
      .map((o) => {
        const representante = datos.representantes.find((r) => r.IdOrganizacion === o.IdOrganizacion);
        const autorizacion = representante
          ? datos.autorizacionesDatos.find((a) => a.IdRepresentante === representante.IdRepresentante)
          : undefined;
        const poblacion = datos.poblacionAtendida
          .filter((p) => p.IdOrganizacion === o.IdOrganizacion)
          .map((p) => ({ grupo: p.Grupo, cantidad: p.Cantidad }));

        return {
          idOrganizacion: o.IdOrganizacion,
          nombre: o.Nombre,
          nit: o.NIT,
          municipio: o.Municipio,
          estado: o.Estado,
          etapa: o.Etapa,
          representanteNombre: representante?.Nombre ?? null,
          representanteDocumento: representante?.Documento ?? null,
          representanteTelefono: representante?.Telefono ?? null,
          autorizada: !!autorizacion,
          fechaAutorizacion: autorizacion?.Fecha ?? null,
          medioAutorizacion: autorizacion?.Medio ?? null,
          finalidadesAutorizacion: autorizacion?.Finalidades ?? null,
          poblacion,
          totalPoblacion: poblacion.reduce((t, p) => t + p.cantidad, 0),
        };
      }),
  );

  const vinculadas = computed(() => filas.value.filter((f) => f.etapa === 'VINCULADA').length);
  const elegiblesRemision = computed(() => filas.value.filter((f) => f.etapa === 'VINCULADA' && f.autorizada).length);
  const enProceso = computed(() => filas.value.filter((f) => f.etapa !== 'VINCULADA').length);

  /** Auditoría OR-03: compara solo dígitos, así "900.111.222-3" y "9001112223"
   *  cuentan como el mismo NIT aunque estén escritos distinto. */
  function nitDuplicado(nit: string): boolean {
    const normalizado = nit.replace(/\D/g, '');
    return datos.organizaciones.some((o) => o.NIT.replace(/\D/g, '') === normalizado);
  }

  function crearOrganizacion(nombre: string, nit: string, municipio: string, estado: EstadoOrganizacion): string {
    return datos.crearOrganizacion(nombre, nit, municipio, estado);
  }

  function cambiarEtapa(idOrganizacion: string, etapa: EtapaOrganizacion): void {
    datos.cambiarEtapaOrganizacion(idOrganizacion, etapa);
  }

  function guardarRepresentante(idOrganizacion: string, nombre: string, documento: string, telefono: string): void {
    datos.guardarRepresentante(idOrganizacion, nombre, documento, telefono);
  }

  function registrarAutorizacion(idOrganizacion: string, fecha: string, medio: string, finalidades: string): void {
    const idRepresentante = datos.representantes.find((r) => r.IdOrganizacion === idOrganizacion)?.IdRepresentante;
    if (!idRepresentante) return;
    datos.registrarAutorizacion(idRepresentante, fecha, medio, finalidades);
  }

  function agregarPoblacion(idOrganizacion: string, grupo: string, cantidad: number): void {
    datos.agregarPoblacion(idOrganizacion, grupo, cantidad);
  }

  function quitarPoblacion(idOrganizacion: string, grupo: string): void {
    datos.quitarPoblacion(idOrganizacion, grupo);
  }

  return {
    filas,
    vinculadas,
    elegiblesRemision,
    enProceso,
    crearOrganizacion,
    nitDuplicado,
    cambiarEtapa,
    guardarRepresentante,
    registrarAutorizacion,
    agregarPoblacion,
    quitarPoblacion,
  };
}
