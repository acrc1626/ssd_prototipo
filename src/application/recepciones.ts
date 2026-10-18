import { computed } from 'vue';

import type { EstadoRecepcion, OrigenRecepcion } from '../domain/modelos';
import { useDatosStore } from '../stores/datos';

export interface FilaRecepcion {
  idRecepcion: string;
  numero: string;
  fecha: string;
  donante: string;
  origen: OrigenRecepcion;
  numeroSoporte: string;
  renglones: number;
  kgRecibidos: number;
  registro: string;
  estado: EstadoRecepcion;
}

/** Arma las filas de la lista de Recepciones uniendo Recepcion con Donante, Usuario
 *  y los lotes/movimientos que generó (CLAUDE.md: domain/calculos no conoce la UI,
 *  esta capa sí la orquesta para la pantalla). */
export function useRecepcionesAplicacion() {
  const datos = useDatosStore();

  const filas = computed<FilaRecepcion[]>(() => {
    const donantes = datos.donantes;
    const usuarios = datos.usuarios;
    const lotes = datos.lotes;
    const movimientos = datos.movimientos;

    return [...datos.recepciones]
      .sort((a, b) => b.Fecha.localeCompare(a.Fecha) || b.Numero_PENDIENTE.localeCompare(a.Numero_PENDIENTE))
      .map((r) => {
        let renglonesCount: number;
        let kgRecibidos: number;

        if (r.Estado_PENDIENTE === 'BORRADOR' && datos.tieneBorradorGuardado(r.IdRecepcion)) {
          const overlay = datos.renglonesBorrador(r.IdRecepcion);
          renglonesCount = overlay.length;
          kgRecibidos = overlay.reduce((t, x) => t + x.kgRecibido, 0);
        } else {
          // Un renglón real es un lote con su movimiento ENTRADA (igual definición que
          // obtenerRecepcionDetalle): un lote sin ENTRADA no cuenta, si no la lista y el
          // detalle quedan con números distintos para la misma recepción.
          const lotesRecepcion = lotes.filter(
            (l) => l.IdRecepcion === r.IdRecepcion && movimientos.some((m) => m.IdLote === l.IdLote && m.Tipo === 'ENTRADA'),
          );
          renglonesCount = lotesRecepcion.length;
          kgRecibidos = lotesRecepcion.reduce(
            (total, lote) =>
              total +
              movimientos
                .filter((m) => m.IdLote === lote.IdLote && m.Tipo === 'ENTRADA')
                .reduce((t, m) => t + m.Kg, 0),
            0,
          );
        }

        return {
          idRecepcion: r.IdRecepcion,
          numero: r.Numero_PENDIENTE,
          fecha: r.Fecha,
          donante: donantes.find((d) => d.IdDonante === r.IdDonante)?.Nombre ?? r.IdDonante,
          origen: r.Origen,
          numeroSoporte: r.NumeroSoporte,
          renglones: renglonesCount,
          kgRecibidos,
          registro: usuarios.find((u) => u.IdUsuario === r.IdUsuario)?.Nombre ?? r.IdUsuario,
          estado: r.Estado_PENDIENTE,
        };
      });
  });

  const registradores = computed(() => {
    const presentes = new Set(filas.value.map((f) => f.registro));
    return [...presentes].sort((a, b) => a.localeCompare(b, 'es'));
  });

  return { filas, registradores };
}
