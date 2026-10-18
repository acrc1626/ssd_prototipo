# Evaluación heurística (Nielsen) del prototipo

> SSD Bancos de Alimentos · Banco Diocesano de Alimentos de Neiva.
> Revisión de usabilidad de todo el prototipo frontend con las 10 heurísticas de Jakob Nielsen, con foco inicial en **Programas y kits** y **Riesgo de vencimiento**, recorriendo el flujo con los tres roles de la demostración (Coordinador, Asistente, Bodega).

## Método

- Recorrido por rol de cada pantalla (`/ingresar`, `/inicio`, `/recepciones`, `/existencias`, `/bajas`, `/remisiones`, `/organizaciones`, `/kits`, `/riesgo`, `/reporte`, `/catalogo`, `/historicos`, `/usuarios`).
- Cada hallazgo se clasifica por heurística y severidad, con la pantalla afectada y una recomendación.
- Severidad: **Alta** (bloquea o engaña en la demo / uso real), **Media** (fricción o pérdida de datos evitable), **Baja** (pulido, consistencia).

## Qué pantalla ve cada rol (contexto del flujo)

| Pantalla | Coordinador | Asistente | Bodega |
|---|:--:|:--:|:--:|
| Inicio, Existencias | ✓ | ✓ | ✓ |
| Recepciones, Bajas | | | ✓ |
| Remisiones, Organizaciones | | ✓ | |
| Programas y kits, Riesgo, Catálogo, Históricos, Usuarios | ✓ | | |
| Reporte mensual | ✓ | ✓ | |

Este reparto explica varios hallazgos: **quien vigila (Coordinador) no es quien ejecuta (Bodega/Asistente)**.

## Resumen

El prototipo tiene una base de usabilidad sólida: componentes compartidos, validaciones antes de enviar, confirmación y deshacer en acciones con efecto, botones ocultos según el rol, estados vacíos y tablas accesibles. Los riesgos que quedan son pocos y acotados.

| # | Hallazgo | Heurística | Severidad | Estado |
|---|---|---|---|---|
| 1 | Recargar la página reinicia los datos sin aviso | H1 | Media‑Alta | Abierto |
| 2 | "Salir" cierra sesión sin confirmar | H3 / H5 | Media | Abierto |
| 3 | Riesgo de vencimiento era un callejón sin salida | H2 / H7 | Media | **Corregido** |
| 4 | Impresión del Reporte arrastra el menú lateral | H8 | Baja | Abierto |
| 5 | El "chevron" para expandir no es consistente entre tablas | H4 | Baja | Abierto |
| 6 | Falta un glosario único (FEFO, niveles, vencimiento estimado) | H10 | Baja | Abierto |
| 7 | Sin red de seguridad ante un error en tiempo de ejecución | H9 | Baja | Abierto |

---

## Hallazgos por heurística

### H1 · Visibilidad del estado del sistema
**Fuerte:** avisos de confirmación (`role="status"`), estados vacíos descriptivos, KPIs y "corte" con fecha de referencia, indicador de página en las tablas.

- **[Media‑Alta] Al recargar (F5) se pierden los cambios de la sesión, sin ninguna señal.** El prototipo guarda en memoria; una recepción confirmada, una baja o una remisión recién emitida desaparecen al recargar. En la sustentación, un refresco accidental "deshace" la demo y nada lo advierte.
  *Recomendación:* una nota discreta y permanente del tipo "Prototipo: los datos se reinician al recargar", o persistir en `localStorage`. Persistir real queda fuera del MVP (no hay backend), así que la nota es lo mínimo.

### H2 · Coincidencia entre el sistema y el mundo real
**Fuerte:** lenguaje del banco, sin tecnicismos; la composición del kit se explica en kilos por kit; "Se entrega / En bodega / ¿Alcanza?" en vez de "necesario/disponible".

- **[Media] Quien ve el riesgo no podía actuar sobre él.** `Riesgo de vencimiento` lo ve solo el Coordinador, pero dar de baja (Bodega) o remitir (Asistente) está en otros roles. La pantalla mostraba el problema y terminaba ahí. **Corregido** (ver "Flujo aplicado"). Queda la observación de diseño: el Coordinador sigue sin poder ejecutar la acción final; delega. Es coherente con la separación de roles, pero conviene tenerlo explícito en la tesis.

### H3 · Control y libertad del usuario
**Fuerte:** "deshacer" al quitar componentes de un kit y en bajas; botones "Cancelar" en los formularios; modales que cierran con Escape y con clic afuera.

