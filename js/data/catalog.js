// ---------------------------------------------------------------------------
// Catálogo de componentes del simulador.
// Las especificaciones son las que luego usan las reglas de compatibilidad
// (js/compat.js) y el generador de piezas 3D (js/scene/parts.js).
// Medidas: longitudes en mm, dimensiones de caja en cm, potencia en W.
// ---------------------------------------------------------------------------

export const CATEGORIES = [
  { id: 'case',        name: 'Caja / Torre',           icon: '🗄️', max: 1,  color: '#8a93a5' },
  { id: 'motherboard', name: 'Placa base',             icon: '🧩', max: 1,  color: '#2f6b3f' },
  { id: 'cpu',         name: 'Procesador (CPU)',       icon: '🧠', max: 1,  color: '#b9bec7' },
  { id: 'cooler',      name: 'Refrigeración',          icon: '❄️', max: 1,  color: '#9aa4b2' },
  { id: 'ram',         name: 'Memoria RAM',            icon: '💾', max: 8,  color: '#3f7d5c' },
  { id: 'gpu',         name: 'Tarjeta gráfica',        icon: '🎮', max: 1,  color: '#4a4f59' },
  { id: 'storage',     name: 'Almacenamiento',         icon: '🗃️', max: 8,  color: '#5b6472' },
  { id: 'psu',         name: 'Fuente de alimentación', icon: '🔌', max: 1,  color: '#7c8085' },
  { id: 'fan',         name: 'Ventiladores de caja',   icon: '🌀', max: 10, color: '#6b7280' },
  { id: 'expansion',   name: 'Tarjetas de expansión',  icon: '📶', max: 4,  color: '#2f4858' },
  { id: 'optical',     name: 'Unidad óptica',          icon: '💿', max: 1,  color: '#4b5563' }
];

export const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

const KIND_LABEL = { nvme: 'SSD NVMe', 'sata-ssd': 'SSD SATA', hdd: 'Disco duro' };

// Etiquetas y formato de las especificaciones mostradas en las fichas.
export const SPEC_FIELDS = {
  case: [
    ['formFactors', 'Placas admitidas', v => v.join(', ')],
    ['psuForm', 'Formato de fuente', v => v.join(' / ')],
    ['maxGpuLen', 'GPU máxima', v => v + ' mm'],
    ['maxCoolerHeight', 'Disipador máximo', v => v + ' mm'],
    ['radiators', 'Radiadores', v => v.length ? v.join(', ') + ' mm' : 'No admite'],
    ['bays35', 'Bahías 3,5"', v => v],
    ['bays25', 'Bahías 2,5"', v => v],
    ['bays525', 'Bahías 5,25"', v => v],
    ['fanMounts', 'Huecos de ventilador', v => v],
    ['dims', 'Medidas (An×Al×Pr)', v => v[0] + ' × ' + v[1] + ' × ' + v[2] + ' cm']
  ],
  motherboard: [
    ['socket', 'Socket', v => v],
    ['chipset', 'Chipset', v => v],
    ['formFactor', 'Formato', v => v],
    ['memType', 'Tipo de RAM', v => v],
    ['memSlots', 'Ranuras de RAM', v => v],
    ['memMaxSpeed', 'RAM máxima', v => v + ' MHz'],
    ['memMaxGb', 'RAM máxima total', v => v + ' GB'],
    ['m2Slots', 'Ranuras M.2', v => v],
    ['sataPorts', 'Puertos SATA', v => v],
    ['pcieX16', 'Ranuras PCIe x16', v => v],
    ['pcieSmall', 'Ranuras PCIe x1/x4', v => v],
    ['pcieVer', 'Versión PCIe', v => v],
    ['eps', 'Conectores EPS de 8 pines', v => v],
    ['wifi', 'Wi-Fi integrado', v => v ? 'Sí' : 'No']
  ],
  cpu: [
    ['socket', 'Socket', v => v],
    ['cores', 'Núcleos', v => v],
    ['threads', 'Hilos', v => v],
    ['baseGhz', 'Frecuencia base', v => v + ' GHz'],
    ['boostGhz', 'Frecuencia turbo', v => v + ' GHz'],
    ['tdp', 'Consumo (TDP)', v => v + ' W'],
    ['memTypes', 'RAM compatible', v => v.join(' o ')],
    ['igpu', 'Gráfica integrada', v => v ? v : 'No tiene'],
    ['includedCooler', 'Disipador incluido', v => v ? 'Sí' : 'No']
  ],
  cooler: [
    ['type', 'Tipo', v => v],
    ['sockets', 'Sockets compatibles', v => v.join(', ')],
    ['heightMm', 'Altura', v => v ? v + ' mm' : '—'],
    ['radiator', 'Radiador', v => v ? v + ' mm' : '—'],
    ['tdpMax', 'Disipación máxima', v => v + ' W'],
    ['fans', 'Ventiladores', v => v]
  ],
  ram: [
    ['memType', 'Tipo', v => v],
    ['moduleGb', 'Capacidad del módulo', v => v + ' GB'],
    ['speed', 'Velocidad', v => v + ' MHz'],
    ['casLatency', 'Latencia', v => 'CL' + v],
    ['heightMm', 'Altura del módulo', v => v + ' mm'],
    ['voltage', 'Voltaje', v => v + ' V']
  ],
  gpu: [
    ['vramGb', 'Memoria de vídeo', v => v + ' GB'],
    ['lengthMm', 'Longitud', v => v + ' mm'],
    ['slots', 'Ranuras que ocupa', v => v],
    ['tdp', 'Consumo', v => v + ' W'],
    ['pcieVer', 'Interfaz', v => 'PCIe ' + v + ' x16'],
    ['power', 'Conectores de alimentación', v => describePower(v)]
  ],
  storage: [
    ['kind', 'Tipo', v => KIND_LABEL[v]],
    ['capacityGb', 'Capacidad', v => v >= 1000 ? (v / 1000) + ' TB' : v + ' GB'],
    ['interface', 'Interfaz', v => v],
    ['format', 'Formato', v => v],
    ['speed', 'Velocidad', v => v]
  ],
  psu: [
    ['watts', 'Potencia', v => v + ' W'],
    ['formFactor', 'Formato', v => v],
    ['efficiency', 'Certificación', v => v],
    ['modular', 'Modular', v => v],
    ['depthMm', 'Profundidad', v => v + ' mm'],
    ['power', 'Conectores', v => describePower(v)],
    ['sata', 'Conectores SATA', v => v]
  ],
  fan: [
    ['sizeMm', 'Tamaño', v => v + ' mm'],
    ['rpm', 'Velocidad', v => v + ' rpm'],
    ['rgb', 'Iluminación RGB', v => v ? 'Sí' : 'No'],
    ['connector', 'Conector', v => v]
  ],
  expansion: [
    ['kind', 'Función', v => v],
    ['slotType', 'Ranura necesaria', v => v]
  ],
  optical: [
    ['kind', 'Tipo', v => v],
    ['interface', 'Interfaz', v => v],
    ['format', 'Bahía necesaria', v => v]
  ]
};

