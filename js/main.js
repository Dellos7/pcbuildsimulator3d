// ---------------------------------------------------------------------------
// Interfaz: menú de componentes, lista del montaje, diálogos y conexión con
// la escena 3D.
// ---------------------------------------------------------------------------

import { CATEGORIES, CAT, COMPONENTS, BY_ID, SPEC_FIELDS, shortSummary, searchText } from './data/catalog.js';
import { checkBuild, estimatePower, totalPrice } from './compat.js';
import * as store from './store.js';
import { initScene } from './scene/scene.js';
import { parseBuildFile, exportBuildFile, MAX_FILE_BYTES } from './build-file.js';
import { learningHint } from './learning.js';

const $ = sel => document.querySelector(sel);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const stage = $('#stage');
let scene;
try { scene = initScene($('#canvas'), {
  onHover: (info, ev) => showTooltip(info, ev),
  onHoverMove: ev => moveTooltip(ev),
  onSelect: uid => selectItem(uid, true)
}); } catch (error) {
  console.error('No se pudo iniciar WebGL:', error);
  $('#canvas').append(el('p', 'webgl-error', 'No se pudo iniciar la vista 3D. Activa la aceleración gráfica o prueba otro navegador. Puedes seguir usando las fichas y la comprobación.'));
  scene = { render() {}, setSelected() {}, setExplode() {}, setHidden() {}, resetCamera() {} };
}

let selectedUid = null;
let flagged = new Set();     // nombres de piezas señaladas por la última comprobación

// ==========================================================================
// Menú lateral de componentes
// ==========================================================================
function buildCatalogMenu() {
  const root = $('#catalog');
  root.innerHTML = '';
  for (const cat of CATEGORIES) {
    const items = COMPONENTS.filter(c => c.cat === cat.id);
    const det = el('details', 'cat');
    det.dataset.cat = cat.id;

    const sum = el('summary');
    sum.append(el('span', 'icon', cat.icon), el('span', 'label', cat.name));
    const badge = el('span', 'badge zero', '0');
    badge.dataset.count = cat.id;
    sum.append(badge, el('span', 'chev', '▶'));
    det.append(sum);

    for (const comp of items) det.append(makeCard(comp));
    root.append(det);
  }
  document.querySelector('.cat')?.setAttribute('open', '');
}

