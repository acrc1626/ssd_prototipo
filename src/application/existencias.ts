import { computed } from 'vue';

import { existenciaLote, kgLote } from '../domain/calculos';
import type { NivelRiesgo, TipoMovimiento } from '../domain/modelos';
import { useDatosStore } from '../stores/datos';

export interface FilaExistencia {
  idLote: string;
  codigo: string;
  producto: string;
  categoriaId: string;
  categoriaNombre: string;
  presentacion: string;
  unidadConteo: string;
  numeroRecepcion: string | null;
  donante: string | null;
  fechaVencimiento: string | null;
  vencimientoEstimado: boolean;
  existencia: number;
  kg: number;
  nivelRiesgo: NivelRiesgo | null;
  diasParaVencer: number | null;
}

export interface MovimientoVista {
  tipo: TipoMovimiento;
  fecha: string;
  cantidad: number;
  kg: number;
  usuario: string;
}

/** Arma las filas de Existencias: solo lotes vigentes (existencia > 0), con su
 *  producto, presentación, recepción de origen y riesgo (CLAUDE.md: domain/calculos
 *  no conoce la UI, esta capa une las entidades para la pantalla). */
export function useExistenciasAplicacion() {
  const datos = useDatosStore();

  const filas = computed<FilaExistencia[]>(() => {
    const movimientos = datos.movimientos;
    const presentaciones = datos.presentaciones;
    const productos = datos.productos;
    const recepciones = datos.recepciones;
    const donantes = datos.donantes;
    const riesgos = datos.riesgoLotes;

    return datos.lotes
      .map((lote) => {
        const existencia = existenciaLote(lote.IdLote, movimientos);
        if (existencia <= 0) return null;

        const presentacion = presentaciones.find((p) => p.IdPresentacion === lote.IdPresentacion);
        const producto = presentacion ? productos.find((p) => p.IdProducto === presentacion.IdProducto) : undefined;
        const categoriaNombre = producto
          ? (datos.categorias.find((c) => c.IdCategoria === producto.IdCategoria)?.Nombre ?? '')
          : '';
        const recepcion = lote.IdRecepcion ? recepciones.find((r) => r.IdRecepcion === lote.IdRecepcion) : undefined;
        const donante = recepcion ? donantes.find((d) => d.IdDonante === recepcion.IdDonante) : undefined;
        const riesgo = riesgos.find((r) => r.IdLote === lote.IdLote);

        const fila: FilaExistencia = {
          idLote: lote.IdLote,
          codigo: lote.Codigo_PROTOTIPO,
          producto: producto?.Nombre ?? '',
          categoriaId: producto?.IdCategoria ?? '',
          categoriaNombre,
          presentacion: presentacion?.Nombre_PENDIENTE ?? '',
          unidadConteo: presentacion?.UnidadConteo_PROTOTIPO ?? 'unidades',
          numeroRecepcion: recepcion?.Numero_PENDIENTE ?? null,
          donante: donante?.Nombre ?? null,
          fechaVencimiento: lote.FechaVencimiento,
          vencimientoEstimado: lote.VencimientoEstimado,
          existencia,
          kg: kgLote(lote.IdLote, movimientos),
          nivelRiesgo: riesgo?.Nivel ?? null,
          diasParaVencer: riesgo?.DiasParaVencer ?? null,
        };
        return fila;
      })
      .filter((f): f is FilaExistencia => f !== null);
  });

  const vencimientoEstimadoCount = computed(() => filas.value.filter((f) => f.vencimientoEstimado).length);

  function trazabilidad(idLote: string): MovimientoVista[] {
    const usuarios = datos.usuarios;
    return datos.movimientos
      .filter((m) => m.IdLote === idLote)
      .sort((a, b) => a.Fecha.localeCompare(b.Fecha))
      .map((m) => ({
        tipo: m.Tipo,
        fecha: m.Fecha,
        cantidad: m.Cantidad,
        kg: m.Kg,
        usuario: usuarios.find((u) => u.IdUsuario === m.IdUsuario)?.Nombre ?? m.IdUsuario,
      }));
  }

  return { filas, vencimientoEstimadoCount, trazabilidad };
}
