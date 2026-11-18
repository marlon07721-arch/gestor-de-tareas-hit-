/**
 * <task-form-modal>: formulario para crear o editar una tarea.
 * Responsable: Juan
 *
 * Uso: form.open(null, categorias) para crear, form.open(tarea, categorias) para editar,
 *      form.close(), form.showErrors(errores)
 * Emite: SAVE { id, data: { title, createdAt, completed, categoryId } }
 *   - id null → crear tarea
 *   - con id  → editar tarea
 */
import { useStyles } from '../../utils/styles.js';
import { icons } from '../../utils/icons.js';
import { EVENTS, emit } from '../../utils/events.js';
import { closeOnBackdrop } from '../../utils/dom.js';
import { DESCRIPTION_MAX, TITLE_MAX, todayISO, validateTaskInput } from '../../models/task.js';
import { isSystemCategory } from '../../models/category.js';

const template = document.createElement('template');
template.innerHTML = `

  <!-- Ventana del formulario -->
  <dialog aria-labelledby="form-title">
    <form novalidate>
      <!-- Encabezado: título de la ventana y botón cerrar -->
      <header class="dialog__header">
        <div>
          <h2 class="dialog__title" id="form-title">Nueva tarea</h2>
          <p class="dialog__subtitle" id="form-subtitle">Los campos con * son obligatorios.</p>
        </div>
        <button class="btn btn--ghost icon-btn" type="button" id="btn-close" aria-label="Cerrar">${icons.close}</button>
      </header>

      <!-- Cuerpo: los campos del formulario -->
      <div class="dialog__body">
        <div class="field">
          <!-- Campo TÍTULO -->
          <label for="title">Título <span class="req">*</span></label>
          <input class="input" id="title" type="text" maxlength="${TITLE_MAX}" autocomplete="off"
            placeholder="Ej.: Preparar la presentación del proyecto" aria-describedby="title-error">
          <div class="hint">
            <span>Describe la tarea en pocas palabras.</span>
            <span id="counter">0/${TITLE_MAX}</span>
          </div>
          <p class="error" id="title-error" role="alert"></p>
        </div>

        <div class="field">
          <!-- Campo DESCRIPCIÓN (opcional): detalles de la tarea -->
          <label for="description">Descripción</label>
          <textarea class="input" id="description" rows="3" maxlength="${DESCRIPTION_MAX}"
            placeholder="Ej.: Diapositivas, ensayo y repartir los temas" aria-describedby="description-hint description-error"></textarea>
          <div class="hint">
            <span id="description-hint">Opcional. Agrega los detalles que necesites.</span>
            <span id="description-counter">0/${DESCRIPTION_MAX}</span>
          </div>
          <p class="error" id="description-error" role="alert"></p>
        </div>

        <div class="field">
          <!-- Campo FECHA DE REGISTRO -->
          <label for="createdAt">Fecha de registro <span class="req">*</span></label>
          <input class="input" id="createdAt" type="date" aria-describedby="createdAt-error">
          <p class="error" id="createdAt-error" role="alert"></p>
        </div>

        <div class="field">
          <!-- Campo CATEGORÍA: las opciones se llenan al abrir, con las categorías que existan -->
          <label for="categoryId">Categoría</label>
          <select class="input" id="categoryId" aria-describedby="categoryId-hint categoryId-error"></select>
          <div class="hint"><span id="categoryId-hint"></span></div>
          <p class="error" id="categoryId-error" role="alert"></p>
        </div>

        <!-- Interruptor COMPLETADA -->
        <label class="switch" for="completed">
          <span>Completada<small>Activa esta opción si la tarea ya está terminada.</small></span>
          <input id="completed" type="checkbox">
        </label>
      </div>

      <!-- Botones Cancelar y Guardar -->
      <footer class="dialog__footer">
        <button class="btn" type="button" id="btn-cancel">Cancelar</button>
        <button class="btn btn--primary" type="submit" id="btn-submit">Guardar tarea</button>
      </footer>
    </form>
  </dialog>
`;

// Clase del componente <task-form-modal>
class TaskFormModal extends HTMLElement {
  #editingId = null; // null = creando una tarea nueva

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Estilos: css/shared/reset + buttons + estos + css/responsive (ver js/utils/styles.js)
    useStyles(this.shadowRoot, ['shared/forms', 'shared/dialog', 'components/task-form-modal']);
    this.shadowRoot.append(template.content.cloneNode(true));

