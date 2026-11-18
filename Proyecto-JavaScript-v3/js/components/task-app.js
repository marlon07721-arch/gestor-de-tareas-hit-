/**
 * <task-app>: componente raíz. Une la interfaz con el store.
 * Responsable: Juan (interfaz) + Marlon (conexión con el store) — punto de integración.
 *
 * Flujo: un componente hijo emite un evento → task-app llama al store →
 * el store valida y guarda en localStorage → task-app vuelve a pintar (#render).
 */
import { useStyles } from '../utils/styles.js';
import './task-toolbar.js';
import './task-list.js';
import './modals/task-form-modal.js';
import './modals/import-modal.js';
import './modals/confirm-dialog.js';
import './toast-message.js';
import './modals/category-manager.js';

import { EVENTS } from '../utils/events.js';
import { CATEGORY_FILTER, countStats, filterTasks, STATUS } from '../utils/filter.js';
import { plural } from '../utils/format.js';
import { isReadOnly } from '../models/task.js';
import { taskStore, ValidationError } from '../store/taskStore.js';
import { IMPORT_CATEGORY } from '../models/category.js';

const template = document.createElement('template');
template.innerHTML = `

  <!-- Contenedor de toda la página -->
  <div class="shell">
    <!-- Encabezado con el título de la aplicación -->
    <header class="app-header">
      <div>
        <h1>Gestor de tareas</h1>
        <p class="subtitle">Organiza, importa y completa tus pendientes.</p>
      </div>
      <!-- Barra de progreso: porcentaje de tareas completadas -->
      <div class="progress">
        <div class="progress__label"><span id="progress-label">Progreso</span><strong id="progress-value">0%</strong></div>
        <div class="progress__track" id="progress-track" role="progressbar" aria-labelledby="progress-label" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="progress__bar" id="progress-bar"></div>
        </div>
      </div>
    </header>

    <!-- Contenido principal -->
    <main>
      <!-- Botones de acción, buscador y filtro -->
      <task-toolbar></task-toolbar>
      <!-- Resumen de cuántas tareas hay (aria-live lo anuncia al lector de pantalla) -->
      <p class="summary" aria-live="polite"></p>
      <!-- Lista de tareas -->
      <task-list></task-list>
    </main>

    <!-- Pie de página -->
    <footer>Tus tareas se guardan en este navegador.</footer>
  </div>

  <!-- Ventanas y avisos: formulario, importar, confirmación y mensajes breves.
       Están ocultos hasta que se usan. -->
  <task-form-modal></task-form-modal>
  <import-modal></import-modal>
  <category-manager></category-manager>
  <confirm-dialog></confirm-dialog>
  <toast-message></toast-message>
`;

// Clase del componente principal <task-app>
class TaskApp extends HTMLElement {
  // Filtros actuales: estado, categoría y texto del buscador
  #filters = { status: STATUS.ALL, category: CATEGORY_FILTER.ALL, query: '' };

  // Se ejecuta al crear el componente
  constructor() {
    super();
    // Crea el Shadow DOM y copia dentro el contenido del template
    this.attachShadow({ mode: 'open' });
    // Estilos: css/shared/reset + buttons + estos + css/responsive (ver js/utils/styles.js)
    useStyles(this.shadowRoot, ['components/task-app']);
    this.shadowRoot.append(template.content.cloneNode(true));

    // Accesos directos a los componentes hijos.
    const root = this.shadowRoot;
    this.toolbar = root.querySelector('task-toolbar');
    this.list = root.querySelector('task-list');
    this.form = root.querySelector('task-form-modal');
    this.importer = root.querySelector('import-modal');
    this.confirm = root.querySelector('confirm-dialog');
    this.toast = root.querySelector('toast-message');
    this.categories = root.querySelector('category-manager');

    this.#listen();
  }

  // Se ejecuta cuando el componente aparece en la página: dibuja la lista por primera vez
  connectedCallback() {
    this.#render();
  }

