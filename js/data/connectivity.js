// Puertos y tamaño físico/ancho eléctrico de PCIe. Fuentes en docs/catalog-sources.md.
// index representa la posición aproximada en el dibujo didáctico, no el plano del fabricante.
const slot = (size, lanes, index) => ({ size, lanes, index });
export const BOARD_CONNECTIONS = {
  'mb-b650m-k': { videoPorts: ['HDMI', 'VGA'], pcieSlots: [slot(16, 16, 0), slot(1, 1, 1), slot(1, 1, 2)] },
  'mb-b650-tomahawk': { videoPorts: ['HDMI', 'DisplayPort'], pcieSlots: [slot(16, 16, 0), slot(16, 2, 3), slot(1, 1, 5)] },
  'mb-x670e-plus': { videoPorts: ['HDMI', 'DisplayPort'], pcieSlots: [slot(16, 16, 0), slot(4, 4, 2), slot(16, 4, 4)] },
  'mb-b550-aorus': { videoPorts: ['HDMI', 'DisplayPort'], pcieSlots: [slot(16, 16, 0), slot(1, 1, 1), slot(16, 2, 3), slot(16, 1, 5)] },
  'mb-a320m': { videoPorts: ['HDMI', 'VGA', 'DVI-D'], pcieSlots: [slot(16, 16, 0), slot(1, 1, 2)] },
  'mb-z790a': { videoPorts: ['HDMI', 'DisplayPort'], pcieSlots: [slot(16, 16, 0), slot(1, 1, 2), slot(16, 4, 3), slot(16, 4, 5)] },
  'mb-z690-ud-ddr4': { videoPorts: ['HDMI', 'DisplayPort'], pcieSlots: [slot(16, 16, 0), slot(1, 1, 1), slot(16, 4, 3), slot(1, 1, 4), slot(16, 1, 5)] },
  'mb-h610m': { videoPorts: ['HDMI', 'VGA'], pcieSlots: [slot(16, 16, 0), slot(1, 1, 2)] },
  'mb-b760i': { videoPorts: ['HDMI', 'DisplayPort'], pcieSlots: [slot(16, 16, 0)] },
  'mb-h110m': { videoPorts: ['VGA', 'DVI-D'], pcieSlots: [slot(16, 16, 0), slot(1, 1, 1), slot(1, 1, 2)] }
};

export const portLabel = p => p === 'VGA' ? 'D-SUB / VGA' : p;
export const describePorts = ports => ports.map(portLabel).join(' · ') || 'Sin salidas';
export const describeSlots = slots => slots.map(s => 'PCIe x' + s.size + (s.size !== s.lanes ? ' (eléctrica x' + s.lanes + ')' : '')).join(' · ');

/** Reserva la ranura principal para GPU y asigna primero las tarjetas de mayor ancho. */
export function allocateExpansion(mb, gpu, expansions) {
  const slots = mb?.specs.pcieSlots || [];
  const primary = slots.find(s => s.size === 16 && s.lanes >= 16);
  const blocked = s => gpu && primary && s.index >= primary.index && s.index < primary.index + gpu.specs.slots;
  const free = slots.filter(s => !blocked(s)).sort((a, b) => a.lanes - b.lanes || a.size - b.size);
  const assignments = new Map(), unplaced = [];
  const width = c => Number(c.specs.slotType.match(/x(\d+)/)?.[1] || 1);
  expansions.map((comp, index) => ({ comp, index })).sort((a, b) => width(b.comp) - width(a.comp)).forEach(({ comp, index }) => {
    const need = width(comp);
    let fit = free.findIndex(s => s.size >= need && s.lanes >= need);
    if (fit === -1) fit = free.findIndex(s => s.size >= need);
    if (fit === -1) unplaced.push(comp);
    else assignments.set(index, free.splice(fit, 1)[0]);
  });
  return { assignments, unplaced, blocked: slots.filter(blocked) };
}
