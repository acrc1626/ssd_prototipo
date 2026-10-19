import type { EstadoRecepcion, OrigenRecepcion } from '../domain/modelos';
import { useDatosStore } from '../stores/datos';
import { useSesionStore } from '../stores/sesion';

export interface RenglonRecepcion {
  /** IdLote si el renglón ya generó un lote real, o un id temporal si es nuevo en el prototipo. */
  id: string;
  idPresentacion: string;
  productoNombre: string;
  presentacionNombre: string;
  unidadConteo: string;
  cantidad: number;
  kgRecibido: number;
  kgDesechado: number;
  fechaVencimiento: string | null;
  vencimientoEstimado: boolean;
  codigoLote: string | null;
}

export interface DatosRecepcionDetalle {
  idRecepcion: string | null;
  numero: string | null;
  donanteId: string;
  fecha: string;
  origen: OrigenRecepcion;
  numeroSoporte: string;
  soporteUrl: string | null;
  estado: EstadoRecepcion;
  registradoPor: string;
  renglones: RenglonRecepcion[];
}

/** Lee una recepción para la pantalla de detalle. Un renglón es un Lote de esa
 *  recepción que tiene un movimiento ENTRADA: los lotes que vienen de un
 *  fraccionamiento posterior (FRACCIONAMIENTO_ENTRADA) no son renglones originales
 *  de la recepción, así que no se cuentan aquí. */
export function obtenerRecepcionDetalle(numero: string): DatosRecepcionDetalle | null {
  const datos = useDatosStore();
  const sesion = useSesionStore();

  if (numero === 'nueva') {
    // La fecha por defecto es el día real en que se registra, puesta automáticamente cada
    // vez que se entra (una recepción se ingresa el día que llega la donación), para que el
    // usuario no tenga que elegirla a mano.
    const hoy = new Date();
    const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    return {
      idRecepcion: null,
      numero: null,
      donanteId: '',
      fecha: fechaHoy,
      origen: 'DONACION',
      numeroSoporte: '',
      soporteUrl: null,
      estado: 'BORRADOR',
      registradoPor: sesion.usuario?.Nombre ?? '',
      renglones: [],
    };
  }

  const rec = datos.recepciones.find((r) => r.Numero_PENDIENTE === numero);
  if (!rec) return null;

  const presentaciones = datos.presentaciones;
  const productos = datos.productos;

  function datosPresentacion(idPresentacion: string) {
    const presentacion = presentaciones.find((p) => p.IdPresentacion === idPresentacion);
    const producto = presentacion ? productos.find((p) => p.IdProducto === presentacion.IdProducto) : undefined;
    return {
      productoNombre: producto?.Nombre ?? '',
      presentacionNombre: presentacion?.Nombre_PENDIENTE ?? '',
      unidadConteo: presentacion?.UnidadConteo_PROTOTIPO ?? 'unidades',
    };
  }

  let renglones: RenglonRecepcion[];

  if (rec.Estado_PENDIENTE === 'BORRADOR' && datos.tieneBorradorGuardado(rec.IdRecepcion)) {
    // Ya se guardó al menos una vez desde esta pantalla: el overlay manda, incluso si
    // quedó en 0 renglones (la persona los quitó todos a propósito).
    renglones = datos.renglonesBorrador(rec.IdRecepcion).map((r) => ({
      id: r.id,
      idPresentacion: r.idPresentacion,
      ...datosPresentacion(r.idPresentacion),
      cantidad: r.cantidad,
      kgRecibido: r.kgRecibido,
      kgDesechado: r.kgDesechado,
      fechaVencimiento: r.fechaVencimiento,
      vencimientoEstimado: r.vencimientoEstimado,
      codigoLote: null,
    }));
  } else {
    // Nunca se guardó desde esta pantalla: usar lo que ya exista como Lote/Movimiento
    // (recepciones confirmadas siempre, y algunas de la semilla que traen lotes de
    // ejemplo aunque sigan marcadas BORRADOR).
    const movimientos = datos.movimientos;
    renglones = datos.lotes
      .filter((l) => l.IdRecepcion === rec.IdRecepcion)
      .flatMap((lote) => {
        const entrada = movimientos.find((m) => m.IdLote === lote.IdLote && m.Tipo === 'ENTRADA');
        if (!entrada) return [];
        const kgDesechado = movimientos
          .filter((m) => m.IdLote === lote.IdLote && m.Tipo === 'DESECHO_RECEPCION')
          .reduce((total, m) => total + m.Kg, 0);
        return [
          {
            id: lote.IdLote,
            idPresentacion: lote.IdPresentacion,
            ...datosPresentacion(lote.IdPresentacion),
            cantidad: entrada.Cantidad,
            kgRecibido: entrada.Kg,
            kgDesechado,
            fechaVencimiento: lote.FechaVencimiento,
            vencimientoEstimado: lote.VencimientoEstimado,
            codigoLote: lote.Codigo_PROTOTIPO,
          },
        ];
      });
  }

  return {
    idRecepcion: rec.IdRecepcion,
    numero: rec.Numero_PENDIENTE,
    donanteId: rec.IdDonante,
    fecha: rec.Fecha,
    origen: rec.Origen,
    numeroSoporte: rec.NumeroSoporte,
    soporteUrl: rec.SoporteUrl,
    estado: rec.Estado_PENDIENTE,
    registradoPor: datos.usuarios.find((u) => u.IdUsuario === rec.IdUsuario)?.Nombre ?? rec.IdUsuario,
    renglones,
  };
}
