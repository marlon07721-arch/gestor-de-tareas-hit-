# Historial de versiones

Aquí se anota qué cambió en cada versión del Gestor de tareas.

## Versión 3.0 — 17 de noviembre de 2026

### Nuevo
- **Categoría del sistema "Importadas"** (ID fijo `CAT-IMPORT`, color azul):
  - Siempre existe, sin tener que crearla, y aparece de primera en la ventana **Categorías** con un candado "Del sistema".
  - Viene **elegida por defecto al importar** (se puede cambiar por otra categoría o por "Sin categoría").
  - **No se puede renombrar ni eliminar**, y nadie puede crear otra categoría con ese nombre.
  - Es solo para tareas importadas: no aparece en el formulario de nueva tarea.
  - No se guarda en localStorage porque es fija (`js/models/category.js` → `IMPORT_CATEGORY`).
  - Si la lista está filtrada por una categoría, al importar se propone esa categoría.

### Compatibilidad
- Los datos guardados con la versión 2.0 siguen cargando igual.

## Versión 2.0 — 17 de noviembre de 2026

Examen (1H): **Categorías para las tareas**.

### Nuevo
- **Categorías:** el botón **Categorías** abre una ventana para crear, renombrar y eliminar categorías.
  - No se permiten nombres vacíos ni repetidos (sin importar mayúsculas ni tildes).
  - Al eliminar una categoría sus tareas **no se borran**: quedan sin categoría.
  - Cada categoría tiene un ID (`CAT-000001`) y un color propio.
- **Formulario de tarea:** campo **Categoría** para elegir a qué categoría pertenece la tarea.
- **Importar:** campo **Categoría** para elegir la categoría de todas las tareas importadas.
- **Filtro por categoría** en la barra, y al pulsar la etiqueta de categoría de una tarea.
- **Descripción** opcional en las tareas (hasta 500 caracteres); el buscador también busca en ella.

### Cambios en la organización del código
- El CSS salió de los archivos JS y quedó en la carpeta `css/`:
  `base/` (variables y página), `shared/` (botones, formularios, etiquetas y ventanas),
  `components/` (un archivo por componente) y `responsive.css` (todas las reglas de celular).
- Nuevo `js/utils/styles.js`: carga los CSS y los aplica dentro de cada componente.
- Las ventanas se movieron a `js/components/modals/` e `icons.js` a `js/utils/`.

### Compatibilidad
- Las tareas guardadas con la versión 1.0 siguen cargando (quedan sin categoría y sin descripción).

## Versión 1.0

Proyecto Gestión de Tareas: crear, editar, completar y eliminar tareas, buscar y filtrar por estado,
importar tareas desde la API pública jsonplaceholder y guardar todo en el navegador (localStorage).
