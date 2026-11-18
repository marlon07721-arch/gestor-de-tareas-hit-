/**
 * <task-toolbar>: botones de acción, buscador, filtro por categoría y filtro por estado.
 * Responsable: Juan
 *
 * Emite: CREATE_REQUEST, IMPORT_REQUEST, CATEGORIES_REQUEST, COMPLETE_ALL_REQUEST,
 *        CLEAR_REQUEST, FILTER_CHANGE { status, category, query }
 * Uso: toolbar.updateStats({ total, pending, completed }), toolbar.setCategories(categorias, elegida),
 *      toolbar.selectCategory(id), toolbar.reset(), toolbar.focusSearch(), toolbar.focusCreate()
 */
import { useStyles } from '../utils/styles.js';
import { icons } from '../utils/icons.js';
import { EVENTS, emit } from '../utils/events.js';
import { CATEGORY_FILTER, STATUS } from '../utils/filter.js';

const template = document.createElement('template');
template.innerHTML = `

  <div class="toolbar">
    <!-- Botones de acción -->
    <div class="actions">
      <button class="btn btn--primary" type="button" id="btn-create">${icons.plus}Nueva tarea</button>
      <button class="btn" type="button" id="btn-import">${icons.download}Importar</button>
      <button class="btn" type="button" id="btn-categories">${icons.tag}Categorías</button>
      <span class="spacer"></span>
      <button class="btn" type="button" id="btn-complete"
        title="Marca como terminadas las tareas pendientes que estás viendo">${icons.checkAll}Marcar terminadas</button>
      <button class="btn btn--danger" type="button" id="btn-clear">${icons.trash}Vaciar lista</button>
    </div>

    <!-- Buscador y filtro por estado -->
    <div class="filters-row">
      <!-- Buscador por título o ID -->
      <div class="search" role="search">
        ${icons.search}
        <label class="sr-only" for="search">Buscar tareas</label>
        <input class="input" id="search" type="search" placeholder="Buscar tarea o ID..." title="Busca en el título, la descripción o el ID" autocomplete="off">
      </div>

      <!-- Filtro por categoría: las opciones se llenan con setCategories() -->
      <label class="sr-only" for="category-filter">Filtrar por categoría</label>
      <select class="input category-filter" id="category-filter">
        <option value="${CATEGORY_FILTER.ALL}">Todas las categorías</option>
      </select>

      <!-- Filtro por estado, con contadores -->
      <fieldset class="filters">
        <legend class="sr-only">Filtrar por estado</legend>
        <label><input type="radio" name="status" value="${STATUS.ALL}" checked>
          <span class="chip">Todas <span class="count" id="count-total">0</span></span></label>
        <label><input type="radio" name="status" value="${STATUS.PENDING}">
          <span class="chip">Pendientes <span class="count" id="count-pending">0</span></span></label>
        <label><input type="radio" name="status" value="${STATUS.COMPLETED}">
          <span class="chip">Completadas <span class="count" id="count-completed">0</span></span></label>
      </fieldset>
    </div>
  </div>
`;

// Clase del componente <task-toolbar>
class TaskToolbar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Estilos: css/shared/reset + buttons + estos + css/responsive (ver js/utils/styles.js)
    useStyles(this.shadowRoot, ['shared/forms', 'components/task-toolbar']);
    this.shadowRoot.append(template.content.cloneNode(true));

    const root = this.shadowRoot;
    // Cada botón solo avisa (emite un evento); task-app decide qué hacer
    root.getElementById('btn-create').addEventListener('click', () => emit(this, EVENTS.CREATE_REQUEST));
    root.getElementById('btn-import').addEventListener('click', () => emit(this, EVENTS.IMPORT_REQUEST));
    root.getElementById('btn-categories').addEventListener('click', () => emit(this, EVENTS.CATEGORIES_REQUEST));
    root.getElementById('btn-complete').addEventListener('click', () => emit(this, EVENTS.COMPLETE_ALL_REQUEST));
    root.getElementById('btn-clear').addEventListener('click', () => emit(this, EVENTS.CLEAR_REQUEST));

    // Buscador: cada vez que se escribe, se envían los filtros
    const search = root.getElementById('search');
    search.addEventListener('input', () => this.#emitFilters());
    // Esc borra la búsqueda.
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        search.value = '';
        this.#emitFilters();
      }
    });
    // El evento change de los radios sube (burbujea) hasta el fieldset.
    root.querySelector('.filters').addEventListener('change', () => this.#emitFilters());
    // Cambiar la categoría también envía los filtros
    root.getElementById('category-filter').addEventListener('change', () => this.#emitFilters());
  }

  /**
   * Llena el filtro por categoría: "Todas", "Sin categoría" y una opción por categoría.
   * selected: la opción que debe quedar elegida (todas, sin categoría o un id).
   */
  setCategories(categories, selected = CATEGORY_FILTER.ALL) {
    const select = this.shadowRoot.getElementById('category-filter');
    select.innerHTML = '';
    select.append(new Option('Todas las categorías', CATEGORY_FILTER.ALL));
    select.append(new Option('Sin categoría', CATEGORY_FILTER.NONE));
    for (const category of categories) {
      // new Option(texto, valor) usa textContent: el nombre lo escribió el usuario
      select.append(new Option(category.name, category.id));
    }
    select.value = selected;
  }

  /** Actualiza los contadores y deshabilita los botones que no aplican. */
  updateStats({ total, pending, completed }) {
    const root = this.shadowRoot;
    root.getElementById('count-total').textContent = total;
    root.getElementById('count-pending').textContent = pending;
    root.getElementById('count-completed').textContent = completed;
    root.getElementById('btn-clear').disabled = total === 0;
    root.getElementById('btn-complete').disabled = pending === 0;
  }

  /** Elige una categoría en el filtro (ej.: al pulsar la etiqueta de una tarea) y filtra. */
  selectCategory(id) {
    const select = this.shadowRoot.getElementById('category-filter');
    select.value = id;
    this.#emitFilters();
  }

  /** Limpia la búsqueda y vuelve a "Todas" en estado y categoría. */
  reset() {
    this.shadowRoot.getElementById('search').value = '';
    this.shadowRoot.getElementById('category-filter').value = CATEGORY_FILTER.ALL;
    this.shadowRoot.querySelector(`input[value="${STATUS.ALL}"]`).checked = true;
    this.#emitFilters();
  }

  focusSearch() {
    this.shadowRoot.getElementById('search').focus();
  }

  focusCreate() {
    this.shadowRoot.getElementById('btn-create').focus();
  }

  // Envía a task-app el estado, la categoría elegida y el texto del buscador
  #emitFilters() {
    const root = this.shadowRoot;
    emit(this, EVENTS.FILTER_CHANGE, {
      status: root.querySelector('input[name="status"]:checked').value,
      category: root.getElementById('category-filter').value,
      query: root.getElementById('search').value,
    });
  }
}

// Registra la etiqueta <task-toolbar>
customElements.define('task-toolbar', TaskToolbar);
