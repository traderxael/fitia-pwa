# Backend de NutriPlan

Node puro (sin dependencias). Sirve la PWA y expone la API en `/api`.

## Arrancar

```bash
npm start
# o, en otro puerto:
PORT=3001 npm start
```

Abre `http://localhost:3000`. Si `NUTRIPLAN_CONFIG.apiUrl` está vacío, la PWA usa este mismo origen.

## Coach con IA gratuita

El proveedor es **Gemini Developer API** (tarifa Free, sin cargo). Para activarlo:

1. Crea una clave gratis en https://aistudio.google.com/api-keys
2. Configura variables de entorno:

```bash
AI_API_KEY=tu_clave_de_google
AI_MODEL=gemini-3.5-flash-lite   # opcional; es el modelo usado por defecto
npm start
```

Sin clave, `/api/coach` responde 501 y la app usa el coach local por reglas. La clave **nunca** se envía al navegador: solo vive en el backend.

## Persistencia

Los datos por código de sincronización se guardan en `server/data/store.json` (ignorado por git). El archivo se crea automáticamente.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del server y de la IA |
| GET | `/api/state/:code` | Obtener estado (o `{state:null}`) |
| PUT | `/api/state/:code` | Guardar estado |
| POST | `/api/coach` | `{message, context}` → `{text, suggestion}` |

## Despliegue

Cualquier host de Node (Render, Railway, Fly.io) sirve este repo con `npm start` y el puerto de `PORT`. Para la versión estática en GitHub Pages, pon la URL del backend en `js/config.js`:

```js
window.NUTRIPLAN_CONFIG = { apiUrl: 'https://tu-backend.onrender.com' };
```
