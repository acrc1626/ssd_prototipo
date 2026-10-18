import { computed } from 'vue';

import { useDatosStore } from '../stores/datos';

export interface FilaCategoria {
  idCategoria: string;
  nombre: string;
  aplicaVencimiento: boolean;
  vidaUtilDias: number | null;
  productos: number;
}

export interface FilaProducto {
  idProducto: string;
  nombre: string;
  categoria: string;
  presentaciones: number;
}

export interface FilaPresentacion {
  idPresentacion: string;
  nombre: string;
  producto: string;
  contenido: number;
  unidad: 'G' | 'ML';
  unidadConteo: string;
}

export interface FilaEquivalenciaCatalogo {
  nombreOrigen: string;
  producto: string;
}

/** Catálogo: productos, presentaciones, categorías y equivalencias (CLAUDE.md, tabla de
 *  pantallas). Sin código de presentación, "Entregable" ni EAN — retirados en
 *  decisiones.md. La asignación de equivalencias pendientes vive en Históricos (ya
 *  construida ahí); aquí solo se listan las ya resueltas, de solo consulta. */
export function useCatalogoAplicacion() {
  const datos = useDatosStore();

  const categorias = computed<FilaCategoria[]>(() =>
    [...datos.categorias]
      .sort((a, b) => a.Nombre.localeCompare(b.Nombre, 'es'))
      .map((c) => ({
        idCategoria: c.IdCategoria,
        nombre: c.Nombre,
        aplicaVencimiento: c.AplicaVencimiento,
        vidaUtilDias: c.VidaUtilDias,
        productos: datos.productos.filter((p) => p.IdCategoria === c.IdCategoria).length,
      })),
  );

  const productos = computed<FilaProducto[]>(() =>
    [...datos.productos]
      .sort((a, b) => a.Nombre.localeCompare(b.Nombre, 'es'))
      .map((p) => ({
        idProducto: p.IdProducto,
        nombre: p.Nombre,
        categoria: datos.categorias.find((c) => c.IdCategoria === p.IdCategoria)?.Nombre ?? '',
        presentaciones: datos.presentaciones.filter((pr) => pr.IdProducto === p.IdProducto).length,
      })),
  );

  const presentaciones = computed<FilaPresentacion[]>(() =>
    [...datos.presentaciones]
      .sort((a, b) => a.Nombre_PENDIENTE.localeCompare(b.Nombre_PENDIENTE, 'es'))
      .map((p) => ({
        idPresentacion: p.IdPresentacion,
        nombre: p.Nombre_PENDIENTE,
        producto: datos.productos.find((prod) => prod.IdProducto === p.IdProducto)?.Nombre ?? '',
        contenido: p.Contenido,
        unidad: p.Unidad,
        unidadConteo: p.UnidadConteo_PROTOTIPO,
      })),
  );

  const equivalencias = computed<FilaEquivalenciaCatalogo[]>(() =>
    [...datos.equivalenciasNombre].reverse().map((e) => ({
      nombreOrigen: e.NombreOrigen,
      producto: datos.productos.find((p) => p.IdProducto === e.IdProducto)?.Nombre ?? '',
    })),
  );

  const nombresSinAsignar = computed(() => datos.prototipo.equivalenciasSinAsignar.length);

  function crearCategoria(nombre: string, aplicaVencimiento: boolean, vidaUtilDias: number | null): void {
    datos.crearCategoria(nombre, aplicaVencimiento, vidaUtilDias);
  }

  function crearProducto(nombre: string, idCategoria: string): void {
    datos.crearProducto(nombre, idCategoria);
  }

  function crearPresentacion(idProducto: string, nombre: string, contenido: number, unidad: 'G' | 'ML', unidadConteo: string): void {
    datos.crearPresentacion(idProducto, nombre, contenido, unidad, unidadConteo);
  }

  return {
    categorias,
    productos,
    presentaciones,
    equivalencias,
    nombresSinAsignar,
    crearCategoria,
    crearProducto,
    crearPresentacion,
  };
}
