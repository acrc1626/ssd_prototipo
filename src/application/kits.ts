import { computed } from 'vue';

import { useDatosStore } from '../stores/datos';

export interface FilaComponente {
  idProducto: string;
  producto: string;
  kgPorKit: number;
}

export interface FilaPrograma {
  idPrograma: string;
  nombre: string;
  activo: boolean;
  componentes: FilaComponente[];
  kgTotalPorKit: number;
}

/** Programas y composición de kits. "Alcanza para N kits" quedó retirado
 *  (decisiones.md: "'alcanza para N kits' en Kits" en la lista de lo que no va) — esta
 *  pantalla no cruza con existencias, solo arma y edita la receta de cada kit. */
export function useKitsAplicacion() {
  const datos = useDatosStore();

  const programas = computed<FilaPrograma[]>(() =>
    [...datos.programas]
      .sort((a, b) => a.Nombre.localeCompare(b.Nombre, 'es'))
      .map((p) => {
        const componentes: FilaComponente[] = datos.componentesKit
          .filter((c) => c.IdPrograma === p.IdPrograma)
          .map((c) => ({
            idProducto: c.IdProducto,
            producto: datos.productos.find((prod) => prod.IdProducto === c.IdProducto)?.Nombre ?? '',
            kgPorKit: c.KgPorKit,
          }))
          .sort((a, b) => a.producto.localeCompare(b.producto, 'es'));

        return {
          idPrograma: p.IdPrograma,
          nombre: p.Nombre,
          activo: p.Activo,
          componentes,
          kgTotalPorKit: componentes.reduce((t, c) => t + c.kgPorKit, 0),
        };
      }),
  );

  const activos = computed(() => programas.value.filter((p) => p.activo).length);
  const productosDistintos = computed(() => new Set(datos.componentesKit.map((c) => c.IdProducto)).size);

  const productos = computed(() => [...datos.productos].sort((a, b) => a.Nombre.localeCompare(b.Nombre, 'es')));

  function crearPrograma(nombre: string): void {
    datos.crearPrograma(nombre);
  }

  function cambiarActivo(idPrograma: string, activo: boolean): void {
    datos.cambiarActivoPrograma(idPrograma, activo);
  }

  function agregarComponente(idPrograma: string, idProducto: string, kgPorKit: number): void {
    datos.agregarComponenteKit(idPrograma, idProducto, kgPorKit);
  }

  function quitarComponente(idPrograma: string, idProducto: string): void {
    datos.quitarComponenteKit(idPrograma, idProducto);
  }

  return {
    programas,
    activos,
    productosDistintos,
    productos,
    crearPrograma,
    cambiarActivo,
    agregarComponente,
    quitarComponente,
  };
}