- **[Media] "Salir" no pide confirmación.** Es un botón de solo ícono pegado al avatar; un clic cierra la sesión de inmediato y, con el reinicio en memoria, se pierde el trabajo. *Recomendación:* confirmación ("¿Cerrar sesión?") antes de salir.

### H4 · Consistencia y estándares
**Fuerte:** `EncabezadoPagina`, `Paginador`, `TarjetaIndicador`, utilidades `tbl-*`, íconos y patrones de acción reutilizados en todas las pantallas; botón primario "+" siempre arriba a la derecha.

- **[Baja] El gesto de "expandir fila" no es uniforme.** Existencias usa un chevron que apunta a la derecha y rota al abrir; Kits, Remisiones y Riesgo usan un chevron hacia abajo. *Recomendación:* unificar el mismo ícono y comportamiento en todas las tablas con detalle.

### H5 · Prevención de errores
**Fuerte:** se ocultan las acciones que el rol no puede hacer (no se muestra "Registrar baja" ni "Nueva remisión" a quien el router rebotaría); validación antes de enviar; chequeo de nombres duplicados en kits; verificación de existencias (FEFO) antes de emitir una remisión; confirmación en acciones con efecto.

- Sin hallazgos nuevos más allá del #2 ("Salir").

### H6 · Reconocer antes que recordar
**Fuerte:** etiquetas en todos los campos; ayudas en línea; el kit muestra qué incluye; la remisión muestra el resumen de lo que se descuenta; los filtros conservan su estado a la vista.

- **[Baja] Siglas sin recordatorio en contexto.** "FEFO", "vencimiento estimado" y los niveles de riesgo se entienden por contexto, pero no hay un recordatorio corto donde aparecen por primera vez. Se cruza con H10.

### H7 · Flexibilidad y eficiencia de uso
**Fuerte:** búsqueda, filtros, orden y paginación en todas las listas largas; atajos de acción por fila.

- Atendido el #3: ahora desde Riesgo se salta directo al lote en Existencias.

### H8 · Diseño estético y minimalista
**Fuerte:** jerarquía visual clara, densidad adecuada, paleta institucional, gráficas del reporte legibles y sobrias.

- **[Baja] La impresión del Reporte incluye el menú lateral y la cabecera.** "Imprimir / PDF" usa la impresión del navegador; falta una hoja de estilo de impresión que oculte el armazón (como ya hace el comprobante de remisión con `print:hidden`). *Recomendación:* ocultar navegación y cabecera al imprimir el reporte.

### H9 · Ayudar a reconocer, diagnosticar y recuperarse de errores
**Fuerte:** mensajes de error en lenguaje claro, en `role="alert"`, junto al campo o la acción; nunca se expone detalle técnico.

- **[Baja] No hay red de seguridad ante un error inesperado en tiempo de ejecución.** Si un componente lanza una excepción, la vista queda en blanco sin mensaje. *Recomendación:* una pantalla de error amable (error boundary) de último recurso.

### H10 · Ayuda y documentación
**Fuerte:** ayuda contextual (`help`) en varias pantallas; estados vacíos que explican qué hacer; nota de roles fijos en Usuarios; explicación de las equivalencias en Catálogo.

- **[Baja] No hay un glosario único.** Convendría un lugar (o tooltips) que explique de una vez FEFO, los tres niveles de riesgo y "vencimiento estimado". Para el tamaño del banco, tooltips bastan.

---

## Flujo aplicado en esta revisión (Kits y Riesgo)

- **Kits (Programas y kits):** el flujo está completo y sano. Crear programa → componer el kit (producto + kg por kit, con validación y deshacer) → el kit queda disponible en "Nueva remisión". Activar/desactivar pide confirmación. No requería cambios.
- **Riesgo de vencimiento → Existencias:** se agregó una acción por fila **"Ver en existencias"** que abre el lote enfocado (`/existencias?lote=<id>`): queda filtrado por su código (a la vista en el buscador, se puede limpiar) y con su trazabilidad abierta. Así se cierra la cadena **Inicio → Riesgo → Existencias**, que antes terminaba en una tabla de solo lectura.

## Recomendaciones priorizadas (lo que falta)

1. **Nota de "los datos se reinician al recargar"** (riesgo de demo). *Media‑Alta.*
2. **Confirmar antes de "Salir".** *Media.*
3. **Hoja de impresión del Reporte** sin menú ni cabecera. *Baja.*
4. **Unificar el chevron de expandir** en todas las tablas. *Baja.*
5. **Tooltips/glosario** de FEFO, niveles y vencimiento estimado. *Baja.*
