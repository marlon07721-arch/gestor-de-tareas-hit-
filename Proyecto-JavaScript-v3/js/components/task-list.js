/**
 * <task-list>: lista de tareas con estados vacíos.
 * Responsable: Juan
 *
 * Uso: list.update({ tasks, total, categories })
 *   tasks → tareas ya filtradas que se deben mostrar
 *   total → cuántas tareas hay en total (para distinguir "lista vacía" de "sin resultados")
 */
import { useStyles } from '../utils/styles.js';
import { icons } from '../utils/icons.js';
import { EVENTS, emit } from '../utils/events.js';
import './task-item.js';

const template = document.createElement('template');
template.innerHTML = `

  <!-- Aquí se agregan las tareas -->
  <ul aria-label="Tareas"></ul>

  <!-- Mensaje cuando no hay ninguna tarea -->
  <div class="empty" id="empty-none" hidden>
    ${icons.inbox}
    <h2>Aún no tienes tareas</h2>
    <p>Crea tu primera tarea o importa algunas desde el banco de tareas.</p>
    <div class="actions">
      <button class="btn btn--primary" type="button" id="btn-create">${icons.plus}Nueva tarea</button>
      <button class="btn" type="button" id="btn-import">${icons.download}Importar tareas</button>
    </div>
  </div>

  <!-- Mensaje cuando la búsqueda o el filtro no encuentran nada -->
  <div class="empty" id="empty-results" hidden>
    ${icons.search}
    <h2>Sin resultados</h2>
    <p>Ninguna tarea coincide con la búsqueda o el filtro seleccionado.</p>
    <div class="actions">
      <button class="btn" type="button" id="btn-reset">Limpiar filtros</button>
    </div>
  </div>
`;

// Clase del componente <task-list>
class TaskList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Estilos: css/shared/reset + buttons + estos + css/responsive (ver js/utils/styles.js)
    useStyles(this.shadowRoot, ['components/task-list']);
    this.shadowRoot.append(template.content.cloneNode(true));

    const root = this.shadowRoot;
    // Botones de los mensajes de lista vacía
    root.getElementById('btn-create').addEventListener('click', () => emit(this, EVENTS.CREATE_REQUEST));
    root.getElementById('btn-import').addEventListener('click', () => emit(this, EVENTS.IMPORT_REQUEST));
    root.getElementById('btn-reset').addEventListener('click', () => emit(this, EVENTS.FILTER_RESET_REQUEST));
  }

  // Dibuja la lista con las tareas que recibe
  update({ tasks, total, categories = [] }) {
    // Buscar la categoría de cada tarea por su id, sin recorrer la lista cada vez
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const root = this.shadowRoot;
    const list = root.querySelector('ul');

    // Qué se muestra: la lista, "Aún no tienes tareas" o "Sin resultados".
    root.getElementById('empty-none').hidden = total > 0;
    root.getElementById('empty-results').hidden = total === 0 || tasks.length > 0;
    list.hidden = tasks.length === 0;

    // Se vacía la lista y se vuelve a crear un <task-item> por cada tarea.
    list.innerHTML = '';
    for (const task of tasks) {
      const li = document.createElement('li');
      const item = document.createElement('task-item');
      item.dataset.id = task.id; // queda como atributo data-id="TSK-L-000001"
      item.setTask(task, categoryById.get(task.categoryId) ?? null);
      li.append(item);
      list.append(li);
    }
  }

  /** Devuelve el foco al círculo de una tarea (la lista se acaba de volver a crear). */
  focusTask(id) {
    const item = this.shadowRoot.querySelector(`task-item[data-id="${id}"]`);
    if (item) item.focusCheck();
  }
}

// Registra la etiqueta <task-list>
customElements.define('task-list', TaskList);
