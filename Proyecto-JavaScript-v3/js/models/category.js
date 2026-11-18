/**
 * Modelo de categoría y validaciones.
 * Responsable: Marlon
 *
 * Estructura (JSON) de una categoría:
 * {
 *   "id": "CAT-000001",
 *   "name": "Trabajo"
 * }
 *
 * Cada tarea guarda la categoría a la que pertenece en "categoryId"
 * (o null si no tiene categoría).
 *
 * Además de las que crea el usuario, existe la categoría del sistema "Importadas"
 * (IMPORT_CATEGORY): siempre existe, viene elegida al importar y no se puede
 * renombrar ni eliminar. No se guarda en localStorage porque es fija.
 */
import { categorySequence } from '../utils/id.js';

// Largo mínimo y máximo del nombre de una categoría
export const CATEGORY_NAME_MIN = 2;
export const CATEGORY_NAME_MAX = 30;

// Categoría del sistema para las tareas importadas (Object.freeze: nadie la puede modificar)
export const IMPORT_CATEGORY = Object.freeze({ id: 'CAT-IMPORT', name: 'Importadas', system: true });

/** Dice si una categoría es la del sistema (no se renombra ni se elimina). */
export function isSystemCategory(id) {
  return id === IMPORT_CATEGORY.id;
}

// Cantidad de colores distintos para las etiquetas de categoría (ver task-item.js)
export const CATEGORY_COLORS = 6;

/**
 * Compara nombres sin importar mayúsculas, tildes ni espacios de los extremos.
 * Así "Trabajo", "trabajo" y " TRABAJÓ " cuentan como el mismo nombre.
 */
function sameName(a, b) {
  const clean = (text) =>
    String(text ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  return clean(a) === clean(b);
}

/**
 * Valida el nombre de una categoría.
 * - categories: las categorías que ya existen (para no repetir nombres).
 * - currentId: al renombrar, el id de la categoría que se edita (puede conservar su nombre).
 * Devuelve { valid, errors }, igual que validateTaskInput.
 */
export function validateCategoryName(name, categories = [], currentId = null) {
  const errors = {};
  const cleanName = String(name ?? '').trim();

  if (!cleanName) {
    errors.name = 'Escribe el nombre de la categoría.';
  } else if (cleanName.length < CATEGORY_NAME_MIN) {
    errors.name = `El nombre debe tener al menos ${CATEGORY_NAME_MIN} caracteres.`;
  } else if (cleanName.length > CATEGORY_NAME_MAX) {
    errors.name = `El nombre no puede superar ${CATEGORY_NAME_MAX} caracteres.`;
  } else if (categories.some((cat) => cat.id !== currentId && sameName(cat.name, cleanName))) {
    errors.name = `Ya existe una categoría llamada "${cleanName}".`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// Crea el objeto de una categoría
export function createCategory({ id, name }) {
  return { id, name: String(name).trim() };
}

/**
 * Color de una categoría: "import" para la del sistema y un número
 * (1 a CATEGORY_COLORS) para las demás, según su consecutivo.
 * Siempre da el mismo color para la misma categoría.
 */
export function categoryColor(id) {
  if (isSystemCategory(id)) return 'import';
  const n = categorySequence(id);
  return n > 0 ? ((n - 1) % CATEGORY_COLORS) + 1 : 1;
}

/** Comprueba que un objeto leído de localStorage tenga la forma de una categoría. */
export function isValidStoredCategory(category) {
  return Boolean(category && typeof category.id === 'string' && typeof category.name === 'string');
}
