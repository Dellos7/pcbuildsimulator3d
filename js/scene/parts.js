// ---------------------------------------------------------------------------
// Construcción de las piezas 3D y colocación dentro de la torre.
//
// Sistema de coordenadas (1 unidad = 1 cm), mirando la torre desde el lado
// abierto (el del panel transparente):
//   X → hacia el panel lateral abierto. La bandeja de la placa base está en
//       X = 0 y el PCB de la placa en X = 0,8. Todo lo que "sobresale" de la
//       placa (disipador, RAM, gráfica) crece en +X.
//   Y → altura. Y = 0 es el suelo de la caja.
//   Z → profundidad. Z = 0 es la parte trasera (donde están los puertos) y
//       Z = profundidad de la caja es el frontal.
//
// Las medidas se toman de las especificaciones reales del catálogo, así que
// una gráfica demasiado larga o un disipador demasiado alto SE VEN salir de
// la caja: ése es el objetivo didáctico.
//
// Cada pieza se construye con chapas recortadas, tornillos, conectores y
// etiquetas para que el alumnado reconozca el componente real al verlo.
// ---------------------------------------------------------------------------

import * as THREE from '../../vendor/three.module.min.js';
import * as M from './materials.js';

const DEFAULT_CASE = { w: 22, h: 45, d: 45 };
const CASE_X0 = -2.5;          // cara interior del lateral por donde van los cables
const MB_PCB_X = 0.8;          // superficie de la placa base
const MB_REAR_Z = 1.6;         // borde trasero de la placa base

// Un toque del color de la marca ayuda a distinguir las piezas de un vistazo.
const BRAND_COLOR = {
  NVIDIA: '#76b900', AMD: '#c8102e', Intel: '#0071c5', Corsair: '#ffd400',
  'G.Skill': '#c02b2b', Kingston: '#d43a2f', Crucial: '#1e7fc2', Noctua: '#cc7a52',
  MSI: '#e01f26', ASUS: '#2f6ee0', Gigabyte: '#f26722', NZXT: '#4a90d9',
  ASRock: '#1f8ac0', Samsung: '#2f57c4', 'Western Digital': '#0389d2',
  Seagate: '#6ebe4a', 'Cooler Master': '#7a3fb0', 'be quiet!': '#e07b39',
  Arctic: '#2a9fd6', 'Fractal Design': '#6b7480', 'Lian Li': '#5a626c',
  Seasonic: '#e0a33d', 'TP-Link': '#3fb6c8', Creative: '#e2231a',
  Elgato: '#1c9bd4', LG: '#a50034', Genérica: '#8a8f97'
};
const brandOf = c => BRAND_COLOR[c.brand] || '#7f8a99';

/** Oscurece un color: el interior de una torre nunca es tan claro como el exterior. */
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = i => Math.round(((n >> (16 - i * 8)) & 255) * f);
  return 'rgb(' + ch(0) + ',' + ch(1) + ',' + ch(2) + ')';
}

const MB_SIZE = {
  'E-ATX':    { h: 33.0, d: 27.2 },
  'ATX':      { h: 30.5, d: 24.4 },
  'MicroATX': { h: 24.4, d: 24.4 },
  'MiniITX':  { h: 17.0, d: 17.0 }
};

/**
 * Calcula los puntos de anclaje del montaje a partir de la caja y la placa.
 *
 * Las alturas siguen el estándar ATX, que es lo que hace que todo encaje:
 * el panel de puertos ocupa la parte alta del canto trasero y las ranuras de
 * expansión van JUSTO DEBAJO, separadas 20,32 mm (una pulgada de cada cinco).
 * Por eso la gráfica queda por debajo de la memoria y no la atraviesa.
 */
export function computeLayout(caseComp, mbComp) {
  const d = caseComp ? caseComp.specs.dims : [DEFAULT_CASE.w, DEFAULT_CASE.h, DEFAULT_CASE.d];
  const box = { w: d[0], h: d[1], d: d[2] };
  const mb = MB_SIZE[mbComp ? mbComp.specs.formFactor : 'MicroATX'];
  const mbTopY = box.h - 4.5;

  // Las torres antiguas (con bahía de DVD) y las cajas pequeñas llevan la
  // fuente arriba; las modernas, abajo. Importa: si no, en una caja baja la
  // fuente queda justo donde tiene que ir la tarjeta gráfica.
  const psuTop = box.h < 38 || (caseComp && caseComp.specs.bays525 > 0);

  const ioH = mb.h >= 24 ? 15.9 : 12.6;        // apertura de puertos traseros
  const ioTopY = mbTopY - 1.5;
  const slot0 = ioTopY - ioH - 0.95;           // centro de la primera ranura PCIe
  const slotY = i => slot0 - i * 2.03;

  return {
    box,
    caseX0: CASE_X0,
    caseCenterX: CASE_X0 + box.w / 2,
    hasCase: !!caseComp,
    psuTop,
    opticalY: psuTop ? box.h - 14.6 : box.h - 9.5,
    mb: { ...mb, topY: mbTopY, bottomY: mbTopY - mb.h, rearZ: MB_REAR_Z, pcbX: MB_PCB_X },
    io: { h: ioH, topY: ioTopY, centerY: ioTopY - ioH / 2 },
    cpu: { x: MB_PCB_X, y: mbTopY - 7.4, z: MB_REAR_Z + 5.8 },
    // Memoria: cuatro ranuras por delante del zócalo, con el módulo hacia arriba.
    ramZ: i => MB_REAR_Z + 13.9 + i * 1.02,
    ramTopY: mbTopY - 1.5,
    ramLen: 13.3,
    // Ranuras de expansión: la carta apoya su borde a 6 mm por encima del centro.
    slotY,
    cardY: i => slotY(i) + 0.6,
    slotCount: Math.max(1, Math.min(7, Math.floor((slot0 - (mbTopY - mb.h) - 0.6) / 2.03) + 1)),
    // Ranuras M.2: la primera entre el zócalo y la PCIe x16; las demás, entre ranuras.
    m2Y: i => (i === 0 ? slot0 + 1.9 : slot0 - (2 * i - 1) * 1.015),
    m2Z: MB_REAR_Z + 3.4
  };
}

// ------------------------------------------------------------------ materiales

function mat(color, o = {}) {
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: o.rough ?? 0.6,
    metalness: o.metal ?? 0.1,
    envMapIntensity: o.env ?? 1,
    side: o.side || THREE.FrontSide,
    map: o.map || null,
    roughnessMap: o.roughMap || null,
    alphaMap: o.alphaMap || null
  });
  if (o.opacity !== undefined) { m.transparent = true; m.opacity = o.opacity; }
  if (o.alphaMap) { m.transparent = true; m.alphaTest = 0.5; }
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); }
  return m;
}

const steel   = (c, o = {}) => mat(c, { metal: 0.85, rough: 0.45, roughMap: M.brushedRough(o.rep || 0.4), ...o });
const alu     = (c, o = {}) => mat(c, { metal: 0.95, rough: 0.3, ...o });
const plastic = (c, o = {}) => mat(c, { metal: 0.02, rough: 0.7, roughMap: M.grainRough(2), ...o });
const rubber  = (c, o = {}) => mat(c, { metal: 0, rough: 0.92, ...o });
const gold    = (o = {}) => mat('#d8b468', { metal: 1, rough: 0.3, ...o });
const pcbMat  = (c, o = {}) => mat('#e4e8ec', { map: M.pcbTexture(c), metal: 0.06, rough: 0.78, ...o });
// Metal pintado: refleja bastante menos que el aluminio desnudo, que si no
// sale blanco en cuanto le da la luz (carcasas de gráficas, chapas negras…).
const painted = (c, o = {}) => mat(c, { metal: 0.55, rough: 0.5, ...o });

// ----------------------------------------------------------------- utilidades

/** Caja con los cantos matados, colocada por su esquina inferior trasera. */
function bx(g, x, y, z, w, h, d, material, opts = {}) {
  const m = new THREE.Mesh(M.roundedBox(w, h, d, opts.radius ?? 0.08), material);
  m.position.set(x + w / 2, y + h / 2, z + d / 2);
  m.castShadow = opts.shadow !== false;
  m.receiveShadow = opts.shadow !== false;
  g.add(m);
  return m;
}