function makeCard(comp) {
  const card = el('div', 'card');
  card.draggable = true;
  card.dataset.id = comp.id;
  card.dataset.search = searchText(comp);

  const top = el('div', 'card-top');
  const txt = el('div', 'card-txt');
  txt.append(el('div', 'card-name', comp.name),
             el('div', 'card-sum', shortSummary(comp)),
             el('div', 'card-price', comp.price === 0 ? 'Incluido con la CPU' : comp.price + ' €'));
  const add = el('button', 'card-add', '+');
  add.title = 'Añadir al montaje';
  add.addEventListener('click', ev => { ev.stopPropagation(); tryAdd(comp.id); });
  top.append(txt, add);
  card.append(top);

  const more = el('button', 'card-more', '▾ Ver características');
  const specs = el('dl', 'specs');
  specs.hidden = true;
  for (const [key, label, fmt] of SPEC_FIELDS[comp.cat]) {
    if (comp.specs[key] === undefined) continue;
    const row = el('div');
    row.append(el('dt', null, label), el('dd', null, String(fmt(comp.specs[key]))));
    specs.append(row);
  }
  more.addEventListener('click', () => {
    specs.hidden = !specs.hidden;
    more.textContent = (specs.hidden ? '▾ Ver' : '▴ Ocultar') + ' características';
  });
  card.append(more, specs);

  card.addEventListener('dragstart', ev => {
    ev.dataTransfer.setData('text/plain', comp.id);
    ev.dataTransfer.effectAllowed = 'copy';
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => card.classList.remove('dragging'));
  return card;
}

$('#search').addEventListener('input', ev => {
  const q = ev.target.value.trim().toLowerCase();
  for (const det of document.querySelectorAll('.cat')) {
    let visible = 0;
    for (const card of det.querySelectorAll('.card')) {
      const match = !q || card.dataset.search.includes(q);
      card.style.display = match ? '' : 'none';
      if (match) visible++;
    }
    det.style.display = visible ? '' : 'none';
    if (q) det.open = true;
  }
});

// ==========================================================================
// Añadir / quitar piezas
// ==========================================================================
function tryAdd(compId) {
  const res = store.add(compId);
  if (!res.ok) return toast(res.reason, 'warn');
  toast(BY_ID[compId].name + ' montado');
}

stage.addEventListener('dragover', ev => {
  ev.preventDefault();
  ev.dataTransfer.dropEffect = 'copy';
  stage.classList.add('dragover');
});
stage.addEventListener('dragleave', ev => {
  if (!stage.contains(ev.relatedTarget)) stage.classList.remove('dragover');
});
stage.addEventListener('drop', ev => {
  ev.preventDefault();
  stage.classList.remove('dragover');
  const id = ev.dataTransfer.getData('text/plain');
  if (id) tryAdd(id);
});

// ==========================================================================
// Lista del montaje (panel derecho)
// ==========================================================================
function renderBuildList(build) {
  const root = $('#buildlist');
  root.innerHTML = '';
  if (!build.items.length) {
    root.append(el('div', 'empty-list', 'Todavía no has montado ninguna pieza. Arrastra componentes desde el menú de la izquierda.'));
    return;
  }
  for (const cat of CATEGORIES) {
    const items = build.items.filter(i => BY_ID[i.compId].cat === cat.id);
    if (!items.length) continue;
    const title = el('div', 'group-title');
    title.append(el('span', null, cat.icon), el('span', null, cat.name),
                 el('span', null, items.length > 1 ? '(' + items.length + ')' : ''));
    root.append(title);

    for (const item of items) {
      const comp = BY_ID[item.compId];
      const row = el('div', 'bitem');
      row.dataset.uid = item.uid;
      if (item.uid === selectedUid) row.classList.add('selected');
      if (flagged.has(comp.name)) row.classList.add('flagged');
      const txt = el('div', 'bi-txt');
      txt.append(el('div', 'bi-name', comp.name), el('div', 'bi-sum', shortSummary(comp)));
      const oculta = store.isHidden(item.uid);
      const eye = el('button', 'bi-eye', oculta ? '🙈' : '👁');
      eye.title = oculta ? 'Volver a mostrar la pieza en el 3D' : 'Ocultar la pieza en el 3D (sigue montada)';
      if (oculta) eye.classList.add('off');
      eye.addEventListener('click', ev => {
        ev.stopPropagation();
        store.toggleHidden(item.uid);
      });
      const del = el('button', 'bi-del', '✕');
      del.title = 'Quitar del montaje';
      del.addEventListener('click', ev => {
        ev.stopPropagation();
        store.remove(item.uid);
        toast(comp.name + ' desmontado');
      });
      row.append(txt, eye, del);
      if (oculta) row.classList.add('hiddenpart');
      row.addEventListener('click', () => selectItem(item.uid));
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', 'Seleccionar ' + comp.name);
      row.addEventListener('keydown', ev => {
        if (ev.target === row && ['Enter', ' '].includes(ev.key)) { ev.preventDefault(); selectItem(item.uid); }
      });
      root.append(row);
    }
  }
}

function selectItem(uid, fromScene = false) {
  selectedUid = (selectedUid === uid && !fromScene) ? null : uid;
  scene.setSelected(selectedUid);
  for (const row of document.querySelectorAll('.bitem')) {
    row.classList.toggle('selected', row.dataset.uid === selectedUid);
    if (fromScene && row.dataset.uid === selectedUid) row.scrollIntoView({ block: 'nearest' });
  }
}

// ==========================================================================
// Etiqueta flotante sobre la pieza señalada con el ratón
// ==========================================================================
const tip = $('#tooltip3d');
function showTooltip(info, ev) {
  if (!info) { tip.hidden = true; return; }
  tip.textContent = info.name;
  tip.hidden = false;
  moveTooltip(ev);
}
function moveTooltip(ev) {
  if (tip.hidden || !ev) return;
  const r = stage.getBoundingClientRect();
  tip.style.left = (ev.clientX - r.left) + 'px';
  tip.style.top = (ev.clientY - r.top) + 'px';
}

// ==========================================================================
// Diálogos
// ==========================================================================
const modal = $('#modal');
function openModal(title, bodyNode, buttons = []) {
  $('#modal-title').textContent = title;
  const body = $('#modal-body');
  body.innerHTML = '';
  body.append(bodyNode);
  const foot = $('#modal-foot');
  foot.innerHTML = '';
  for (const b of buttons) {
    const btn = el('button', 'btn ' + (b.cls || ''), b.label);
    btn.addEventListener('click', () => b.onClick?.(close));
    foot.append(btn);
  }
  if (!modal.open) modal.showModal();
  function close() { modal.close(); }
  return close;
}
$('#modal-close').addEventListener('click', () => modal.close());

function toast(msg, kind = '') {
  const t = el('div', 'toast ' + kind, msg);
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 2600);
}

