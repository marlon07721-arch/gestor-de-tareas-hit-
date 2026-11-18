# Gestor de tareas — Guía del usuario

**Versión:** 3.0 (17 de noviembre de 2026) · Historial de cambios en [`CHANGELOG.md`](CHANGELOG.md)

**Autor:** Marlon 

El Gestor de tareas es una aplicación web para organizar tus pendientes. Con ella puedes **crear, editar, completar y eliminar tareas**, **organizarlas por categorías**, **buscarlas y filtrarlas** por estado o categoría e **importar tareas** desde un banco de tareas en internet.

Tus tareas se guardan en tu navegador. Siguen ahí aunque recargues la página o cierres el navegador.

---

## 1. Cómo abrir la aplicación

La aplicación debe abrirse desde un servidor local. Si haces doble clic en `index.html`, el navegador no la carga.

**Opción recomendada: Visual Studio Code + Live Server**

1. Descarga el proyecto: `git clone <enlace-del-repositorio>` (o descarga el ZIP desde GitHub y descomprímelo).
2. Abre la carpeta del proyecto en Visual Studio Code.
3. Instala la extensión **Live Server**.
4. Haz clic derecho en `index.html` y elige **Open with Live Server**.

**Otra opción: desde la terminal**, dentro de la carpeta del proyecto:

```bash
python -m http.server 5500
```

Luego abre `http://localhost:5500` en el navegador.

**Navegadores compatibles:** Chrome, Edge, Firefox y Safari 15.4 o superior.

---

## 2. La pantalla principal

Al abrir la aplicación verás la **lista de tareas**. Cada tarea muestra:

| Elemento | Qué indica |
|---|---|
| Círculo a la izquierda | Sirve para marcar la tarea como completada o pendiente |
| Título | El nombre de la tarea |
| Etiqueta **Pendiente** o **Completada** | El estado actual |
| Etiqueta **Importada** | La tarea viene del banco de tareas (solo se puede eliminar) |
| Fecha | Fecha de registro de la tarea |
| ID | Código único de la tarea, por ejemplo `TSK-L-000001` |
| Lápiz y papelera | Editar y eliminar |

Arriba de la lista están los **botones de acción**, el **buscador** y el **filtro por estado**. En la parte superior derecha, la **barra de progreso** muestra qué porcentaje de tus tareas ya está completado.

Si todavía no tienes tareas, verás el mensaje **"Aún no tienes tareas"** con botones para crear o importar la primera.

---

## 3. Cómo usar cada función

### Crear una tarea
1. Pulsa **Nueva tarea**.
2. Escribe el **título** (entre 3 y 120 caracteres).
3. Si quieres, agrega una **descripción** con los detalles (opcional, hasta 500 caracteres). Se muestra debajo del título.
4. Revisa la **fecha de registro**. Por defecto es hoy y no puede ser una fecha futura.
5. Si quieres, elige una **Categoría** (o deja **Sin categoría**).
6. Si la tarea ya está hecha, activa **Completada**.
7. Pulsa **Guardar tarea**. La tarea aparece al inicio de la lista.

Si falta un dato o no es válido, el formulario te dice qué corregir debajo del campo.

### Marcar una tarea como completada
- Pulsa el **círculo** a la izquierda de la tarea. Vuelve a pulsarlo para dejarla pendiente.

### Marcar varias tareas como terminadas
1. Usa el buscador o el filtro para ver las tareas que quieres completar.
2. Pulsa **Marcar terminadas**.
3. Confirma. Se completan todas las tareas pendientes **que estás viendo**.

### Editar una tarea
1. Pulsa el **lápiz** de la tarea.
2. Cambia lo que necesites y pulsa **Guardar cambios**.

### Eliminar una tarea
1. Pulsa la **papelera** de la tarea.
2. Confirma con **Eliminar**. Esta acción no se puede deshacer.

