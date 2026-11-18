/**
 * Persistencia en localStorage (estructura JSON).
 * Responsable: Marlon
 *
 * Clave: "tareas.v1"
 * Valor: {
 *   "version": 1,
 *   "nextSeq": 4,             // siguiente consecutivo de tareas locales
 *   "tasks": [ ...tareas ],
 *   "nextCategorySeq": 3,     // siguiente consecutivo de categorías
 *   "categories": [ ...categorías ]
 * }
 *
 * Los consecutivos no se reinician al vaciar o eliminar, así un id nunca se reutiliza.
 * Los datos guardados antes de existir las categorías siguen cargando: se toman
 * como "sin categorías".
 */
// Funciones para revisar lo guardado y leer el número de los IDs
import { isValidStoredTask } from '../models/task.js';
import { IMPORT_CATEGORY, isValidStoredCategory, isSystemCategory } from '../models/category.js';
import { categorySequence, localSequence } from '../utils/id.js';

// Nombre con el que se guardan los datos en localStorage
export const STORAGE_KEY = 'tareas.v1';

// Estado inicial cuando no hay nada guardado
const emptyState = () => ({ version: 1, nextSeq: 1, tasks: [], nextCategorySeq: 1, categories: [] });

// El siguiente consecutivo: el guardado, pero nunca menor que el más alto ya usado + 1
function nextSequence(saved, items, readSequence) {
  const maxSeq = items.reduce((max, item) => Math.max(max, readSequence(item.id)), 0);
  const savedSeq = Number.isInteger(saved) ? saved : 1;
  return Math.max(savedSeq, maxSeq + 1);
}

export function loadState() {
  try {
    // Lee el texto guardado en el navegador
    const raw = localStorage.getItem(STORAGE_KEY);
    // Si no hay nada guardado, empieza vacío
    if (!raw) return emptyState();

    // Convierte el texto JSON en un objeto de JavaScript
    const data = JSON.parse(raw);
    // Si los datos no tienen la forma esperada, empieza vacío
    if (!data || !Array.isArray(data.tasks)) return emptyState();

    // Categorías: se queda con las válidas (si no hay, la lista queda vacía)
    // Solo se guardan las categorías del usuario: la del sistema (Importadas) es fija y no se guarda
    const categories = Array.isArray(data.categories)
      ? data.categories.filter((cat) => isValidStoredCategory(cat) && !isSystemCategory(cat.id))
      : [];
    const categoryIds = new Set([IMPORT_CATEGORY.id, ...categories.map((cat) => cat.id)]);

    // Se queda solo con las tareas que tienen todos sus datos correctos.
    // Si una tarea apunta a una categoría que ya no existe, queda sin categoría.
    const tasks = data.tasks.filter(isValidStoredTask).map((task) => ({
      ...task,
      categoryId: categoryIds.has(task.categoryId) ? task.categoryId : null,
    }));

    return {
      version: 1,
      nextSeq: nextSequence(data.nextSeq, tasks, localSequence),
      tasks,
      nextCategorySeq: nextSequence(data.nextCategorySeq, categories, categorySequence),
      categories,
    };
  } catch (error) {
    // Datos dañados o almacenamiento bloqueado: se arranca con la lista vacía.
    console.warn('[storage] No se pudieron leer las tareas guardadas:', error);
    return emptyState();
  }
}

/** Guarda el estado. Devuelve true si se guardó y false si falló (almacenamiento lleno o bloqueado). */
export function saveState(state) {
  try {
    // Convierte el estado en texto JSON y lo guarda
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error('[storage] No se pudieron guardar las tareas:', error);
    return false;
  }
}
