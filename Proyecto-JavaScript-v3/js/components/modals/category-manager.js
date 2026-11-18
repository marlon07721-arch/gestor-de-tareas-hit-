/**
 * <category-manager>: ventana para crear, renombrar y eliminar categorías.
 * Responsable: Juan
 *
 * Uso: manager.open(categorias, conteos), manager.update(categorias, conteos),
 *      manager.showErrors(errores, id), manager.announce(mensaje, tipo),
 *      manager.finishRename(id), manager.clearNewName(), manager.close()
 *   - conteos: { 'CAT-000001': 3, ... } cuántas tareas tiene cada categoría
 * Emite: CATEGORY_SAVE { id, name }  (id null = crear, con id = renombrar)
 *        CATEGORY_DELETE { id }
 *
 * Igual que los demás componentes, no cambia los datos: solo avisa.
 * task-app llama al store y luego le devuelve las categorías con update().
 */
import { useStyles } from '../../utils/styles.js';
import { icons } from '../../utils/icons.js';
import { EVENTS, emit } from '../../utils/events.js';
import { closeOnBackdrop } from '../../utils/dom.js';
import { plural } from '../../utils/format.js';
import { CATEGORY_NAME_MAX, categoryColor, isSystemCategory, validateCategoryName } from '../../models/category.js';

const template = document.createElement('template');
template.innerHTML = `

  <!-- Ventana de categorías -->
  <dialog aria-labelledby="cat-title">
    <header class="dialog__header">
      <div>
        <h2 class="dialog__title" id="cat-title">Categorías</h2>
        <p class="dialog__subtitle">Al eliminar una categoría sus tareas no se borran: quedan sin categoría.</p>
      </div>
      <button class="btn btn--ghost icon-btn" type="button" id="btn-close" aria-label="Cerrar">${icons.close}</button>
    </header>

    <div class="dialog__body">
      <p class="status" id="status" role="status" aria-live="polite"></p>

      <!-- Crear una categoría. novalidate: la validación la hace validateCategoryName -->
      <form class="field create" id="create-form" novalidate>
        <label for="new-name">Nueva categoría</label>
        <div class="row">
          <input class="input" id="new-name" type="text" maxlength="${CATEGORY_NAME_MAX}" autocomplete="off"
            placeholder="Ej.: Trabajo, Estudio, Casa" aria-describedby="new-name-error">
          <button class="btn btn--primary" type="submit">${icons.plus}Agregar</button>
        </div>
        <p class="error" id="new-name-error" role="alert"></p>
      </form>

      <p class="list-title" id="list-title">Tus categorías</p>
      <ul aria-labelledby="list-title"></ul>
      <p class="empty" hidden>Aún no has creado categorías propias. Crea la primera arriba.</p>
    </div>

    <footer class="dialog__footer">
      <button class="btn" type="button" id="btn-done">Cerrar</button>
    </footer>
  </dialog>
`;

// Clase del componente <category-manager>
class CategoryManager extends HTMLElement {
  #categories = []; // las categorías que se muestran
  #counts = {}; //     cuántas tareas tiene cada una
  #editingId = null; // id de la categoría que se está renombrando (null = ninguna)

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Estilos: css/shared/reset + buttons + estos + css/responsive (ver js/utils/styles.js)
    useStyles(this.shadowRoot, ['shared/forms', 'shared/badges', 'shared/dialog', 'components/category-manager']);
    this.shadowRoot.append(template.content.cloneNode(true));

    const root = this.shadowRoot;
    const dialog = root.querySelector('dialog');
    root.getElementById('btn-close').addEventListener('click', () => this.close());
    root.getElementById('btn-done').addEventListener('click', () => this.close());
    closeOnBackdrop(dialog, () => this.close());

    // Esc mientras se renombra: cancela el cambio de nombre en vez de cerrar la ventana
    dialog.addEventListener('cancel', (e) => {
      if (this.#editingId) {
        e.preventDefault();
        this.#stopEditing();
      }
    });

