import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkBuild, estimatePower, totalPrice } from '../js/compat.js';
import { COMPONENTS, BY_ID } from '../js/data/catalog.js';
import { allocateExpansion } from '../js/data/connectivity.js';
const build = (ids, video = { source: 'motherboard', port: 'HDMI' }) => ({ items: ids.map(compId => ({ compId })), video });
const has = (b, title, level) => checkBuild(b).issues.some(i => i.title === title && (!level || i.level === level));
const base = ['case-h5flow', 'mb-b650m-k', 'cpu-7600x', 'cool-212', 'ram-fury16-5600', 'ram-fury16-5600', 'ssd-990pro-1t', 'psu-focus650', 'fan-p12', 'monitor-hdmi'];
test('Montaje completo con monitor y gráfica integrada es compatible', () => {
  const result = checkBuild(build(base)); assert.equal(result.errors, 0); assert.equal(result.warnings, 0);
  assert.equal(has(build(base), 'Conexión de pantalla compatible', 'ok'), true);
});
test('Tener HDMI en la placa no genera vídeo si la CPU carece de gráfica, incluso con GPU', () => {
  const b = build(['cpu-13400f', 'mb-h610m', 'gpu-4060', 'monitor-hdmi']);
  assert.equal(has(b, 'Los puertos de la placa base no generan vídeo por sí solos', 'error'), true);
  assert.equal(has(b, 'Conexión de pantalla compatible', 'ok'), false);
  b.video.source = 'gpu'; assert.equal(has(b, 'Conexión de pantalla compatible', 'ok'), true);
});
test('Detecta cable incorrecto, VGA frente a digital, fuente ausente y conexión sin elegir', () => {
  assert.equal(has(build(['mb-b650m-k', 'cpu-7600x', 'monitor-dp'], { source: 'motherboard', port: 'DisplayPort' }), 'El cable de vídeo no coincide con los puertos', 'error'), true);
  assert.equal(has(build(['gpu-4060', 'monitor-vga'], { source: 'gpu', port: 'VGA' }), 'El cable de vídeo no coincide con los puertos', 'error'), true);
  assert.equal(has(build(['monitor-hdmi'], { source: 'gpu', port: 'HDMI' }), 'La pantalla está conectada a una pieza que falta', 'error'), true);
  assert.equal(has(build(['monitor-hdmi'], { source: '', port: '' }), 'Elige la conexión de la pantalla', 'warning'), true);
  assert.equal(has(build(['mb-h110m', 'cpu-i3-6100', 'monitor-dvi'], { source: 'motherboard', port: 'DVI-D' }), 'Conexión de pantalla compatible', 'ok'), true);
});
test('El monitor cuenta en precio y enchufe, pero no en la fuente; cuenta el disipador de serie', () => {
  const b = build(['cpu-12400']); const m = build(['cpu-12400', 'monitor-hdmi']);
  assert.equal(estimatePower(b).total, 120);
  assert.equal(estimatePower(m).total, estimatePower(b).total);
  assert.equal(estimatePower(m).external, 25);
  assert.equal(totalPrice(m) - totalPrice(b), 110);
});
test('PCIe x4 no entra en x1, x1 entra en x16 libre y una GPU bloquea ranuras contiguas', () => {
  assert.equal(has(build(['mb-b650m-k', 'gpu-4060', 'exp-capture']), 'No hay ranuras PCIe suficientes', 'error'), true);
  assert.equal(has(build(['mb-b760i', 'exp-wifi6']), 'No hay ranuras PCIe suficientes', 'error'), false);
  assert.equal(has(build(['mb-b760i', 'gpu-4060', 'exp-wifi6']), 'No hay ranuras PCIe suficientes', 'error'), true);
  const assigned = allocateExpansion(BY_ID['mb-z690-ud-ddr4'], BY_ID['gpu-4060'], [BY_ID['exp-wifi6'], BY_ID['exp-capture']]);
  assert.equal(assigned.unplaced.length, 0); assert.equal(assigned.assignments.get(1).lanes, 4);
});
test('Ranura físicamente x16 con líneas x2 avisa de limitación, no de incompatibilidad física', () => {
  const b = build(['mb-b650-tomahawk', 'gpu-4060', 'exp-capture']);
  assert.equal(has(b, 'La ranura limita el ancho de banda', 'warning'), true);
  assert.equal(has(b, 'No hay ranuras PCIe suficientes', 'error'), false);
});
test('Una unidad óptica necesita SATA aunque no haya otros discos', () => {
  const mb = BY_ID['mb-h110m']; const original = mb.specs.sataPorts;
  try { mb.specs.sataPorts = 0; assert.equal(has(build(['mb-h110m', 'odd-dvd']), 'No hay puertos SATA suficientes en la placa', 'error'), true); }
  finally { mb.specs.sataPorts = original; }
});
test('El catálogo y todas las combinaciones CPU/placa/RAM siguen evaluándose sin excepciones', () => {
  assert.equal(new Set(COMPONENTS.map(c => c.id)).size, COMPONENTS.length);
  for (const cpu of COMPONENTS.filter(c => c.cat === 'cpu')) for (const mb of COMPONENTS.filter(c => c.cat === 'motherboard')) for (const ram of COMPONENTS.filter(c => c.cat === 'ram')) assert.doesNotThrow(() => checkBuild(build([cpu.id, mb.id, ram.id])));
});
