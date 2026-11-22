# NutriPlan PWA

PWA de nutrición y seguimiento corporal inspirada en Fitia. Funciona 100% en el navegador, sin backend: los datos se guardan en `localStorage` y la app se puede instalar y usar sin conexión.

## Funciones

- **Plan:** calendario semanal, registro de comidas (desayuno, almuerzo, cena y snacks) desde una base de alimentos **o desde una foto**, contador de calorías y macronutrientes, control de agua y cierre del día.
- **Progreso:** objetivo de peso con fecha estimada, actualización de peso, **racha y promedio semanal**, score nutricional, gráficas de calorías y peso, fotos del progreso y métricas personalizadas.
- **Social:** feed con publicaciones, me gusta, comentarios, follows y búsqueda.
- **Coach:** asistente contextual que analiza lo que registraste y sugiere cambios, menús y cenas — con botón para **agregar la sugerencia al plan** de un toque.
- **Ajustes:** edición de objetivos y perfil, **exportación e importación** de todos tus datos en JSON y restablecimiento.
- Instalable (manifest + service worker) y offline.

## Vista previa

![Las cuatro pantallas de NutriPlan](screenshots/app-preview.png)

![Registro por foto y sugerencia del Coach en uso](screenshots/mejoras-preview.png)

Capturas reales generadas con `python scripts/capture.py`. Puedes apuntarlo a la versión publicada con `APP_URL=https://traderxael.github.io/fitia-pwa/`.

## Arrancar

Sirve la carpeta con cualquier servidor estático:

```bash
python -m http.server 8080
```

Abre `http://localhost:8080`. Para instalarla como PWA, usa el menú "Instalar aplicación" del navegador.

## Estructura

```
index.html            # shell de la app
css/styles.css        # sistema visual
js/data.js            # alimentos y estado inicial
js/store.js           # persistencia y cálculos
js/ui.js              # render de pantallas y modales
js/app.js             # eventos y arranque
sw.js                 # caché offline
manifest.webmanifest  # instalación como PWA
```