### Importar tareas del banco
1. Pulsa **Importar**. Se abre una ventana con el banco de tareas (200 tareas de la API pública jsonplaceholder).
2. Si quieres, busca por título o filtra por estado dentro de la ventana.
3. Marca una o varias tareas, o usa **Seleccionar visibles** para marcar todas las que ves.
4. Abajo, en **Categoría**, elige a qué categoría pertenecerán las tareas importadas. Por defecto viene elegida **Importadas**; puedes cambiarla por otra o por **Sin categoría**.
5. Pulsa **Importar (n)**, donde *n* es el número de tareas elegidas.

Las tareas que ya importaste aparecen como **"Ya importada"** y no se pueden volver a elegir.

### Gestionar categorías
Pulsa **Categorías** para abrir la ventana de categorías.

- **Crear:** escribe el nombre (entre 2 y 30 caracteres) y pulsa **Agregar** o `Enter`. No se permiten nombres repetidos: "Trabajo", "trabajo" y "TRABAJÓ" cuentan como el mismo.
- **Renombrar:** pulsa el **lápiz**, cambia el nombre y pulsa **Guardar** o `Enter`. `Esc` cancela el cambio.
- **Eliminar:** pulsa la **papelera** y confirma. **Las tareas de esa categoría no se borran:** quedan sin categoría.

Cada categoría muestra cuántas tareas tiene y un color propio, que se repite en la etiqueta de sus tareas.

**Importadas** es una categoría **del sistema**: siempre existe, aparece de primera con un candado, viene elegida al importar y **no se puede renombrar ni eliminar**. Es solo para tareas importadas, por eso no aparece en el formulario de nueva tarea.

### Buscar y filtrar
- **Buscar por título o descripción:** escribe en el buscador. No importan las tildes ni las mayúsculas: "reunion" encuentra "Reunión".
- **Buscar por ID:** escribe el código empezando por `tsk`, por ejemplo `tsk-l-000003`.
- **Filtrar por categoría:** elige una categoría, **Sin categoría** o **Todas las categorías** en la lista de la barra. También puedes **pulsar la etiqueta de categoría** de cualquier tarea para ver solo las tareas de esa categoría.
- **Filtrar por estado:** elige **Todas**, **Pendientes** o **Completadas**. Cada opción muestra cuántas tareas tiene.
- **Borrar la búsqueda:** pulsa `Esc` dentro del buscador.

Si ninguna tarea coincide, verás **"Sin resultados"** con un botón para **Limpiar filtros**.

### Vaciar la lista
1. Pulsa **Vaciar lista**.
2. Confirma. Se borran **todas** las tareas, incluidas las importadas. Esta acción no se puede deshacer.

---

## 4. Reglas que debes conocer

- **Las tareas importadas solo se pueden eliminar.** No se pueden editar ni cambiar de estado.
- **Cada tarea tiene un ID único:**
  - `TSK-L-000001`: tarea creada por ti. El número aumenta con cada tarea y nunca se repite, aunque vacíes la lista.
  - `TSK-A-000012`: tarea importada. El número es el de la tarea en el banco.
- **La categoría de una tarea importada se elige al importarla** y luego no se puede cambiar, igual que el resto de sus datos.
- **Cada categoría tiene un ID único** con la forma `CAT-000001`. La categoría del sistema **Importadas** usa el ID fijo `CAT-IMPORT`.
- **Las tareas se guardan solo en este navegador.** Si abres la aplicación en otro navegador o en otro computador, la lista empieza vacía.

---

## 5. Mensajes que puedes ver

