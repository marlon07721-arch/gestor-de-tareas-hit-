/**
 * <confirm-dialog>: confirmación reutilizable (eliminar, vaciar, marcar terminadas).
 * Responsable: Juan
 *
 * Uso (con un callback que solo se ejecuta si el usuario confirma):
 *   confirmDialog.ask({
 *     title: '¿Eliminar tarea?',
 *     message: '...',
 *     confirmText: 'Eliminar',
 *     tone: 'danger',              // 'danger' pinta el botón en rojo
 *     onConfirm: () => { ... },
 *   });
 */
import { useStyles } from '../../utils/styles.js';
import { icons } from '../../utils/icons.js';
import { closeOnBackdrop } from '../../utils/dom.js';

const template = document.createElement('template');
template.innerHTML = `

  <!-- Ventana de confirmación -->
  <dialog aria-labelledby="confirm-title" aria-describedby="confirm-message">
    <div class="content">
      <span class="icon">${icons.alert}</span>
      <div>
        <h2 class="dialog__title" id="confirm-title"></h2>
        <p class="message" id="confirm-message"></p>
      </div>
    </div>
    <!-- Botones Cancelar y Confirmar -->
    <footer class="dialog__footer">
      <button class="btn" type="button" id="btn-cancel">Cancelar</button>
      <button class="btn btn--primary" type="button" id="btn-confirm"></button>
    </footer>
  </dialog>
`;

// Clase del componente <confirm-dialog>
class ConfirmDialog extends HTMLElement {
  #onConfirm = null; // función que se ejecuta si el usuario confirma

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Estilos: css/shared/reset + buttons + estos + css/responsive (ver js/utils/styles.js)
    useStyles(this.shadowRoot, ['shared/dialog', 'components/confirm-dialog']);
    this.shadowRoot.append(template.content.cloneNode(true));

    const root = this.shadowRoot;
    const dialog = root.querySelector('dialog');
    // Cancelar o clic afuera: cierra sin hacer nada
    root.getElementById('btn-cancel').addEventListener('click', () => dialog.close());
    closeOnBackdrop(dialog, () => dialog.close());

    // Confirmar: cierra la ventana y ejecuta la acción guardada
    root.getElementById('btn-confirm').addEventListener('click', () => {
      const action = this.#onConfirm;
      dialog.close();
      if (action) action();
    });

    // Al cerrarse (por botón, Esc o clic afuera) se olvida la acción pendiente.
    dialog.addEventListener('close', () => {
      this.#onConfirm = null;
    });
  }

  // Abre la ventana con el título, el mensaje y la acción que se ejecuta si se confirma
  ask({ title, message, confirmText = 'Confirmar', tone = 'primary', onConfirm }) {
    const root = this.shadowRoot;
    const danger = tone === 'danger';
    const confirmBtn = root.getElementById('btn-confirm');

    root.getElementById('confirm-title').textContent = title;
    root.getElementById('confirm-message').textContent = message;
    confirmBtn.textContent = confirmText;
    confirmBtn.className = danger ? 'btn btn--danger-solid' : 'btn btn--primary';
    root.querySelector('.content').classList.toggle('is-danger', danger);

    this.#onConfirm = onConfirm;
    root.querySelector('dialog').showModal();
    // En acciones peligrosas el foco empieza en "Cancelar", para no borrar por accidente con Enter.
    if (danger) root.getElementById('btn-cancel').focus();
    else confirmBtn.focus();
  }
}

// Registra la etiqueta <confirm-dialog>
customElements.define('confirm-dialog', ConfirmDialog);
