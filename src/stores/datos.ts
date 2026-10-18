import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import { existenciaLote, kgLote } from '../domain/calculos';
import type { DatosEjemplo, EstadoOrganizacion, EtapaOrganizacion, MovimientoInventario, OrigenRecepcion } from '../domain/modelos';

/** Un renglón de recepción mientras es borrador: todavía no genera Lote ni
 *  MovimientoInventario (esos solo existen "al confirmar", decisiones.md). Vive en el
 *  overlay `borradores` de abajo, no en el JSON. */
export interface RenglonBorrador {
  id: string;
  idPresentacion: string;
  cantidad: number;
  kgRecibido: number;
  kgDesechado: number;
  fechaVencimiento: string | null;
  vencimientoEstimado: boolean;
}

export interface GuardarRecepcionParams {
  idRecepcion: string | null;
  donanteId: string;
  fecha: string;
  origen: OrigenRecepcion;
  numeroSoporte: string;
  soporteUrl: string | null;
  idUsuario: string;
}

/** Simula el backend: carga data/datos-ejemplo.json una sola vez y expone los datos
 *  como estado reactivo. Se precarga en main.ts antes de montar la app, así que cuando
 *  una pantalla se renderiza los datos ya están listos. Las entidades del JSON son de
 *  solo lectura; `registrarMovimiento` es la única mutación real (movimientos creados
 *  en la sesión, p. ej. desde Bajas), vive solo en memoria, no hay backend. */
