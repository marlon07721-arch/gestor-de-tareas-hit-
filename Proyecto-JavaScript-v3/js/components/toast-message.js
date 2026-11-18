/**
 * <toast-message>: avisos breves ("Tarea creada", "3 tareas importadas").
 * Responsable: Juan
 *
 * Uso: toast.show('Tarea creada', 'success')
 * Tipos: 'success' | 'error' | 'info'
 */
import { useStyles } from '../utils/styles.js';
import { icons } from '../utils/icons.js';

const DURACION = 3500; // milisegundos que se ve cada aviso

const template = document.createElement('template');
template.innerHTML = `
  <!-- aria-live: el lector de pantalla anuncia los avisos nuevos. -->
  <div class="region" role="status" aria-live="polite"></div>
`;

// Ícono que corresponde a cada tipo de aviso
const ICONS = { success: icons.check, error: icons.alert, info: icons.info };

// Clase del componente <toast-message>
class ToastMessage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Estilos: css/shared/reset + buttons + estos + css/responsive (ver js/utils/styles.js)
    useStyles(this.shadowRoot, ['components/toast-message']);
    this.shadowRoot.append(template.content.cloneNode(true));
  }

  // Muestra un aviso nuevo
  show(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `${ICONS[type]}<span></span>
      <button class="btn btn--ghost icon-btn" type="button" aria-label="Cerrar aviso">${icons.close}</button>`;
    toast.querySelector('span').textContent = message; // textContent: el mensaje puede traer texto del usuario
    // El botón X cierra el aviso
    toast.querySelector('button').addEventListener('click', () => toast.remove());

    this.shadowRoot.querySelector('.region').append(toast);
    // El aviso se borra solo después de DURACION milisegundos
    setTimeout(() => toast.remove(), DURACION);
  }
}

// Registra la etiqueta <toast-message>
customElements.define('toast-message', ToastMessage);
