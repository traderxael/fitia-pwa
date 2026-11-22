/* Configuración de despliegue.
   - Con el backend Node en el mismo origen: apiUrl = '' (valor por defecto).
   - En GitHub Pages: se desactiva la API automáticamente (null) y la app va en modo local.
   - Para un backend externo: pon su URL, p. ej. 'https://nutriplan.onrender.com'. */
window.NUTRIPLAN_CONFIG = {
  apiUrl: location.hostname.endsWith('github.io') ? null : ''
};
