# NutriPlan

PWA de nutrición y seguimiento corporal inspirada en Fitia, con **backend propio**, **onboarding**, **coach con IA gratuita** y funcionamiento offline.

## Funciones

- **Plan:** calendario semanal, comidas con base de alimentos, favoritos, recientes, unidades (g, porción, cucharada, taza), registro por foto comprimida, calorías y macros, agua y cierre del día.
- **Progreso:** objetivo con fecha estimada, peso, racha, promedio semanal, score nutricional, gráficas de calorías y tendencia de 14 días, fotos, métricas y descarga de una imagen para compartir.
- **Social:** historias, publicaciones propias con foto, me gusta, comentarios, seguir, buscar y recordatorios.
- **Coach:** asistente contextual que analiza tus comidas y puede agregar, reemplazar o deshacer sugerencias en tu plan. Usa **Gemini (tarifa Free)** cuando hay clave, y un coach local por reglas cuando no.
- **Cuenta:** onboarding con cálculo de metas (Mifflin-St Jeor), sincronización entre dispositivos por código, export/import JSON y modo offline.

## Arranque rápido

```bash
npm start
# http://localhost:3000
```

El servidor Node (sin dependencias) sirve la PWA **y** la API. Para otro puerto: `PORT=3001 npm start`.

## Coach con IA gratuita

1. Crea una clave gratuita en https://aistudio.google.com/api-keys
2. Arranca con `AI_API_KEY=tu_clave npm start`
3. El modelo por defecto es `gemini-3.5-flash-lite` (se puede cambiar con `AI_MODEL`).

La clave vive solo en el backend; nunca llega al navegador. Sin clave, el coach funciona en modo local. Ver [`server/README.md`](server/README.md).

## Sincronización

En **Ajustes → Sincronizar dispositivos** se crea un código de 8 caracteres. Los datos se guardan en `server/data/store.json`. Al abrir la app en otro dispositivo, ingresa ese código. Si no hay backend, la app sigue funcionando con `localStorage`.

## Despliegue

- **PWA estática:** GitHub Pages (URL actual: https://traderxael.github.io/fitia-pwa/). Sin backend, usa modo local.
- **Con backend:** cualquier host Node (`npm start`, puerto de `PORT`). Configura `js/config.js` con `apiUrl` apuntando a ese host.

## Pruebas

```bash
npm start &
APP_URL=http://127.0.0.1:3000 python scripts/capture.py
 Las capturas se guardan en `screenshots/`. GitHub Actions ejecuta lo mismo en cada push.
```
