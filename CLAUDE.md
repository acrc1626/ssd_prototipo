# SSD Bancos de Alimentos · prototipo frontend

Prototipo de la tesis (Maestría en Arquitectura de Software, U. Sabana). Caso: Banco Diocesano de Alimentos de Neiva. Equipo: Astrid, Luis Rojas, Alexander Caballero.

## Stack
- Vue 3 (Composition API, `<script setup>`, Vite) + Pinia + Vue Router + Tailwind CSS v4 (plugin `@tailwindcss/vite`).
- Capas en `src/`: `domain/` (modelos y cálculos, TS puro), `stores/` (Pinia: datos, sesión, confirmar, deshacer), `application/` (view-models por pantalla, `computed()` de Vue), `router/`, `components/` (compartidos y `shell/`), `views/` (una por pantalla, `recepciones/` para lista+detalle).
- Sin backend: los datos salen de `data/datos-ejemplo.json` (copiado a `/data/` en dev y build vía `vite-plugin-static-copy`, sin duplicar el archivo) a través del store `stores/datos.ts`. `db/ssd_banco_neiva.sql` es el esquema PostgreSQL con los mismos datos, para cuando haya API.
- Estilos: `styles/ssd-theme.css` (importado desde `src/style.css` después de `@import "tailwindcss";`). No crear colores ni medidas fuera de ese tema.

## Reglas que no se negocian
1. **MVP y modelo de datos.** Solo se construye lo que está en el documento de arquitectura. Los campos salen del modelo v1.1 (`docs/modelo-datos-p16.jpg`). Si algo pedido no está en el documento, avisar ANTES de construirlo.
2. **Escala del sistema visual (Figma del equipo, no una grilla de 8 px).** Espaciado 4/8/12/16/20/24/32/40 (coincide con la escala nativa de Tailwind: p-1…p-10, se usa directo). Texto: 11 etiquetas/auxiliar, 13 cuerpo y botones, 15 título de tarjeta (`h2`), 25 métrica destacada / título en móvil, 32 título principal (`h1`) desde 1024 px. Radios: 10 inputs y botones, 14 tarjetas, 16 paneles destacados, píldora en chips/badges. Todo esto ya está en `styles/ssd-theme.css`; no inventar tamaños fuera de esos tokens.
3. **Heurísticas de Nielsen.** Estado visible del sistema, lenguaje del banco (no técnico), confirmación y deshacer en acciones con efecto, consistencia, prevención de errores, reconocer antes que recordar.
4. **Paleta (sistema visual del Figma).** Verde institucional para acciones y estado óptimo; azul para información/entradas; turquesa para categorías complementarias; violeta para datos secundarios (incluye el código de lote, p. ej. "L-104") y estado moderado; frambuesa solo para estado crítico y errores. Jerarquía: 60% blancos/neutros, 25% verde, 10% verdes vivos, 5% el resto. Botón primario con degradado verde y sombra suave; tarjetas con sombra muy suave gris-verdosa (el prototipo anterior no usaba sombras; este sistema sí, a propósito).
5. **Accesibilidad.** Labels en todos los campos, `:focus-visible` visible, `aria-label` en botones de solo ícono, roles de tabla, `aria-current` en el menú, navegación completa con teclado. Contraste AA (4.5:1) — varios tonos de la ficha de Figma no pasaban en texto chico (verde de marca, el extremo claro del degradado del botón, azul informativo, gris de encabezado de tabla, placeholder); en `ssd-theme.css` quedaron ajustados un poco más oscuros manteniendo el mismo matiz. Si se agrega un color nuevo de la paleta en un lugar con texto, verificar contraste antes de usarlo tal cual viene del Figma.
6. **Responsive.** La página nunca hace scroll horizontal (no usar 100vw). Tablas con scroll dentro de su contenedor (`tbl-scroll` con tabindex="0" y aria-label). Cortes: 1440 o más, menú lateral completo (240, con etiqueta); bajo 1440, menú en cajón detrás del botón de hamburguesa (sin estado intermedio solo-ícono, que es lo que desbordaba texto en pantallas chicas); bajo 1280, controles táctiles de 48; bajo 1024, filas de tabla como tarjetas.
7. **Botones de crear** de cada página: `btn-primary` con ícono +, a la derecha del encabezado de la página.
8. **Textos en español**, tono claro y corto. Nunca usar la raya (—) en textos de la interfaz.

## Roles (solo para la demostración)
- Coordinador del banco: Laura Gómez. Ve todo menos Recepciones, Bajas, Remisiones y Organizaciones.
- Asistente administrativa: Diana Ríos. Ve Inicio, Existencias, Remisiones, Organizaciones y Reporte.
- Personal de bodega: Carlos Perdomo. Ve Inicio, Recepciones, Existencias y Bajas.
- El rol se elige en Ingresar ("Rol para la demostración") y se guarda en localStorage `ssd.rol`.

## Pantallas (rutas sugeridas)
| Ruta | Pantalla | Caso de uso |
|---|---|---|
| /ingresar | Ingresar con Google + rol de demostración | Auth Cognito + Google |
| /inicio | Indicadores, pendientes por rol, alertas de vencimiento | |
| /recepciones | Lista (borradores y confirmadas) | UC-01 |
| /recepciones/:id | Recepción (nueva, borrador editable, confirmada de consulta) | UC-01 |
| /existencias | Lotes en bodega, trazabilidad, ajuste | UC-02 |
| /bajas | Bajas y compostaje | |
| /remisiones | Lista de remisiones emitidas | UC-03 |
| /remisiones/nueva | Remisión con asignación FEFO y PDF | UC-03 |
| /organizaciones | Organizaciones, autorización de datos, población | |
| /kits | Programas y composición de kits | |
| /riesgo | Riesgo de vencimiento | |
| /reporte | Reporte mensual de desperdicio | |
| /catalogo | Productos, presentaciones, categorías, equivalencias | |
| /historicos | Importar históricos | |
| /usuarios | Usuarios y roles | |

Los números de caso de uso de la tabla son orientativos: verificarlos contra el documento de arquitectura.

## Material de referencia
- `referencia/capturas/`: cómo se ve cada pantalla hoy (1440 px). Las medidas viejas (36 px, 52 px) quedan reemplazadas por la grilla de 8.
- `referencia/prototipo-dc/`: el HTML de cada pantalla del canvas (formato DC: plantilla `<x-dc>` y lógica en `class Component extends DCLogic`). Sirve para sacar textos, datos y comportamiento. No copiar sus estilos inline.
- `docs/decisiones.md`: qué se quitó, qué se ajustó al modelo y preguntas abiertas.

## Datos
- Campos `_PENDIENTE` en el JSON: los usa la pantalla pero no están en el modelo v1.1 (pregunta abierta). Mostrarlos, pero no inventar más.
- Campos `_PROTOTIPO`: solo ayudas de presentación.
- Existencias de un lote = suma de sus movimientos (ENTRADA y FRACCIONAMIENTO_ENTRADA suman; el resto resta). Kg = Contenido × Cantidad ÷ 1000.
- Fecha de referencia del prototipo: martes 10-nov-2026.