// -------------------------------------------------- comprobar compatibilidad
$('#btn-check').addEventListener('click', () => {
  const build = store.getBuild();
  if (!build.items.length) return toast('Monta algunas piezas antes de comprobar', 'warn');
  const result = checkBuild(build);

  flagged = new Set();
  for (const i of result.issues) if (i.level === 'error') i.parts.forEach(p => flagged.add(p));
  renderBuildList(build);
  renderCheckSummary(result);

  const body = el('div');
  const v = el('div', 'verdict ' + (result.errors ? 'bad' : result.warnings ? 'mid' : 'good'));
  if (result.errors) {
    v.append(document.createTextNode('❌ Hay ' + result.errors + ' incompatibilidad' + (result.errors > 1 ? 'es' : '') + ' que debes resolver antes de utilizar este equipo.'));
  } else if (result.warnings) {
    v.append(document.createTextNode('⚠️ No se han detectado incompatibilidades, pero hay ' + result.warnings + ' aviso' + (result.warnings > 1 ? 's' : '') + ' que debes revisar.'));
  } else {
    v.append(document.createTextNode('✅ ¡Montaje compatible! Todas las piezas encajan entre sí.'));
  }
  v.append(el('small', null, 'Las piezas con problemas aparecen marcadas en rojo en la lista del montaje.'));
  body.append(v);

  const order = { error: 0, warning: 1, info: 2, ok: 3 };
  const titles = { error: 'Incompatibilidades', warning: 'Avisos', info: 'Información', ok: 'Comprobaciones correctas' };
  let lastLevel = null;
  for (const i of [...result.issues].sort((a, b) => order[a.level] - order[b.level])) {
    if (i.level !== lastLevel) {
      body.append(el('div', 'section-title', titles[i.level]));
      lastLevel = i.level;
    }
    const card = el('div', 'issue ' + i.level);
    const icon = { error: '❌', warning: '⚠️', info: 'ℹ️', ok: '✅' }[i.level];
    const h = el('h4');
    h.append(el('span', null, icon), el('span', null, i.title));
    card.append(h, el('p', null, i.detail));
    if (i.level === 'error' || i.level === 'warning') {
      const hint = learningHint(i.title);
      const help = el('details', 'learning-hint');
      help.append(el('summary', null, 'Pista para resolverlo'), el('p', null, hint));
      card.append(help);
    }
    if (i.parts.length) {
      const p = el('div', 'parts');
      [...new Set(i.parts)].forEach(name => p.append(el('span', null, name)));
      card.append(p);
    }
    body.append(card);
  }

  body.append(el('div', 'section-title', 'Consumo estimado'));
  const table = el('table', 'power');
  for (const [name, w] of result.power.rows) {
    const tr = el('tr');
    tr.append(el('td', null, name), el('td', null, w + ' W'));
    table.append(tr);
  }
  const tr = el('tr', 'total');
  tr.append(el('td', null, 'Total estimado (se recomienda una fuente de ' + result.power.recommended + ' W)'),
            el('td', null, result.power.total + ' W'));
  table.append(tr);
  body.append(table);
  body.append(el('p', 'hint-power', 'La potencia de la torre es una estimación didáctica, no una medición: el TDP y los límites de potencia no equivalen al consumo en todo momento.'));
  if (result.power.external) body.append(el('p', null, 'Pantalla: unos ' + result.power.external + ' W adicionales en el enchufe, fuera de la fuente de la torre.'));

  openModal('Resultado de la comprobación', body, [{ label: 'Cerrar', cls: 'btn-primary', onClick: c => c() }]);
});

