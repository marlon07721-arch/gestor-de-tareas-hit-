/**
 * <import-modal>: selecciona tareas del banco público (jsonplaceholder) para importarlas.
 * Responsable: Marlon
 *
 * Uso: importer.open(idsYaImportados, categorias, categoriaInicial), importer.close()
 * Emite: IMPORT { todos: [{ id, title, completed, userId }], categoryId }
 *   categoryId: la categoría elegida para TODAS las tareas importadas (null = sin categoría)
 *
 * Estados: cargando → listo | error (con botón "Reintentar").
 * Las tareas ya importadas aparecen marcadas y deshabilitadas.
 */
import { useStyles } from '../../utils/styles.js';
import { icons } from '../../utils/icons.js';
import { EVENTS, emit } from '../../utils/events.js';
import { closeOnBackdrop, escapeHTML } from '../../utils/dom.js';
import { STATUS, matchesStatus, normalize } from '../../utils/filter.js';
import { fetchTodos } from '../../services/api.js';

// Copia en memoria del banco: así no se descarga cada vez que se abre el modal.
let cachedTodos = null;

const template = document.createElement('template');
template.innerHTML = `

  <!-- Ventana de importar -->
  <dialog aria-labelledby="import-title">
    <header class="dialog__header">
      <div>
        <h2 class="dialog__title" id="import-title">Importar tareas</h2>
        <p class="dialog__subtitle">Selecciona una o varias tareas del banco público. Las tareas importadas no se pueden editar, solo eliminar.</p>
      </div>
      <button class="btn btn--ghost icon-btn" type="button" id="btn-close" aria-label="Cerrar">${icons.close}</button>
    </header>

    <div class="dialog__body">
      <!-- Estado CARGANDO -->
      <div class="state" id="state-loading" role="status">
        <span class="spinner"></span>
        <p>Cargando tareas del banco...</p>
      </div>

      <!-- Estado ERROR, con botón Reintentar -->
      <div class="state state--error" id="state-error" role="alert" hidden>
        ${icons.alert}
        <strong>No pudimos cargar las tareas</strong>
        <p id="error-message"></p>
        <button class="btn" type="button" id="btn-retry">${icons.refresh}Reintentar</button>
      </div>

      <!-- Estado LISTO: buscador, filtro y lista -->
      <div class="ready" id="state-ready" hidden>
        <div class="controls">
          <label class="sr-only" for="bank-search">Buscar en el banco</label>
          <input class="input" id="bank-search" type="search" placeholder="Buscar en el banco..." autocomplete="off">
          <label class="sr-only" for="bank-status">Estado</label>
          <select class="input" id="bank-status">
            <option value="${STATUS.ALL}">Todas</option>
            <option value="${STATUS.PENDING}">Pendientes</option>
            <option value="${STATUS.COMPLETED}">Completadas</option>
          </select>
        </div>
        <!-- Caja con Seleccionar visibles y la lista -->
        <div class="box">
          <label class="select-all">
            <input type="checkbox" id="select-all">
            <span>Seleccionar visibles <span id="visible-count"></span></span>
          </label>
          <ul aria-label="Banco de tareas"></ul>
          <p class="no-results" hidden>Ninguna tarea coincide con la búsqueda.</p>
        </div>
      </div>
    </div>

    <!-- Pie: contador de seleccionadas y botones Cancelar e Importar -->
    <footer class="dialog__footer">
      <span class="selected-count" id="selected-count" aria-live="polite">0 seleccionadas</span>
      <!-- Categoría para todas las tareas que se importen -->
      <label class="category-pick" for="import-category">
        Categoría
        <select class="input" id="import-category"></select>
      </label>
      <button class="btn" type="button" id="btn-cancel">Cancelar</button>
      <button class="btn btn--primary" type="button" id="btn-import" disabled>Importar</button>
    </footer>
  </dialog>
`;