  /**
   * Los eventos de los hijos tienen bubbles + composed, así que suben hasta
   * el shadowRoot de task-app y aquí se escuchan todos.
   */
  #listen() {
    const root = this.shadowRoot;
    // Cada evento llama a la función que le corresponde
    root.addEventListener(EVENTS.CREATE_REQUEST, () => this.form.open(null, taskStore.getCategories()));
    root.addEventListener(EVENTS.EDIT, (e) => this.#edit(e.detail.id));
    root.addEventListener(EVENTS.SAVE, (e) => this.#save(e.detail));
    root.addEventListener(EVENTS.TOGGLE, (e) => this.#toggle(e.detail.id));
    root.addEventListener(EVENTS.DELETE, (e) => this.#delete(e.detail.id));
    root.addEventListener(EVENTS.IMPORT_REQUEST, () => this.#openImporter());
    root.addEventListener(EVENTS.IMPORT, (e) => this.#import(e.detail.todos, e.detail.categoryId));
    root.addEventListener(EVENTS.COMPLETE_ALL_REQUEST, () => this.#completeVisible());
    root.addEventListener(EVENTS.CLEAR_REQUEST, () => this.#clear());
    root.addEventListener(EVENTS.FILTER_CHANGE, (e) => {
      this.#filters = e.detail;
      this.#render();
    });
    // Clic en la etiqueta de categoría de una tarea: filtra por esa categoría
    root.addEventListener(EVENTS.FILTER_CATEGORY, (e) => this.toolbar.selectCategory(e.detail.id));
    root.addEventListener(EVENTS.FILTER_RESET_REQUEST, () => {
      this.toolbar.reset();
      this.toolbar.focusSearch();
    });
    // Categorías
    root.addEventListener(EVENTS.CATEGORIES_REQUEST, () => {
      this.categories.open(taskStore.getCategories(), taskStore.countByCategory());
    });
    root.addEventListener(EVENTS.CATEGORY_SAVE, (e) => this.#saveCategory(e.detail));
    root.addEventListener(EVENTS.CATEGORY_DELETE, (e) => this.#deleteCategory(e.detail.id));
  }

  /** Vuelve a pintar la lista, los contadores, el resumen y la barra de progreso. */
  #render() {
    // Pide las tareas y las categorías al store
    const all = taskStore.getAll();
    const categories = taskStore.getCategories();
    // Si se filtraba por una categoría que ya no existe, se vuelve a "Todas las categorías"
    const { category } = this.#filters;
    if (category !== CATEGORY_FILTER.ALL && category !== CATEGORY_FILTER.NONE && !categories.some((cat) => cat.id === category)) {
      this.#filters = { ...this.#filters, category: CATEGORY_FILTER.ALL };
    }
    // Aplica los filtros y cuenta
    const visible = filterTasks(all, this.#filters);
    const stats = countStats(all);

    // Actualiza los contadores, el filtro de categorías y la lista
    this.toolbar.updateStats(stats);
    this.toolbar.setCategories(categories, this.#filters.category);
    this.list.update({ tasks: visible, total: all.length, categories });

    // Escribe el texto del resumen
    const summary = this.shadowRoot.querySelector('.summary');
    const isFiltered =
      this.#filters.query.trim() !== '' ||
      this.#filters.status !== STATUS.ALL ||
      this.#filters.category !== CATEGORY_FILTER.ALL;
    if (all.length === 0) {
      summary.textContent = '';
    } else if (isFiltered) {
      summary.textContent = `Mostrando ${visible.length} de ${plural(all.length, 'tarea', 'tareas')}`;
    } else {
      summary.textContent = `${plural(all.length, 'tarea', 'tareas')} · ${plural(stats.pending, 'pendiente', 'pendientes')}`;
    }

    // Calcula el porcentaje y dibuja la barra de progreso
    const percent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    this.shadowRoot.getElementById('progress-value').textContent = `${percent}%`;
    this.shadowRoot.getElementById('progress-bar').style.width = `${percent}%`;
    this.shadowRoot.getElementById('progress-track').setAttribute('aria-valuenow', percent);
  }

  /**
   * Ejecuta una acción del store. Si sale bien muestra el mensaje de éxito;
   * si falla, muestra el error. Siempre vuelve a pintar.
   * Devuelve lo que devuelva la acción, o undefined si falló.
   */
  #run(action, successMessage) {
    let result;
    try {
      result = action();
      if (successMessage) this.toast.show(successMessage, 'success');
    } catch (error) {
      this.toast.show(error.message, 'error');
      console.error(error);
    }
    this.#render();
    return result;
  }

  // Abre el formulario para editar (las tareas importadas no se pueden editar)
  #edit(id) {
    const task = taskStore.getById(id);
    if (!task) return;
    if (isReadOnly(task)) {
      this.toast.show('Las tareas importadas no se pueden editar, solo eliminar.', 'info');
      return;
    }
    this.form.open(task, taskStore.getCategories());
  }

  // Guarda el formulario: con id edita, sin id crea una tarea nueva
  #save({ id, data }) {
    let saved = null;
    try {
      saved = id ? taskStore.update(id, data) : taskStore.add(data);
      this.form.close();
      this.toast.show(id ? 'Cambios guardados' : 'Tarea creada', 'success');
    } catch (error) {
      if (error instanceof ValidationError) {
        this.form.showErrors(error.errors); // el formulario se queda abierto con los errores
      } else {
        this.form.close();
        this.toast.show(error.message, 'error');
      }
    }
    this.#render();
    // La lista se volvió a crear: el foco pasa a la tarea creada o editada.
    if (saved) this.list.focusTask(saved.id);
  }

  // Marca o desmarca una tarea
  #toggle(id) {
    this.#run(() => taskStore.toggle(id));
    // La lista se volvió a crear: se devuelve el foco al círculo de la misma tarea.
    this.list.focusTask(id);
  }

  // Pide confirmación y elimina una tarea
  #delete(id) {
    const task = taskStore.getById(id);
    if (!task) return;
    this.confirm.ask({
      title: '¿Eliminar esta tarea?',
      message: `"${task.title}" se eliminará de forma permanente.`,
      confirmText: 'Eliminar',
      tone: 'danger',
      onConfirm: () => {
        this.#run(() => taskStore.remove(id), 'Tarea eliminada');
        this.toolbar.focusCreate(); // el botón de la tarea eliminada ya no existe
      },
    });
  }

  /**
   * Abre la ventana de importar. Si la lista está filtrada por una categoría,
   * esa categoría aparece elegida para las tareas importadas.
   */
  #openImporter() {
    const categories = taskStore.getCategories();
    // Por defecto se propone "Importadas"; si la lista está filtrada por una categoría, se propone esa
    const filtered = categories.some((cat) => cat.id === this.#filters.category);
    this.importer.open(taskStore.importedExternalIds(), categories, filtered ? this.#filters.category : IMPORT_CATEGORY.id);
  }

  // Importa las tareas elegidas en la categoría elegida y avisa cuántas se agregaron
  #import(todos, categoryId = null) {
    this.importer.close(); // se cierra primero para que el aviso no quede tapado por el modal
    const result = this.#run(() => taskStore.importTodos(todos, categoryId));
    this.toolbar.focusCreate(); // por si se abrió desde "Aún no tienes tareas", que ya no se ve
    if (!result) return; // falló: #run ya mostró el error

    let message = result.added > 0
      ? plural(result.added, 'tarea importada', 'tareas importadas')
      : 'No se importó ninguna tarea nueva';
    // Dice en qué categoría quedaron
    const category = taskStore.getCategories().find((cat) => cat.id === categoryId);
    if (result.added > 0 && category) message += ` en "${category.name}"`;
    if (result.skipped > 0) message += ` · ${plural(result.skipped, 'ya existía', 'ya existían')}`;
    this.toast.show(message, result.added > 0 ? 'success' : 'info');
  }

  /**
   * Crea (sin id) o renombra (con id) una categoría.
   * La ventana de categorías se queda abierta y muestra el resultado en su línea de estado.
   */
  #saveCategory({ id, name }) {
    try {
      const category = id ? taskStore.updateCategory(id, name) : taskStore.addCategory(name);
      this.categories.update(taskStore.getCategories(), taskStore.countByCategory());
      if (id) {
        this.categories.announce(`Categoría renombrada a "${category.name}".`);
        this.categories.finishRename(id);
      } else {
        this.categories.announce(`Categoría "${category.name}" creada.`);
        this.categories.clearNewName();
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        this.categories.showErrors(error.errors, id); // por ejemplo, un nombre repetido
      } else {
        this.categories.announce(error.message, 'error');
        console.error(error);
      }
    }
    this.#render(); // las etiquetas de las tareas y el filtro muestran el nombre nuevo
  }

  // Pide confirmación y elimina una categoría; sus tareas quedan sin categoría
  #deleteCategory(id) {
    const category = taskStore.getCategories().find((cat) => cat.id === id);
    if (!category) return;
    const total = taskStore.countByCategory()[id] ?? 0;
    const detail = total > 0
      ? `${plural(total, 'tarea quedará', 'tareas quedarán')} sin categoría; no se borra ninguna.`
      : 'No tiene tareas.';

    this.confirm.ask({
      title: '¿Eliminar la categoría?',
      message: `"${category.name}" se eliminará. ${detail}`,
      confirmText: 'Eliminar categoría',
      tone: 'danger',
      onConfirm: () => {
        try {
          taskStore.removeCategory(id);
          this.categories.announce(`Categoría "${category.name}" eliminada.`);
        } catch (error) {
          this.categories.announce(error.message, 'error');
          console.error(error);
        }
        this.categories.update(taskStore.getCategories(), taskStore.countByCategory());
        this.#render();
      },
    });
  }

  /**
   * "Marcar terminadas": marca como completadas las tareas pendientes que se
   * están viendo (respeta la búsqueda y el filtro). Las importadas se omiten.
   */
  #completeVisible() {
    const visible = filterTasks(taskStore.getAll(), this.#filters);
    const candidates = visible.filter((task) => !task.completed && !isReadOnly(task));
    const skippedImported = visible.filter((task) => !task.completed && isReadOnly(task)).length;

    if (candidates.length === 0) {
      const message = skippedImported > 0
        ? 'Las tareas pendientes visibles son importadas y no se pueden modificar.'
        : 'No hay tareas pendientes para marcar.';
      this.toast.show(message, 'info');
      return;
    }

    let note = '';
    if (skippedImported > 0) note = ` Se omitirán ${plural(skippedImported, 'tarea importada', 'tareas importadas')}.`;

    this.confirm.ask({
      title: '¿Marcar como terminadas?',
      message: `Se marcará como completada: ${plural(candidates.length, 'tarea pendiente', 'tareas pendientes')}.${note}`,
      confirmText: 'Marcar terminadas',
      onConfirm: () => {
        const ids = candidates.map((task) => task.id);
        const changed = this.#run(() => taskStore.markCompleted(ids));
        if (changed) this.toast.show(`${plural(changed, 'tarea marcada', 'tareas marcadas')} como terminada${changed === 1 ? '' : 's'}`, 'success');
      },
    });
  }

  // Pide confirmación y vacía toda la lista
  #clear() {
    const total = taskStore.getAll().length;
    if (total === 0) return;
    this.confirm.ask({
      title: '¿Vaciar la lista?',
      message: `Se eliminarán ${plural(total, 'tarea', 'tareas')}, incluidas las importadas. Esta acción no se puede deshacer.`,
      confirmText: 'Vaciar lista',
      tone: 'danger',
      onConfirm: () => {
        this.#run(() => taskStore.clear(), 'Lista vaciada');
        this.toolbar.focusCreate(); // "Vaciar lista" queda deshabilitado
      },
    });
  }
}

// Registra la etiqueta <task-app> para poder usarla en el HTML
customElements.define('task-app', TaskApp);