/** Caja recta con coordenadas de textura normales (para piezas texturizadas). */
function tex(g, x, y, z, w, h, d, material, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x + w / 2, y + h / 2, z + d / 2);
  m.castShadow = opts.shadow !== false;
  m.receiveShadow = opts.shadow !== false;
  g.add(m);
  return m;
}

function cyl(r, h, material, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), material);
  m.castShadow = true;
  return m;
}

/**
 * Chapa plana con recortes, colocada en el mundo por su centro.
 * `axis` es el eje de la normal. Los recortes se dan en coordenadas del mundo
 * de los dos ejes del plano, así no hay que pelearse con los signos.
 */
function panel(g, axis, center, uSize, vSize, thick, material, cutouts = [], radius = 0.25) {
  const [cx, cy, cz] = center;
  const local = cutouts.map(c => {
    const o = { round: c.round };
    if (axis === 'z') { o.x = c.x - cx; o.y = c.y - cy; }
    else if (axis === 'x') { o.x = -(c.z - cz); o.y = c.y - cy; }
    else { o.x = c.x - cx; o.y = -(c.z - cz); }
    if (c.r !== undefined) o.r = c.r; else { o.w = c.w; o.h = c.h; }
    return o;
  });
  const m = new THREE.Mesh(M.plate(uSize, vSize, thick, local, radius), material);
  m.position.set(cx, cy, cz);
  if (axis === 'x') m.rotation.y = Math.PI / 2;
  if (axis === 'y') m.rotation.x = -Math.PI / 2;
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  return m;
}

const FACE = {
  '+x': m => { m.rotation.y = Math.PI / 2; },
  '-x': m => { m.rotation.y = -Math.PI / 2; },
  '+y': m => { m.rotation.x = -Math.PI / 2; },
  '-y': m => { m.rotation.x = Math.PI / 2; },
  '+z': () => {},
  '-z': m => { m.rotation.y = Math.PI; }
};

/** Etiqueta / serigrafía pegada sobre una cara: da escala y "marca" a la pieza. */
function decal(g, face, x, y, z, w, h, texture, opts = {}) {
  const geo = new THREE.PlaneGeometry(w, h);
  if (opts.rot) geo.rotateZ(opts.rot);        // el texto sigue el lado largo de la pieza
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: texture, transparent: true, roughness: opts.rough ?? 0.75, metalness: opts.metal ?? 0,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3
  }));
  FACE[face](m);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

/** Tornillo avellanado: cuatro de éstos hacen que una chapa parezca chapa. */
function screw(g, face, x, y, z, r = 0.22) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.12, 10), alu('#8d949e', { rough: 0.35 }));
  if (face === 'x') m.rotation.z = Math.PI / 2;
  if (face === 'z') m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

/** Cable trenzado siguiendo una curva suave entre dos puntos. */
function cable(g, points, radius, color) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, radius, 8, false),
    rubber(color, { rough: 0.85 }));
  m.castShadow = true;
  g.add(m);
  return m;
}

// ------------------------------------------------------------- ventiladores

/** Pala de ventilador: perfil barrido y retorcido en hélice, no una tablilla. */
function bladeGeometry(r0, r1, sweep, span, pitch) {
  const shape = new THREE.Shape();
  const pts = [], N = 8;
  for (let i = 0; i <= N; i++) {
    const t = i / N, rr = r0 + (r1 - r0) * t, a = sweep * t;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  for (let i = N; i >= 0; i--) {
    const t = i / N, rr = r0 + (r1 - r0) * t, a = sweep * t + span * (1 - 0.45 * t);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false, curveSegments: 1 });
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {                     // torsión helicoidal
    const x = pos.getX(i), y = pos.getY(i), rr = Math.hypot(x, y);
    const t = Math.min(1, Math.max(0, (rr - r0) / (r1 - r0)));
    let rel = Math.atan2(y, x) - sweep * t;
    while (rel < -Math.PI) rel += Math.PI * 2;
    while (rel > Math.PI) rel -= Math.PI * 2;
    pos.setZ(i, pos.getZ(i) + pitch * rel * rr);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Ventilador completo: marco cuadrado con el agujero circular, buje, nueve
 * palas y los brazos traseros. El rotor va en un grupo aparte para que gire
 * él solo y el marco se quede quieto.
 */
function fanMesh(size, opts = {}) {
  const g = new THREE.Group();
  const r = size / 2;
  const depth = Math.max(1.6, size * 0.21);
  const frameCol = opts.frame || '#24282e';
  const bladeCol = opts.blade || '#31363d';

  const frame = new THREE.Mesh(M.plate(size, size, depth, [{ x: 0, y: 0, r: r * 0.95 }], size * 0.09),
    plastic(frameCol));
  frame.castShadow = true; frame.receiveShadow = true;
  g.add(frame);
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {   // taladros de montaje
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.035, size * 0.035, depth + 0.05, 8),
      plastic('#15181c'));
    hole.rotation.x = Math.PI / 2;
    hole.position.set(sx * r * 0.82, sy * r * 0.82, 0);
    g.add(hole);
  }

  const rotor = new THREE.Group();
  rotor.userData.isFan = true;
  const hub = cyl(r * 0.3, depth * 0.75, plastic(opts.hub || '#1b1e23'), 20);
  hub.rotation.x = Math.PI / 2;
  rotor.add(hub);
  const bladeGeo = bladeGeometry(r * 0.3, r * 0.93, 0.5, 0.78, 0.30);
  const bladeMat = plastic(bladeCol, { rough: 0.45, opacity: opts.opacity });
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Mesh(bladeGeo, bladeMat);
    b.rotation.z = i / 9 * Math.PI * 2;
    b.position.z = -depth * 0.12;
    rotor.add(b);
  }
  const cap = new THREE.Mesh(new THREE.CircleGeometry(r * 0.29, 20), plastic(opts.hub || '#14171b', { rough: 0.35 }));
  cap.position.z = depth * 0.38 + 0.01;
  rotor.add(cap);
  if (opts.logo) {
    const l = new THREE.Mesh(new THREE.CircleGeometry(r * 0.18, 16),
      mat(opts.logo, { rough: 0.4, metal: 0.3 }));
    l.position.z = depth * 0.38 + 0.02;
    rotor.add(l);
  }
  g.add(rotor);

  for (let i = 0; i < 4; i++) {                                    // brazos traseros
    const arm = new THREE.Mesh(new THREE.BoxGeometry(r * 0.9, 0.18, 0.3), plastic(frameCol));
    arm.position.set(Math.cos(i / 4 * Math.PI * 2) * r * 0.55, Math.sin(i / 4 * Math.PI * 2) * r * 0.55,
      -depth * 0.36);
    arm.rotation.z = i / 4 * Math.PI * 2;
    g.add(arm);
  }
  if (opts.rgb) {                                                  // anillo difusor
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.86, 0.16, 8, 40),
      mat('#cfe0ff', { emissive: '#4f8cff', rough: 0.25 }));
    ring.position.z = depth * 0.42;
    g.add(ring);
  }
  return g;
}

/** Bloque de aletas de aluminio: láminas finas separadas unos 2 mm. */
function finStack(g, x0, x1, y, z, height, depthZ, color) {
  const count = Math.max(6, Math.floor((x1 - x0) / 0.24));
  const geo = new THREE.BoxGeometry(0.07, height, depthZ);
  const material = alu(color, { rough: 0.32 });
  for (let i = 0; i < count; i++) {
    const fin = new THREE.Mesh(geo, material);
    fin.position.set(x0 + (i + 0.5) * ((x1 - x0) / count), y, z);
    g.add(fin);   // las aletas no proyectan sombra: son cientos y no se nota
  }
}

// --------------------------------------------------------- piezas concretas