// Clase del componente <import-modal>
class ImportModal extends HTMLElement {
  #todos = [];            // todas las tareas del banco
  #visible = [];          // las que se ven según la búsqueda y el filtro
  #selected = new Set();  // ids marcados por el usuario
  #imported = new Set();  // ids que ya están en la lista (no se pueden volver a importar)
  #loadNumber = 0;        // cuenta las cargas, para ignorar la respuesta de una carga vieja

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Estilos: css/shared/reset + buttons + estos + css/responsive (ver js/utils/styles.js)
    useStyles(this.shadowRoot, ['shared/forms', 'shared/badges', 'shared/dialog', 'components/import-modal']);
    this.shadowRoot.append(template.content.cloneNode(true));

    const root = this.shadowRoot;
    root.getElementById('btn-close').addEventListener('click', () => this.close());
    root.getElementById('btn-cancel').addEventListener('click', () => this.close());
    closeOnBackdrop(root.querySelector('dialog'), () => this.close());

    // Botones y controles de la ventana
    root.getElementById('btn-retry').addEventListener('click', () => this.#load());
    root.getElementById('bank-search').addEventListener('input', () => this.#renderList());
    root.getElementById('bank-status').addEventListener('change', () => this.#renderList());
    root.getElementById('select-all').addEventListener('change', (e) => this.#toggleVisible(e.target.checked));
    root.getElementById('btn-import').addEventListener('click', () => this.#import());

    // Delegación de eventos: un solo listener en la <ul> para todos los checkboxes.
    root.querySelector('ul').addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') this.#toggleOne(Number(e.target.value), e.target.checked);
    });
  }

  /**
   * importedIds: Set con los ids originales de la API que ya están en la lista.
   * categories: categorías que existen; selectedCategoryId: la que aparece elegida al abrir.
   */
  open(importedIds, categories = [], selectedCategoryId = null) {
    const root = this.shadowRoot;
    this.#imported = importedIds;
    this.#selected.clear();
    this.#fillCategories(categories, selectedCategoryId);
    root.getElementById('bank-search').value = '';
    root.getElementById('bank-status').value = STATUS.ALL;
    this.#updateFooter();
    root.querySelector('dialog').showModal();

    if (cachedTodos) {
      this.#showTodos(cachedTodos);
    } else {
      this.#load();
    }
  }

  // Cierra la ventana
  close() {
    this.shadowRoot.querySelector('dialog').close();
  }

  // Descarga las tareas de la API (async: espera la respuesta sin congelar la página)
  async #load() {
    this.#loadNumber += 1;
    const myLoad = this.#loadNumber;
    this.#setState('loading');
    try {
      const todos = await fetchTodos();
      cachedTodos = todos;
      // Si mientras esperaba se cerró el modal o empezó otra carga, esta respuesta ya no sirve.
      if (myLoad !== this.#loadNumber || !this.shadowRoot.querySelector('dialog').open) return;
      this.#showTodos(todos);
    } catch (error) {
      if (myLoad !== this.#loadNumber || !this.shadowRoot.querySelector('dialog').open) return;
      this.shadowRoot.getElementById('error-message').textContent = error.message;
      this.#setState('error');
      this.shadowRoot.getElementById('btn-retry').focus();
    }
  }

  // Muestra la lista del banco
  #showTodos(todos) {
    this.#todos = todos;
    this.#setState('ready');
    this.#renderList();
    this.shadowRoot.getElementById('bank-search').focus();
  }

  /** state: 'loading' | 'error' | 'ready'. Muestra ese bloque y oculta los demás. */
  #setState(state) {
    const root = this.shadowRoot;
    root.getElementById('state-loading').hidden = state !== 'loading';
    root.getElementById('state-error').hidden = state !== 'error';
    root.getElementById('state-ready').hidden = state !== 'ready';
  }

  #renderList() {
    const root = this.shadowRoot;
    const q = normalize(root.getElementById('bank-search').value);
    const status = root.getElementById('bank-status').value;
    this.#visible = this.#todos.filter(
      (todo) => matchesStatus(todo, status) && (!q || normalize(todo.title).includes(q) || String(todo.id) === q)
    );

    const list = root.querySelector('ul');
    // El título viene de la API: se escapa antes de usar innerHTML.
    list.innerHTML = this.#visible.map((todo) => this.#itemHTML(todo)).join('');

