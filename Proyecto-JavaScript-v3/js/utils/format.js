/**
 * Formato de fechas y textos para la interfaz.
 * Responsable: Juan
 */

/** "2026-11-04" → "4 nov 2026" */
export function formatDate(iso) {
  // Si la fecha no tiene el formato AAAA-MM-DD, muestra 'Sin fecha'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')) return 'Sin fecha';
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day); // los meses en Date van de 0 a 11
  // Formato de Colombia (es-CO): día, mes corto y año
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** plural(3, 'tarea', 'tareas') → "3 tareas" */
export function plural(count, singular, pluralForm) {
  // Usa la palabra en singular si es 1 y en plural en los demás casos
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
