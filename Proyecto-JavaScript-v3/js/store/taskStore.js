/**
 * Store central de tareas. Es el ÚNICO módulo que modifica los datos.
 * Responsable: Marlon
 *
 * Los componentes leen con getAll() y piden cambios con add(), update(),
 * toggle(), remove(), importTodos(), markCompleted() y clear().
 * Las categorías se leen con getCategories() y se cambian con addCategory(),
 * updateCategory() y removeCategory(). La categoría del sistema "Importadas"
 * siempre aparece en getCategories() y no se puede renombrar ni eliminar.
 * Cada cambio se guarda en localStorage. Después de cada acción, <task-app>
 * vuelve a pintar la lista.
 */
// Funciones del modelo, de los IDs y del guardado que usa el store
import { createApiTask, createLocalTask, isReadOnly, SOURCE, validateTaskInput } from '../models/task.js';
import { createCategory, IMPORT_CATEGORY, isSystemCategory, validateCategoryName } from '../models/category.js';
import { apiId, categoryId, localId } from '../utils/id.js';
import { loadState, saveState } from '../services/storage.js';

// Errores propios: así <task-app> sabe qué tipo de error ocurrió.
// Error cuando los datos del formulario no son válidos
export class ValidationError extends Error {
  constructor(errors) {
    super('Datos de la tarea no válidos.');
    this.name = 'ValidationError';
    this.errors = errors; // { title?, description?, createdAt?, categoryId?, name? }
  }
}

// Error cuando se intenta modificar una tarea importada
export class ReadOnlyTaskError extends Error {
  constructor() {
    super('Las tareas importadas no se pueden modificar, solo eliminar.');
    this.name = 'ReadOnlyTaskError';
  }
}

// Error cuando no existe una tarea con ese ID
export class TaskNotFoundError extends Error {
  constructor(id) {
    super(`No se encontró la tarea ${id}.`);
    this.name = 'TaskNotFoundError';
  }
}

// Mensaje cuando se intenta cambiar la categoría del sistema
const SYSTEM_CATEGORY_MESSAGE = `"${IMPORT_CATEGORY.name}" es una categoría del sistema: no se puede renombrar ni eliminar.`;

// Error cuando no existe una categoría con ese ID
export class CategoryNotFoundError extends Error {
  constructor(id) {
    super(`No se encontró la categoría ${id}. Puede que la hayan eliminado.`);
    this.name = 'CategoryNotFoundError';
  }
}

// Error cuando el navegador no deja guardar
export class StorageError extends Error {
  constructor() {
    super('No se pudieron guardar los cambios en el navegador.');
    this.name = 'StorageError';
  }
}

// Clase que maneja todas las tareas de la aplicación
class TaskStore {
  // # = campo privado: solo se puede usar dentro de esta clase.
  #state = loadState(); // { version, nextSeq, tasks, nextCategorySeq, categories }

  // Devuelve todas las tareas
  getAll() {
    // Se devuelven copias para que nadie modifique los datos desde afuera.
    return this.#state.tasks.map((task) => ({ ...task }));
  }

  // Devuelve una tarea por su ID, o null si no existe
  getById(id) {
    const task = this.#find(id);
    return task ? { ...task } : null;
  }

  /** Ids originales (de la API) de las tareas ya importadas. */
  importedExternalIds() {
    const ids = this.#state.tasks
      .filter((task) => task.source === SOURCE.API)
      .map((task) => task.externalId);
    return new Set(ids);
  }