    // Crear: Enter o el botón Agregar envían el formulario
    root.getElementById('create-form').addEventListener('submit', (e) => {
      e.preventDefault(); // evita que la página se recargue
      this.#create();
    });
    root.getElementById('new-name').addEventListener('input', () => this.#setError('new-name', ''));

    // Delegación de eventos: un solo listener en la <ul> para los botones de todas las filas
    root.querySelector('ul').addEventListener('click', (e) => {
      const button = e.target.closest('button[data-action]');
      if (!button) return;
      const id = button.closest('li').dataset.id;
      if (button.dataset.action === 'edit') this.#startEditing(id);
      if (button.dataset.action === 'delete') emit(this, EVENTS.CATEGORY_DELETE, { id });
      if (button.dataset.action === 'save') this.#rename(id);
      if (button.dataset.action === 'cancel') this.#stopEditing();
    });
    // Enter en la caja de renombrar guarda
    root.querySelector('ul').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('input')) {
        e.preventDefault();
        this.#rename(e.target.closest('li').dataset.id);
      }
    });
  }

  /** Abre la ventana con las categorías y sus conteos. */
  open(categories, counts) {
    const root = this.shadowRoot;
    this.#editingId = null;
    root.getElementById('new-name').value = '';
    this.#setError('new-name', '');
    this.announce('');
    this.update(categories, counts);
    root.querySelector('dialog').showModal();
    root.getElementById('new-name').focus();
  }

  close() {
    this.#editingId = null;
    this.shadowRoot.querySelector('dialog').close();
  }

  /** Vuelve a pintar la lista después de un cambio (task-app lo llama). */
  update(categories, counts) {
    this.#categories = categories;
    this.#counts = counts;
    // Si la categoría que se renombraba ya no existe, se sale del modo edición
    if (!categories.some((cat) => cat.id === this.#editingId)) this.#editingId = null;
    this.#render();
  }

  /**
   * Muestra un error del store (por ejemplo, un nombre repetido).
   * id: la categoría que se renombraba, o null si el error es al crear.
   */
  showErrors(errors, id = null) {
    const field = id ? `edit-${id}` : 'new-name';
    this.#setError(field, errors.name ?? '');
    this.shadowRoot.getElementById(field)?.focus();
  }

  /** Escribe la línea de estado. type: 'success' o 'error'. Con mensaje vacío se oculta. */
  announce(message, type = 'success') {
    const status = this.shadowRoot.getElementById('status');
    status.textContent = message;
    status.className = `status status--${type}`;
  }

  /** Deja el texto de la caja de crear vacío y el cursor en ella (después de crear). */
  clearNewName() {
    const input = this.shadowRoot.getElementById('new-name');
    input.value = '';
    input.focus();
  }

  /** Termina el modo renombrar después de guardar y deja el foco en el lápiz de esa categoría. */
  finishRename(id) {
    this.#editingId = null;
    this.#render();
    this.focusCategory(id);
  }

  /** Pone el foco en el lápiz de una categoría. */
  focusCategory(id) {
    this.shadowRoot.querySelector(`li[data-id="${id}"] button[data-action="edit"]`)?.focus();
  }

  // Valida el nombre nuevo y avisa a task-app
  #create() {
    const name = this.shadowRoot.getElementById('new-name').value.trim();
    const { valid, errors } = validateCategoryName(name, this.#categories);
    if (!valid) {
      this.showErrors(errors);
      return;
    }
    emit(this, EVENTS.CATEGORY_SAVE, { id: null, name });
  }

  // Valida el nuevo nombre de una categoría y avisa a task-app
  #rename(id) {
    const name = this.shadowRoot.getElementById(`edit-${id}`).value.trim();
    const { valid, errors } = validateCategoryName(name, this.#categories, id);
    if (!valid) {
      this.showErrors(errors, id);
      return;
    }
    emit(this, EVENTS.CATEGORY_SAVE, { id, name });
  }

  #startEditing(id) {
    this.#editingId = id;
    this.#render();
    const input = this.shadowRoot.getElementById(`edit-${id}`);
    input.focus();
    input.select(); // selecciona el texto para reemplazarlo fácil
  }

  #stopEditing() {
    const id = this.#editingId;
    this.#editingId = null;
    this.#render();
    this.focusCategory(id);
  }

  // Dibuja la lista. Se crean los elementos con createElement y textContent
  // porque los nombres los escribió el usuario (así nunca se ejecuta HTML).
  #render() {
    const root = this.shadowRoot;
    const list = root.querySelector('ul');
    list.innerHTML = '';
    list.hidden = this.#categories.length === 0;
    // El mensaje sale si solo existe la categoría del sistema (Importadas)
    root.querySelector('.empty').hidden = this.#categories.some((cat) => !isSystemCategory(cat.id));

    for (const category of this.#categories) {
      list.append(category.id === this.#editingId ? this.#editRow(category) : this.#viewRow(category));
    }
  }

  // Fila normal: punto de color, nombre, cuántas tareas y botones editar/eliminar
  #viewRow(category) {
    const li = document.createElement('li');
    li.dataset.id = category.id;
    const total = this.#counts[category.id] ?? 0;
    if (isSystemCategory(category.id)) return this.#systemRow(li, category, total);
    li.innerHTML = `
      <div class="line">
        <span class="dot" aria-hidden="true"></span>
        <span class="name"></span>
        <span class="count"></span>
        <span class="actions">
          <button class="btn btn--ghost icon-btn" type="button" data-action="edit">${icons.edit}</button>
          <button class="btn btn--ghost icon-btn btn--delete" type="button" data-action="delete">${icons.trash}</button>
        </span>
      </div>`;
    li.querySelector('.dot').dataset.color = String(categoryColor(category.id));
    li.querySelector('.name').textContent = category.name;
    li.querySelector('.count').textContent = plural(total, 'tarea', 'tareas');
    li.querySelector('[data-action="edit"]').setAttribute('aria-label', `Renombrar "${category.name}"`);
    li.querySelector('[data-action="edit"]').title = 'Renombrar';
    li.querySelector('[data-action="delete"]').setAttribute('aria-label', `Eliminar "${category.name}"`);
    li.querySelector('[data-action="delete"]').title = 'Eliminar';
    return li;
  }

  // Fila de la categoría del sistema (Importadas): sin botones, con un candado "Del sistema"
  #systemRow(li, category, total) {
    li.className = 'is-system';
    li.innerHTML = `
      <div class="line">
        <span class="dot" aria-hidden="true"></span>
        <span class="name"></span>
        <span class="count"></span>
        <span class="system" title="Categoría del sistema: no se puede renombrar ni eliminar">${icons.lock}Del sistema</span>
      </div>`;
    li.querySelector('.dot').dataset.color = String(categoryColor(category.id));
    li.querySelector('.name').textContent = category.name;
    li.querySelector('.count').textContent = plural(total, 'tarea', 'tareas');
    return li;
  }

  // Fila en modo renombrar: caja de texto con el nombre, Guardar y Cancelar
  #editRow(category) {
    const li = document.createElement('li');
    li.className = 'is-editing';
    li.dataset.id = category.id;
    const inputId = `edit-${category.id}`;
    li.innerHTML = `
      <div class="line">
        <span class="dot" aria-hidden="true"></span>
        <label class="sr-only" for="${inputId}">Nuevo nombre</label>
        <input class="input" id="${inputId}" type="text" maxlength="${CATEGORY_NAME_MAX}" autocomplete="off" aria-describedby="${inputId}-error">
        <span class="actions">
          <button class="btn btn--ghost icon-btn" type="button" data-action="save" aria-label="Guardar nombre" title="Guardar">${icons.save}</button>
          <button class="btn btn--ghost icon-btn" type="button" data-action="cancel" aria-label="Cancelar" title="Cancelar">${icons.close}</button>
        </span>
      </div>
      <p class="error" id="${inputId}-error" role="alert"></p>`;
    li.querySelector('.dot').dataset.color = String(categoryColor(category.id));
    const input = li.querySelector('input');
    input.value = category.name;
    input.addEventListener('input', () => this.#setError(inputId, ''));
    return li;
  }

  /** Muestra o borra el error de una caja (field = id de la caja). */
  #setError(field, message) {
    const root = this.shadowRoot;
    const error = root.getElementById(`${field}-error`);
    const input = root.getElementById(field);
    if (!error || !input) return;
    error.innerHTML = message ? `${icons.alert}<span></span>` : '';
    if (message) error.querySelector('span').textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }
}

// Registra la etiqueta <category-manager>
customElements.define('category-manager', CategoryManager);