export const useDatosStore = defineStore('datos', () => {
  const datos = ref<DatosEjemplo | null>(null);
  let promesaCarga: Promise<DatosEjemplo> | undefined;

  /** Movimientos creados durante la sesión (p. ej. desde Bajas) que no vienen del JSON
   *  de ejemplo. Viven solo en memoria: al recargar la página se pierden, como el resto
   *  del prototipo (no hay backend). Se combinan con los del JSON en `movimientos`. */
  const movimientosLocales = ref<MovimientoInventario[]>([]);

  function registrarMovimiento(mov: MovimientoInventario): void {
    movimientosLocales.value = [...movimientosLocales.value, mov];
  }

  function quitarMovimiento(idMovimiento: string): void {
    movimientosLocales.value = movimientosLocales.value.filter((m) => m.IdMovimiento !== idMovimiento);
  }

  /** Usuarios y roles (A-05, decisiones.md: cambiar un rol pide confirmación en la
   *  pantalla, no aquí). A diferencia de los movimientos, Usuario/UsuarioRol se editan
   *  en el sitio: `datos` es un ref, así que mutar sus arreglos adentro sigue siendo
   *  reactivo (Vue hace el objeto profundamente reactivo), no hace falta un overlay. */
  function cambiarRolUsuario(idUsuario: string, idRol: string): void {
    const d = requerir();
    const indice = d.UsuarioRol.findIndex((ur) => ur.IdUsuario === idUsuario);
    if (indice >= 0) d.UsuarioRol[indice] = { IdUsuario: idUsuario, IdRol: idRol };
    else d.UsuarioRol.push({ IdUsuario: idUsuario, IdRol: idRol });
  }

  function cambiarActivoUsuario(idUsuario: string, activo: boolean): void {
    const usuario = requerir().Usuario.find((u) => u.IdUsuario === idUsuario);
    if (usuario) usuario.Activo = activo;
  }

  /** Históricos: asignar un producto a un nombre que venía sin equivalencia. Pasa de
   *  `_prototipo.equivalenciasSinAsignar` (no resueltos) a EquivalenciaNombre (resuelto),
   *  igual mutación directa que Usuario/UsuarioRol de arriba. */
  function asignarEquivalencia(nombreOrigen: string, idProducto: string): void {
    const d = requerir();
    d.EquivalenciaNombre.push({ NombreOrigen: nombreOrigen, IdProducto: idProducto });
    d._prototipo.equivalenciasSinAsignar = d._prototipo.equivalenciasSinAsignar.filter((n) => n !== nombreOrigen);
  }

  /** Slug legible para ids nuevos (prog-mercado-solidario, cat-aseo-hogar, ...), con
   *  sufijo numérico si ya existe uno igual. Mismo criterio en toda la app: los ids del
   *  JSON de ejemplo ya siguen este patrón, así que los nuevos se ven igual. */
  function generarId(prefijo: string, nombre: string, existentes: Set<string>): string {
    const base = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    let id = `${prefijo}-${base}`;
    let sufijo = 2;
    while (existentes.has(id)) {
      id = `${prefijo}-${base}-${sufijo}`;
      sufijo += 1;
    }
    return id;
  }

  /** Programas y kits: "alcanza para N kits" quedó retirado (decisiones.md) — estas
   *  mutaciones solo tocan el programa y su composición, nada de existencias. */
  function crearPrograma(nombre: string): string {
    const idPrograma = generarId('prog', nombre, new Set(requerir().Programa.map((p) => p.IdPrograma)));
    requerir().Programa.push({ IdPrograma: idPrograma, Nombre: nombre, Activo: true });
    return idPrograma;
  }

  function cambiarActivoPrograma(idPrograma: string, activo: boolean): void {
    const programa = requerir().Programa.find((p) => p.IdPrograma === idPrograma);
    if (programa) programa.Activo = activo;
  }

  function agregarComponenteKit(idPrograma: string, idProducto: string, kgPorKit: number): void {
    const d = requerir();
    const existente = d.ComponenteKit.find((c) => c.IdPrograma === idPrograma && c.IdProducto === idProducto);
    if (existente) existente.KgPorKit = kgPorKit;
    else d.ComponenteKit.push({ IdPrograma: idPrograma, IdProducto: idProducto, KgPorKit: kgPorKit });
  }

  function quitarComponenteKit(idPrograma: string, idProducto: string): void {
    const d = requerir();
    d.ComponenteKit = d.ComponenteKit.filter((c) => !(c.IdPrograma === idPrograma && c.IdProducto === idProducto));
  }

  /** Catálogo: crear categoría, producto o presentación. Sin editar ni borrar las que
   *  ya existen — datos de ejemplo usados por Recepciones, Existencias, Kits, etc., y
   *  decisiones.md no pide esa edición; solo "código de presentación, 'Entregable' y
   *  EAN" quedaron retirados (campos, no el alta misma). */
  function crearCategoria(nombre: string, aplicaVencimiento: boolean, vidaUtilDias: number | null): string {
    const idCategoria = generarId('cat', nombre, new Set(requerir().Categoria.map((c) => c.IdCategoria)));
    requerir().Categoria.push({ IdCategoria: idCategoria, Nombre: nombre, AplicaVencimiento: aplicaVencimiento, VidaUtilDias: vidaUtilDias });
    return idCategoria;
  }

  function crearProducto(nombre: string, idCategoria: string): string {
    const idProducto = generarId('prod', nombre, new Set(requerir().Producto.map((p) => p.IdProducto)));
    requerir().Producto.push({ IdProducto: idProducto, IdCategoria: idCategoria, Nombre: nombre });
    return idProducto;
  }

  function crearPresentacion(
    idProducto: string,
    nombre: string,
    contenido: number,
    unidad: 'G' | 'ML',
    unidadConteo: string,
  ): string {
    const idPresentacion = generarId('pres', `${idProducto}-${nombre}`, new Set(requerir().Presentacion.map((p) => p.IdPresentacion)));
    requerir().Presentacion.push({
      IdPresentacion: idPresentacion,
      IdProducto: idProducto,
      Contenido: contenido,
      Unidad: unidad,
      Nombre_PENDIENTE: nombre,
      UnidadConteo_PROTOTIPO: unidadConteo,
    });
    return idPresentacion;
  }

  /** Organizaciones: alta + avanzar de etapa + representante + autorización + población.
   *  Una organización nueva entra siempre en RADICACION (decisiones.md: flujo de
   *  etapas), sin representante ni autorización — se completan después, a medida que
   *  avanza. "Vigente" para A-03 (solo elegibles en Remisiones) se define como "tiene
   *  un registro de AutorizacionDatos": el prototipo no tiene fecha de vencimiento de
   *  autorización en el modelo, así que no se inventa una. */
  function crearOrganizacion(nombre: string, nit: string, municipio: string, estado: EstadoOrganizacion): string {
    const idOrganizacion = generarId('org', nombre, new Set(requerir().Organizacion.map((o) => o.IdOrganizacion)));
    requerir().Organizacion.push({
      IdOrganizacion: idOrganizacion,
      Nombre: nombre,
      NIT: nit,
      Municipio: municipio,
      Estado: estado,
      Etapa: 'RADICACION',
    });
    return idOrganizacion;
  }

  function cambiarEtapaOrganizacion(idOrganizacion: string, etapa: EtapaOrganizacion): void {
    const organizacion = requerir().Organizacion.find((o) => o.IdOrganizacion === idOrganizacion);
    if (organizacion) organizacion.Etapa = etapa;
  }

  function guardarRepresentante(idOrganizacion: string, nombre: string, documento: string, telefono: string): void {
    const d = requerir();
    const existente = d.Representante.find((r) => r.IdOrganizacion === idOrganizacion);
    if (existente) {
      existente.Nombre = nombre;
      existente.Documento = documento;
      existente.Telefono = telefono;
      return;
    }
    const idRepresentante = generarId('rep', idOrganizacion, new Set(d.Representante.map((r) => r.IdRepresentante)));
    d.Representante.push({ IdRepresentante: idRepresentante, IdOrganizacion: idOrganizacion, Nombre: nombre, Documento: documento, Telefono: telefono });
  }

  function registrarAutorizacion(idRepresentante: string, fecha: string, medio: string, finalidades: string): void {
    const d = requerir();
    const idAutorizacion = generarId('aut', idRepresentante, new Set(d.AutorizacionDatos.map((a) => a.IdAutorizacion)));
    d.AutorizacionDatos.push({
      IdAutorizacion: idAutorizacion,
      IdRepresentante: idRepresentante,
      Fecha: fecha,
      Medio: medio,
      Finalidades: finalidades,
      VersionPolitica: 'v2.1',
      SoporteUrl: null,
    });
  }

  function agregarPoblacion(idOrganizacion: string, grupo: string, cantidad: number): void {
    const d = requerir();
    const existente = d.PoblacionAtendida.find((p) => p.IdOrganizacion === idOrganizacion && p.Grupo === grupo);
    if (existente) existente.Cantidad = cantidad;
    else d.PoblacionAtendida.push({ IdOrganizacion: idOrganizacion, Grupo: grupo, Cantidad: cantidad });
  }

  function quitarPoblacion(idOrganizacion: string, grupo: string): void {
    const d = requerir();
    d.PoblacionAtendida = d.PoblacionAtendida.filter((p) => !(p.IdOrganizacion === idOrganizacion && p.Grupo === grupo));
  }

  function siguienteNumeroRemision(): string {
    const max = requerir().Remision.reduce((m, r) => {
      const coincide = /^S-(\d+)$/.exec(r.Numero);
      return coincide ? Math.max(m, Number(coincide[1])) : m;
    }, 0);
    return `S-${String(max + 1).padStart(4, '0')}`;
  }

  /** Emitir remisión: sin estado de borrador (decisiones.md) — se emite directo. Para
   *  cada componente del kit, asigna existencias por FEFO (primero en vencer, primero en
   *  salir) entre los lotes del producto, creando SALIDA_REMISION + DetalleRemision.
   *  Asume que quien llama ya validó con `simularFefo` que hay existencia suficiente
   *  (application/remisiones.ts deshabilita "Emitir" si no la hay); si de todas formas
   *  faltara, simplemente consume lo que haya y deja el resto sin cubrir — no lanza
   *  error, para no tumbar el flujo por una carrera de datos en memoria. */
  function emitirRemision(idOrganizacion: string, idPrograma: string, numeroKits: number, idUsuario: string): { idRemision: string; numero: string } {
    const d = requerir();
    const numero = siguienteNumeroRemision();
    const idRemision = `rem-${numero}`;
    const fecha = `${fechaReferencia.value}T09:00:00-05:00`;
    const idsDetalleExistentes = new Set(d.DetalleRemision.map((x) => x.IdDetalleRemision));

    const componentes = d.ComponenteKit.filter((c) => c.IdPrograma === idPrograma);
    for (const componente of componentes) {
      let kgRestante = componente.KgPorKit * numeroKits;
      const lotesDelProducto = d.Lote.filter((l) => {
        const presentacion = d.Presentacion.find((p) => p.IdPresentacion === l.IdPresentacion);
        return presentacion?.IdProducto === componente.IdProducto;
      }).sort((a, b) => (a.FechaVencimiento ?? '9999-99-99').localeCompare(b.FechaVencimiento ?? '9999-99-99'));

      for (const lote of lotesDelProducto) {
        if (kgRestante <= 0) break;
        const existenciaActual = existenciaLote(lote.IdLote, d.MovimientoInventario);
        const kgActual = kgLote(lote.IdLote, d.MovimientoInventario);
        if (existenciaActual <= 0 || kgActual <= 0) continue;

        // Cantidad proporcional al kg real que se toma, sin forzar un mínimo de 1 unidad:
        // con un mínimo de 1, un lote de "bultos de 50 kg" consumía el bulto entero (50 kg)
        // aunque el kit solo necesitara 6 kg — el comprobante quedaba con casi 10 veces más
        // kg de los que decía la simulación de la pantalla "Nueva remisión".
        const kgPorUnidad = kgActual / existenciaActual;
        const kgReal = Math.round(Math.min(kgRestante, kgActual) * 10) / 10;
        const cantidadAConsumir = Math.round((kgReal / kgPorUnidad) * 10) / 10;

        d.MovimientoInventario.push({
          IdMovimiento: `mov-${idRemision}-${lote.IdLote}`,
          IdLote: lote.IdLote,
          Tipo: 'SALIDA_REMISION',
          Cantidad: cantidadAConsumir,
          Kg: kgReal,
          Fecha: fecha,
          IdUsuario: idUsuario,
          IdRemision: idRemision,
          IdMovimientoCorregido: null,
        });
        const idDetalle = generarId('det', `${idRemision}-${lote.IdLote}`, idsDetalleExistentes);
        idsDetalleExistentes.add(idDetalle);
        d.DetalleRemision.push({ IdDetalleRemision: idDetalle, IdRemision: idRemision, IdLote: lote.IdLote, Cantidad: cantidadAConsumir, Kg: kgReal });

        kgRestante -= kgReal;
      }
    }

    d.Remision.push({
      IdRemision: idRemision,
      Numero: numero,
      Fecha: fechaReferencia.value,
      IdOrganizacion: idOrganizacion,
      IdPrograma: idPrograma,
      NumeroKits: numeroKits,
      PdfUrl: null,
    });

    return { idRemision, numero };
  }

  /** Renglones de recepciones en borrador (overlay, igual que `movimientosLocales`:
   *  no son Lote/MovimientoInventario todavía). Clave = IdRecepcion. La presencia de la
   *  clave (no el largo del arreglo) es lo que distingue "ya se guardó, aunque haya
   *  quedado en 0 renglones" de "nunca se tocó, usar lo que traiga el JSON semilla"
   *  — por eso algunas recepciones de ejemplo (p. ej. con Lote ya creados pese a seguir
   *  en BORRADOR) se siguen viendo hasta que alguien las edite y guarde de verdad. */
  const borradores = ref<Record<string, RenglonBorrador[]>>({});

  function tieneBorradorGuardado(idRecepcion: string): boolean {
    return idRecepcion in borradores.value;
  }

  function renglonesBorrador(idRecepcion: string): RenglonBorrador[] {
    return borradores.value[idRecepcion] ?? [];
  }

  function guardarRenglonesBorrador(idRecepcion: string, renglones: RenglonBorrador[]): void {
    borradores.value = { ...borradores.value, [idRecepcion]: renglones };
  }

  function siguienteNumeroRecepcion(): string {
    const max = requerir().Recepcion.reduce((m, r) => {
      const coincide = /^R-(\d+)$/.exec(r.Numero_PENDIENTE);
      return coincide ? Math.max(m, Number(coincide[1])) : m;
    }, 0);
    return `R-${String(max + 1).padStart(4, '0')}`;
  }

  function siguienteCodigoLote(): string {
    const max = requerir().Lote.reduce((m, l) => {
      const coincide = /^L-(\d+)$/.exec(l.Codigo_PROTOTIPO);
      return coincide ? Math.max(m, Number(coincide[1])) : m;
    }, 0);
    return `L-${String(max + 1).padStart(3, '0')}`;
  }

  /** Crea la recepción (si idRecepcion es null) o actualiza sus datos de cabecera.
   *  Lo que haga que "Guardar borrador" sirva de verdad: antes solo mostraba un aviso
   *  y no tocaba nada, así que al volver a entrar los renglones desaparecían. */
  function guardarRecepcion(params: GuardarRecepcionParams): { idRecepcion: string; numero: string } {
    const d = requerir();

    if (params.idRecepcion) {
      const existente = d.Recepcion.find((r) => r.IdRecepcion === params.idRecepcion);
      if (existente) {
        existente.IdDonante = params.donanteId;
        existente.Fecha = params.fecha;
        existente.Origen = params.origen;
        existente.NumeroSoporte = params.numeroSoporte;
        existente.SoporteUrl = params.soporteUrl;
        return { idRecepcion: existente.IdRecepcion, numero: existente.Numero_PENDIENTE };
      }
    }

    const numero = siguienteNumeroRecepcion();
    const idRecepcion = `rec-${numero}`;
    d.Recepcion.push({
      IdRecepcion: idRecepcion,
      Origen: params.origen,
      IdDonante: params.donanteId,
      Fecha: params.fecha,
      NumeroSoporte: params.numeroSoporte,
      SoporteUrl: params.soporteUrl,
      IdUsuario: params.idUsuario,
      Numero_PENDIENTE: numero,
      Estado_PENDIENTE: 'BORRADOR',
    });
    return { idRecepcion, numero };
  }

  /** Confirmar: recién aquí se crean los Lote y los MovimientoInventario (ENTRADA y,
   *  si aplica, DESECHO_RECEPCION) a partir de los renglones del borrador — igual que
   *  describe decisiones.md. Limpia el overlay porque de ahora en adelante esos
   *  renglones ya existen como datos "reales". */
  function confirmarRecepcion(idRecepcion: string): void {
    const d = requerir();
    const rec = d.Recepcion.find((r) => r.IdRecepcion === idRecepcion);
    if (!rec) return;

    const fechaMovimiento = `${rec.Fecha}T08:00:00-05:00`;
    for (const r of renglonesBorrador(idRecepcion)) {
      const codigo = siguienteCodigoLote();
      const idLote = `lot-${codigo}`;
      d.Lote.push({
        IdLote: idLote,
        IdRecepcion: idRecepcion,
        IdPresentacion: r.idPresentacion,
        IdLoteOrigen: null,
        FechaVencimiento: r.fechaVencimiento,
        VencimientoEstimado: r.vencimientoEstimado,
        Codigo_PROTOTIPO: codigo,
      });
      d.MovimientoInventario.push({
        IdMovimiento: `mov-${idLote}-entrada`,
        IdLote: idLote,
        Tipo: 'ENTRADA',
        Cantidad: r.cantidad,
        Kg: r.kgRecibido,
        Fecha: fechaMovimiento,
        IdUsuario: rec.IdUsuario,
        IdRemision: null,
        IdMovimientoCorregido: null,
      });
      if (r.kgDesechado > 0) {
        const cantidadDesechada = r.kgRecibido > 0 ? Math.round((r.kgDesechado / r.kgRecibido) * r.cantidad) : 0;
        d.MovimientoInventario.push({
          IdMovimiento: `mov-${idLote}-desecho`,
          IdLote: idLote,
          Tipo: 'DESECHO_RECEPCION',
          Cantidad: cantidadDesechada,
          Kg: r.kgDesechado,
          Fecha: fechaMovimiento,
          IdUsuario: rec.IdUsuario,
          IdRemision: null,
          IdMovimientoCorregido: null,
        });
      }
    }

    rec.Estado_PENDIENTE = 'CONFIRMADA';
    const sinEsteBorrador = { ...borradores.value };
    delete sinEsteBorrador[idRecepcion];
    borradores.value = sinEsteBorrador;
  }

  const cargado = computed(() => datos.value !== null);

  function cargar(): Promise<DatosEjemplo> {
    if (!promesaCarga) {
      promesaCarga = fetch('/data/datos-ejemplo.json')
        .then((respuesta) => respuesta.json() as Promise<DatosEjemplo>)
        .then((valor) => {
          datos.value = valor;
          return valor;
        });
    }
    return promesaCarga;
  }

  function requerir(): DatosEjemplo {
    if (!datos.value) {
      throw new Error('useDatosStore: se consultaron los datos antes de cargarlos.');
    }
    return datos.value;
  }

  const banco = computed(() => requerir().Banco[0]);
  const roles = computed(() => requerir().Rol);
  const usuarios = computed(() => requerir().Usuario);
  const usuarioRoles = computed(() => requerir().UsuarioRol);
  const categorias = computed(() => requerir().Categoria);
  const productos = computed(() => requerir().Producto);
  const presentaciones = computed(() => requerir().Presentacion);
  const donantes = computed(() => requerir().Donante);
  const recepciones = computed(() => requerir().Recepcion);
  const lotes = computed(() => requerir().Lote);
  const movimientos = computed(() => [...requerir().MovimientoInventario, ...movimientosLocales.value]);
  const riesgoLotes = computed(() => requerir().RiesgoLote);
  const importaciones = computed(() => requerir().Importacion);
  const equivalenciasNombre = computed(() => requerir().EquivalenciaNombre);
  const programas = computed(() => requerir().Programa);
  const componentesKit = computed(() => requerir().ComponenteKit);
  const organizaciones = computed(() => requerir().Organizacion);
  const representantes = computed(() => requerir().Representante);
  const autorizacionesDatos = computed(() => requerir().AutorizacionDatos);
  const poblacionAtendida = computed(() => requerir().PoblacionAtendida);
  const remisiones = computed(() => requerir().Remision);
  const detallesRemision = computed(() => requerir().DetalleRemision);
  const prototipo = computed(() => requerir()._prototipo);
  const fechaReferencia = computed(() => prototipo.value.fechaReferencia);

  return {
    datos,
    cargado,
    cargar,
    banco,
    roles,
    usuarios,
    usuarioRoles,
    categorias,
    productos,
    presentaciones,
    donantes,
    recepciones,
    lotes,
    movimientos,
    riesgoLotes,
    importaciones,
    equivalenciasNombre,
    programas,
    componentesKit,
    organizaciones,
    representantes,
    autorizacionesDatos,
    poblacionAtendida,
    remisiones,
    detallesRemision,
    prototipo,
    fechaReferencia,
    registrarMovimiento,
    quitarMovimiento,
    cambiarRolUsuario,
    cambiarActivoUsuario,
    asignarEquivalencia,
    crearPrograma,
    cambiarActivoPrograma,
    crearCategoria,
    crearProducto,
    crearPresentacion,
    agregarComponenteKit,
    quitarComponenteKit,
    crearOrganizacion,
    cambiarEtapaOrganizacion,
    guardarRepresentante,
    registrarAutorizacion,
    agregarPoblacion,
    quitarPoblacion,
    emitirRemision,
    tieneBorradorGuardado,
    renglonesBorrador,
    guardarRenglonesBorrador,
    guardarRecepcion,
    confirmarRecepcion,
  };
});
