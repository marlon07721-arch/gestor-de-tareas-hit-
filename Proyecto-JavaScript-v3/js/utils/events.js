/**
 * Contrato de eventos entre componentes.
 * Responsables: Juan y Marlon (compartido — no cambiar sin avisar al otro)
 *
 * Todos los eventos usan bubbles + composed para atravesar el Shadow DOM
 * y llegar hasta <task-app>, que es quien habla con el store.
 */
// Nombres de todos los eventos de la app.
// Se guardan en constantes para no escribir mal un nombre.
export const EVENTS = Object.freeze({
  CREATE_REQUEST: 'task:create-request', //  {}            abrir formulario vacío
  EDIT: 'task:edit', //                      { id }        abrir formulario con la tarea
  SAVE: 'task:save', //                      { id?, data } guardar desde el formulario (data incluye categoryId)
  TOGGLE: 'task:toggle', //                  { id }        cambiar completada/pendiente
  DELETE: 'task:delete', //                  { id }        eliminar una tarea
  IMPORT_REQUEST: 'task:import-request', //  {}            abrir modal de importar
  IMPORT: 'task:import', //                  { todos, categoryId } importar las seleccionadas en una categoría
  COMPLETE_ALL_REQUEST: 'task:complete-all-request', // {} marcar visibles como terminadas
  CLEAR_REQUEST: 'task:clear-request', //    {}            vaciar la lista
  FILTER_CHANGE: 'filter:change', //         { status, category, query }
  FILTER_RESET_REQUEST: 'filter:reset-request', // {}      limpiar búsqueda y filtros
  FILTER_CATEGORY: 'filter:category', //     { id }        filtrar por una categoría (clic en su etiqueta)
  CATEGORIES_REQUEST: 'category:manage-request', // {}     abrir la ventana de categorías
  CATEGORY_SAVE: 'category:save', //         { id?, name } crear (sin id) o renombrar (con id)
  CATEGORY_DELETE: 'category:delete', //     { id }        eliminar una categoría
});

// Envía un evento con datos (detail).
// bubbles: el evento sube por los elementos padres.
// composed: el evento puede salir del Shadow DOM.
export function emit(element, name, detail = {}) {
  element.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
}
