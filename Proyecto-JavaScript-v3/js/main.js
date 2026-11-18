/**
 * Punto de entrada.
 * Responsables: Juan y Marlon (compartido)
 *
 * 1. Carga los archivos CSS de los componentes (js/utils/styles.js).
 * 2. Cuando están listos, registra los componentes. task-app.js importa el resto,
 *    así que basta con importarlo a él.
 *
 * Se usa import() (dinámico) para que ningún componente se dibuje sin sus estilos.
 */
import { loadStyles } from './utils/styles.js';

try {
  await loadStyles();
  await import('./components/task-app.js');
} catch (error) {
  console.error(error);
  // Muestra el problema en lugar del texto "Cargando tareas…"
  const message = document.querySelector('.app-loading');
  if (message) message.textContent = `No se pudo cargar la aplicación: ${error.message}`;
}
