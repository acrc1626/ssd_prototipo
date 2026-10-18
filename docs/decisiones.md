# Prototipo frontend SSD Bancos de Alimentos: decisiones

Canvas de referencia: https://claude.ai/artifact/3yBViXW9wEik1wvtKyLE7i (página "Prototipo v2", versión 46).

## Regla principal (Luis y Astrid, 13-oct)
- El prototipo se pega al documento de arquitectura (MVP). Lo que no esté en el documento no va.
- El modelo de datos del documento (página 16, versión 1.1 del 11-oct-2026) es la fuente de los campos. Ver `docs/modelo-datos-p16.jpg`.
- Si alguien del equipo propone algo que no está en el documento, se avisa antes de construirlo.

## Retirado por no estar en el documento
- Campana de alertas, buscador global y selector de banco en el encabezado.
- Importar renglones por CSV en Recepción.
- Observaciones y motivos por renglón en Recepción y en Bajas (MovimientoInventario no tiene esos campos).
- Código de presentación, "Entregable" y EAN en el catálogo; "alcanza para N kits" en Kits.
- Remisiones recientes y tipo de organización; último acceso y bitácora de accesos; roles inventados.
- En el reporte: motivos y "¿Cuánto se pudo evitar?". Botones Exportar; estado borrador en Remisión.
- Tarjeta "Validación" y marca "estimada" en la grilla de Recepción (el dato VencimientoEstimado se sigue guardando).

## Ajustado al modelo de datos
- Categoría: vida útil y "Aplica vencimiento". Presentación: contenido + unidad (g o ml). Equivalencias → Producto.
- Recepción: donante, fecha, origen (Donación o Compra), número de soporte, soporte adjunto; IdUsuario se muestra solo en la lista ("Registró").
- Organización: NIT, municipio, estado (Permanente o Esporádica), etapas Radicación, Verificación, Contacto, Visita, Vinculada. Representante: nombre, documento, teléfono. Población: grupo + cantidad.
- Usuarios: nombre, correo, roles, activo. Roles = actores del documento. Ingreso con Google.
- Importacion y CambioParametro se mantienen.

## Flujo y pantallas
- Ingreso con Google y selector de rol solo para la demostración (Laura Gómez, coordinadora; Diana Ríos, asistente administrativa; Carlos Perdomo, personal de bodega).
- Un solo usuario en sesión en todas las pantallas; el menú muestra solo lo que su rol puede usar.
- Menú por rol: bodega ve Inicio, Recepciones (entradas), Existencias y Bajas; asistente ve Inicio, Existencias, Remisiones (salidas), Organizaciones y Reporte; coordinador ve todo menos Recepciones, Bajas, Remisiones y Organizaciones.
- Inicio: indicadores, pendientes según el rol y alertas de vencimiento.
- Recepciones: lista (borradores y confirmadas, filtro por origen y por quien registró), nueva recepción vacía, borradores editables y confirmadas solo de consulta. Soporte con botón "Ver".
- Remisiones: lista de emitidas y "Nueva remisión".
- Fecha de referencia única del prototipo: martes 10-nov-2026.

## Correcciones de la auditoría UX
- A-01: confirmar recepción pide confirmación con resumen; quitar renglones tiene "Deshacer".
- A-02: "Registrar baja" abre Bajas con el lote elegido; "Registrar ajuste" crea un movimiento AJUSTE; "Emitir remisión" pide confirmación y muestra el PDF; "Nueva presentación", "Nuevo programa" y "Nueva organización" abren su formulario.
- A-03: la remisión solo deja elegir organizaciones vinculadas con autorización vigente.
- A-04: un solo usuario de sesión y menú por rol. A-05: cambiar un rol pide confirmación.
- A-06: lista de remisiones. A-07: fecha única. A-08: sin códigos internos en pantalla. A-11: migas con enlaces reales. A-12: gris secundario #5F656B. A-13: nombres reales de ejemplo.
- A-09: sin campana; en el menú, "Riesgo de vencimiento" muestra el número de lotes en riesgo alto.
- A-10: falta confirmar con el banco si se usa en tablet.

## Responsive
- Cabecera fija, menú lateral fijo y contenido con minmax(0,1fr). La página nunca hace scroll horizontal; las tablas anchas se desplazan dentro de su propio contenedor (enfocable con teclado y con nombre).
- 1440 o más: menú completo y tabla completa. 1024 a 1439: menú solo íconos (el botón de tres líneas lo abre encima). Bajo 1280: controles táctiles de 48 px. Bajo 1024: menú detrás del botón y cada fila de tabla pasa a tarjeta con su etiqueta.
- Textos largos de tabla con puntos suspensivos y el valor completo en title.
- Botones de crear de cada página: verde primario con ícono +, a la derecha del encabezado.

## Paleta y medidas (grilla de 8 px)
- Verde #33C863 (texto e íconos verdes #1A7F3D), menta #A7E8BB y #E3F7E9, naranja #FFA56B y #FFEBDD solo para lotes y pérdidas, fondo #F7F8FA, texto #26323F, secundario #5F656B, rojo y ámbar solo para riesgo y errores.
- Controles de 40 px (48 táctil), radio 8; filas de tabla de 48, encabezado de 40; menú de 240.
- Cajas de texto con ancho máximo: 360 texto, 176 fechas, 112 cantidades.

## Preguntas abiertas al equipo
- Recepcion y Remision no tienen Estado ni (Recepcion) Numero en el modelo: los borradores y "R-0458" los necesitan.
- Presentacion no tiene nombre: ¿se agrega Nombre o se quitan "Caja 1.100 ml", "Bolsa 500 g"?
- NivelRiesgo incluye VENCIDO; las pantallas solo muestran Alto, Medio y Bajo.
- ADR-009 pide consulta de excepciones a FEFO por periodo y motivo.
- R-0458 aparece como borrador pero sus lotes ya están en Existencias.
- Todos los datos son de ejemplo.