    const root = this.shadowRoot;
    // novalidate en el <form>: la validación la hace validateTaskInput, no el navegador.
    root.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault(); // evita que el formulario recargue la página
      this.#submit();
    });
    // La X y Cancelar cierran la ventana sin guardar
    root.getElementById('btn-close').addEventListener('click', () => this.close());
    root.getElementById('btn-cancel').addEventListener('click', () => this.close());
    closeOnBackdrop(root.querySelector('dialog'), () => this.close());

    // Al escribir se actualiza el contador y se borra el error del campo.
    root.getElementById('title').addEventListener('input', () => {
      this.#updateCounter();
      this.#setError('title', '');
    });
    root.getElementById('description').addEventListener('input', () => {
      this.#updateCounter();
      this.#setError('description', '');
    });
    root.getElementById('createdAt').addEventListener('input', () => this.#setError('createdAt', ''));
    root.getElementById('categoryId').addEventListener('change', () => this.#setError('categoryId', ''));
  }

  /**
   * Sin tarea abre el modo "crear"; con tarea, el modo "editar".
   * categories: las categorías que existen, para llenar el selector.
   */
  open(task = null, categories = []) {
    const root = this.shadowRoot;
    const isEdit = task !== null;
    this.#editingId = isEdit ? task.id : null;

    // Cambia los textos según sea crear o editar
    root.getElementById('form-title').textContent = isEdit ? 'Editar tarea' : 'Nueva tarea';
    root.getElementById('form-subtitle').textContent = isEdit
      ? `ID ${task.id} · Los campos con * son obligatorios.`
      : 'Los campos con * son obligatorios.';
    root.getElementById('btn-submit').textContent = isEdit ? 'Guardar cambios' : 'Guardar tarea';

    // Llena los campos: vacíos al crear o con los datos de la tarea al editar
    root.getElementById('title').value = isEdit ? task.title : '';
    root.getElementById('description').value = isEdit ? task.description ?? '' : '';
    root.getElementById('createdAt').value = isEdit ? task.createdAt : todayISO();
    root.getElementById('createdAt').max = todayISO(); // el calendario no deja elegir fechas futuras
    root.getElementById('completed').checked = isEdit ? task.completed : false;
    this.#fillCategories(categories, isEdit ? task.categoryId : null);
    this.#setError('title', '');
    this.#setError('description', '');
    this.#setError('createdAt', '');
    this.#setError('categoryId', '');
    this.#updateCounter();

    // Abre la ventana y pone el cursor en el título
    root.querySelector('dialog').showModal();
    root.getElementById('title').focus();
  }

  // Cierra la ventana
  close() {
    this.shadowRoot.querySelector('dialog').close();
  }

  /** Muestra los errores de validación y pone el foco en el primer campo con error. */
  showErrors(errors) {
    this.#setError('title', errors.title ?? '');
    this.#setError('description', errors.description ?? '');
    this.#setError('createdAt', errors.createdAt ?? '');
    this.#setError('categoryId', errors.categoryId ?? '');
    if (errors.title) this.shadowRoot.getElementById('title').focus();
    else if (errors.description) this.shadowRoot.getElementById('description').focus();
    else if (errors.createdAt) this.shadowRoot.getElementById('createdAt').focus();
    else if (errors.categoryId) this.shadowRoot.getElementById('categoryId').focus();
  }

  /**
   * Llena el selector: "Sin categoría" y luego una opción por categoría.
   * Se crea cada <option> con textContent porque el nombre lo escribió el usuario.
   */
  #fillCategories(categories, selectedId) {
    const root = this.shadowRoot;
    const select = root.getElementById('categoryId');
    select.innerHTML = '';
    // value "" = sin categoría (se convierte en null al guardar)
    select.append(new Option('Sin categoría', ''));
    // "Importadas" (categoría del sistema) es solo para tareas importadas: no se ofrece aquí
    const ownCategories = categories.filter((category) => !isSystemCategory(category.id));
    for (const category of ownCategories) {
      select.append(new Option(category.name, category.id));
    }
    select.value = selectedId ?? '';
    root.getElementById('categoryId-hint').textContent = ownCategories.length
      ? 'Opcional. Te ayuda a organizar y filtrar tus tareas.'
      : 'Aún no tienes categorías: créalas con el botón “Categorías”.';
  }

  // Al pulsar Guardar: lee los campos, valida y envía el evento SAVE
  #submit() {
    const root = this.shadowRoot;
    const data = {
      title: root.getElementById('title').value.trim(),
      description: root.getElementById('description').value.trim(),
      createdAt: root.getElementById('createdAt').value,
      completed: root.getElementById('completed').checked,
      // "" (Sin categoría) se guarda como null
      categoryId: root.getElementById('categoryId').value || null,
    };
    const { valid, errors } = validateTaskInput(data);
    if (!valid) {
      this.showErrors(errors);
      return;
    }
    emit(this, EVENTS.SAVE, { id: this.#editingId, data });
  }

  /** field es 'title', 'description', 'createdAt' o 'categoryId'. Con mensaje vacío se borra el error. */
  #setError(field, message) {
    const root = this.shadowRoot;
    const error = root.getElementById(`${field}-error`);
    error.innerHTML = message ? `${icons.alert}<span></span>` : '';
    if (message) error.querySelector('span').textContent = message;
    root.getElementById(field).setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  // Actualiza los contadores de caracteres del título (ej.: 12/120) y de la descripción
  #updateCounter() {
    const root = this.shadowRoot;
    root.getElementById('counter').textContent = `${root.getElementById('title').value.length}/${TITLE_MAX}`;
    root.getElementById('description-counter').textContent =
      `${root.getElementById('description').value.length}/${DESCRIPTION_MAX}`;
  }
}

// Registra la etiqueta <task-form-modal>
customElements.define('task-form-modal', TaskFormModal);