function renderCheckSummary(result) {
  const box = $('#check-summary');
  box.hidden = false;
  box.innerHTML = '';
  const mk = (cls, txt) => { const s = el('span', 'pill ' + cls, txt); box.append(s); };
  if (result.errors) mk('err', result.errors + ' incompatibilidad' + (result.errors > 1 ? 'es' : ''));
  if (result.warnings) mk('warn', result.warnings + ' aviso' + (result.warnings > 1 ? 's' : ''));
  if (!result.errors && !result.warnings) mk('ok', 'Todo compatible');
}

// ------------------------------------------------------------- guardar/abrir
$('#btn-save').addEventListener('click', () => {
  if (!store.getBuild().items.length) return toast('El montaje está vacío', 'warn');
  const body = el('div');
  body.append(el('p', null, 'Ponle un nombre a este montaje para guardarlo en este ordenador:'));
  const input = el('input');
  input.type = 'text';
  input.value = 'Montaje ' + new Date().toLocaleDateString('es-ES');
  body.append(input);
  const close = openModal('Guardar montaje', body, [
    { label: 'Cancelar', onClick: c => c() },
    { label: 'Guardar', cls: 'btn-primary', onClick: c => {
        const name = input.value.trim();
        if (!name) return;
        const save = () => {
          const result = store.saveNamed(name);
          if (!result.ok) return toast(result.reason, 'warn');
          modal.close(); toast('Guardado como "' + name + '"');
        };
        if (store.listSaved().some(s => s.name === name)) {
          const warning = el('p', null, 'Ya existe «' + name + '». ¿Quieres sustituirlo por el montaje actual?');
          openModal('Sustituir montaje guardado', warning, [{ label: 'Cancelar', onClick: close => close() }, { label: 'Sustituir', cls: 'btn-primary', onClick: save }]);
        } else save();
      } }
  ]);
  input.select();
  input.maxLength = 120;
  input.setAttribute('aria-label', 'Nombre del montaje');
  input.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); $('#modal-foot').lastChild.click(); }
  });
  void close;
});

$('#btn-open').addEventListener('click', () => {
  const saved = store.listSaved();
  const body = el('div');
  if (!saved.length) {
    body.append(el('p', null, 'Todavía no hay montajes guardados en este navegador.'));
  }
  for (const s of saved) {
    const row = el('div', 'saved-row');
    const txt = el('div', 'sr-txt');
    const parts = s.items.length;
    txt.append(el('div', 'sr-name', s.name),
               el('div', 'sr-meta', parts + ' pieza' + (parts === 1 ? '' : 's') + ' · ' +
                  new Date(s.date).toLocaleString('es-ES')));
    const load = el('button', 'btn btn-primary btn-small', 'Abrir');
    load.addEventListener('click', () => {
      if (!store.loadNamed(s.name)) return toast('No se pudo abrir ese montaje.', 'warn');
      modal.close();
      toast('Montaje "' + s.name + '" cargado');
    });
    const del = el('button', 'btn btn-danger btn-small', 'Borrar');
    del.addEventListener('click', () => {
      const result = store.deleteNamed(s.name);
      if (!result.ok) return toast(result.reason, 'warn');
      row.remove();
      toast('Montaje "' + s.name + '" borrado');
    });
    row.append(txt, load, del);
    body.append(row);
  }
  openModal('Montajes guardados', body, [{ label: 'Cerrar', onClick: c => c() }]);
});

// -------------------------------------------------- archivos y reflexión
$('#btn-export').addEventListener('click', () => {
  if (!store.getBuild().items.length) return toast('El montaje está vacío', 'warn');
  const url = URL.createObjectURL(new Blob([exportBuildFile(store.getBuild())], { type: 'application/json' }));
  const link = el('a');
  link.href = url;
  link.download = 'montaje-pc-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Montaje exportado. Incluye tus explicaciones de «Mis decisiones».');
});

