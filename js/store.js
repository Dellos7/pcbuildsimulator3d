// ---------------------------------------------------------------------------
// Estado del montaje y persistencia en localStorage.
// ---------------------------------------------------------------------------

import { BY_ID, CAT } from './data/catalog.js';

const CURRENT_KEY = 'pcsim3d.actual';
const SAVED_KEY = 'pcsim3d.guardados';

let build = { items: [] };
const listeners = new Set();
let seq = 0;
// Piezas ocultas en el 3D. Es sólo una ayuda para mirar dentro del montaje:
// la pieza sigue montada, cuenta para el precio y para la comprobación.
const hidden = new Set();

function uid() {
  seq += 1;
  return 'p' + Date.now().toString(36) + seq.toString(36);
}

function emit() {
  persistCurrent();
  listeners.forEach(fn => fn(build));
}

export function subscribe(fn) { listeners.add(fn); fn(build); return () => listeners.delete(fn); }
export function getBuild() { return build; }

export function isHidden(itemUid) { return hidden.has(itemUid); }
export function getHidden() { return hidden; }
export function toggleHidden(itemUid) {
  if (hidden.has(itemUid)) hidden.delete(itemUid); else hidden.add(itemUid);
  emit();
  return hidden.has(itemUid);
}
export function showAll() { hidden.clear(); emit(); }

export function countOf(cat) {
  return build.items.filter(i => BY_ID[i.compId].cat === cat).length;
}

/** ¿Se puede añadir esta pieza? Sólo limitamos por número de huecos "físicos". */
export function canAdd(compId) {
  const comp = BY_ID[compId];
  if (!comp) return { ok: false, reason: 'Componente desconocido.' };
  const cat = CAT[comp.cat];
  if (countOf(comp.cat) >= cat.max) {
    return {
      ok: false,
      reason: cat.max === 1
        ? 'Ya has montado ' + articleFor(cat.name) + '. Quítala primero desde la lista de la derecha.'
        : 'No puedes añadir más de ' + cat.max + ' piezas de "' + cat.name + '".'
    };
  }
  return { ok: true };
}

function articleFor(name) {
  return /^(Caja|Placa|Memoria|Tarjeta|Fuente|Unidad|Refrigeración)/.test(name)
    ? 'una pieza de "' + name + '"' : 'un componente de "' + name + '"';
}

export function add(compId) {
  const check = canAdd(compId);
  if (!check.ok) return check;
  build.items.push({ uid: uid(), compId });
  emit();
  return { ok: true };
}

export function remove(itemUid) {
  build.items = build.items.filter(i => i.uid !== itemUid);
  hidden.delete(itemUid);
  emit();
}

export function clear() {
  build.items = [];
  hidden.clear();
  emit();
}

export function replaceItems(items) {
  hidden.clear();
  build.items = items.filter(i => BY_ID[i.compId]).map(i => ({ uid: uid(), compId: i.compId }));
  emit();
}

// ------------------------------------------------------------- persistencia

function persistCurrent() {
  try {
    localStorage.setItem(CURRENT_KEY, JSON.stringify({ items: build.items.map(i => ({ compId: i.compId })) }));
  } catch (e) { /* modo privado del navegador: seguimos sin persistir */ }
}

export function restoreCurrent() {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.items)) replaceItems(data.items);
  } catch (e) { /* datos corruptos: empezamos de cero */ }
}

function readSaved() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '{}'); } catch (e) { return {}; }
}

export function listSaved() {
  const all = readSaved();
  return Object.entries(all)
    .map(([name, v]) => ({ name, date: v.date, items: v.items }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export function saveNamed(name) {
  const all = readSaved();
  all[name] = { date: new Date().toISOString(), items: build.items.map(i => ({ compId: i.compId })) };
  localStorage.setItem(SAVED_KEY, JSON.stringify(all));
}

export function loadNamed(name) {
  const all = readSaved();
  if (!all[name]) return false;
  replaceItems(all[name].items);
  return true;
}

export function deleteNamed(name) {
  const all = readSaved();
  delete all[name];
  localStorage.setItem(SAVED_KEY, JSON.stringify(all));
}
