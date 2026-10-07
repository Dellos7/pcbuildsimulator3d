// Formato portable: sólo referencias al catálogo, nunca código ni especificaciones externas.
import { BY_ID, CAT } from './data/catalog.js';

export const VIDEO_PORTS = ['HDMI', 'DisplayPort', 'VGA', 'DVI-D'];
export const MAX_FILE_BYTES = 128 * 1024;
export const emptyVideo = () => ({ source: '', port: '' });
export const emptyNotes = () => ({ purpose: '', reasoning: '', correction: '' });
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);

export function validateBuild(data) {
  if (!record(data) || !Array.isArray(data.items)) throw new Error('El montaje debe contener una lista de piezas.');
  const counts = {};
  const maxItems = Object.values(CAT).reduce((n, c) => n + c.max, 0);
  if (data.items.length > maxItems) throw new Error('El archivo contiene demasiadas piezas.');
  const items = data.items.map(item => {
    if (!record(item) || typeof item.compId !== 'string' || !Object.hasOwn(BY_ID, item.compId)) throw new Error('El archivo contiene una pieza desconocida o inválida.');
    const comp = BY_ID[item.compId];
    counts[comp.cat] = (counts[comp.cat] || 0) + 1;
    if (counts[comp.cat] > CAT[comp.cat].max) throw new Error('Demasiadas piezas de «' + CAT[comp.cat].name + '».');
    return { compId: comp.id };
  });
  const video = data.video === undefined ? emptyVideo() : data.video;
  if (!record(video) || !['', 'motherboard', 'gpu'].includes(video.source) || !['', ...VIDEO_PORTS].includes(video.port)) throw new Error('La conexión de la pantalla no es válida.');
  const notes = data.notes === undefined ? emptyNotes() : data.notes;
  if (!record(notes)) throw new Error('Las explicaciones del montaje no son válidas.');
  const cleanNotes = emptyNotes();
  for (const key of Object.keys(cleanNotes)) {
    const value = notes[key] ?? '';
    if (typeof value !== 'string' || value.length > 2000) throw new Error('Cada explicación debe ser un texto de hasta 2000 caracteres.');
    cleanNotes[key] = value;
  }
  return { items, video: { source: video.source, port: video.port }, notes: cleanNotes };
}
export function parseBuildFile(text) {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) throw new Error('El archivo supera los 128 KB.');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('El archivo no contiene JSON válido.'); }
  if (!record(data) || data.format !== 'pcsim3d' || data.version !== 1) throw new Error('No es un archivo de montaje compatible (pcsim3d, versión 1).');
  return validateBuild(data.build);
}
export function exportBuildFile(build) {
  return JSON.stringify({ format: 'pcsim3d', version: 1, exportedAt: new Date().toISOString(), build: validateBuild(build) }, null, 2);
}