export function describePower(p) {
  if (!p) return 'No necesita';
  const parts = [];
  if (p.pcie8) parts.push(p.pcie8 + ' × PCIe 8 pines');
  if (p.pcie6) parts.push(p.pcie6 + ' × PCIe 6 pines');
  if (p.vhpwr) parts.push(p.vhpwr + ' × 12VHPWR (16 pines)');
  if (p.eps8) parts.push(p.eps8 + ' × EPS 8 pines (CPU)');
  return parts.length ? parts.join(' + ') : 'No necesita';
}

export const COMPONENTS = [
  // ------------------------------------------------------------------ CAJAS
  { id: 'case-h5flow', cat: 'case', name: 'NZXT H5 Flow', brand: 'NZXT', price: 95, color: '#e8eaee',
    specs: { formFactors: ['ATX', 'MicroATX', 'MiniITX'], psuForm: ['ATX'], maxGpuLen: 365, maxCoolerHeight: 165,
             radiators: [240, 280], bays35: 1, bays25: 2, bays525: 0, fanMounts: 4, dims: [22.7, 46, 44.5] } },
  { id: 'case-pop-air', cat: 'case', name: 'Fractal Design Pop Air', brand: 'Fractal Design', price: 89, color: '#dfe3e8',
    specs: { formFactors: ['ATX', 'MicroATX', 'MiniITX'], psuForm: ['ATX'], maxGpuLen: 405, maxCoolerHeight: 170,
             radiators: [240, 280, 360], bays35: 2, bays25: 2, bays525: 1, fanMounts: 6, dims: [21.5, 47.5, 45] } },
  { id: 'case-q300l', cat: 'case', name: 'Cooler Master MasterBox Q300L', brand: 'Cooler Master', price: 55, color: '#cfd4db',
    specs: { formFactors: ['MicroATX', 'MiniITX'], psuForm: ['ATX'], maxGpuLen: 360, maxCoolerHeight: 159,
             radiators: [240], bays35: 1, bays25: 2, bays525: 0, fanMounts: 4, dims: [23, 38.7, 38.1] } },
  { id: 'case-nr200', cat: 'case', name: 'Cooler Master NR200 (Mini-ITX)', brand: 'Cooler Master', price: 99, color: '#eceff3',
    specs: { formFactors: ['MiniITX'], psuForm: ['SFX'], maxGpuLen: 330, maxCoolerHeight: 155,
             radiators: [240], bays35: 0, bays25: 2, bays525: 0, fanMounts: 4, dims: [18, 29.2, 37.6] } },
  { id: 'case-4000d', cat: 'case', name: 'Corsair 4000D Airflow', brand: 'Corsair', price: 105, color: '#d7dbe2',
    specs: { formFactors: ['ATX', 'MicroATX', 'MiniITX'], psuForm: ['ATX'], maxGpuLen: 360, maxCoolerHeight: 170,
             radiators: [240, 280, 360], bays35: 2, bays25: 2, bays525: 0, fanMounts: 6, dims: [23, 45.3, 46.6] } },
  { id: 'case-o11evo', cat: 'case', name: 'Lian Li O11 Dynamic EVO', brand: 'Lian Li', price: 175, color: '#f0f2f5',
    specs: { formFactors: ['ATX', 'MicroATX', 'MiniITX', 'E-ATX'], psuForm: ['ATX', 'SFX'], maxGpuLen: 423, maxCoolerHeight: 167,
             radiators: [240, 280, 360], bays35: 2, bays25: 4, bays525: 0, fanMounts: 10, dims: [28.5, 46.5, 46.5] } },
  { id: 'case-basic', cat: 'case', name: 'Torre básica de oficina (con bahía DVD)', brand: 'Genérica', price: 32, color: '#c9ced6',
    specs: { formFactors: ['MicroATX', 'MiniITX'], psuForm: ['ATX'], maxGpuLen: 290, maxCoolerHeight: 150,
             radiators: [], bays35: 2, bays25: 1, bays525: 2, fanMounts: 2, dims: [19, 41, 40] } },

  // ------------------------------------------------------------ PLACAS BASE
  { id: 'mb-b650m-k', cat: 'motherboard', name: 'ASUS PRIME B650M-K', brand: 'ASUS', price: 129, color: '#1c4a37',
    specs: { socket: 'AM5', chipset: 'B650', formFactor: 'MicroATX', memType: 'DDR5', memSlots: 2, memMaxSpeed: 6400,
             memMaxGb: 96, m2Slots: 2, sataPorts: 4, pcieX16: 1, pcieSmall: 1, pcieVer: '4.0', eps: 1, wifi: false } },
  { id: 'mb-b650-tomahawk', cat: 'motherboard', name: 'MSI MAG B650 TOMAHAWK WIFI', brand: 'MSI', price: 219, color: '#16303f',
    specs: { socket: 'AM5', chipset: 'B650', formFactor: 'ATX', memType: 'DDR5', memSlots: 4, memMaxSpeed: 6600,
             memMaxGb: 128, m2Slots: 3, sataPorts: 6, pcieX16: 2, pcieSmall: 2, pcieVer: '4.0', eps: 2, wifi: true } },
  { id: 'mb-x670e-plus', cat: 'motherboard', name: 'ASUS TUF GAMING X670E-PLUS', brand: 'ASUS', price: 279, color: '#23272e',
    specs: { socket: 'AM5', chipset: 'X670E', formFactor: 'ATX', memType: 'DDR5', memSlots: 4, memMaxSpeed: 6400,
             memMaxGb: 128, m2Slots: 4, sataPorts: 6, pcieX16: 2, pcieSmall: 1, pcieVer: '5.0', eps: 2, wifi: true } },
  { id: 'mb-b550-aorus', cat: 'motherboard', name: 'Gigabyte B550 AORUS ELITE V2', brand: 'Gigabyte', price: 139, color: '#1a2b38',
    specs: { socket: 'AM4', chipset: 'B550', formFactor: 'ATX', memType: 'DDR4', memSlots: 4, memMaxSpeed: 4400,
             memMaxGb: 128, m2Slots: 2, sataPorts: 6, pcieX16: 2, pcieSmall: 3, pcieVer: '4.0', eps: 1, wifi: false } },
  { id: 'mb-a320m', cat: 'motherboard', name: 'ASRock A320M-HDV', brand: 'ASRock', price: 55, color: '#1d4633',
    specs: { socket: 'AM4', chipset: 'A320', formFactor: 'MicroATX', memType: 'DDR4', memSlots: 2, memMaxSpeed: 3200,
             memMaxGb: 32, m2Slots: 1, sataPorts: 4, pcieX16: 1, pcieSmall: 1, pcieVer: '3.0', eps: 1, wifi: false } },
  { id: 'mb-z790a', cat: 'motherboard', name: 'ASUS ROG STRIX Z790-A GAMING', brand: 'ASUS', price: 349, color: '#262b33',
    specs: { socket: 'LGA1700', chipset: 'Z790', formFactor: 'ATX', memType: 'DDR5', memSlots: 4, memMaxSpeed: 7800,
             memMaxGb: 128, m2Slots: 4, sataPorts: 4, pcieX16: 2, pcieSmall: 1, pcieVer: '5.0', eps: 2, wifi: true } },
  { id: 'mb-z690-ud-ddr4', cat: 'motherboard', name: 'Gigabyte Z690 UD DDR4', brand: 'Gigabyte', price: 159, color: '#1e2a36',
    specs: { socket: 'LGA1700', chipset: 'Z690', formFactor: 'ATX', memType: 'DDR4', memSlots: 4, memMaxSpeed: 5333,
             memMaxGb: 128, m2Slots: 3, sataPorts: 6, pcieX16: 2, pcieSmall: 2, pcieVer: '5.0', eps: 2, wifi: false } },
  { id: 'mb-h610m', cat: 'motherboard', name: 'MSI PRO H610M-B DDR4', brand: 'MSI', price: 79, color: '#1b4234',
    specs: { socket: 'LGA1700', chipset: 'H610', formFactor: 'MicroATX', memType: 'DDR4', memSlots: 2, memMaxSpeed: 3200,
             memMaxGb: 64, m2Slots: 1, sataPorts: 4, pcieX16: 1, pcieSmall: 1, pcieVer: '4.0', eps: 1, wifi: false } },
  { id: 'mb-b760i', cat: 'motherboard', name: 'ASUS ROG STRIX B760-I (Mini-ITX)', brand: 'ASUS', price: 249, color: '#2a2f37',
    specs: { socket: 'LGA1700', chipset: 'B760', formFactor: 'MiniITX', memType: 'DDR5', memSlots: 2, memMaxSpeed: 7200,
             memMaxGb: 96, m2Slots: 2, sataPorts: 4, pcieX16: 1, pcieSmall: 0, pcieVer: '5.0', eps: 1, wifi: true } },
  { id: 'mb-h110m', cat: 'motherboard', name: 'ASUS H110M-K (antigua, 2016)', brand: 'ASUS', price: 45, color: '#255540',
    specs: { socket: 'LGA1151', chipset: 'H110', formFactor: 'MicroATX', memType: 'DDR4', memSlots: 2, memMaxSpeed: 2133,
             memMaxGb: 32, m2Slots: 0, sataPorts: 4, pcieX16: 1, pcieSmall: 2, pcieVer: '3.0', eps: 1, wifi: false } },

  // ------------------------------------------------------------ PROCESADORES
  { id: 'cpu-7600x', cat: 'cpu', name: 'AMD Ryzen 5 7600X', brand: 'AMD', price: 209, color: '#c8cdd6',
    specs: { socket: 'AM5', cores: 6, threads: 12, baseGhz: 4.7, boostGhz: 5.3, tdp: 105, memTypes: ['DDR5'],
             igpu: 'Radeon Graphics (2 CU)', includedCooler: false } },
  { id: 'cpu-7800x3d', cat: 'cpu', name: 'AMD Ryzen 7 7800X3D', brand: 'AMD', price: 359, color: '#c8cdd6',
    specs: { socket: 'AM5', cores: 8, threads: 16, baseGhz: 4.2, boostGhz: 5.0, tdp: 120, memTypes: ['DDR5'],
             igpu: 'Radeon Graphics (2 CU)', includedCooler: false } },
  { id: 'cpu-7950x', cat: 'cpu', name: 'AMD Ryzen 9 7950X', brand: 'AMD', price: 549, color: '#c8cdd6',
    specs: { socket: 'AM5', cores: 16, threads: 32, baseGhz: 4.5, boostGhz: 5.7, tdp: 170, memTypes: ['DDR5'],
             igpu: 'Radeon Graphics (2 CU)', includedCooler: false } },
  { id: 'cpu-5600', cat: 'cpu', name: 'AMD Ryzen 5 5600', brand: 'AMD', price: 129, color: '#d2d7de',
    specs: { socket: 'AM4', cores: 6, threads: 12, baseGhz: 3.5, boostGhz: 4.4, tdp: 65, memTypes: ['DDR4'],
             igpu: null, includedCooler: true } },
  { id: 'cpu-5950x', cat: 'cpu', name: 'AMD Ryzen 9 5950X', brand: 'AMD', price: 449, color: '#d2d7de',
    specs: { socket: 'AM4', cores: 16, threads: 32, baseGhz: 3.4, boostGhz: 4.9, tdp: 105, memTypes: ['DDR4'],
             igpu: null, includedCooler: false } },
  { id: 'cpu-3200g', cat: 'cpu', name: 'AMD Ryzen 3 3200G', brand: 'AMD', price: 85, color: '#d2d7de',
    specs: { socket: 'AM4', cores: 4, threads: 4, baseGhz: 3.6, boostGhz: 4.0, tdp: 65, memTypes: ['DDR4'],
             igpu: 'Radeon Vega 8', includedCooler: true } },
  { id: 'cpu-13400f', cat: 'cpu', name: 'Intel Core i5-13400F', brand: 'Intel', price: 189, color: '#b8c4d2',
    specs: { socket: 'LGA1700', cores: 10, threads: 16, baseGhz: 2.5, boostGhz: 4.6, tdp: 148, memTypes: ['DDR4', 'DDR5'],
             igpu: null, includedCooler: true } },
  { id: 'cpu-12400', cat: 'cpu', name: 'Intel Core i5-12400', brand: 'Intel', price: 169, color: '#b8c4d2',
    specs: { socket: 'LGA1700', cores: 6, threads: 12, baseGhz: 2.5, boostGhz: 4.4, tdp: 117, memTypes: ['DDR4', 'DDR5'],
             igpu: 'Intel UHD 730', includedCooler: true } },
  { id: 'cpu-14700k', cat: 'cpu', name: 'Intel Core i7-14700K', brand: 'Intel', price: 419, color: '#b8c4d2',
    specs: { socket: 'LGA1700', cores: 20, threads: 28, baseGhz: 3.4, boostGhz: 5.6, tdp: 253, memTypes: ['DDR4', 'DDR5'],
             igpu: 'Intel UHD 770', includedCooler: false } },
  { id: 'cpu-14900k', cat: 'cpu', name: 'Intel Core i9-14900K', brand: 'Intel', price: 589, color: '#b8c4d2',
    specs: { socket: 'LGA1700', cores: 24, threads: 32, baseGhz: 3.2, boostGhz: 6.0, tdp: 253, memTypes: ['DDR4', 'DDR5'],
             igpu: 'Intel UHD 770', includedCooler: false } },
  { id: 'cpu-i3-6100', cat: 'cpu', name: 'Intel Core i3-6100 (antiguo, 2015)', brand: 'Intel', price: 35, color: '#c3ccd8',
    specs: { socket: 'LGA1151', cores: 2, threads: 4, baseGhz: 3.7, boostGhz: 3.7, tdp: 51, memTypes: ['DDR4'],
             igpu: 'Intel HD 530', includedCooler: true } },

  // ---------------------------------------------------------- REFRIGERACIÓN
  { id: 'cool-wraith', cat: 'cooler', name: 'AMD Wraith Stealth (el que viene con la CPU)', brand: 'AMD', price: 0, color: '#808388',
    specs: { type: 'Aire', sockets: ['AM4'], heightMm: 54, radiator: null, tdpMax: 65, fans: 1 } },
  { id: 'cool-laminar', cat: 'cooler', name: 'Intel Laminar RM1 (el que viene con la CPU)', brand: 'Intel', price: 0, color: '#808388',
    specs: { type: 'Aire', sockets: ['LGA1700'], heightMm: 47, radiator: null, tdpMax: 65, fans: 1 } },
  { id: 'cool-212', cat: 'cooler', name: 'Cooler Master Hyper 212 Black', brand: 'Cooler Master', price: 39, color: '#7e8794',
    specs: { type: 'Aire', sockets: ['AM4', 'AM5', 'LGA1700', 'LGA1200', 'LGA1151'], heightMm: 159, radiator: null, tdpMax: 150, fans: 1, ramClearance: 38 } },
  { id: 'cool-nhd15', cat: 'cooler', name: 'Noctua NH-D15 (doble torre)', brand: 'Noctua', price: 109, color: '#8d99a8',
    specs: { type: 'Aire', sockets: ['AM4', 'AM5', 'LGA1700', 'LGA1200'], heightMm: 165, radiator: null, tdpMax: 250, fans: 2, ramClearance: 32 } },
  { id: 'cool-nhl9i', cat: 'cooler', name: 'Noctua NH-L9i (perfil bajo)', brand: 'Noctua', price: 49, color: '#8d99a8',
    specs: { type: 'Aire', sockets: ['LGA1700', 'LGA1200'], heightMm: 37, radiator: null, tdpMax: 65, fans: 1 } },
  { id: 'cool-purerock2', cat: 'cooler', name: 'be quiet! Pure Rock 2', brand: 'be quiet!', price: 45, color: '#6f7784',
    specs: { type: 'Aire', sockets: ['AM4', 'AM5', 'LGA1700', 'LGA1200', 'LGA1151'], heightMm: 155, radiator: null, tdpMax: 150, fans: 1, ramClearance: 40 } },
  { id: 'cool-h100i', cat: 'cooler', name: 'Corsair iCUE H100i (líquida 240)', brand: 'Corsair', price: 129, color: '#586374',
    specs: { type: 'Líquida (AIO)', sockets: ['AM4', 'AM5', 'LGA1700', 'LGA1200'], heightMm: null, radiator: 240, tdpMax: 250, fans: 2 } },
  { id: 'cool-lf2-280', cat: 'cooler', name: 'Arctic Liquid Freezer II 280 (líquida)', brand: 'Arctic', price: 119, color: '#586374',
    specs: { type: 'Líquida (AIO)', sockets: ['AM4', 'AM5', 'LGA1700'], heightMm: null, radiator: 280, tdpMax: 300, fans: 2 } },
  { id: 'cool-kraken360', cat: 'cooler', name: 'NZXT Kraken 360 (líquida 360)', brand: 'NZXT', price: 199, color: '#586374',
    specs: { type: 'Líquida (AIO)', sockets: ['AM4', 'AM5', 'LGA1700'], heightMm: null, radiator: 360, tdpMax: 300, fans: 3 } },

  // ------------------------------------------------------------- MEMORIA RAM
  { id: 'ram-lpx8-3200', cat: 'ram', name: 'Corsair Vengeance LPX 8 GB DDR4-3200', brand: 'Corsair', price: 22, color: '#2f3b4a',
    specs: { memType: 'DDR4', moduleGb: 8, speed: 3200, casLatency: 16, heightMm: 34, voltage: 1.35 } },
  { id: 'ram-lpx16-3200', cat: 'ram', name: 'Corsair Vengeance LPX 16 GB DDR4-3200', brand: 'Corsair', price: 39, color: '#2f3b4a',
    specs: { memType: 'DDR4', moduleGb: 16, speed: 3200, casLatency: 16, heightMm: 34, voltage: 1.35 } },
  { id: 'ram-tz16-3600', cat: 'ram', name: 'G.Skill Trident Z RGB 16 GB DDR4-3600', brand: 'G.Skill', price: 52, color: '#4a4f5c',
    specs: { memType: 'DDR4', moduleGb: 16, speed: 3600, casLatency: 18, heightMm: 44, voltage: 1.35 } },
  { id: 'ram-value8-2666', cat: 'ram', name: 'Kingston ValueRAM 8 GB DDR4-2666', brand: 'Kingston', price: 18, color: '#2b3543',
    specs: { memType: 'DDR4', moduleGb: 8, speed: 2666, casLatency: 19, heightMm: 31, voltage: 1.2 } },
  { id: 'ram-fury16-5600', cat: 'ram', name: 'Kingston Fury Beast 16 GB DDR5-5600', brand: 'Kingston', price: 55, color: '#1f4a3c',
    specs: { memType: 'DDR5', moduleGb: 16, speed: 5600, casLatency: 36, heightMm: 35, voltage: 1.25 } },
  { id: 'ram-veng32-6000', cat: 'ram', name: 'Corsair Vengeance 32 GB DDR5-6000', brand: 'Corsair', price: 99, color: '#1f4a3c',
    specs: { memType: 'DDR5', moduleGb: 32, speed: 6000, casLatency: 30, heightMm: 35, voltage: 1.35 } },
  { id: 'ram-tz5-16-6400', cat: 'ram', name: 'G.Skill Trident Z5 RGB 16 GB DDR5-6400', brand: 'G.Skill', price: 79, color: '#3d5b52',
    specs: { memType: 'DDR5', moduleGb: 16, speed: 6400, casLatency: 32, heightMm: 44, voltage: 1.4 } },
  { id: 'ram-dom32-7200', cat: 'ram', name: 'Corsair Dominator Titanium 32 GB DDR5-7200', brand: 'Corsair', price: 189, color: '#3d5b52',
    specs: { memType: 'DDR5', moduleGb: 32, speed: 7200, casLatency: 34, heightMm: 56, voltage: 1.45 } },
  { id: 'ram-ddr3-8', cat: 'ram', name: 'Crucial 8 GB DDR3-1600 (antigua)', brand: 'Crucial', price: 12, color: '#3a3f4a',
    specs: { memType: 'DDR3', moduleGb: 8, speed: 1600, casLatency: 11, heightMm: 30, voltage: 1.5 } },

  // -------------------------------------------------------- TARJETAS GRÁFICAS
  { id: 'gpu-4060', cat: 'gpu', name: 'NVIDIA RTX 4060 (ASUS Dual)', brand: 'NVIDIA', price: 309, color: '#3b4049',
    specs: { vramGb: 8, lengthMm: 227, slots: 2, tdp: 115, pcieVer: '4.0', power: { pcie8: 1 } } },
  { id: 'gpu-4070s', cat: 'gpu', name: 'NVIDIA RTX 4070 SUPER (MSI Ventus 3X)', brand: 'NVIDIA', price: 629, color: '#33383f',
    specs: { vramGb: 12, lengthMm: 308, slots: 3, tdp: 220, pcieVer: '4.0', power: { pcie8: 2 } } },
  { id: 'gpu-4080s', cat: 'gpu', name: 'NVIDIA RTX 4080 SUPER', brand: 'NVIDIA', price: 1109, color: '#2e333a',
    specs: { vramGb: 16, lengthMm: 336, slots: 3, tdp: 320, pcieVer: '4.0', power: { vhpwr: 1 } } },
  { id: 'gpu-4090', cat: 'gpu', name: 'NVIDIA RTX 4090 (Gigabyte Gaming OC)', brand: 'NVIDIA', price: 1899, color: '#292d34',
    specs: { vramGb: 24, lengthMm: 340, slots: 4, tdp: 450, pcieVer: '4.0', power: { vhpwr: 1 } } },
  { id: 'gpu-3050', cat: 'gpu', name: 'NVIDIA RTX 3050 6 GB', brand: 'NVIDIA', price: 189, color: '#41464f',
    specs: { vramGb: 6, lengthMm: 170, slots: 2, tdp: 70, pcieVer: '4.0', power: null } },
  { id: 'gpu-1650lp', cat: 'gpu', name: 'NVIDIA GTX 1650 (perfil bajo)', brand: 'NVIDIA', price: 139, color: '#474c55',
    specs: { vramGb: 4, lengthMm: 145, slots: 2, tdp: 75, pcieVer: '3.0', power: null } },
  { id: 'gpu-7600', cat: 'gpu', name: 'AMD Radeon RX 7600 (Sapphire Pulse)', brand: 'AMD', price: 279, color: '#4a3a3c',
    specs: { vramGb: 8, lengthMm: 240, slots: 2, tdp: 165, pcieVer: '4.0', power: { pcie8: 1 } } },
  { id: 'gpu-7900xtx', cat: 'gpu', name: 'AMD Radeon RX 7900 XTX (XFX)', brand: 'AMD', price: 999, color: '#42292b',
    specs: { vramGb: 24, lengthMm: 344, slots: 3, tdp: 355, pcieVer: '4.0', power: { pcie8: 2 } } },
  { id: 'gpu-arc750', cat: 'gpu', name: 'Intel Arc A750', brand: 'Intel', price: 219, color: '#2f3a48',
    specs: { vramGb: 8, lengthMm: 270, slots: 2, tdp: 225, pcieVer: '4.0', power: { pcie8: 2 } } },

  // ----------------------------------------------------------- ALMACENAMIENTO
  { id: 'ssd-990pro-1t', cat: 'storage', name: 'Samsung 990 PRO 1 TB', brand: 'Samsung', price: 109, color: '#28394a',
    specs: { kind: 'nvme', capacityGb: 1000, interface: 'PCIe 4.0 x4 (NVMe)', format: 'M.2 2280', speed: '7450 MB/s' } },
  { id: 'ssd-980-500', cat: 'storage', name: 'Samsung 980 500 GB', brand: 'Samsung', price: 49, color: '#28394a',
    specs: { kind: 'nvme', capacityGb: 500, interface: 'PCIe 3.0 x4 (NVMe)', format: 'M.2 2280', speed: '3100 MB/s' } },
  { id: 'ssd-sn850x-2t', cat: 'storage', name: 'WD Black SN850X 2 TB', brand: 'Western Digital', price: 169, color: '#233042',
    specs: { kind: 'nvme', capacityGb: 2000, interface: 'PCIe 4.0 x4 (NVMe)', format: 'M.2 2280', speed: '7300 MB/s' } },
  { id: 'ssd-kc3000-1t', cat: 'storage', name: 'Kingston KC3000 1 TB', brand: 'Kingston', price: 89, color: '#2b3846',
    specs: { kind: 'nvme', capacityGb: 1000, interface: 'PCIe 4.0 x4 (NVMe)', format: 'M.2 2280', speed: '7000 MB/s' } },
  { id: 'ssd-mx500-1t', cat: 'storage', name: 'Crucial MX500 1 TB', brand: 'Crucial', price: 69, color: '#455160',
    specs: { kind: 'sata-ssd', capacityGb: 1000, interface: 'SATA III', format: '2,5"', speed: '560 MB/s' } },
  { id: 'ssd-a400-480', cat: 'storage', name: 'Kingston A400 480 GB', brand: 'Kingston', price: 32, color: '#455160',
    specs: { kind: 'sata-ssd', capacityGb: 480, interface: 'SATA III', format: '2,5"', speed: '500 MB/s' } },
  { id: 'hdd-barracuda-2t', cat: 'storage', name: 'Seagate BarraCuda 2 TB', brand: 'Seagate', price: 55, color: '#5d646e',
    specs: { kind: 'hdd', capacityGb: 2000, interface: 'SATA III', format: '3,5"', speed: '7200 rpm' } },
  { id: 'hdd-blue-4t', cat: 'storage', name: 'WD Blue 4 TB', brand: 'Western Digital', price: 89, color: '#4e5761',
    specs: { kind: 'hdd', capacityGb: 4000, interface: 'SATA III', format: '3,5"', speed: '5400 rpm' } },

  // -------------------------------------------------- FUENTES DE ALIMENTACIÓN
  { id: 'psu-generic400', cat: 'psu', name: 'Fuente genérica 400 W (sin certificar)', brand: 'Genérica', price: 19, color: '#4b5058',
    specs: { watts: 400, formFactor: 'ATX', efficiency: 'Sin certificar', modular: 'No', depthMm: 140, sata: 2,
             power: { eps8: 1, pcie8: 0 } } },
  { id: 'psu-sp10-450', cat: 'psu', name: 'be quiet! System Power 10 450 W', brand: 'be quiet!', price: 55, color: '#383d45',
    specs: { watts: 450, formFactor: 'ATX', efficiency: '80 PLUS Bronze', modular: 'No', depthMm: 140, sata: 4,
             power: { eps8: 1, pcie8: 1 } } },
  { id: 'psu-cx550', cat: 'psu', name: 'Corsair CX550', brand: 'Corsair', price: 65, color: '#3a3f47',
    specs: { watts: 550, formFactor: 'ATX', efficiency: '80 PLUS Bronze', modular: 'No', depthMm: 140, sata: 4,
             power: { eps8: 1, pcie8: 2 } } },
  { id: 'psu-focus650', cat: 'psu', name: 'Seasonic Focus GX-650', brand: 'Seasonic', price: 99, color: '#33383f',
    specs: { watts: 650, formFactor: 'ATX', efficiency: '80 PLUS Gold', modular: 'Sí (total)', depthMm: 140, sata: 6,
             power: { eps8: 2, pcie8: 4 } } },
  { id: 'psu-rm750e', cat: 'psu', name: 'Corsair RM750e', brand: 'Corsair', price: 109, color: '#33383f',
    specs: { watts: 750, formFactor: 'ATX', efficiency: '80 PLUS Gold', modular: 'Sí (total)', depthMm: 140, sata: 8,
             power: { eps8: 2, pcie8: 4 } } },
  { id: 'psu-a1000g', cat: 'psu', name: 'MSI MPG A1000G PCIE5', brand: 'MSI', price: 189, color: '#2d323a',
    specs: { watts: 1000, formFactor: 'ATX', efficiency: '80 PLUS Gold', modular: 'Sí (total)', depthMm: 160, sata: 10,
             power: { eps8: 2, pcie8: 6, vhpwr: 1 } } },
  { id: 'psu-v850sfx', cat: 'psu', name: 'Cooler Master V850 SFX Gold', brand: 'Cooler Master', price: 165, color: '#383d45',
    specs: { watts: 850, formFactor: 'SFX', efficiency: '80 PLUS Gold', modular: 'Sí (total)', depthMm: 100, sata: 6,
             power: { eps8: 2, pcie8: 4, vhpwr: 1 } } },

  // ------------------------------------------------------------ VENTILADORES
  { id: 'fan-p12', cat: 'fan', name: 'Arctic P12 PWM 120 mm', brand: 'Arctic', price: 8, color: '#5b6270',
    specs: { sizeMm: 120, rpm: 1800, rgb: false, connector: '4 pines PWM' } },
  { id: 'fan-nfa12', cat: 'fan', name: 'Noctua NF-A12x25 120 mm', brand: 'Noctua', price: 32, color: '#9c7e6e',
    specs: { sizeMm: 120, rpm: 2000, rgb: false, connector: '4 pines PWM' } },
  { id: 'fan-sp140rgb', cat: 'fan', name: 'Corsair iCUE SP140 RGB 140 mm', brand: 'Corsair', price: 29, color: '#7d8593',
    specs: { sizeMm: 140, rpm: 1400, rgb: true, connector: '4 pines PWM + RGB' } },
  { id: 'fan-basic120', cat: 'fan', name: 'Ventilador genérico 120 mm', brand: 'Genérica', price: 4, color: '#6a717c',
    specs: { sizeMm: 120, rpm: 1200, rgb: false, connector: '3 pines' } },

  // ------------------------------------------------------ TARJETAS DE EXPANSIÓN
  { id: 'exp-wifi6', cat: 'expansion', name: 'TP-Link Archer TX50E (Wi-Fi 6)', brand: 'TP-Link', price: 39, color: '#26333f',
    specs: { kind: 'Tarjeta de red inalámbrica Wi-Fi 6 + Bluetooth', slotType: 'PCIe x1' } },
  { id: 'exp-lan', cat: 'expansion', name: 'TP-Link TG-3468 (Ethernet Gigabit)', brand: 'TP-Link', price: 15, color: '#26333f',
    specs: { kind: 'Tarjeta de red por cable (RJ-45)', slotType: 'PCIe x1' } },
  { id: 'exp-sound', cat: 'expansion', name: 'Creative Sound Blaster Audigy FX', brand: 'Creative', price: 45, color: '#332f42',
    specs: { kind: 'Tarjeta de sonido 5.1', slotType: 'PCIe x1' } },
  { id: 'exp-capture', cat: 'expansion', name: 'Elgato 4K60 Pro MK.2', brand: 'Elgato', price: 249, color: '#22303a',
    specs: { kind: 'Capturadora de vídeo 4K', slotType: 'PCIe x4' } },

  // ---------------------------------------------------------- UNIDAD ÓPTICA
  { id: 'odd-dvd', cat: 'optical', name: 'LG GH24NSD5 (grabadora DVD)', brand: 'LG', price: 22, color: '#3b414a',
    specs: { kind: 'Grabadora de DVD ±RW', interface: 'SATA', format: 'Bahía 5,25"' } },
  { id: 'odd-bluray', cat: 'optical', name: 'ASUS BW-16D1HT (grabadora Blu-ray)', brand: 'ASUS', price: 89, color: '#333941',
    specs: { kind: 'Grabadora de Blu-ray', interface: 'SATA', format: 'Bahía 5,25"' } }
];

