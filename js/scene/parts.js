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
// ---------------------------------------------------------------------------

import * as THREE from '../../vendor/three.module.min.js';

const DEFAULT_CASE = { w: 22, h: 45, d: 45 };
const CASE_X0 = -2.5;          // cara interior del panel del lado de la bandeja
const MB_PCB_X = 0.8;          // superficie de la placa base
const MB_REAR_Z = 1.6;         // borde trasero de la placa base

// Un toque del color de la marca ayuda a distinguir las piezas de un vistazo.
const BRAND_COLOR = {
  NVIDIA: '#76b900', AMD: '#c8102e', Intel: '#0071c5', Corsair: '#ffd400',
  'G.Skill': '#c02b2b', Kingston: '#d43a2f', Crucial: '#1e7fc2', Noctua: '#cc7a52',
  MSI: '#e01f26', ASUS: '#2f6ee0', Gigabyte: '#f26722', NZXT: '#4a90d9'
};
const brandOf = c => BRAND_COLOR[c.brand] || '#7f8a99';

const MB_SIZE = {
  'E-ATX':    { h: 33.0, d: 27.2 },
  'ATX':      { h: 30.5, d: 24.4 },
  'MicroATX': { h: 24.4, d: 24.4 },
  'MiniITX':  { h: 17.0, d: 17.0 }
};

/** Calcula los puntos de anclaje del montaje a partir de la caja y la placa. */
export function computeLayout(caseComp, mbComp) {
  const d = caseComp ? caseComp.specs.dims : [DEFAULT_CASE.w, DEFAULT_CASE.h, DEFAULT_CASE.d];
  const box = { w: d[0], h: d[1], d: d[2] };
  const mb = MB_SIZE[mbComp ? mbComp.specs.formFactor : 'MicroATX'];
  const mbTopY = box.h - 4.5;
  return {
    box,
    caseX0: CASE_X0,
    caseCenterX: CASE_X0 + box.w / 2,
    hasCase: !!caseComp,
    mb: { ...mb, topY: mbTopY, bottomY: mbTopY - mb.h, rearZ: MB_REAR_Z, pcbX: MB_PCB_X },
    cpu: { x: MB_PCB_X, y: mbTopY - 6.8, z: MB_REAR_Z + 5.6 },
    ramZ: i => MB_REAR_Z + 11.2 + i * 0.95,
    ramTopY: mbTopY - 1.8,
    slotY: i => mbTopY - 12.6 - i * 2.0,
    m2Y: i => mbTopY - 15.5 - i * 3.0
  };
}

// --------------------------------------------------------------- utilidades

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color), roughness: opts.rough ?? 0.65,
    metalness: opts.metal ?? 0.25, transparent: !!opts.opacity,
    opacity: opts.opacity ?? 1, side: opts.side || THREE.FrontSide
  });
}

/** Caja con las esquinas ligeramente redondeadas mediante escalado del bisel. */
function box(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function place(mesh, x0, y0, z0, w, h, d) {
  mesh.position.set(x0 + w / 2, y0 + h / 2, z0 + d / 2);
  return mesh;
}

function cyl(r, h, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, opts.seg || 16), mat(color, opts));
  m.castShadow = true;
  return m;
}

/** Rejilla de un ventilador: aspas + marco. */
function fanMesh(sizeCm, color, rgb) {
  const g = new THREE.Group();
  const frame = box(sizeCm, sizeCm, 2.5, color, { rough: 0.8 });
  g.add(frame);
  const hub = cyl(sizeCm * 0.17, 2.0, '#2b3038');
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  for (let i = 0; i < 7; i++) {
    const blade = box(sizeCm * 0.42, 0.16, 1.6, rgb ? '#cfd8ff' : '#d7dbe1', { rough: 0.5, opacity: 0.95 });
    blade.position.set(Math.cos(i / 7 * Math.PI * 2) * sizeCm * 0.26,
                       Math.sin(i / 7 * Math.PI * 2) * sizeCm * 0.26, 0);
    blade.rotation.z = i / 7 * Math.PI * 2;
    blade.rotation.y = 0.5;
    g.add(blade);
  }
  if (rgb) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(sizeCm * 0.42, 0.18, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x6ea8ff }));
    ring.position.z = 1.2;
    g.add(ring);
  }
  g.userData.isFan = true;
  return g;
}

