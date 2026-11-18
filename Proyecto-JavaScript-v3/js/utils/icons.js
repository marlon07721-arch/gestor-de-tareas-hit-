/**
 * Íconos SVG en línea (sin dependencias externas).
 * Responsable: Juan
 */
// Función que arma un ícono SVG a partir de sus trazos (paths).
// currentColor: el ícono toma el mismo color del texto.
const svg = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

// Todos los íconos de la app, por nombre
export const icons = Object.freeze({
  // Signo + (Nueva tarea)
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  // Flecha hacia abajo (Importar)
  download: svg('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>'),
  // Doble chulo (Marcar terminadas)
  checkAll: svg('<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>'),
  // Chulo (aviso de éxito)
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  // Papelera (Eliminar)
  trash: svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>'),
  // Lápiz (Editar)
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  // X (Cerrar)
  close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  // Lupa (Buscar)
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  // Alerta (errores y confirmaciones)
  alert: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>'),
  // Información (avisos)
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>'),
  // Flechas en círculo (Reintentar)
  refresh: svg('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
  // Bandeja (lista vacía)
  inbox: svg('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z"/>'),
  // Candado (tarea importada)
  lock: svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  // Etiqueta (categorías)
  tag: svg('<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/>'),
  // Disquete (guardar cambios de una categoría)
  save: svg('<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M7 3v5h8"/><path d="M7 21v-7h10v7"/>'),
  // Calendario (fecha de registro)
  calendar: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>'),
});