export const BY_ID = Object.fromEntries(COMPONENTS.map(c => [c.id, c]));

/** Texto corto que resume la pieza (se muestra bajo el nombre en el menú). */
export function shortSummary(c) {
  const s = c.specs;
  switch (c.cat) {
    case 'case': return s.formFactors[0] + ' · GPU ≤ ' + s.maxGpuLen + ' mm';
    case 'motherboard': return s.socket + ' · ' + s.chipset + ' · ' + s.memType + ' · ' + s.formFactor;
    case 'cpu': return s.socket + ' · ' + s.cores + ' núcleos · ' + s.tdp + ' W';
    case 'cooler': return s.type + ' · hasta ' + s.tdpMax + ' W';
    case 'ram': return s.memType + ' · ' + s.moduleGb + ' GB · ' + s.speed + ' MHz';
    case 'gpu': return s.vramGb + ' GB · ' + s.lengthMm + ' mm · ' + s.tdp + ' W';
    case 'storage': return KIND_LABEL[s.kind] + ' · ' + s.format;
    case 'psu': return s.watts + ' W · ' + s.efficiency;
    case 'fan': return s.sizeMm + ' mm' + (s.rgb ? ' · RGB' : '');
    case 'expansion': return s.slotType;
    case 'optical': return s.kind;
    default: return '';
  }
}

/** Palabras por las que se puede buscar una pieza en el menú lateral. */
export function searchText(c) {
  return (c.name + ' ' + c.brand + ' ' + CAT[c.cat].name + ' ' + shortSummary(c) +
          ' ' + Object.values(c.specs).join(' ')).toLowerCase();
}