  // Crea una tarea nueva
  add({ title, description = '', createdAt, completed = false, categoryId = null }) {
    const { valid, errors } = validateTaskInput({ title, description, createdAt });
    // La categoría es opcional, pero si viene debe existir y no puede ser "Importadas"
    this.#checkLocalCategory(categoryId, errors);
    // Si los datos no son válidos, se detiene y avisa con un error
    if (!valid || errors.categoryId) throw new ValidationError(errors);

    const task = createLocalTask({
      id: localId(this.#state.nextSeq),
      title,
      description,
      createdAt,
      completed,
      categoryId,
    });
    // Suma 1 al consecutivo para la próxima tarea
    this.#state.nextSeq += 1;
    this.#state.tasks.unshift(task); // unshift: la agrega al inicio de la lista
    this.#save();
    return { ...task };
  }

  // Edita una tarea existente
  update(id, changes) {
    const task = this.#getEditable(id);
    // Une los cambios con los datos actuales (?? deja el valor anterior si no hay cambio)
    const next = {
      title: changes.title ?? task.title,
      description: changes.description ?? task.description ?? '',
      createdAt: changes.createdAt ?? task.createdAt,
      completed: changes.completed ?? task.completed,
      // Aquí no sirve ??: null es un valor válido (quitar la categoría).
      // Solo se conserva la anterior si no se envió categoryId.
      categoryId: changes.categoryId === undefined ? task.categoryId : changes.categoryId,
    };
    const { valid, errors } = validateTaskInput(next);
    this.#checkLocalCategory(next.categoryId, errors);
    if (!valid || errors.categoryId) throw new ValidationError(errors);

    task.title = String(next.title).trim();
    task.description = String(next.description).trim();
    task.createdAt = next.createdAt;
    task.completed = Boolean(next.completed);
    task.categoryId = next.categoryId || null;
    this.#save();
    return { ...task };
  }

  // Cambia una tarea de pendiente a completada, o al revés
  toggle(id) {
    const task = this.#getEditable(id);
    task.completed = !task.completed;
    this.#save();
    return { ...task };
  }

  // Elimina una tarea (también funciona con las importadas)
  remove(id) {
    const index = this.#state.tasks.findIndex((task) => task.id === id);
    if (index === -1) throw new TaskNotFoundError(id);
    this.#state.tasks.splice(index, 1);
    this.#save();
  }

  /**
   * Importa tareas de la API, omitiendo las que ya existen.
   * Todas las importadas quedan en la categoría elegida (o sin categoría si es null).
   * Devuelve { added, skipped }: cuántas se agregaron y cuántas ya estaban.
   */
  importTodos(todos, categoryId = null) {
    if (!this.#categoryExists(categoryId)) throw new CategoryNotFoundError(categoryId);

    // IDs que ya están en la lista, para no repetir
    const existing = new Set(this.#state.tasks.map((task) => task.id));
    const newTasks = [];
    let skipped = 0;

    // Revisa una por una las tareas que se quieren importar
    for (const todo of todos) {
      if (existing.has(apiId(todo.id))) {
        skipped += 1;
      } else {
        const task = createApiTask(todo, categoryId);
        existing.add(task.id);
        newTasks.push(task);
      }
    }

    // Solo guarda si hubo tareas nuevas
    if (newTasks.length > 0) {
      this.#state.tasks.unshift(...newTasks);
      this.#save();
    }
    return { added: newTasks.length, skipped };
  }

  /**
   * Marca como completadas las tareas indicadas. Las importadas se omiten
   * porque son de solo lectura. Devuelve cuántas tareas cambiaron.
   */
  markCompleted(ids) {
    // Cuenta cuántas tareas se marcaron
    let changed = 0;
    for (const task of this.#state.tasks) {
      if (ids.includes(task.id) && !isReadOnly(task) && !task.completed) {
        task.completed = true;
        changed += 1;
      }
    }
    if (changed > 0) this.#save();
    return changed;
  }

  /** Vacía la lista. nextSeq se conserva para no reutilizar ids. Las categorías se mantienen. */
  clear() {
    this.#state.tasks = [];
    this.#save();
  }

  // ===== Categorías =====

  /** Devuelve copias de las categorías: primero "Importadas" y luego las del usuario por nombre (A → Z). */
  getCategories() {
    const userCategories = this.#state.categories
      .map((category) => ({ ...category }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    return [{ ...IMPORT_CATEGORY }, ...userCategories];
  }

  /** Cuántas tareas tiene cada categoría: { 'CAT-000001': 3, ... } */
  countByCategory() {
    const counts = {};
    for (const task of this.#state.tasks) {
      if (task.categoryId) counts[task.categoryId] = (counts[task.categoryId] ?? 0) + 1;
    }
    return counts;
  }

  // Crea una categoría nueva
  addCategory(name) {
    // getCategories() incluye "Importadas": así tampoco se puede repetir ese nombre
    const { valid, errors } = validateCategoryName(name, this.getCategories());
    if (!valid) throw new ValidationError(errors);

    const category = createCategory({ id: categoryId(this.#state.nextCategorySeq), name });
    this.#state.nextCategorySeq += 1;
    this.#state.categories.push(category);
    this.#save();
    return { ...category };
  }

  // Cambia el nombre de una categoría. Sus tareas la siguen teniendo (se guarda el id, no el nombre).
  updateCategory(id, name) {
    if (isSystemCategory(id)) throw new ValidationError({ name: SYSTEM_CATEGORY_MESSAGE });
    const category = this.#findCategory(id);
    if (!category) throw new CategoryNotFoundError(id);
    // currentId = id: la categoría puede "renombrarse" con su mismo nombre sin chocar consigo misma
    const { valid, errors } = validateCategoryName(name, this.getCategories(), id);
    if (!valid) throw new ValidationError(errors);

    category.name = String(name).trim();
    this.#save();
    return { ...category };
  }

  /**
   * Elimina una categoría. Sus tareas NO se borran: quedan sin categoría.
   * Devuelve cuántas tareas quedaron sin categoría.
   */
  removeCategory(id) {
    if (isSystemCategory(id)) throw new ValidationError({ name: SYSTEM_CATEGORY_MESSAGE });
    const index = this.#state.categories.findIndex((category) => category.id === id);
    if (index === -1) throw new CategoryNotFoundError(id);

    this.#state.categories.splice(index, 1);
    let released = 0;
    for (const task of this.#state.tasks) {
      if (task.categoryId === id) {
        task.categoryId = null;
        released += 1;
      }
    }
    this.#save();
    return released;
  }

  // Busca la tarea original (no una copia)
  #find(id) {
    return this.#state.tasks.find((task) => task.id === id);
  }

  // Busca la categoría original (no una copia)
  #findCategory(id) {
    return this.#state.categories.find((category) => category.id === id);
  }

  // null (sin categoría) siempre es válido; un id debe existir ("Importadas" siempre existe)
  #categoryExists(id) {
    return id === null || id === undefined || id === '' || isSystemCategory(id) || Boolean(this.#findCategory(id));
  }

  // Revisa la categoría de una tarea creada por el usuario: debe existir y no puede ser "Importadas"
  #checkLocalCategory(id, errors) {
    if (isSystemCategory(id)) errors.categoryId = `La categoría "${IMPORT_CATEGORY.name}" es solo para tareas importadas.`;
    else if (!this.#categoryExists(id)) errors.categoryId = 'La categoría elegida ya no existe.';
  }

  // Busca una tarea que se pueda editar; si no existe o es importada, lanza un error
  #getEditable(id) {
    const task = this.#find(id);
    if (!task) throw new TaskNotFoundError(id);
    if (isReadOnly(task)) throw new ReadOnlyTaskError();
    return task;
  }

  // Guarda el estado en localStorage
  #save() {
    const saved = saveState(this.#state);
    if (!saved) {
      // Si no se pudo guardar, se deshace el cambio volviendo a lo último guardado.
      this.#state = loadState();
      throw new StorageError();
    }
  }
}

// Una sola instancia para toda la app.
export const taskStore = new TaskStore();
