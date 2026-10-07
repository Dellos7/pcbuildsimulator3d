import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { exportBuildFile, parseBuildFile, validateBuild, MAX_FILE_BYTES } from '../js/build-file.js';
import * as store from '../js/store.js';

const items = (...ids) => ids.map(compId => ({ compId }));
let memory;
beforeEach(() => {
  memory = new Map();
  globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  store.clear();
});
test('JSON conserva piezas repetidas, conexión y explicaciones; omite UID y datos externos', () => {
  const build = { items: items('ram-lpx8-3200', 'ram-lpx8-3200', 'monitor-vga'), video: { source: 'motherboard', port: 'VGA' }, notes: { purpose: 'Aula', reasoning: 'Comparé puertos', correction: 'Cambié el cable' } };
  build.items[0].uid = 'externo'; build.items[0].price = -500;
  const restored = parseBuildFile(exportBuildFile(build));
  assert.deepEqual(restored, validateBuild(build));
  assert.equal(restored.items[0].uid, undefined);
  assert.equal(restored.items[0].price, undefined);
});
test('Rechaza archivos corruptos, versiones ajenas, exceso de tamaño y datos mal formados', () => {
  for (const input of ['null', '[]', '{', '{}', JSON.stringify({ format: 'pcsim3d', version: 2, build: { items: [] } })]) assert.throws(() => parseBuildFile(input));
  assert.throws(() => parseBuildFile(' '.repeat(MAX_FILE_BYTES + 1)), /128 KB/);
  for (const build of [{ items: [null] }, { items: items('__proto__') }, { items: items('cpu-7600x', 'cpu-7600x') }, { items: [], video: { source: 'gpu', port: 'USB' } }, { items: [], notes: { purpose: 'x'.repeat(2001) } }]) assert.throws(() => validateBuild(build));
});
test('Una carga inválida conserva el montaje y la visibilidad', () => {
  store.add('cpu-7600x'); const original = structuredClone(store.getBuild());
  store.toggleHidden(original.items[0].uid);
  assert.throws(() => store.replaceBuild({ items: items('cpu-7600x', 'cpu-7600x') }));
  assert.deepEqual(store.getBuild(), original);
  assert.equal(store.isHidden(original.items[0].uid), true);
});
test('Restaura el formato local antiguo y admite __proto__ como nombre', () => {
  memory.set('pcsim3d.actual', JSON.stringify({ items: items('cpu-12400') }));
  assert.equal(store.restoreCurrent().ok, true);
  assert.equal(store.countOf('cpu'), 1);
  assert.equal(store.saveNamed('__proto__').ok, true);
  store.clear(); assert.equal(store.loadNamed('__proto__'), true);
  assert.equal(store.countOf('cpu'), 1);
});
test('Datos corruptos no bloquean la lista y fallos de escritura se devuelven a la interfaz', () => {
  for (const raw of ['null', '[]', '{', '{"mal":{"items":null}}']) {
    memory.set('pcsim3d.guardados', raw); assert.deepEqual(store.listSaved(), []);
  }
  localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(store.saveNamed('Prueba').ok, false);
  assert.equal(store.deleteNamed('Prueba').ok, false);
  assert.doesNotThrow(() => store.add('cpu-12400'));
});
test('Visibilidad y notas emiten eventos distintos a cambios de piezas o cable', () => {
  const kinds = []; const unsubscribe = store.subscribe((build, change) => kinds.push(change.kind));
  store.add('cpu-12400'); store.toggleHidden(store.getBuild().items[0].uid);
  store.setVideo({ source: 'motherboard', port: 'HDMI' }); store.setNotes({ purpose: 'Aula' });
  unsubscribe(); assert.deepEqual(kinds, ['init', 'build', 'visibility', 'video', 'notes']);
});
