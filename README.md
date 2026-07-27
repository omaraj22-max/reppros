# Pipeline Audit — Reputation Pros

Herramienta de flowchart + audit checklist + reporte con **estado compartido entre todos los visitantes** (Upstash Redis).

## Estructura

```
index.html      → la app completa (flow chart, audit, workflows, report)
api/state.js    → serverless function (runtime Node.js) que lee/escribe el key "audit-state" en Redis
vercel.json     → reescribe /flow /audit /workflows /report a index.html
```

No hace falta `package.json`: Vercel sirve `index.html` como estático y detecta `api/state.js` como serverless function automáticamente.

## Rutas

Cada sección tiene su propia URL, así que se puede compartir y sobrevive al refresh:

| URL | Sección |
|---|---|
| `/` o `/flow` | Flow chart |
| `/audit` | Audit checklist |
| `/workflows` | Workflow audits |
| `/report` | Report |

`vercel.json` reescribe esas rutas a `index.html` y la app lee `location.pathname` al cargar.
Abriendo el archivo directo (`file://`) no hay rutas, así que cae a un `#` (`index.html#/audit`).

## Setup en Vercel

1. Sube el repo/carpeta a Vercel (`vercel` CLI o import desde GitHub).
2. En el proyecto de Vercel deben existir las variables de entorno (ya las tienes si conectaste la integración Upstash / KV):
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
3. Deploy. Listo — no hay build step.

## Cómo funciona el estado compartido

- **Al abrir la página**: `GET /api/state`. Si Redis tiene datos, reemplaza `nodes`, `edges` y `audit` y re-renderiza; si no (o si falla), se usan los defaults del HTML.
- **Al editar cualquier cosa** (checkboxes, notas, status, mover/crear/borrar pasos y conexiones, labels, paneles): `saveState()` hace un POST del estado completo con **debounce de 1.5 s**. Última escritura gana.
- **Indicador en el header**: `Guardando…` → `Guardado ✓`, o `Error al guardar (reintenta)` (reintenta solo cada 5 s, o haz click en el texto para reintentar ya).
- Al cerrar la pestaña con cambios pendientes se envía un último guardado vía `sendBeacon`.
- **Export/Import JSON** siguen funcionando como respaldo manual; un Import también sube ese estado a Redis (lo comparte con todos).
- **Reset** restaura el flujo original **para todos los visitantes**.

## API

- `GET /api/state` → JSON `{nodes, edges, audit}` o `null` si aún no hay nada guardado.
- `POST /api/state` con body `{nodes, edges, audit}` → `{ok: true}`. Valida la forma del body (400 si no cumple).

## Desarrollo local

`vercel dev` con las env vars en `.env.local`, o simplemente abrir `index.html` (sin API funciona con los defaults y el guardado marca error).