$('#btn-import').addEventListener('click', () => {
  const body = el('div');
  body.append(el('p', null, 'Selecciona un montaje JSON. Podrás revisar sus piezas antes de sustituir el montaje actual.'));
  const input = el('input'); input.type = 'file'; input.accept = '.json,application/json';
  input.setAttribute('aria-label', 'Archivo de montaje JSON');
  body.append(input);
  const status = el('p'); status.setAttribute('role', 'status'); body.append(status);
  let draft = null;
  let readId = 0;
  openModal('Importar montaje', body, [
    { label: 'Cancelar', onClick: close => close() },
    { label: 'Importar y sustituir', cls: 'btn-primary', onClick: close => {
      if (!draft) return;
      store.replaceBuild(draft); close(); toast('Montaje importado. Revisa sus decisiones y comprueba la compatibilidad.');
    } }
  ]);
  const importButton = $('#modal-foot').lastChild; importButton.disabled = true;
  input.addEventListener('change', async () => {
    const currentRead = ++readId;
    draft = null; importButton.disabled = true;
    body.querySelector('.import-preview')?.remove();
    const file = input.files[0]; if (!file) { status.textContent = ''; return; }
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error('El archivo supera los 128 KB.');
      const candidate = parseBuildFile(await file.text());
      if (currentRead !== readId || !modal.open || !input.isConnected) return;
      draft = candidate;
      status.textContent = candidate.items.length + ' piezas · ' + totalPrice(candidate).toLocaleString('es-ES') + ' €. Se conservarán las elecciones de vídeo y las explicaciones del archivo.';
      const preview = el('div', 'import-preview');
      const list = el('ul');
      candidate.items.forEach(i => list.append(el('li', null, BY_ID[i.compId].name)));
      preview.append(list, el('p', null, 'Un archivo válido puede contener un montaje incompatible: tendrás que comprobarlo y explicar las correcciones.'));
      body.append(preview); importButton.disabled = false;
    } catch (error) { if (currentRead === readId) status.textContent = error.message; }
  });
});

$('#btn-notes').addEventListener('click', () => {
  const body = el('div');
  body.append(el('p', null, 'Explica tus elecciones con tus palabras. Estos textos se guardan y viajan con el JSON; puedes completarlos durante el ejercicio.'));
  const inputs = {};
  for (const [key, label] of [
    ['purpose', '¿Para qué se utilizará el equipo y qué presupuesto tienes?'],
    ['reasoning', '¿Por qué elegiste estas piezas? Justifica socket, RAM y conexión de pantalla.'],
    ['correction', '¿Qué error encontraste, por qué ocurría y cómo lo resolviste?']
  ]) {
    const field = el('label', 'note-field', label), input = el('textarea');
    input.rows = 3; input.maxLength = 2000; input.value = store.getBuild().notes[key];
    field.append(input); body.append(field); inputs[key] = input;
  }
  openModal('Mis decisiones', body, [{ label: 'Cancelar', onClick: close => close() }, {
    label: 'Guardar explicaciones', cls: 'btn-primary', onClick: close => {
      store.setNotes(Object.fromEntries(Object.entries(inputs).map(([k, input]) => [k, input.value])));
      close(); toast('Explicaciones incorporadas al montaje.');
    }
  }]);
});

for (const id of ['video-source', 'video-port']) $('#' + id).addEventListener('change', () => {
  store.setVideo({ source: $('#video-source').value, port: $('#video-port').value });
});

$('#btn-reset').addEventListener('click', () => {
  if (!store.getBuild().items.length) return toast('El montaje ya está vacío', 'warn');
  const body = el('div');
  body.append(el('p', null, '¿Seguro que quieres quitar todas las piezas y empezar de nuevo? ' +
    'Los montajes que hayas guardado con un nombre no se borran.'));
  openModal('Reiniciar el montaje', body, [
    { label: 'Cancelar', onClick: c => c() },
    { label: 'Sí, reiniciar', cls: 'btn-danger', onClick: c => { store.clear(); c(); toast('Montaje vacío'); } }
  ]);
});

