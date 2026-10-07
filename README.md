# Simulador 3D de montaje de ordenadores

Aplicación web para que el alumnado de ESO y Bachillerato monte un ordenador de
torre pieza a pieza y descubra qué componentes son compatibles entre sí.

## Cómo se ejecuta

La aplicación usa módulos de JavaScript, así que **no funciona haciendo doble clic
en `index.html`**: hace falta servirla desde un servidor web (aunque sea local).

- **Windows:** doble clic en `abrir-simulador.cmd`. Levanta un servidor local y abre
  el navegador. Para cerrarlo, cierra la ventana negra.
- **Visual Studio Code:** abre la carpeta y usa la extensión *Live Server*.
- **Publicarlo para clase:** sube toda la carpeta a cualquier hosting estático
  (GitHub Pages, Netlify, el Moodle del centro…). No necesita servidor con PHP ni
  base de datos, ni conexión a internet una vez cargada.

## Cómo funciona

- **Izquierda:** las piezas, agrupadas por tipo de componente. Cada ficha muestra sus
  características reales (socket, tipo de RAM, longitud, vatios…). El buscador filtra
  por cualquier dato: `AM5`, `DDR4`, `ATX`, `Noctua`…
- **Centro:** el montaje en 3D. Se arrastra la pieza al centro o se pulsa **+**.
  Las medidas son proporcionales a las reales, así que una gráfica demasiado larga o
  un disipador demasiado alto se ven salir de la caja. Las piezas se dibujan con el
  detalle suficiente para reconocerlas: la chapa perforada del frontal, el peine de
  contactos dorados de la RAM, las aletas del disipador, la etiqueta de vatios de la
  fuente o los puertos del panel trasero de la placa.
- **Derecha:** las piezas montadas. Al pinchar una, se resalta en el 3D; con el 👁 se
  esconde del dibujo sin desmontarla (útil para quitar la caja o la gráfica de en medio
  y ver lo que hay detrás), y con la ✕ se quita del todo.
  En el 3D también se puede pinchar directamente sobre una pieza aunque esté dentro de
  la torre: la caja no se lleva el clic.
- **Comprobar compatibilidad:** el simulador *no avisa* mientras se monta. Sólo al
  pulsar el botón se explican, una a una, las incompatibilidades y los avisos.
- **Guardar / Abrir / Reiniciar:** los montajes se guardan con nombre en el propio
  navegador (localStorage). Además, el montaje en curso se recupera al recargar.
- **Monitor:** añade una pantalla y elige la salida (placa o gráfica) y el cable
  en el panel derecho. Se comparan HDMI, DisplayPort, D-SUB/VGA y DVI-D. Las
  salidas de la placa necesitan una CPU con gráfica integrada. Los adaptadores
  y los límites de resolución/Hz no se simulan.
- **Pistas / Mis decisiones:** tras comprobar, abre las pistas para corregir los
  errores y escribe tus explicaciones. Se conservan con el montaje.
- **Exportar / Importar:** intercambia JSON con piezas, conexión y explicaciones.
  La importación valida el archivo (máximo 128 KB), muestra una vista previa y
  requiere pulsar «Importar y sustituir». Un archivo inválido conserva el montaje
  actual; un archivo estructuralmente válido puede contener incompatibilidades.
- En móvil, la escena, el catálogo y el montaje se organizan en vertical. La cámara
  ajusta el encuadre al monitor, al despiece y al tamaño de la pantalla.

## Archivos y aprendizaje

El JSON usa `format: "pcsim3d"`, `version: 1` y `build` con `items`, `video` y
`notes`. Sólo acepta IDs del catálogo y límites por categoría. Los UID, precios
y especificaciones externos no se importan. Los guardados locales anteriores,
que sólo tenían `items`, siguen siendo compatibles.

[Ejemplo importable](docs/example-build.json) ·
[Guía de actividades, evaluación y uso de IA](docs/teaching-guide.md) ·
[Fuentes y límites del catálogo](docs/catalog-sources.md)

Los archivos y sus explicaciones son editables: no prueban autoría. Para evaluar
aprendizaje, combina el montaje con justificación, diagnóstico de errores y una
modificación o explicación breve en directo.

## Comprobaciones de desarrollo

La web no necesita Node para publicarse. Para las pruebas, usa Node.js 24 o superior:
`npm test` (sin instalar dependencias). Se cubren JSON, persistencia, conexiones
de pantalla, PCIe y combinaciones CPU/placa/RAM. GitHub Actions ejecuta las pruebas
en cada push o pull request. La revisión visual WebGL se hace en navegador.

## Estructura de los archivos

| Archivo | Contenido |
|---|---|
| `js/data/catalog.js` | Catálogo de piezas y sus especificaciones. **Aquí se añaden componentes nuevos.** |
| `js/compat.js` | Reglas de compatibilidad y estimación de consumo. |
| `js/scene/parts.js` | Geometría 3D de cada pieza y su posición dentro de la torre. |
| `js/scene/materials.js` | Materiales y texturas. Se dibujan con canvas al arrancar (circuitos, rejillas, etiquetas), así que no hay ninguna imagen que descargar. |
| `js/scene/scene.js` | Cámara, luces, reflejos y render. |
| `js/store.js` | Estado del montaje y guardado en localStorage. |
| `js/build-file.js` | Validación y formato JSON portable. |
| `js/data/connectivity.js` | Puertos, ranuras y asignación de tarjetas PCIe. |
| `js/learning.js` | Pistas progresivas para resolver errores. |
| `js/main.js` | Interfaz: menús, lista, diálogos. |
| `vendor/` | Three.js (licencia MIT), incluido para funcionar sin internet. |

### Añadir una pieza nueva

Basta con copiar una entrada de `js/data/catalog.js` y cambiar sus datos: la ficha del
menú, las reglas de compatibilidad y el dibujo en 3D se generan automáticamente a
partir de las especificaciones.

Una nueva placa debe declarar también `videoPorts` y `pcieSlots` en sus
especificaciones o en `js/data/connectivity.js`. Cada ranura indica `size`
(tamaño físico), `lanes` (ancho eléctrico) e `index` (posición aproximada en 3D).
