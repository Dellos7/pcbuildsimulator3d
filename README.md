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
  un disipador demasiado alto se ven salir de la caja.
- **Derecha:** las piezas montadas. Al pinchar una, se resalta en el 3D; con la ✕ se quita.
- **Comprobar compatibilidad:** el simulador *no avisa* mientras se monta. Sólo al
  pulsar el botón se explican, una a una, las incompatibilidades y los avisos.
- **Guardar / Abrir / Reiniciar:** los montajes se guardan con nombre en el propio
  navegador (localStorage). Además, el montaje en curso se recupera al recargar.

## Estructura de los archivos

| Archivo | Contenido |
|---|---|
| `js/data/catalog.js` | Catálogo de piezas y sus especificaciones. **Aquí se añaden componentes nuevos.** |
| `js/compat.js` | Reglas de compatibilidad y estimación de consumo. |
| `js/scene/parts.js` | Geometría 3D de cada pieza y su posición dentro de la torre. |
| `js/scene/scene.js` | Cámara, luces y render. |
| `js/store.js` | Estado del montaje y guardado en localStorage. |
| `js/main.js` | Interfaz: menús, lista, diálogos. |
| `vendor/` | Three.js (licencia MIT), incluido para funcionar sin internet. |

### Añadir una pieza nueva

Basta con copiar una entrada de `js/data/catalog.js` y cambiar sus datos: la ficha del
menú, las reglas de compatibilidad y el dibujo en 3D se generan automáticamente a
partir de las especificaciones.