$('#btn-help').addEventListener('click', () => {
  const body = el('div');
  body.innerHTML = `
    <p><b>Objetivo:</b> montar un ordenador de sobremesa eligiendo piezas que sean compatibles entre sí.</p>
    <div class="section-title">Cómo se usa</div>
    <ul>
      <li>Abre una categoría del menú de la izquierda y pulsa <b>Ver características</b> para leer las especificaciones de cada pieza.</li>
      <li><b>Arrastra</b> la pieza al centro (o pulsa <b>+</b>) para montarla.</li>
      <li>Gira la vista arrastrando con el ratón, acerca con la rueda y mueve con el botón derecho.</li>
      <li>Pincha una pieza en el 3D o en la lista de la derecha para resaltarla; con la <b>✕</b> la quitas.</li>
      <li>Usa el control <b>Vista despiezada</b> para separar las piezas y ver dónde va cada una.</li>
      <li>Cuando creas que el montaje está bien, pulsa <b>Comprobar compatibilidad</b>.</li>
    </ul>
    <div class="section-title">Qué se comprueba</div>
    <ul>
      <li>Socket del procesador y de la placa base.</li>
      <li>Tipo de memoria (DDR3/DDR4/DDR5), número de ranuras y velocidad máxima.</li>
      <li>Formato de la placa (ATX, MicroATX, Mini-ITX) y de la fuente frente a la caja.</li>
      <li>Longitud de la tarjeta gráfica y altura del disipador frente al espacio de la caja.</li>
      <li>Potencia y conectores de la fuente de alimentación.</li>
      <li>Ranuras M.2, puertos SATA, bahías de disco y de 5,25", huecos de ventilador…</li>
      <li>Si el equipo tendrá salida de vídeo (gráfica dedicada o integrada en la CPU).</li>
      <li>Si el cable elegido coincide con la salida de vídeo y con la entrada de la pantalla. Las salidas de la placa necesitan una CPU con gráfica integrada.</li>
    </ul>
    <p><b>Importante:</b> el simulador <u>no avisa</u> mientras montas. Primero razona tú si las piezas
    encajan y después comprueba el resultado. Abre las pistas si necesitas ayuda para corregir un error.</p>
    <p>Usa <b>Mis decisiones</b> para justificar lo que haces. <b>Exportar</b> e <b>Importar</b> permiten llevar piezas, conexión y explicaciones en un archivo JSON.</p>`;
  openModal('Cómo funciona el simulador', body, [{ label: 'Entendido', cls: 'btn-primary', onClick: c => c() }]);
});

// -------------------------------------------------------------- vista 3D
$('#explode').addEventListener('input', ev => scene.setExplode(parseFloat(ev.target.value)));
$('#btn-camera').addEventListener('click', () => scene.resetCamera());

// ==========================================================================
// Arranque
// ==========================================================================
buildCatalogMenu();

let storageWarningShown = false;
store.subscribe((build, change) => {
  if (!change.persisted && !storageWarningShown) {
    storageWarningShown = true; toast('El navegador no puede conservar los cambios. Exporta tu montaje a JSON.', 'warn');
  }
  if (change.kind === 'notes') return;
  if (change.kind === 'visibility') {
    renderBuildList(build); scene.setHidden(store.getHidden()); return;
  }
  // Toda modificación de piezas o conexiones invalida el resultado anterior.
  flagged = new Set(); $('#check-summary').hidden = true;
  $('#video-settings').hidden = !build.items.some(i => BY_ID[i.compId].cat === 'monitor');
  $('#video-source').value = build.video.source;
  $('#video-port').value = build.video.port;
  if (change.kind === 'video') { renderBuildList(build); return; }
  // Contadores del menú lateral
  for (const cat of CATEGORIES) {
    const n = build.items.filter(i => BY_ID[i.compId].cat === cat.id).length;
    const badge = document.querySelector('.badge[data-count="' + cat.id + '"]');
    if (badge) { badge.textContent = n; badge.classList.toggle('zero', n === 0); }
  }
  // Totales
  $('#total-parts').textContent = build.items.length;
  $('#total-price').textContent = totalPrice(build).toLocaleString('es-ES') + ' €';
  $('#total-watts').textContent = estimatePower(build).total + ' W';
  $('#empty-hint').hidden = build.items.length > 0;

  if (selectedUid && !build.items.some(i => i.uid === selectedUid)) selectedUid = null;
  if (!build.items.length) { flagged = new Set(); $('#check-summary').hidden = true; }

  renderBuildList(build);
  scene.render(build);
  scene.setHidden(store.getHidden());
  scene.setSelected(selectedUid);
});

const restored = store.restoreCurrent();
if (!restored.ok) toast(restored.reason, 'warn');
