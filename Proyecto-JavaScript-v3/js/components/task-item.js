/**
 * <task-item>: una tarea de la lista.
 * Responsable: Juan
 *
 * Uso: item.setTask(tarea, categoria)   (categoria = { id, name } o null)
 * Emite: TOGGLE, EDIT, DELETE (con { id })
 *
 * Las tareas importadas (source "api") no se pueden editar ni cambiar de estado:
 * se muestran con la etiqueta "Importada" y solo permiten eliminar.
 */
import { useStyles } from '../utils/styles.js';
import { icons } from '../utils/icons.js';
import { EVENTS, emit } from '../utils/events.js';
import { formatDate } from '../utils/format.js';
import { isReadOnly } from '../models/task.js';
import { categoryColor } from '../models/category.js';

const template = document.createElement('template');
template.innerHTML = `

  <!-- Tarjeta de la tarea -->
  <article class="item">
    <!-- Círculo para marcar como completada -->
    <input class="check" type="checkbox">
    <!-- Título y datos de la tarea -->
    <div class="content">
      <p class="title"></p>
      <!-- Descripción: solo se muestra si la tarea tiene una -->
      <p class="description" hidden></p>
      <p class="meta">
        <span class="badge status"></span>
        <span class="badge badge--api imported" hidden>${icons.lock}Importada</span>
        <!-- Etiqueta de categoría: es un botón; al pulsarlo se filtra la lista por esa categoría -->
        <button class="badge badge--cat category" type="button" hidden>${icons.tag}<span></span></button>
        <span class="date" title="Fecha de registro">${icons.calendar}<span class="date-text"></span></span>
        <span class="id"></span>
      </p>
    </div>
    <!-- Botones editar (lápiz) y eliminar (papelera) -->
    <div class="actions">
      <button class="btn btn--ghost icon-btn edit" type="button" title="Editar">${icons.edit}</button>
      <button class="btn btn--ghost icon-btn btn--delete delete" type="button" title="Eliminar">${icons.trash}</button>
    </div>
  </article>
`;

// Clase del componente <task-item>
class TaskItem extends HTMLElement {
  // Tarea que muestra este componente
  #task = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Estilos: css/shared/reset + buttons + estos + css/responsive (ver js/utils/styles.js)
    useStyles(this.shadowRoot, ['shared/badges', 'components/task-item']);
    this.shadowRoot.append(template.content.cloneNode(true));

    const root = this.shadowRoot;
    // Al marcar el círculo o pulsar un botón, avisa a task-app con el ID de la tarea
    root.querySelector('.check').addEventListener('change', () => {
      emit(this, EVENTS.TOGGLE, { id: this.#task.id });
    });
    root.querySelector('.edit').addEventListener('click', () => {
      emit(this, EVENTS.EDIT, { id: this.#task.id });
    });
    root.querySelector('.delete').addEventListener('click', () => {
      emit(this, EVENTS.DELETE, { id: this.#task.id });
    });
    root.querySelector('.category').addEventListener('click', () => {
      emit(this, EVENTS.FILTER_CATEGORY, { id: this.#task.categoryId });
    });
  }

  /** Recibe la tarea (y su categoría, si tiene) y pinta sus datos. */
  setTask(task, category = null) {
    this.#task = task;
    const root = this.shadowRoot;
    // ¿Es importada? Entonces no se puede editar ni marcar
    const readOnly = isReadOnly(task);

    root.querySelector('.item').classList.toggle('is-completed', task.completed);
    // textContent (y no innerHTML) para que un título como "<b>hola</b>" se vea como texto.
    root.querySelector('.title').textContent = task.title;
    const description = root.querySelector('.description');
    description.textContent = task.description ?? '';
    description.hidden = !task.description;
    root.querySelector('.id').textContent = task.id;
    root.querySelector('.date-text').textContent = formatDate(task.createdAt);

    // Etiqueta Pendiente o Completada
    const status = root.querySelector('.status');
    status.textContent = task.completed ? 'Completada' : 'Pendiente';
    status.className = `badge status ${task.completed ? 'badge--done' : 'badge--pending'}`;
    root.querySelector('.imported').hidden = !readOnly;

    // Etiqueta de categoría: solo si la tarea tiene una. El nombre va con textContent (lo escribió el usuario).
    const categoryBadge = root.querySelector('.category');
    categoryBadge.hidden = !category;
    if (category) {
      categoryBadge.querySelector('span').textContent = category.name;
      categoryBadge.dataset.color = String(categoryColor(category.id));
      categoryBadge.title = `Ver solo las tareas de "${category.name}"`;
      categoryBadge.setAttribute('aria-label', `Categoría ${category.name}. Pulsa para ver solo sus tareas`);
    }

    // Círculo: marcado si está completada y deshabilitado si es importada
    const check = root.querySelector('.check');
    check.checked = task.completed;
    check.disabled = readOnly;
    check.title = readOnly
      ? 'Las tareas importadas no se pueden modificar'
      : `Marcar como ${task.completed ? 'pendiente' : 'completada'}`;
    // aria-label: lo que lee un lector de pantalla para personas con discapacidad visual.
    check.setAttribute('aria-label', `${check.title}: "${task.title}"`);

    // El lápiz se oculta en las tareas importadas
    const edit = root.querySelector('.edit');
    edit.hidden = readOnly;
    edit.setAttribute('aria-label', `Editar "${task.title}"`);
    root.querySelector('.delete').setAttribute('aria-label', `Eliminar "${task.title}"`);
  }

  /** Pone el foco en el círculo (se usa después de marcar la tarea con el teclado). */
  focusCheck() {
    this.shadowRoot.querySelector('.check').focus();
  }
}

// Registra la etiqueta <task-item>
customElements.define('task-item', TaskItem);
