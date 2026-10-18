import { computed } from 'vue';

import { useDatosStore } from '../stores/datos';

export interface FilaImportacion {
  idImportacion: string;
  fecha: string;
  archivo: string;
  usuario: string;
  filasTotales: number;
  filasImportadas: number;
  filasConError: number;
}

export interface FilaEquivalencia {
  nombreOrigen: string;
  producto: string;
}

/** Importar históricos: "sin CSV real" (decisiones.md) — no hay un botón de subir
 *  archivo que no haga nada. Lo funcional de verdad es resolver los nombres que
 *  vinieron de la importación sin equivalencia a un producto del catálogo; el resto
 *  (lista de importaciones pasadas) es de solo consulta, con los datos que ya trae
 *  el modelo (Importacion). */
export function useHistoricosAplicacion() {
  const datos = useDatosStore();

  const importaciones = computed<FilaImportacion[]>(() =>
    [...datos.importaciones]
      .sort((a, b) => b.Fecha.localeCompare(a.Fecha))
      .map((imp) => ({
        idImportacion: imp.IdImportacion,
        fecha: imp.Fecha,
        archivo: imp.ArchivoUrl.split('/').pop() ?? imp.ArchivoUrl,
        usuario: datos.usuarios.find((u) => u.IdUsuario === imp.IdUsuario)?.Nombre ?? imp.IdUsuario,
        filasTotales: imp.FilasTotales,
        filasImportadas: imp.FilasImportadas,
        filasConError: imp.FilasTotales - imp.FilasImportadas,
      })),
  );

  const totalFilasImportadas = computed(() => importaciones.value.reduce((t, i) => t + i.filasImportadas, 0));

  const productos = computed(() => [...datos.productos].sort((a, b) => a.Nombre.localeCompare(b.Nombre, 'es')));

  const nombresSinAsignar = computed(() => datos.prototipo.equivalenciasSinAsignar);

  const equivalenciasResueltas = computed<FilaEquivalencia[]>(() =>
    [...datos.equivalenciasNombre].reverse().map((e) => ({
      nombreOrigen: e.NombreOrigen,
      producto: datos.productos.find((p) => p.IdProducto === e.IdProducto)?.Nombre ?? '',
    })),
  );

  function asignar(nombreOrigen: string, idProducto: string): void {
    datos.asignarEquivalencia(nombreOrigen, idProducto);
  }

  return {
    importaciones,
    totalFilasImportadas,
    productos,
    nombresSinAsignar,
    equivalenciasResueltas,
    asignar,
  };
}
