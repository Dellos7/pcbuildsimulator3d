// Estado y persistencia. La visibilidad no cambia la configuración del equipo.
import { BY_ID, CAT } from './data/catalog.js';
import { validateBuild, emptyVideo, emptyNotes } from './build-file.js';

const CURRENT_KEY = 'pcsim3d.actual';
const SAVED_KEY = 'pcsim3d.guardados';
let build = { items: [], video: emptyVideo(), notes: emptyNotes() };
const listeners = new Set(), hidden = new Set();
let seq = 0;
const uid = () => 'p' + Date.now().toString(36) + (++seq).toString(36);
const storageError = () => ({ ok: false, reason: 'No se pudo guardar en este navegador. Exporta el montaje a JSON para conservarlo.' });
function emit(kind = 'build') {
  const persisted = kind === 'visibility' || persistCurrent();
  listeners.forEach(fn => fn(build, { kind, persisted }));
}
export function subscribe(fn) { listeners.add(fn); fn(build, { kind: 'init', persisted: true }); return () => listeners.delete(fn); }
export function getBuild() { return build; }
export function isHidden(id) { return hidden.has(id); }
export function getHidden() { return hidden; }
export function toggleHidden(id) {
  if (!build.items.some(i => i.uid === id)) return false;
  if (hidden.has(id)) hidden.delete(id); else hidden.add(id);
  emit('visibility'); return hidden.has(id);
}
export function showAll() { hidden.clear(); emit('visibility'); }
export function countOf(cat) { return build.items.filter(i => BY_ID[i.compId].cat === cat).length; }
export function canAdd(id) {
  if (!Object.hasOwn(BY_ID, id)) return { ok: false, reason: 'Componente desconocido.' };
  const cat = CAT[BY_ID[id].cat];
  if (countOf(cat.id) >= cat.max) return { ok: false, reason: 'No puedes añadir más de ' + cat.max + ' pieza(s) de «' + cat.name + '». Quita una desde el montaje actual.' };
  return { ok: true };
}
export function add(id) {
  const check = canAdd(id); if (!check.ok) return check;
  build.items.push({ uid: uid(), compId: id }); emit(); return { ok: true };
}
export function remove(id) { build.items = build.items.filter(i => i.uid !== id); hidden.delete(id); emit(); }
export function clear() { build = { items: [], video: emptyVideo(), notes: emptyNotes() }; hidden.clear(); emit(); }
export function replaceBuild(data) {
  // Validar antes de mutar: un archivo rechazado conserva el montaje en curso.
  const clean = validateBuild(data);
  build = { ...clean, items: clean.items.map(i => ({ uid: uid(), compId: i.compId })) };
  hidden.clear(); emit();
}
export function replaceItems(items) { replaceBuild({ items }); }
export function setVideo(video) { build.video = validateBuild({ ...build, video }).video; emit('video'); }
export function setNotes(notes) { build.notes = validateBuild({ ...build, notes }).notes; emit('notes'); }
function persistCurrent() {
  try { localStorage.setItem(CURRENT_KEY, JSON.stringify(validateBuild(build))); return true; }
  catch { return false; }
}
export function restoreCurrent() {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    if (raw) replaceBuild(JSON.parse(raw));
    return { ok: true };
  } catch { return { ok: false, reason: 'No se pudo recuperar el montaje anterior: los datos no son válidos o el almacenamiento no está disponible.' }; }
}
function readSaved() {
  const all = Object.create(null);
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_KEY) || '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return all;
    for (const [name, value] of Object.entries(raw)) {
      try {
        if (!value || typeof value.date !== 'string' || !Number.isFinite(Date.parse(value.date))) continue;
        all[name] = { ...validateBuild(value), date: value.date };
      } catch { /* Un guardado corrupto no bloquea los demás. */ }
    }
  } catch { /* Almacenamiento no disponible: lista vacía. */ }
  return all;
}
export function listSaved() { return Object.entries(readSaved()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.date.localeCompare(a.date)); }
export function saveNamed(name) {
  if (typeof name !== 'string' || !name.trim() || name.length > 120) return { ok: false, reason: 'Usa un nombre de entre 1 y 120 caracteres.' };
  const all = readSaved(); all[name.trim()] = { ...validateBuild(build), date: new Date().toISOString() };
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(all)); return { ok: true }; }
  catch { return storageError(); }
}
export function loadNamed(name) { const all = readSaved(); if (!Object.hasOwn(all, name)) return false; replaceBuild(all[name]); return true; }
export function deleteNamed(name) {
  const all = readSaved(); delete all[name];
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(all)); return { ok: true }; }
  catch { return storageError(); }
}
