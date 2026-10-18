# Kit para seguir el prototipo en local con Claude Code

## Qué hay
- `CLAUDE.md`: las reglas del proyecto. Claude Code lo lee solo al abrir la carpeta.
- `data/datos-ejemplo.json`: los datos de todas las pantallas, por entidad del modelo.
- `db/ssd_banco_neiva.sql`: el esquema PostgreSQL con los mismos datos.
- `styles/ssd-theme.css`: el tema de Tailwind v4 con la grilla de 8 px.
- `docs/`: decisiones del equipo y el modelo de datos (página 16).
- `referencia/`: capturas y el HTML de cada pantalla del canvas.

## Cómo arrancar
1. `npm install`
2. `npm run dev` (sirve en `http://localhost:5173` por defecto)

El prototipo ya está construido en Vue 3 + Pinia + Vue Router + Tailwind v4: shell con menú por rol, Ingresar, Inicio, Recepciones (lista y detalle) y Existencias. El resto de pantallas del menú tienen una pantalla "en construcción" mientras se completan.