    list.hidden = this.#visible.length === 0;
    root.querySelector('.no-results').hidden = this.#visible.length > 0;
    root.getElementById('visible-count').textContent = `(${this.#selectableVisible().length})`;
    this.#updateFooter();
  }

  // Arma el HTML de una tarea del banco con su etiqueta
  #itemHTML(todo) {
    const imported = this.#imported.has(todo.id);
    const selected = this.#selected.has(todo.id);
    let tag = '<span class="badge badge--pending">Pendiente</span>';
    if (todo.completed) tag = '<span class="badge badge--done">Completada</span>';
    if (imported) tag = '<span class="badge badge--api">Ya importada</span>';

    return `
      <li class="${imported ? 'is-imported' : ''} ${selected ? 'is-selected' : ''}" data-id="${todo.id}">
        <label>
          <input type="checkbox" value="${todo.id}" ${imported ? 'checked disabled' : ''} ${selected ? 'checked' : ''}>
          <span>
            <span class="todo-title">${escapeHTML(todo.title)}</span>
            <span class="todo-meta">#${todo.id} · Usuario ${escapeHTML(todo.userId)}</span>
          </span>
          ${tag}
        </label>
      </li>`;
  }

  /** Tareas visibles que todavía se pueden seleccionar (no importadas). */
  #selectableVisible() {
    return this.#visible.filter((todo) => !this.#imported.has(todo.id));
  }

  // Marca o desmarca una tarea
  #toggleOne(id, checked) {
    if (checked) this.#selected.add(id);
    else this.#selected.delete(id);
    const li = this.shadowRoot.querySelector(`li[data-id="${id}"]`);
    li.classList.toggle('is-selected', checked);
    this.#updateFooter();
  }

  // Marca o desmarca todas las tareas visibles
  #toggleVisible(checked) {
    for (const todo of this.#selectableVisible()) {
      if (checked) this.#selected.add(todo.id);
      else this.#selected.delete(todo.id);
    }
    this.#renderList();
  }

  // Actualiza el contador de seleccionadas y el botón Importar
  #updateFooter() {
    const root = this.shadowRoot;
    const count = this.#selected.size;
    root.getElementById('selected-count').textContent = count === 1 ? '1 seleccionada' : `${count} seleccionadas`;

    const importBtn = root.getElementById('btn-import');
    importBtn.disabled = count === 0;
    const label = count > 0 ? `Importar (${count})` : 'Importar';
    importBtn.innerHTML = icons.download + label;

    // "Seleccionar visibles": marcado si están todas, a medias (indeterminate) si hay algunas.
    const selectable = this.#selectableVisible();
    const selectedVisible = selectable.filter((todo) => this.#selected.has(todo.id)).length;
    const selectAll = root.getElementById('select-all');
    selectAll.disabled = selectable.length === 0;
    selectAll.checked = selectable.length > 0 && selectedVisible === selectable.length;
    selectAll.indeterminate = selectedVisible > 0 && selectedVisible < selectable.length;
  }

  // Llena el selector de categoría: "Sin categoría" y una opción por categoría (con textContent, por seguridad)
  #fillCategories(categories, selectedId) {
    const select = this.shadowRoot.getElementById('import-category');
    select.innerHTML = '';
    select.append(new Option('Sin categoría', ''));
    for (const category of categories) {
      select.append(new Option(category.name, category.id));
    }
    // task-app envía "Importadas" (o la categoría filtrada). Si ya no existe, queda "Sin categoría"
    select.value = categories.some((cat) => cat.id === selectedId) ? selectedId : '';
  }

  // Envía a task-app las tareas elegidas y la categoría en la que quedarán
  #import() {
    const todos = this.#todos.filter((todo) => this.#selected.has(todo.id));
    const categoryId = this.shadowRoot.getElementById('import-category').value || null;
    if (todos.length > 0) emit(this, EVENTS.IMPORT, { todos, categoryId });
  }
}

// Registra la etiqueta <import-modal>
customElements.define('import-modal', ImportModal);
