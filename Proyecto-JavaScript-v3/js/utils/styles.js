/**
 * Cargador de estilos para los componentes.
 * Responsable: Juan
 *
 * El Shadow DOM aísla los estilos: el CSS de la página no entra al componente.
 * Por eso cada archivo de la carpeta css/ (menos css/base) se descarga UNA sola vez,
 * se convierte en una hoja de estilos (CSSStyleSheet) y cada componente "adopta"
 * las hojas que necesita con shadowRoot.adoptedStyleSheets.
 *
 * Orden en que se aplican dentro de cada componente (el último gana):
 *   1. shared/reset y shared/buttons   → todos los componentes
 *   2. las que pide el componente       → ej.: shared/forms, components/task-item
 *   3. responsive                       → todos los componentes
 */

// Todas las hojas que usan los componentes (rutas dentro de css/, sin ".css")
const SHEETS = [
  'shared/reset',
  'shared/buttons',
  'shared/forms',
  'shared/badges',
  'shared/dialog',
  'components/task-app',
  'components/task-toolbar',
  'components/task-list',
  'components/task-item',
  'components/task-form-modal',
  'components/import-modal',
  'components/confirm-dialog',
  'components/category-manager',
  'components/toast-message',
  'responsive',
];

// Hojas ya cargadas: nombre → CSSStyleSheet
const loaded = new Map();

// Descarga un archivo CSS y lo convierte en hoja de estilos
async function loadSheet(name) {
  // La ruta se calcula desde este archivo (js/utils/) hasta la carpeta css/
  const url = new URL(`../../css/${name}.css`, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se encontró el archivo css/${name}.css`);
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(await response.text());
  loaded.set(name, sheet);
}

/** Carga todas las hojas al mismo tiempo. main.js la llama antes de mostrar la app. */
export async function loadStyles() {
  await Promise.all(SHEETS.map(loadSheet));
}

/**
 * Aplica los estilos a un componente.
 * Ej.: useStyles(this.shadowRoot, ['shared/forms', 'components/task-item']);
 */
export function useStyles(shadowRoot, names = []) {
  shadowRoot.adoptedStyleSheets = ['shared/reset', 'shared/buttons', ...names, 'responsive'].map((name) => {
    const sheet = loaded.get(name);
    if (!sheet) throw new Error(`La hoja "${name}" no está cargada. Agrégala a SHEETS en js/utils/styles.js`);
    return sheet;
  });
}