/** Aletas de un disipador de torre: láminas apiladas alejándose de la placa. */
function finStack(stackX, h, d, color, count) {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const fin = box(0.1, h, d, color, { metal: 0.75, rough: 0.35 });
    fin.position.x = -stackX / 2 + (i + 0.5) * (stackX / count);
    g.add(fin);
  }
  return g;
}

// --------------------------------------------------------- piezas concretas

const builders = {

  case(c, L) {
    const g = new THREE.Group();
    const { w, h, d } = L.box;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(c.color), transparent: true,
        opacity: 0.05, roughness: 0.15, metalness: 0.1, side: THREE.DoubleSide }));
    place(glass, L.caseX0, 0, 0, w, h, d);
    g.add(glass);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)),
      new THREE.LineBasicMaterial({ color: 0x5b6472 }));
    edges.position.copy(glass.position);
    g.add(edges);

    // Chapa: suelo, techo, panel trasero y bandeja de la placa base.
    g.add(place(box(w, 0.5, d, c.color, { rough: 0.75 }), L.caseX0, 0, 0, w, 0.5, d));
    g.add(place(box(w, 0.4, d, c.color, { rough: 0.75, opacity: 0.45 }), L.caseX0, h - 0.4, 0, w, 0.4, d));
    g.add(place(box(w, h, 0.5, c.color, { rough: 0.8, opacity: 0.92 }), L.caseX0, 0, 0, w, h, 0.5));
    g.add(place(box(0.4, h - 1, d - 1, c.color, { rough: 0.8 }), L.caseX0, 0.5, 0.5, 0.4, h - 1, d - 1));
    // Frontal: sólo el marco, para poder ver el interior del equipo.
    for (const [bx, by, bw, bh] of [[0, 0, w, 1.6], [0, h - 1.6, w, 1.6], [0, 0, 1.6, h], [w - 1.6, 0, 1.6, h]]) {
      g.add(place(box(bw, bh, 0.7, c.color, { rough: 0.8 }), L.caseX0 + bx, by, d - 0.7, bw, bh, 0.7));
    }
    g.userData.explode = new THREE.Vector3(0, 0, 0);
    return g;
  },

  motherboard(c, L) {
    const g = new THREE.Group();
    const { d: md, h: mh, topY, rearZ } = L.mb;
    const y0 = topY - mh;
    // PCB
    g.add(place(box(0.22, mh, md, c.color, { rough: 0.8, metal: 0.1 }), MB_PCB_X - 0.22, y0, rearZ, 0.22, mh, md));
    // Panel de puertos traseros
    g.add(place(box(4.4, 15.9, 0.7, '#98a2b3', { metal: 0.8, rough: 0.3 }),
      MB_PCB_X, topY - 17.4, rearZ - 0.7, 4.4, 15.9, 0.7));
    // Socket de la CPU
    g.add(place(box(0.5, 4.8, 4.8, '#20242b', { rough: 0.5 }), MB_PCB_X, L.cpu.y - 2.4, L.cpu.z - 2.4, 0.5, 4.8, 4.8));
    // Ranuras de RAM
    for (let i = 0; i < c.specs.memSlots; i++) {
      g.add(place(box(0.5, 13.3, 0.55, i % 2 ? '#39424f' : '#5d6b7d', { rough: 0.5 }),
        MB_PCB_X, L.ramTopY - 13.3, L.ramZ(i) - 0.28, 0.5, 13.3, 0.55));
    }
    // Ranuras PCIe (la primera x16, el resto pequeñas)
    for (let i = 0; i < 1 + c.specs.pcieSmall + (c.specs.pcieX16 - 1); i++) {
      const big = i === 0 || (c.specs.pcieX16 > 1 && i === 3);
      const len = big ? 9.5 : 3.5;
      g.add(place(box(0.5, 0.9, len, big ? '#4b5563' : '#8b95a4', { rough: 0.5 }),
        MB_PCB_X, L.slotY(i) - 0.45, rearZ + 3.2, 0.5, 0.9, len));
    }
    // Disipadores del chipset y de las fases de alimentación
    g.add(place(box(0.9, 4.5, 4.5, '#7b8598', { metal: 0.8, rough: 0.3 }),
      MB_PCB_X, L.cpu.y + 3.6, rearZ + 1.2, 0.9, 4.5, 4.5));
    g.add(place(box(0.8, 4.0, 4.0, '#7b8598', { metal: 0.8, rough: 0.3 }),
      MB_PCB_X, y0 + 4.5, rearZ + 4.0, 0.8, 4.0, 4.0));
    // Conector ATX de 24 pines
    g.add(place(box(0.9, 5.2, 1.1, '#e2e8f0', { rough: 0.7 }),
      MB_PCB_X, topY - 9, rearZ + md - 1.4, 0.9, 5.2, 1.1));
    g.userData.explode = new THREE.Vector3(-1, 0, 0);
    return g;
  },

  cpu(c, L) {
    const g = new THREE.Group();
    // Sustrato + IHS (la "tapa" metálica que se ve por fuera)
    g.add(place(box(0.15, 4.0, 4.0, '#2f3540', { rough: 0.7 }), MB_PCB_X + 0.5, L.cpu.y - 2.0, L.cpu.z - 2.0, 0.15, 4, 4));
    g.add(place(box(0.35, 3.4, 3.4, c.color, { metal: 0.9, rough: 0.25 }),
      MB_PCB_X + 0.65, L.cpu.y - 1.7, L.cpu.z - 1.7, 0.35, 3.4, 3.4));
    g.userData.explode = new THREE.Vector3(1.6, 0.6, 0);
    return g;
  },

  cooler(c, L) {
    const g = new THREE.Group();
    const s = c.specs;
    if (s.radiator) {
      // Bloque-bomba sobre la CPU
      const pump = place(box(4.6, 7.2, 7.2, '#41474f', { rough: 0.4 }),
        MB_PCB_X + 1.0, L.cpu.y - 3.6, L.cpu.z - 3.6, 4.6, 7.2, 7.2);
      g.add(pump);
      const led = place(box(0.3, 4.4, 4.4, '#8ab4ff', { rough: 0.2, metal: 0.1 }),
        MB_PCB_X + 5.6, L.cpu.y - 2.2, L.cpu.z - 2.2, 0.3, 4.4, 4.4);
      g.add(led);
      // Radiador montado en el frontal de la caja
      const radH = s.radiator / 10;
      const radZ = L.box.d - 4.2;
      const radY = Math.max(2, (L.box.h - radH) / 2);
      g.add(place(box(12, radH, 2.8, '#6b7280', { metal: 0.7, rough: 0.4 }),
        L.caseCenterX - 6, radY, radZ, 12, radH, 2.8));
      const fanSize = s.radiator / s.fans / 10;
      for (let i = 0; i < s.fans; i++) {
        const f = fanMesh(fanSize * 0.95, c.color, false);
        f.position.set(L.caseCenterX, radY + fanSize * (i + 0.5), radZ - 1.6);
        g.add(f);
      }
      // Tubos flexibles entre la bomba y el radiador
      for (const off of [-2.2, 2.2]) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(MB_PCB_X + 3, L.cpu.y + off, L.cpu.z + 3.4),
          new THREE.Vector3(MB_PCB_X + 6, L.cpu.y + off * 2, L.cpu.z + 12),
          new THREE.Vector3(L.caseCenterX, radY + radH * 0.6 + off, radZ - 1)
        ]);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.55, 8, false), mat('#3d434c', { rough: 0.8 }));
        g.add(tube);
      }
    } else {
      const hCm = s.heightMm / 10;
      if (hCm < 8) {
        // Disipador de perfil bajo: aletas planas y ventilador encima
        g.add(place(box(hCm * 0.55, 9.5, 9.5, '#9aa3b0', { metal: 0.8, rough: 0.3 }),
          MB_PCB_X, L.cpu.y - 4.75, L.cpu.z - 4.75, hCm * 0.55, 9.5, 9.5));
        const f = fanMesh(8.5, c.color, false);
        f.rotation.y = Math.PI / 2;
        f.position.set(MB_PCB_X + hCm - 1.2, L.cpu.y, L.cpu.z);
        g.add(f);
      } else {
        // Torre de aletas + ventilador(es) laterales
        const towers = s.fans >= 2 ? 2 : 1;
        for (let t = 0; t < towers; t++) {
          const stack = finStack(hCm - 4.5, 12.5, 5.2, '#aab3c0', 30);
          stack.position.set(MB_PCB_X + 4.5 + (hCm - 4.5) / 2, L.cpu.y + 3.2, L.cpu.z + (towers === 2 ? (t ? 3.6 : -3.6) : 0));
          g.add(stack);
        }
        // Base de contacto y heatpipes
        g.add(place(box(1.6, 5.4, 5.4, '#b9c0c9', { metal: 0.9, rough: 0.2 }),
          MB_PCB_X + 0.9, L.cpu.y - 2.7, L.cpu.z - 2.7, 1.6, 5.4, 5.4));
        for (let i = 0; i < 5; i++) {
          const hp = cyl(0.32, hCm - 3.5, '#c08d5a', { metal: 1, rough: 0.25 });
          hp.rotation.z = Math.PI / 2;
          hp.position.set(MB_PCB_X + 2.4 + (hCm - 3.5) / 2, L.cpu.y + 1.5, L.cpu.z - 2 + i);
          g.add(hp);
        }
        const f = fanMesh(12, c.color, false);
        f.position.set(MB_PCB_X + 3 + (hCm - 4.5) / 2, L.cpu.y + 3.5, L.cpu.z - (towers === 2 ? 6.6 : 3.6));
        g.add(f);
      }
    }
    g.userData.explode = new THREE.Vector3(2.4, 0.8, 0);
    return g;
  },

  ram(c, L, ctx) {
    const g = new THREE.Group();
    const hCm = c.specs.heightMm / 10;
    const z = L.ramZ(ctx.index);
    const pcbH = 3.0;
    g.add(place(box(pcbH, 13.3, 0.2, '#1d5540', { rough: 0.8 }), MB_PCB_X + 0.4, L.ramTopY - 13.3, z - 0.1, pcbH, 13.3, 0.2));
    // Disipador del módulo (su altura es la que puede chocar con el disipador de la CPU)
    g.add(place(box(hCm, 11.6, 0.7, c.color, { metal: 0.7, rough: 0.35 }),
      MB_PCB_X + 0.4, L.ramTopY - 11.6, z - 0.35, hCm, 11.6, 0.7));
    g.add(place(box(hCm, 0.5, 0.75, brandOf(c), { metal: 0.5, rough: 0.35 }),
      MB_PCB_X + 0.4, L.ramTopY - 0.5, z - 0.375, hCm, 0.5, 0.75));
    g.userData.explode = new THREE.Vector3(1.2, 1.2, 0);
    return g;
  },

  gpu(c, L, ctx) {
    const g = new THREE.Group();
    const len = c.specs.lengthMm / 10;
    const thick = c.specs.slots * 1.9;
    const y0 = L.slotY(0) + 0.5 - thick;
    const z0 = 1.0;
    // PCB
    g.add(place(box(10.8, 0.25, len, '#1c2430', { rough: 0.8 }), MB_PCB_X + 0.9, y0 + thick - 0.7, z0, 10.8, 0.25, len));
    // Carcasa del disipador
    g.add(place(box(11.4, thick - 0.9, len - 0.6, c.color, { metal: 0.6, rough: 0.4 }),
      MB_PCB_X + 0.9, y0, z0 + 0.3, 11.4, thick - 0.9, len - 0.6));
    // Ventiladores de la gráfica
    const nf = len > 28 ? 3 : (len > 20 ? 2 : 1);
    for (let i = 0; i < nf; i++) {
      const f = fanMesh(Math.min(8.5, (len - 2) / nf), '#31363e', false);
      f.rotation.x = Math.PI / 2;
      f.position.set(MB_PCB_X + 6.5, y0 + 0.2, z0 + (len / nf) * (i + 0.5));
      g.add(f);
    }
    // Franja con el color de la marca, sobre el canto de la carcasa
    g.add(place(box(0.35, 0.9, len * 0.42, brandOf(c), { metal: 0.4, rough: 0.4 }),
      MB_PCB_X + 12.3, y0 + thick - 2.2, z0 + len * 0.5, 0.35, 0.9, len * 0.42));

    // Conector de la ranura y chapa trasera
    g.add(place(box(0.9, 0.75, 8.8, '#c8b273', { metal: 1, rough: 0.3 }),
      MB_PCB_X + 0.9, L.slotY(0) - 0.4, z0 + 2.4, 0.9, 0.75, 8.8));
    g.add(place(box(0.25, 11.5, 1.8, '#aeb6c2', { metal: 0.9, rough: 0.3 }),
      MB_PCB_X + 0.6, y0 - 1.5, 0.3, 0.25, 11.5, 1.8));
    // Conector de alimentación
    if (c.specs.power) {
      g.add(place(box(1.6, 1.2, 3.0, '#e8edf3', { rough: 0.7 }),
        MB_PCB_X + 9.5, y0 + thick - 1.4, z0 + len - 5, 1.6, 1.2, 3.0));
    }
    g.userData.explode = new THREE.Vector3(0.6, -2.2, 0);
    return g;
  },

  storage(c, L, ctx) {
    const g = new THREE.Group();
    const k = c.specs.kind;
    if (k === 'nvme') {
      const y = L.m2Y(ctx.indexByKind);
      g.add(place(box(0.25, 2.2, 8.0, '#123a2c', { rough: 0.8 }), MB_PCB_X, y, L.mb.rearZ + 4.2, 0.25, 2.2, 8.0));
      g.add(place(box(0.5, 2.4, 7.0, c.color, { metal: 0.7, rough: 0.35 }), MB_PCB_X + 0.25, y - 0.1, L.mb.rearZ + 4.6, 0.5, 2.4, 7.0));
      g.userData.explode = new THREE.Vector3(1.0, 0, 0);
    } else if (k === 'sata-ssd') {
      const y = 9.8 + ctx.indexByKind * 1.3;
      g.add(place(box(10.0, 0.75, 7.0, c.color, { metal: 0.6, rough: 0.4 }), L.caseX0 + 3.5, y, L.box.d * 0.42, 10.0, 0.75, 7.0));
      g.userData.explode = new THREE.Vector3(0, 2.5, 0);
    } else {
      const y = 1.4 + ctx.indexByKind * 3.2;
      g.add(place(box(10.2, 2.6, 14.7, c.color, { metal: 0.5, rough: 0.5 }), L.caseX0 + 4, y, L.box.d - 17, 10.2, 2.6, 14.7));
      g.add(place(box(9.4, 0.15, 13.9, '#c9ced6', { metal: 0.9, rough: 0.25 }), L.caseX0 + 4.4, y + 2.6, L.box.d - 16.6, 9.4, 0.15, 13.9));
      g.userData.explode = new THREE.Vector3(0, -1.5, 1.5);
    }
    return g;
  },

  psu(c, L) {
    const g = new THREE.Group();
    const sfx = c.specs.formFactor === 'SFX';
    const w = sfx ? 12.5 : 15, h = sfx ? 6.35 : 8.6, dd = c.specs.depthMm / 10;
    const x0 = L.caseX0 + 1.2, y0 = 0.8, z0 = 0.9;
    g.add(place(box(w, h, dd, c.color, { metal: 0.6, rough: 0.45 }), x0, y0, z0, w, h, dd));
    // Ventilador de la fuente mirando hacia el suelo de la caja
    const f = fanMesh(sfx ? 8 : 12, '#2c3138', false);
    f.rotation.x = Math.PI / 2;
    f.position.set(x0 + w / 2, y0 + 0.4, z0 + dd / 2);
    g.add(f);
    // Rejilla trasera y cables
    g.add(place(box(w - 1, h - 1, 0.4, '#5f6874', { rough: 0.8 }), x0 + 0.5, y0 + 0.5, z0 - 0.4, w - 1, h - 1, 0.4));
    for (let i = 0; i < 4; i++) {
      const cable = cyl(0.3, 6 + i, '#2b3038', { rough: 0.9 });
      cable.rotation.z = Math.PI / 2.4;
      cable.position.set(x0 + w - 1, y0 + h + 2 + i * 0.2, z0 + dd - 2 - i * 1.6);
      g.add(cable);
    }
    g.userData.explode = new THREE.Vector3(0, -2.5, -1);
    return g;
  },

  fan(c, L, ctx) {
    const g = new THREE.Group();
    const s = c.specs.sizeMm / 10;
    const i = ctx.index;
    const f = fanMesh(s, c.color, c.specs.rgb);
    if (i === 0) {                       // trasero (extracción)
      f.position.set(L.caseCenterX, L.box.h - 8.5, 1.9);
    } else if (i <= 3) {                 // frontales (entrada)
      f.position.set(L.caseCenterX, 6 + (i - 1) * (s + 1), L.box.d - 2.4);
    } else {                             // superiores
      f.rotation.x = Math.PI / 2;
      f.position.set(L.caseCenterX, L.box.h - 2.2, 6 + (i - 4) * (s + 1));
    }
    g.add(f);
    g.userData.explode = new THREE.Vector3(0, 1.5, 0);
    return g;
  },

  expansion(c, L, ctx) {
    const g = new THREE.Group();
    const y = L.slotY(ctx.slotIndex);
    const len = c.specs.slotType === 'PCIe x4' ? 14 : 11;
    g.add(place(box(8.0, 0.22, len, c.color, { rough: 0.8 }), MB_PCB_X + 0.9, y - 0.7, 1.2, 8.0, 0.22, len));
    g.add(place(box(0.9, 0.75, 2.4, '#c8b273', { metal: 1, rough: 0.3 }), MB_PCB_X + 0.9, y - 0.4, 3.4, 0.9, 0.75, 2.4));
    g.add(place(box(0.25, 11.0, 1.8, '#aeb6c2', { metal: 0.9, rough: 0.3 }), MB_PCB_X + 0.6, y - 1.6, 0.4, 0.25, 11.0, 1.8));
    // Antenitas para las tarjetas de red inalámbricas
    if (/Wi-Fi/i.test(c.specs.kind)) {
      for (const dz of [-0.6, 0.6]) {
        const a = cyl(0.22, 6, '#2f353d');
        a.position.set(MB_PCB_X + 1.2, y - 4.4, 0.7 + dz);
        a.rotation.x = 0.25;
        g.add(a);
      }
    }
    g.userData.explode = new THREE.Vector3(0.6, -1.6, 0);
    return g;
  },

  optical(c, L) {
    const g = new THREE.Group();
    const y0 = L.box.h - 9.5, z0 = L.box.d - 19;
    g.add(place(box(14.8, 4.2, 18, c.color, { metal: 0.5, rough: 0.5 }), L.caseX0 + 2.5, y0, z0, 14.8, 4.2, 18));
    g.add(place(box(14.6, 3.6, 0.6, '#e6eaef', { rough: 0.6 }), L.caseX0 + 2.6, y0 + 0.3, z0 + 18, 14.6, 3.6, 0.6));
    g.userData.explode = new THREE.Vector3(0, 2, 2);
    return g;
  }
};

/**
 * Crea el grupo 3D de una pieza ya colocado en su sitio.
 * @param {object} comp componente del catálogo
 * @param {object} L    anclajes devueltos por computeLayout
 * @param {object} ctx  { index, indexByKind, slotIndex }
 */
export function createPart(comp, L, ctx = {}) {
  const g = builders[comp.cat](comp, L, ctx);
  g.userData.explode = g.userData.explode || new THREE.Vector3(0, 1, 0);
  g.userData.basePos = g.position.clone();
  return g;
}