const builders = {

  // ------------------------------------------------------------------ CAJA
  case(c, L) {
    const g = new THREE.Group();
    const { w, h, d } = L.box;
    const x0 = L.caseX0, x1 = x0 + w, cx = x0 + w / 2;
    const col = c.color;
    const inner = shade(col, 0.42);              // interior mate, como en las torres reales
    const chassis = () => steel(inner, { rep: 0.35 });
    const t = 0.15;

    // Suelo con la rejilla de la fuente, y patas de goma.
    panel(g, 'y', [cx, t / 2, d / 2], w, d, t, chassis(),
      [{ x: x0 + 8.5, z: 9, w: 13, h: 12 }]);
    panel(g, 'y', [cx, 0.1, d / 2], w, d, 0.06, steel('#3b4048', { alphaMap: M.honeycombAlpha(0.3) }),
      [], 0.2);
    for (const [fx, fz] of [[x0 + 2, 3], [x1 - 2, 3], [x0 + 2, d - 3], [x1 - 2, d - 3]]) {
      const foot = cyl(1.1, 1.0, rubber('#23262b'), 12);
      foot.position.set(fx, -0.5, fz);
      g.add(foot);
    }

    // Techo perforado.
    panel(g, 'y', [cx, h - t / 2, d / 2], w, d, t, chassis(),
      [{ x: cx, z: d / 2 + 2, w: w - 5, h: d - 14 }]);
    panel(g, 'y', [cx, h - t - 0.05, d / 2 + 2], w - 5, d - 14, 0.06,
      steel('#454b54', { alphaMap: M.meshAlpha(0.3) }), [], 0.3);

    // Trasera: hueco de puertos, ranuras de expansión y rejilla del ventilador.
    const slots = [];
    for (let i = 0; i < L.slotCount; i++) {
      slots.push({ x: MB_PCB_X + 6.3, y: L.slotY(i) - 0.35, w: 11.6, h: 1.85, round: 0.2 });
    }
    panel(g, 'z', [cx, h / 2, t / 2], w, h, t, chassis(), [
      { x: MB_PCB_X + 2.2, y: L.io.centerY, w: 4.8, h: L.io.h + 0.5, round: 0.3 },
      { x: cx, y: h - 8.5, r: 6.3 },
      ...slots
    ]);
    panel(g, 'z', [cx, h - 8.5, t + 0.06], 13, 13, 0.06,
      steel('#454b54', { alphaMap: M.honeycombAlpha(0.32) }), [{ x: cx, y: h - 8.5, r: 0.8 }], 0.4);
    for (let i = 0; i < L.slotCount; i++) {            // tapas ciegas de las ranuras
      bx(g, MB_PCB_X + 0.5, L.slotY(i) - 1.25, 0.05, 11.6, 1.8, 0.12, steel('#6f7784'), { radius: 0.15 });
    }

    // Lateral de los cables + bandeja de la placa base con pasacables.
    panel(g, 'x', [x0 - t / 2, h / 2, d / 2], d, h, t, steel(shade(col, 0.55), { rep: 0.35 }));
    panel(g, 'x', [-0.2, h / 2 + 1, d / 2], d - 3, h - 4, 0.2, chassis(), [
      { z: L.mb.rearZ + L.mb.d + 2.2, y: L.mb.topY - 6, w: 2.6, h: 14, round: 0.8 },
      { z: L.mb.rearZ + L.mb.d + 2.2, y: L.mb.bottomY - 3.5, w: 2.6, h: 6, round: 0.8 },
      { z: 6, y: L.mb.topY + 2.6, w: 9, h: 2.6, round: 0.8 }
    ], 0.6);

    // Frontal: marco con una gran ventana tapada por chapa perforada. Si la caja
    // tiene bahías de 5,25", la rejilla se interrumpe para dejar salir la unidad.
    const bayY = L.opticalY + 2.1;
    const bays = c.specs.bays525 > 0 ? [{ x: cx, y: bayY, w: 15.2, h: 4.4, round: 0.2 }] : [];
    panel(g, 'z', [cx, h / 2, d - 0.4], w, h, 0.5, plastic(shade(col, 0.72)),
      [{ x: cx, y: h / 2 - 1, w: w - 3.4, h: h - 7, round: 0.8 }], 0.6);
    panel(g, 'z', [cx, h / 2 - 1, d - 0.85], w - 3.4, h - 7, 0.1,
      steel('#3f444c', { alphaMap: M.meshAlpha(0.28) }), bays, 0.6);
    if (bays.length) {   // tapa ciega: queda a la vista si no hay unidad óptica
      bx(g, cx - 7.5, bayY - 2.1, d - 1.5, 15.0, 4.2, 0.3, plastic(shade(col, 0.72)), { radius: 0.15 });
    }

    // Frontal de conexiones: botón de encendido, USB y jack.
    const ioY = h - 2.6;
    bx(g, cx - 3.6, ioY, d - 0.2, 7.2, 1.6, 0.3, plastic('#2a2e35'), { radius: 0.2 });
    const pwr = cyl(0.45, 0.25, alu('#c6ccd4'), 16);
    pwr.rotation.x = Math.PI / 2;
    pwr.position.set(cx - 2.6, ioY + 0.8, d + 0.05);
    g.add(pwr);
    for (let i = 0; i < 2; i++) {
      bx(g, cx - 0.9 + i * 1.5, ioY + 0.45, d - 0.05, 1.2, 0.6, 0.2, mat('#1a5fa8', { rough: 0.5 }), { radius: 0.05 });
    }
    bx(g, cx + 2.6, ioY + 0.5, d - 0.05, 0.6, 0.6, 0.2, mat('#12161b', { rough: 0.5 }), { radius: 0.05 });

    // Panel lateral de cristal templado con sus cuatro tornillos.
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.4, h - 0.6, d - 0.6),
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#a9b4bd'), transparent: true, opacity: 0.11,
        roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03,
        envMapIntensity: 1.6, side: THREE.DoubleSide
      }));
    glass.position.set(x1 - 0.2, h / 2, d / 2);
    g.add(glass);
    for (const [gy, gz] of [[1.6, 1.6], [h - 1.6, 1.6], [1.6, d - 1.6], [h - 1.6, d - 1.6]]) {
      screw(g, 'x', x1 + 0.05, gy, gz, 0.3);
    }

    g.userData.explode = new THREE.Vector3(0, 0, 0);
    return g;
  },

  // ------------------------------------------------------------ PLACA BASE
  motherboard(c, L) {
    const g = new THREE.Group();
    const s = c.specs;
    const { d: md, h: mh, topY, rearZ } = L.mb;
    const y0 = topY - mh, z1 = rearZ + md;
    const cy = L.cpu.y, cz = L.cpu.z;
    const X = MB_PCB_X;

    // Circuito impreso y tornillos de sujeción a la bandeja.
    tex(g, X - 0.22, y0, rearZ, 0.22, mh, md, pcbMat(c.color));
    for (const [sy, sz] of [[y0 + 0.9, rearZ + 0.9], [topY - 0.9, rearZ + 0.9],
                            [y0 + 0.9, z1 - 0.9], [topY - 0.9, z1 - 0.9],
                            [topY - 0.9, rearZ + md / 2], [y0 + 0.9, rearZ + md / 2],
                            [L.slotY(0) + 1.4, rearZ + 0.9]]) {
      screw(g, 'x', X + 0.02, sy, sz, 0.25);
    }

    // Panel de puertos traseros.
    bx(g, X, L.io.topY - L.io.h, rearZ - 0.75, 4.4, L.io.h, 0.75, plastic('#1b1f26'), { radius: 0.1 });
    decal(g, '-z', X + 2.2, L.io.centerY, rearZ - 0.78, 4.4, L.io.h, M.rearIoTexture(s.wifi));

    // Zócalo del procesador: la diferencia entre AM4/AM5 y LGA se nota.
    bx(g, X, cy - 2.6, cz - 2.6, 0.45, 5.2, 5.2, plastic('#15181d'), { radius: 0.1 });
    for (const [ay, az, aw, ad] of [[cy - 3.1, cz - 3.1, 6.2, 0.5], [cy + 2.6, cz - 3.1, 6.2, 0.5],
                                    [cy - 3.1, cz - 3.1, 0.5, 6.2], [cy - 3.1, cz + 2.6, 0.5, 6.2]]) {
      bx(g, X + 0.45, ay, az, 0.3, aw === 6.2 ? 0.5 : aw, ad === 6.2 ? 6.2 : ad,
        alu('#aab2bc', { rough: 0.35 }), { radius: 0.06 });
    }
    const lever = cyl(0.13, 5.2, alu('#c3c9d1'), 8);      // palanca de retención
    lever.rotation.x = Math.PI / 2;
    lever.position.set(X + 0.7, cy - 3.4, cz);
    g.add(lever);

    // Disipadores de fases (VRM): aletas encima y detrás del zócalo.
    bx(g, X, topY - 4.6, rearZ + 0.8, 1.1, 4.0, 7.5, alu('#6e7681', { rough: 0.35 }), { radius: 0.15 });
    finStack(g, X + 0.3, X + 1.0, topY - 2.6, rearZ + 4.5, 3.4, 7.0, '#8a929c');
    bx(g, X, cy - 1.0, rearZ + 0.6, 1.1, 8.0, 2.6, alu('#6e7681', { rough: 0.35 }), { radius: 0.15 });

    // Bobinas y condensadores alrededor del zócalo.
    for (let i = 0; i < 8; i++) {
      bx(g, X, topY - 5.8, rearZ + 1.2 + i * 0.85, 0.75, 0.8, 0.7, mat('#22262c', { rough: 0.55 }), { radius: 0.05 });
    }
    for (let i = 0; i < 5; i++) {
      const cap = cyl(0.28, 1.0, mat(i % 2 ? '#2b2f36' : '#3a4048', { rough: 0.5, metal: 0.3 }), 10);
      cap.rotation.z = Math.PI / 2;
      cap.position.set(X + 0.5, cy + 3.6, rearZ + 2.4 + i * 0.9);
      g.add(cap);
    }

    // Ranuras de memoria, con sus pestañas de anclaje.
    const ramBottom = L.ramTopY - L.ramLen;
    for (let i = 0; i < s.memSlots; i++) {
      const z = L.ramZ(i), col = i % 2 ? '#2b323b' : '#4d5867';
      bx(g, X, ramBottom, z - 0.29, 0.55, L.ramLen, 0.58, plastic(col), { radius: 0.06 });
      for (const ty of [L.ramTopY - 0.5, ramBottom]) {
        bx(g, X, ty, z - 0.32, 0.75, 0.55, 0.64, plastic('#5f6b7a'), { radius: 0.08 });
      }
    }

    // ---- Ranuras PCIe -------------------------------------------------------
    // Las x16 son largas, negras y con blindaje metálico; las x1, cortas y
    // claras. Así se distinguen de un vistazo y se ve cuáles tapa la gráfica.
    let big = s.pcieX16, small = s.pcieSmall;
    for (let i = 0; i < L.slotCount && (big > 0 || small > 0); i++) {
      const isBig = ((i === 0 || i === 3) && big > 0) || (small === 0 && big > 0);
      if (isBig) big--; else small--;
      const len = isBig ? 8.9 : 2.5;
      const y = L.slotY(i) - 0.575;
      bx(g, X, y, rearZ + 3.4, 0.7, 1.15, len, plastic(isBig ? '#1b1f25' : '#9aa3ad'), { radius: 0.07 });
      // Canal interior más claro: se ve que es un conector hembra.
      bx(g, X + 0.18, y + 0.75, rearZ + 3.6, 0.34, 0.3, len - 0.4,
        mat(isBig ? '#454d58' : '#c6ccd3', { rough: 0.6 }), { radius: 0.03, shadow: false });
      if (isBig) {
        bx(g, X + 0.02, y - 0.1, rearZ + 3.3, 0.66, 1.35, len + 0.2,
          alu('#b3b9c1', { rough: 0.3 }), { radius: 0.05 });                                  // blindaje
        bx(g, X, y, rearZ + 3.4 + len, 0.7, 1.5, 0.7, plastic('#1b1f25'), { radius: 0.08 });  // pestillo
      }
    }

    // ---- Ranuras M.2 --------------------------------------------------------
    for (let i = 0; i < Math.min(4, s.m2Slots); i++) {
      const y = L.m2Y(i), z = L.m2Z;
      // Serigrafía del hueco, conector al fondo y separador roscado a 80 mm.
      bx(g, X, y - 1.1, z, 0.06, 2.2, 8.4, mat('#0f1317', { rough: 0.85 }), { radius: 0.05, shadow: false });
      tex(g, X + 0.06, y - 0.9, z - 0.55, 0.45, 1.8, 0.55,
        mat('#dfe5ec', { map: M.pinsTexture(16, 1), rough: 0.6 }));
      const post = cyl(0.22, 0.34, alu('#aeb5be'), 10);
      post.rotation.z = Math.PI / 2;
      post.position.set(X + 0.17, y, z + 8.0);
      g.add(post);
    }

    // ---- Chipset, en la zona baja como en las placas reales -----------------
    // Va bajo. Tiene que ser plano: justo encima queda la tarjeta grafica.
    const chipY = L.slotY(0) - 5.4, chipZ = rearZ + 13.5;
    bx(g, X, chipY, chipZ, 0.6, 4.8, 4.8, alu('#5f6773', { rough: 0.38 }), { radius: 0.25 });
    bx(g, X + 0.6, chipY + 1.7, chipZ + 1.7, 0.08, 1.4, 1.4,
      mat(brandOf(c), { rough: 0.45, metal: 0.5, env: 0.6 }), { radius: 0.1 });

    // ---- Borde inferior: pila, audio y conectores del frontal ---------------
    const bottom = y0 + 0.55;
    // Pila de botón del CMOS, la que guarda la hora y la configuración.
    const coin = cyl(1.0, 0.32, alu('#c5cbd3', { rough: 0.25 }), 20);
    coin.rotation.z = Math.PI / 2;
    coin.position.set(X + 0.32, chipY - 1.9, chipZ + 4.8);
    g.add(coin);

    // Sección de audio: condensadores en fila y su chip, en la esquina trasera.
    for (let i = 0; i < 5; i++) {
      const cap = cyl(0.33, 1.1, mat('#1d2228', { rough: 0.45, metal: 0.35 }), 12);
      cap.rotation.z = Math.PI / 2;
      cap.position.set(X + 0.55, bottom + 2.2, rearZ + 2.0 + i * 1.1);
      g.add(cap);
    }
    bx(g, X, bottom + 3.4, rearZ + 1.6, 0.35, 1.8, 1.8, mat('#15181d', { rough: 0.5 }), { radius: 0.05 });
    // Linea de serigrafia que separa la zona de audio del resto de la placa.
    bx(g, X, bottom + 4.6, rearZ + 1.0, 0.05, 0.16, 7.0, mat('#d8dde4', { rough: 0.9 }), { radius: 0.02, shadow: false });

    // Conectores del panel frontal a lo largo del borde inferior.
    for (let i = 0; i < 5; i++) {
      bx(g, X, bottom, rearZ + 10.5 + i * 2.2, 0.6, 1.0, 1.7,
        plastic(i === 1 ? '#1d3f6b' : '#20252c'), { radius: 0.06 });
    }
    // Chip de la BIOS y algún integrado suelto.
    bx(g, X, chipY + 6.2, z1 - 4.2, 0.22, 1.2, 1.6, mat('#1a1e24', { rough: 0.5 }), { radius: 0.05 });
    bx(g, X, chipY - 0.4, rearZ + 8.6, 0.25, 1.6, 1.6, mat('#1a1e24', { rough: 0.5 }), { radius: 0.05 });

    // ---- Conectores de alimentación y datos ---------------------------------
    tex(g, X, topY - 9.5, z1 - 1.3, 0.9, 5.2, 1.1,
      mat('#e6ebf1', { map: M.pinsTexture(12, 2), rough: 0.6 }));
    for (let i = 0; i < Math.min(2, s.eps); i++) {
      tex(g, X, topY, rearZ + 2.2 + i * 2.0, 0.85, 0.9, 1.8,
        mat('#e6ebf1', { map: M.pinsTexture(4, 2), rough: 0.6 }));
    }
    // Puertos SATA sobre el borde frontal.
    for (let i = 0; i < Math.min(6, s.sataPorts); i++) {
      bx(g, X, L.slotY(1) - 0.6 + Math.floor(i / 2) * 1.3, z1 - 1.1,
        0.55, 1.1, 1.0, plastic(i % 2 ? '#1d3f6b' : '#20242a'), { radius: 0.05 });
    }
    // Cabecera USB 3.0 del frontal.
    bx(g, X, L.slotY(0) + 2.6, z1 - 1.5, 0.9, 1.1, 2.2, plastic('#1d3f6b'), { radius: 0.06 });

    g.userData.explode = new THREE.Vector3(-1, 0, 0);
    return g;
  },

  // ------------------------------------------------------------ PROCESADOR
  cpu(c, L) {
    const g = new THREE.Group();
    const socket = c.specs.socket;
    const intel = socket.startsWith('LGA');
    const subH = intel ? 4.5 : 4.0, subD = intel ? 3.75 : 4.0;   // los LGA son rectangulares
    const y = L.cpu.y - subH / 2, z = L.cpu.z - subD / 2;

    // Sustrato verde/negro con el chaflán y el triángulo dorado de orientación.
    tex(g, MB_PCB_X + 0.45, y, z, 0.12, subH, subD, pcbMat(intel ? '#1d2228' : '#16321f'));

    // Cubierta metálica (IHS): octogonal en AM5, rectangular en Intel.
    const ihsH = subH - 0.55, ihsD = subD - 0.55;
    const shape = socket === 'AM5'
      ? (() => {                                        // esquinas cortadas del AM5
          const sh = new THREE.Shape(), k = 0.9;
          const pts = [[-ihsH / 2 + k, -ihsD / 2], [ihsH / 2 - k, -ihsD / 2], [ihsH / 2, -ihsD / 2 + k],
                       [ihsH / 2, ihsD / 2 - k], [ihsH / 2 - k, ihsD / 2], [-ihsH / 2 + k, ihsD / 2],
                       [-ihsH / 2, ihsD / 2 - k], [-ihsH / 2, -ihsD / 2 + k]];
          sh.moveTo(pts[0][0], pts[0][1]);
          pts.slice(1).forEach(p => sh.lineTo(p[0], p[1]));
          sh.closePath();
          return sh;
        })()
      : M.roundedRectShape(ihsH, ihsD, 0.25);
    const ihsGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1, curveSegments: 4 });
    ihsGeo.center();
    const ihs = new THREE.Mesh(ihsGeo, alu(c.color, { rough: 0.22, metal: 0.98 }));
    ihs.rotation.y = Math.PI / 2;
    ihs.position.set(MB_PCB_X + 0.75, L.cpu.y, L.cpu.z);
    ihs.castShadow = true;
    g.add(ihs);

    // Serigrafía con el nombre del modelo: se lee al acercar la cámara.
    const short = c.name.replace(/\s*\(.*\)/, '');
    decal(g, '+x', MB_PCB_X + 0.91, L.cpu.y, L.cpu.z, ihsD * 0.92, ihsH * 0.92,
      M.stickerTexture('cpu:' + c.id, 256, 256, null, [
        { text: c.brand.toUpperCase(), size: 0.09, y: 0.36, color: 'rgba(30,34,40,0.75)' },
        { text: short.split(' ').slice(-1)[0], size: 0.13, y: 0.55, color: 'rgba(25,28,34,0.8)' },
        { text: socket, size: 0.07, y: 0.7, color: 'rgba(40,45,52,0.6)', weight: 'normal' }
      ]), { metal: 0.6, rough: 0.3 });

    // Triángulo dorado de la esquina (el que indica cómo se coloca).
    const tri = new THREE.Mesh(new THREE.CircleGeometry(0.22, 3), gold());
    tri.rotation.y = Math.PI / 2;
    tri.rotation.x = Math.PI;
    tri.position.set(MB_PCB_X + 0.58, L.cpu.y - subH / 2 + 0.5, L.cpu.z - subD / 2 + 0.5);
    g.add(tri);

    g.userData.explode = new THREE.Vector3(1.6, 0.6, 0);
    return g;
  },

  // --------------------------------------------------------- REFRIGERACIÓN
  cooler(c, L) {
    const g = new THREE.Group();
    const s = c.specs;
    const cy = L.cpu.y, cz = L.cpu.z;
    const fanCol = c.brand === 'Noctua' ? { frame: '#5c3a2e', blade: '#d9c2a8', hub: '#5c3a2e' }
                 : c.brand === 'be quiet!' ? { frame: '#1b1d20', blade: '#2b2f34', hub: '#1b1d20' }
                 : { frame: '#23272d', blade: '#33383f', hub: '#1b1e23' };

    if (s.radiator) {
      // --- Refrigeración líquida ------------------------------------------
      bx(g, MB_PCB_X + 0.95, cy - 3.8, cz - 3.8, 1.2, 7.6, 7.6, alu('#9aa2ac', { rough: 0.3 }), { radius: 0.3 });
      bx(g, MB_PCB_X + 2.15, cy - 3.6, cz - 3.6, 3.4, 7.2, 7.2, plastic('#2c3038'), { radius: 0.4 });
      const capR = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.9, 0.5, 32),
        mat('#c9d8f0', { rough: 0.15, metal: 0.1, emissive: '#3f6fd0' }));
      capR.rotation.z = Math.PI / 2;
      capR.position.set(MB_PCB_X + 5.8, cy, cz);
      g.add(capR);
      decal(g, '+x', MB_PCB_X + 6.07, cy, cz, 4.4, 4.4,
        M.stickerTexture('aio:' + c.id, 256, 256, null, [
          { text: c.brand.toUpperCase(), size: 0.11, y: 0.55, color: 'rgba(255,255,255,0.85)' }
        ]));

      // Radiador en el frontal, con sus ventiladores.
      const radH = s.radiator / 10, radZ = L.box.d - 5.6;
      const radY = Math.max(2, (L.box.h - radH) / 2);
      bx(g, L.caseCenterX - 6.2, radY, radZ, 12.4, radH, 0.6, alu('#7e858f', { rough: 0.4 }), { radius: 0.15 });
      bx(g, L.caseCenterX - 6.2, radY, radZ + 2.4, 12.4, radH, 0.6, alu('#7e858f', { rough: 0.4 }), { radius: 0.15 });
      for (let i = 0; i < Math.floor(radH / 0.35); i++) {         // panel de aletas
        const fin = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.1, 2.2), alu('#aab2bc', { rough: 0.45 }));
        fin.position.set(L.caseCenterX, radY + 0.4 + i * 0.35, radZ + 1.5);
        g.add(fin);
      }
      const fanSize = s.radiator / s.fans / 10;
      for (let i = 0; i < s.fans; i++) {
        const f = fanMesh(fanSize * 0.96, fanCol);
        f.position.set(L.caseCenterX, radY + fanSize * (i + 0.5), radZ - 1.5);
        g.add(f);
      }
      // Tubos flexibles desde el bloque hasta el radiador.
      for (const off of [-2.4, 2.4]) {
        cable(g, [[MB_PCB_X + 4, cy + off, cz + 3.6], [MB_PCB_X + 7, cy + off * 1.8, cz + 12],
                  [L.caseCenterX + 2, radY + radH * 0.55 + off, radZ - 2.5]], 0.62, '#2f343b');
      }
    } else if (s.heightMm / 10 < 8) {
      // --- Disipador de perfil bajo ---------------------------------------
      const hCm = s.heightMm / 10;
      bx(g, MB_PCB_X + 0.45, cy - 2.8, cz - 2.8, 0.9, 5.6, 5.6, alu('#b9c0c9', { rough: 0.25 }), { radius: 0.15 });
      finStack(g, MB_PCB_X + 1.4, MB_PCB_X + hCm * 0.55, cy, cz, 9.2, 9.2, '#aab3c0');
      const f = fanMesh(8.6, fanCol);
      f.rotation.y = Math.PI / 2;
      f.position.set(MB_PCB_X + hCm - 1.0, cy, cz);
      g.add(f);
    } else {
      // --- Torre de aire ---------------------------------------------------
      const hCm = s.heightMm / 10;
      const towers = s.fans >= 2 ? 2 : 1;
      const finX0 = MB_PCB_X + 4.3, finX1 = MB_PCB_X + hCm;
      bx(g, MB_PCB_X + 0.45, cy - 2.0, cz - 2.7, 0.55, 4.0, 5.4, alu('#c6ccd4', { rough: 0.2, metal: 1 }), { radius: 0.1 });
      bx(g, MB_PCB_X + 1.0, cy - 2.2, cz - 2.9, 1.6, 4.4, 5.8, alu('#8d949e', { rough: 0.35 }), { radius: 0.15 });
      for (let t = 0; t < towers; t++) {
        const tz = cz + (towers === 2 ? (t ? 3.5 : -3.5) : 0);
        finStack(g, finX0, finX1, cy, tz, 13.0, 5.4, '#aeb6c1');
        bx(g, finX1 - 0.25, cy - 6.6, tz - 2.8, 0.3, 13.2, 5.6, alu('#9099a4', { rough: 0.3 }), { radius: 0.1 });
      }
      for (let i = 0; i < 6; i++) {                       // tubos de calor de cobre
        const x = MB_PCB_X + 2.2;
        const zz = cz - 2.2 + (i % 3) * 1.5 + (i > 2 ? 0.35 : 0);
        const hp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
          new THREE.Vector3(x, cy + (i > 2 ? -0.6 : 0.6), zz),
          new THREE.Vector3(x + 1.6, cy + (i > 2 ? -3.2 : 3.2), zz),
          new THREE.Vector3(finX0 + 1.0, cy + (i > 2 ? -4.6 : 4.6), zz),
          new THREE.Vector3(finX1 - 0.8, cy + (i > 2 ? -5.0 : 5.0), zz)
        ]), 20, 0.3, 8, false), alu('#b98a52', { rough: 0.3, metal: 1 }));
        hp.castShadow = true;
        g.add(hp);
      }
      const f = fanMesh(12, fanCol);
      f.position.set((finX0 + finX1) / 2, cy, cz + (towers === 2 ? 0 : 4.0));
      g.add(f);
      if (towers === 2) {
        const f2 = fanMesh(12, fanCol);
        f2.position.set((finX0 + finX1) / 2, cy, cz - 7.0);
        g.add(f2);
      }
    }
    g.userData.explode = new THREE.Vector3(2.4, 0.8, 0);
    return g;
  },

  // ------------------------------------------------------------ MEMORIA RAM
  ram(c, L, ctx) {
    const g = new THREE.Group();
    const hCm = c.specs.heightMm / 10;         // altura real: la que choca con el disipador
    const z = L.ramZ(ctx.index);
    const rgb = /RGB|Dominator/i.test(c.name);
    const top = L.ramTopY, bottom = top - 13.3;
    const x0 = MB_PCB_X + 0.4;                 // cara del módulo pegada a la placa
    const spreaderH = rgb ? hCm - 0.8 : hCm;   // los kits RGB reservan el difusor arriba

    // Circuito con el peine de contactos dorados en el borde que entra en la ranura.
    tex(g, x0, bottom, z - 0.1, 3.0, 13.3, 0.2, pcbMat('#14322a'));
    for (const dz of [0.11, -0.11]) {
      decal(g, dz > 0 ? '+z' : '-z', x0 + 0.38, (top + bottom) / 2, z + dz, 0.68, 12.2, M.goldFingers());
    }
    // Muesca de posición (la que impide meter una DDR4 en una ranura DDR5).
    bx(g, x0 + 0.05, top - (c.specs.memType === 'DDR5' ? 6.4 : 8.2), z - 0.12, 0.28, 0.5, 0.24,
      plastic('#0d1a15'), { radius: 0.02, shadow: false });

    // Disipador: dos chapas de aluminio y el peine dentado de arriba.
    for (const dz of [-0.30, 0.30]) {                    // un módulo real mide 7,8 mm de grueso
      bx(g, x0 + 0.12, top - 11.9, z + dz - 0.1, spreaderH - 0.2, 11.9, 0.2,
        alu(c.color, { rough: 0.32 }), { radius: 0.15 });
    }
    bx(g, x0 + 0.12, top - 12.0, z - 0.4, spreaderH - 0.2, 0.3, 0.8, alu(c.color, { rough: 0.32 }), { radius: 0.1 });
    for (let i = 0; i < 9; i++) {
      bx(g, x0 + 0.2 + (i % 2) * 0.25, top - 0.85, z - 0.38 + i * 0.086, spreaderH - 0.7, 0.85, 0.06,
        alu(c.color, { rough: 0.3 }), { radius: 0.02, shadow: false });
    }

    // Etiqueta de la marca, leyendo a lo largo del módulo.
    decal(g, '+z', x0 + spreaderH / 2, top - 6.4, z + 0.42, 8.5, spreaderH * 0.75,
      M.stickerTexture('ram:' + c.id, 512, 128, null, [
        { text: c.brand.toUpperCase(), size: 0.3, y: 0.44, color: 'rgba(255,255,255,0.8)' },
        { text: c.specs.memType + '-' + c.specs.speed, size: 0.2, y: 0.72, color: 'rgba(255,255,255,0.55)', weight: 'normal' }
      ]), { rot: Math.PI / 2 });

    if (rgb) {                                 // difusor luminoso del borde superior
      bx(g, x0 + 0.15, top - 0.85, z - 0.38, spreaderH - 0.3, 0.8, 0.76,
        mat('#eef3ff', { emissive: '#7aa8ff', rough: 0.15 }), { radius: 0.2 });
    }
    g.userData.explode = new THREE.Vector3(1.2, 1.2, 0);
    return g;
  },

  // -------------------------------------------------------- TARJETA GRÁFICA
  gpu(c, L) {
    const g = new THREE.Group();
    const s = c.specs;
    const len = s.lengthMm / 10;
    const thick = s.slots * 1.9;
    const slotY = L.slotY(0);
    const pcbY = L.cardY(0);                  // el PCB apoya en el borde de la ranura
    const y0 = pcbY - thick;                  // cara inferior (donde van los ventiladores)
    const z0 = 1.0;
    const cardW = 11.0;                       // "alto" real de la tarjeta, aquí en X
    const x0 = MB_PCB_X + 0.9;

    // Circuito impreso.
    tex(g, x0, pcbY - 0.25, z0 + 1.2, cardW, 0.25, len - 1.6, pcbMat('#15181d'));
    decal(g, '-y', x0 + cardW / 2, pcbY - 0.27, z0 + 2.0, 0.9, 5.6, M.goldFingers());

    // Bloque de aletas del disipador, visible por los laterales.
    const finGeo = new THREE.BoxGeometry(cardW - 1.4, thick - 1.6, 0.08);
    const finMat = alu('#b3bac4', { rough: 0.35 });
    for (let i = 0; i < Math.floor((len - 4) / 0.32); i++) {
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.set(x0 + cardW / 2, y0 + (thick - 1.6) / 2 + 0.4, z0 + 2.2 + i * 0.32);
      g.add(fin);
    }

    // Carcasa inferior con los huecos de los ventiladores.
    const nf = len > 28 ? 3 : (len > 19 ? 2 : 1);
    const fanD = Math.min(9.0, (len - 2.4) / nf);
    const holes = [];
    for (let i = 0; i < nf; i++) {
      holes.push({ x: x0 + cardW / 2, z: z0 + 1.6 + (len - 2) / nf * (i + 0.5), r: fanD * 0.46 });
    }
    panel(g, 'y', [x0 + cardW / 2, y0 + 0.15, z0 + len / 2], cardW + 0.4, len, 0.3,
      plastic(c.color), holes, 0.4);
    // Costados y frente de la carcasa.
    bx(g, x0 - 0.2, y0, z0, 0.35, thick - 0.5, len, plastic(c.color), { radius: 0.15 });
    bx(g, x0 + cardW - 0.15, y0, z0, 0.35, thick - 0.5, len, plastic(c.color), { radius: 0.15 });
    bx(g, x0, y0, z0 + len - 0.35, cardW, thick - 0.5, 0.35, plastic(c.color), { radius: 0.15 });

    // Placa trasera (backplate) con el nombre de la marca.
    panel(g, 'y', [x0 + cardW / 2, pcbY + 0.22, z0 + len / 2 + 0.4], cardW + 0.2, len - 1, 0.18,
      painted('#32373e'), [], 0.4);
    decal(g, '+y', x0 + cardW / 2, pcbY + 0.33, z0 + len * 0.55, Math.min(12, len * 0.45), 3.4,
      M.stickerTexture('gpu:' + c.id, 384, 128, null, [
        { text: c.brand.toUpperCase(), size: 0.26, y: 0.62, color: 'rgba(255,255,255,0.5)' }
      ]), { rot: Math.PI / 2 });

    // Ventiladores (miran hacia abajo, como en una torre real).
    for (let i = 0; i < nf; i++) {
      const f = fanMesh(fanD, { frame: '#1d2126', blade: '#2b3037', logo: brandOf(c) });
      f.rotation.x = Math.PI / 2;
      f.position.set(x0 + cardW / 2, y0 + 0.5, z0 + 1.6 + (len - 2) / nf * (i + 0.5));
      g.add(f);
    }

    // Conector de la ranura PCIe y chapa de salidas de vídeo.
    bx(g, x0 + 0.6, slotY - 0.5, z0 + 2.2, 0.85, 1.0, 8.5, gold({ rough: 0.35 }), { radius: 0.05 });
    const brH = Math.min(thick, 3.9), brY = pcbY + 0.35 - brH / 2;
    panel(g, 'z', [x0 + cardW / 2 - 0.3, brY, z0 - 0.5], cardW + 1.0, brH, 0.12,
      alu('#9aa3ae', { rough: 0.4 }), [], 0.2);
    decal(g, '-z', x0 + cardW / 2 - 0.3, brY, z0 - 0.57, cardW + 0.8, brH - 0.1,
      M.gpuBracketTexture());

    // Conector de alimentación.
    if (s.power) {
      const pins = s.power.vhpwr ? M.pinsTexture(8, 2) : M.pinsTexture(4, 2);
      const cw = s.power.vhpwr ? 2.2 : (s.power.pcie8 > 1 ? 4.4 : 2.4);
      tex(g, x0 + cardW - 3.2, pcbY + 0.4, z0 + len - 5.2, 1.5, 1.2, cw,
        mat('#1c2027', { map: pins, rough: 0.6 }));
    }
    g.userData.explode = new THREE.Vector3(0.6, -2.2, 0);
    return g;
  },

  // -------------------------------------------------------- ALMACENAMIENTO
  storage(c, L, ctx) {
    const g = new THREE.Group();
    const s = c.specs;
    const gb = s.capacityGb >= 1000 ? (s.capacityGb / 1000) + ' TB' : s.capacityGb + ' GB';

    if (s.kind === 'nvme') {
      // Se apoya en la ranura M.2 de la placa: entra por el conector y se
      // atornilla al separador de 80 mm que hay al otro extremo.
      const y = L.m2Y(ctx.indexByKind), z = L.m2Z;
      tex(g, MB_PCB_X + 0.12, y - 1.1, z, 0.16, 2.2, 8.0, pcbMat('#12312a'));
      for (let i = 0; i < 3; i++) {                      // chips de memoria
        bx(g, MB_PCB_X + 0.28, y - 0.75, z + 1.0 + i * 2.1, 0.2, 1.5, 1.7,
          mat('#1b1f25', { rough: 0.45 }), { radius: 0.04 });
      }
      screw(g, 'x', MB_PCB_X + 0.36, y, z + 8.0, 0.24);
      decal(g, '+x', MB_PCB_X + 0.49, y, z + 3.6, 5.4, 1.9,
        M.stickerTexture('nvme:' + c.id, 512, 180, '#e8ecf1', [
          { text: c.brand, size: 0.22, y: 0.42, color: '#1b2430' },
          { text: gb + ' · ' + s.format, size: 0.16, y: 0.72, color: '#4a5666', weight: 'normal' }
        ]));
      g.userData.explode = new THREE.Vector3(1.0, 0, 0);

    } else if (s.kind === 'sata-ssd') {
      const y = (L.psuTop ? 1.4 : 9.8) + ctx.indexByKind * 1.4;
      const x = L.caseX0 + 3.2;
      bx(g, x, y, L.box.d * 0.42, 10.0, 0.7, 7.0, painted(c.color, { rough: 0.45 }), { radius: 0.15 });
      decal(g, '+y', x + 5.0, y + 0.72, L.box.d * 0.42 + 3.5, 6.0, 4.4,
        M.stickerTexture('ssd:' + c.id, 420, 300, '#22282f', [
          { text: c.brand, size: 0.16, y: 0.42, color: '#e7ecf2' },
          { text: gb, size: 0.2, y: 0.68, color: '#9fb4c9' }
        ]), { rot: Math.PI / 2 });
      bx(g, x + 8.6, y + 0.1, L.box.d * 0.42 + 0.4, 1.4, 0.5, 2.2, plastic('#15181c'), { radius: 0.05 });
      g.userData.explode = new THREE.Vector3(0, 2.5, 0);

    } else {
      const y = 1.4 + ctx.indexByKind * 3.4;
      const x = L.caseX0 + 3.6, z = L.box.d - 17;
      tex(g, x, y, z, 10.2, 0.35, 14.7, pcbMat('#16281f'));         // electrónica
      bx(g, x, y + 0.35, z, 10.2, 2.25, 14.7, painted('#5f666f', { rough: 0.5 }), { radius: 0.2 });
      bx(g, x + 0.3, y + 2.5, z + 0.3, 9.6, 0.14, 14.1, alu('#aeb5be', { rough: 0.28, metal: 0.95 }), { radius: 0.1 });
      for (const [sx, sz] of [[x + 1, z + 1], [x + 9.2, z + 1], [x + 1, z + 13.7], [x + 9.2, z + 13.7]]) {
        screw(g, 'y', sx, y + 2.62, sz, 0.28);
      }
      decal(g, '+y', x + 5.1, y + 2.66, z + 7.4, 10, 7.6,
        M.stickerTexture('hdd:' + c.id, 500, 380, '#d9dee5', [
          { text: c.brand, size: 0.09, y: 0.26, color: '#1c232c' },
          { text: gb, size: 0.15, y: 0.44, color: '#0f141a' },
          { text: s.speed, size: 0.06, y: 0.58, color: '#4d5865', weight: 'normal' },
          { text: s.interface, size: 0.05, y: 0.68, color: '#6a7482', weight: 'normal' }
        ]), { rot: Math.PI / 2 });
      bx(g, x + 6.4, y + 0.5, z - 0.35, 1.4, 0.9, 0.5, plastic('#15181c'), { radius: 0.05 });
      bx(g, x + 8.2, y + 0.5, z - 0.35, 1.1, 0.9, 0.5, plastic('#15181c'), { radius: 0.05 });
      g.userData.explode = new THREE.Vector3(0, -1.5, 1.5);
    }
    return g;
  },

  // ------------------------------------------------------------- FUENTE
  psu(c, L, ctx) {
    const g = new THREE.Group();
    const s = c.specs;
    const sfx = s.formFactor === 'SFX';
    const w = sfx ? 12.5 : 15, h = sfx ? 6.35 : 8.6, dd = s.depthMm / 10;
    const x0 = L.caseX0 + 1.2, z0 = 1.0;
    const y0 = L.psuTop ? L.box.h - h - 0.9 : 0.9;
    const up = y => Math.min(y, L.box.h - 1.6);      // los cables no salen por el techo
    const badge = M.efficiencyBadge(s.efficiency);

    // Carcasa de chapa (dejando fuera la cara trasera y el hueco del ventilador).
    bx(g, x0, y0, z0, w, h, dd, steel(c.color, { rep: 0.35 }), { radius: 0.2 });
    panel(g, 'y', [x0 + w / 2, y0 + 0.02, z0 + dd / 2], w - 1.2, dd - 1.2, 0.12,
      steel('#2f343b', { alphaMap: M.honeycombAlpha(0.35) }), [], 0.3);
    const fan = fanMesh(sfx ? 8 : 12, { frame: '#1c1f24', blade: '#2a2f36' });
    fan.rotation.x = Math.PI / 2;
    fan.position.set(x0 + w / 2, y0 + 0.9, z0 + dd / 2);
    g.add(fan);

    // Trasera: rejilla de panal, enchufe y interruptor.
    panel(g, 'z', [x0 + w / 2, y0 + h / 2, z0 - 0.1], w - 0.6, h - 0.6, 0.12,
      steel('#343a42', { alphaMap: M.honeycombAlpha(0.35) }), [], 0.25);
    bx(g, x0 + 0.9, y0 + 1.4, z0 - 0.35, 3.2, 2.6, 0.4, plastic('#14171b'), { radius: 0.1 });
    bx(g, x0 + 4.6, y0 + 1.9, z0 - 0.3, 1.6, 1.2, 0.3, plastic('#2b3038'), { radius: 0.08 });

    // Etiqueta lateral con los vatios reales y el sello de eficiencia.
    decal(g, '+x', x0 + w + 0.02, y0 + h / 2, z0 + dd / 2, dd - 1.6, h - 1.2,
      M.stickerTexture('psu:' + c.id, 480, 300, '#eef1f5', [
        { text: c.brand, size: 0.12, y: 0.26, color: '#1b2029' },
        { text: s.watts + ' W', size: 0.26, y: 0.58, color: '#0e1319' },
        { text: badge.text, size: 0.1, y: 0.82, color: badge.color }
      ], (x, tw, th) => {
        x.strokeStyle = badge.color; x.lineWidth = 6;
        x.strokeRect(tw * 0.18, th * 0.68, tw * 0.64, th * 0.2);
      }));

    // Panel de conectores modulares o manojo de cables fijos.
    const modular = /Sí/i.test(s.modular);
    if (modular) {
      bx(g, x0 + 0.6, y0 + 0.8, z0 + dd - 0.3, w - 1.2, h - 1.6, 0.35, plastic('#1d2127'), { radius: 0.1 });
      for (let i = 0; i < 8; i++) {
        tex(g, x0 + 1.2 + (i % 4) * 3.1, y0 + 1.4 + Math.floor(i / 4) * 2.6, z0 + dd + 0.02,
          2.6, 1.9, 0.12, mat('#dfe5ec', { map: M.pinsTexture(4, 2), rough: 0.6 }));
      }
    }

    // Cables hasta la placa base, el procesador y la gráfica.
    const mb = ctx.build && ctx.build.mb, gpu = ctx.build && ctx.build.gpu;
    const out = [x0 + w - 2, y0 + h - 0.4, z0 + dd - 1];
    if (mb) {
      const z1 = L.mb.rearZ + L.mb.d;
      cable(g, [out, [L.caseX0 + 1.5, up(y0 + h + 6), z1 + 3.5],
                [L.caseX0 + 1.5, L.mb.topY - 8, z1 + 3.2],
                [MB_PCB_X + 0.6, L.mb.topY - 9.0, z1 - 0.6]], 0.42, '#1f2328');
      const epsY = Math.min(L.mb.topY + 2.6, L.box.h - 2.2);
      cable(g, [out, [L.caseX0 + 1.2, up(y0 + h + 10), 8],
                [L.caseX0 + 1.2, epsY, 4],
                [MB_PCB_X + 0.5, L.mb.topY + 0.7, L.mb.rearZ + 2.8]], 0.34, '#1f2328');
    }
    if (gpu && gpu.specs.power) {
      const gy = L.cardY(0);
      cable(g, [out, [L.caseX0 + 1.6, gy - 4, L.box.d * 0.55],
                [MB_PCB_X + 8, gy + 2.2, L.box.d * 0.62],
                [MB_PCB_X + 8.7, gy + 1.0, 1.0 + gpu.specs.lengthMm / 10 - 5.2]], 0.38, '#1f2328');
    }
    if (!modular) {
      for (let i = 0; i < 3; i++) {
        cable(g, [[x0 + w - 1.5, y0 + h - 0.6, z0 + dd - 2 - i], [x0 + w - 3, up(y0 + h + 3 + i), z0 + dd + 2],
                  [L.caseX0 + 1.5, up(y0 + h + 5 + i * 1.5), z0 + dd + 4]], 0.28, '#23272d');
      }
    }
    g.userData.explode = new THREE.Vector3(0, -2.5, -1);
    return g;
  },

  // ------------------------------------------------------------ VENTILADORES
  fan(c, L, ctx) {
    const g = new THREE.Group();
    const size = c.specs.sizeMm / 10;
    const i = ctx.index;
    const col = c.brand === 'Noctua' ? { frame: '#5c3a2e', blade: '#d9c2a8', hub: '#5c3a2e' }
              : { frame: '#23272d', blade: '#343941', hub: '#1b1e23' };
    const f = fanMesh(size, { ...col, rgb: c.specs.rgb, logo: brandOf(c) });
    if (i === 0) {                       // trasero (extracción)
      f.position.set(L.caseCenterX, L.box.h - 8.5, 2.1);
    } else if (i <= 3) {                 // frontales (entrada)
      f.position.set(L.caseCenterX, 6 + (i - 1) * (size + 0.6), L.box.d - 2.6);
    } else {                             // superiores
      f.rotation.x = Math.PI / 2;
      f.position.set(L.caseCenterX, L.box.h - 2.4, 7 + (i - 4) * (size + 0.6));
    }
    g.add(f);
    g.userData.explode = new THREE.Vector3(0, 1.5, 0);
    return g;
  },

  // -------------------------------------------------- TARJETAS DE EXPANSIÓN
  expansion(c, L, ctx) {
    const g = new THREE.Group();
    const y = L.slotY(ctx.slotIndex);
    const pcbY = L.cardY(ctx.slotIndex);
    const len = c.specs.slotType === 'PCIe x4' ? 13 : 10;
    const x0 = MB_PCB_X + 0.9;
    tex(g, x0, pcbY - 0.2, 1.4, 8.0, 0.2, len, pcbMat(c.color));
    bx(g, x0 + 1.2, pcbY - 1.0, 3.0, 4.0, 0.75, 4.0, alu('#7f8792', { rough: 0.4 }), { radius: 0.12 });
    bx(g, x0 + 0.5, y - 0.5, 3.2, 0.85, 1.0, 2.3, gold({ rough: 0.35 }), { radius: 0.05 });
    panel(g, 'z', [x0 + 5.2, pcbY - 0.6, 0.75], 11.0, 1.8, 0.12, alu('#9aa3ae', { rough: 0.4 }), [], 0.2);
    if (/Wi-Fi/i.test(c.specs.kind)) {
      for (const dz of [-0.55, 0.55]) {
        const a = cyl(0.2, 6.5, plastic('#1f2429'), 10);
        a.position.set(x0 + 1.4, pcbY - 3.6, 0.9 + dz);
        a.rotation.x = 0.22;
        g.add(a);
      }
    }
    g.userData.explode = new THREE.Vector3(0.6, -1.6, 0);
    return g;
  },

  // ------------------------------------------------------------ UNIDAD ÓPTICA
  optical(c, L) {
    const g = new THREE.Group();
    const y0 = L.opticalY, z0 = L.box.d - 19, x0 = L.caseX0 + 2.5;
    bx(g, x0, y0, z0, 14.8, 4.2, 18, steel('#4a5059', { rep: 0.4 }), { radius: 0.15 });
    bx(g, x0 - 0.05, y0 + 0.25, z0 + 18, 14.9, 3.7, 0.6, plastic(c.color), { radius: 0.15 });
    bx(g, x0 + 1.0, y0 + 0.9, z0 + 18.6, 11.5, 1.6, 0.15, plastic('#23272d'), { radius: 0.05 });
    bx(g, x0 + 13.2, y0 + 1.3, z0 + 18.6, 0.9, 0.5, 0.2, plastic('#2f353d'), { radius: 0.05 });
    const led = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), mat('#ffb347', { emissive: '#c46a00' }));
    led.position.set(x0 + 12.2, y0 + 1.5, z0 + 18.72);
    g.add(led);
    g.userData.explode = new THREE.Vector3(0, 2, 2);
    return g;
  }
};

/**
 * Crea el grupo 3D de una pieza ya colocado en su sitio.
 * @param {object} comp componente del catálogo
 * @param {object} L    anclajes devueltos por computeLayout
 * @param {object} ctx  { index, indexByKind, slotIndex, build }
 */
export function createPart(comp, L, ctx = {}) {
  const g = builders[comp.cat](comp, L, ctx);
  g.userData.explode = g.userData.explode || new THREE.Vector3(0, 1, 0);
  g.userData.basePos = g.position.clone();
  return g;
}