| Mensaje | Qué significa | Qué hacer |
|---|---|---|
| "No hay conexión a internet…" | No tienes internet al importar | Revisa tu conexión y pulsa **Reintentar** |
| "La API tardó demasiado en responder…" | El banco no respondió en 8 segundos | Pulsa **Reintentar** |
| "El servidor respondió con un error…" | El banco de tareas tiene un problema | Intenta más tarde |
| "La respuesta de la API no es un JSON válido" / "no tiene el formato esperado" | El banco envió datos que no se pueden leer | Intenta más tarde |
| "No se pudieron guardar los cambios en el navegador" | El almacenamiento del navegador está lleno o bloqueado | Revisa que no estés en modo privado y libera espacio |
| "Las tareas importadas no se pueden editar, solo eliminar." | Intentaste editar una tarea importada | Elimínala si ya no la necesitas |
| "Ya existe una categoría llamada…" | El nombre de la categoría está repetido | Usa otro nombre |
| "La categoría elegida ya no existe." | La categoría se eliminó mientras el formulario estaba abierto | Elige otra categoría |

---

## 6. Accesibilidad y uso en celular

- Todo se puede usar con el **teclado**: `Tab` para moverse, `Enter` o `Espacio` para pulsar y `Esc` para cerrar ventanas.
- Las ventanas se cierran con `Esc`, con **Cancelar**, con la ✕ o haciendo clic fuera de ellas.
- La aplicación se adapta al **celular**: los botones ocupan el ancho de la pantalla y las ventanas salen desde abajo.
- Si tu sistema usa **modo oscuro**, la aplicación cambia sola a colores oscuros.

---

## 7. Contenido del proyecto

```
Proyecto-JavaScript/
├── index.html                    Página principal
├── CHANGELOG.md                  Historial de versiones
├── css/
│   ├── base/
│   │   ├── variables.css         Colores, letra, sombras y modo oscuro (único lugar con colores)
│   │   └── global.css            Estilos de la página (body)
│   ├── shared/                   Piezas que comparten varios componentes
│   │   ├── reset.css             Reglas básicas de todos los componentes
│   │   ├── buttons.css           TODOS los botones
│   │   ├── forms.css             Cajas de texto, listas desplegables y errores
│   │   ├── badges.css            Etiquetas (Pendiente, Completada…) y colores de categoría
│   │   └── dialog.css            Ventanas (modales)
│   ├── components/               Un archivo por componente, con el mismo nombre que su .js
│   └── responsive.css            TODAS las reglas para tablet y celular
├── js/
│   ├── main.js                   Punto de entrada: carga los estilos y arranca la app
│   ├── components/               Partes de la pantalla (app, barra, lista, tarea, avisos)
│   │   └── modals/               Ventanas: formulario, importar, confirmar y categorías
│   ├── models/                   Forma y validación de tareas y categorías
│   ├── store/                    Estado de la app (crear, editar, eliminar…)
│   ├── services/                 localStorage y conexión con la API
│   └── utils/                    Ayudas: eventos, filtros, fechas, IDs, íconos y cargador de estilos
└── docs/
    ├── PLAN.md                   Explicación del ejercicio y plan del proyecto
    └── wireframes/               Bocetos de las pantallas
```

**¿Cómo llegan los estilos a cada componente?** Los componentes usan Shadow DOM, que no deja
entrar el CSS de la página. Por eso `js/utils/styles.js` descarga cada archivo de `css/` una sola
vez y cada componente elige los que necesita, por ejemplo:

```js
useStyles(this.shadowRoot, ['shared/badges', 'components/task-item']);
```

Siempre se aplican primero `reset.css` y `buttons.css`, y de último `responsive.css`.
Si creas un archivo CSS nuevo, agrégalo a la lista `SHEETS` de `js/utils/styles.js`.

| Boceto | Archivo |
|---|---|
| Lista de tareas (escritorio) | [`01-lista-escritorio.svg`](docs/wireframes/01-lista-escritorio.svg) |
| Formulario de tarea | [`02-modal-formulario.svg`](docs/wireframes/02-modal-formulario.svg) |
| Ventana de importar | [`03-modal-importar.svg`](docs/wireframes/03-modal-importar.svg) |
| Vista en celular | [`04-lista-movil.svg`](docs/wireframes/04-lista-movil.svg) |
