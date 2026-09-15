// ---------------------------------------------------------------------------
// Materiales, texturas y geometrías reutilizables de la escena.
//
// Todas las texturas se DIBUJAN con canvas 2D al arrancar (los circuitos de las
// placas, las rejillas hexagonales, las etiquetas de las fuentes, la chapa
// cepillada…). Así el simulador sigue siendo una carpeta de archivos de texto
// que funciona sin internet: no hay ni una sola imagen que descargar.
//
// Las texturas se guardan en caché porque generarlas es caro. Los materiales,
// en cambio, se crean nuevos para cada pieza: el resaltado al pasar el ratón
// cambia el color emisivo del material y no debe contagiarse a las demás.
// ---------------------------------------------------------------------------

import * as THREE from '../../vendor/three.module.min.js';

const CACHE = new Map();
const cache = (key, make) => {
  let v = CACHE.get(key);
  if (v === undefined) CACHE.set(key, v = make());
  return v;
};

/** Generador pseudoaleatorio con semilla: el dibujo sale igual en cada carga. */
function rng(seed) {
  let s = 7;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeTex(w, h, draw, opts = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = opts.data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

// ------------------------------------------------------------- texturas base

/** Circuito impreso: máscara de soldadura, pistas de cobre, vías y serigrafía. */
export const pcbTexture = base => cache('pcb:' + base, () => makeTex(512, 512, (x, w, h) => {
  const r = rng('pcb' + base);
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {                       // irregularidades del barniz
    x.fillStyle = 'rgba(255,255,255,' + (0.004 + r() * 0.012).toFixed(3) + ')';
    x.fillRect(r() * w, r() * h, 30 + r() * 140, 20 + r() * 110);
  }
  x.lineCap = 'round'; x.lineJoin = 'round';
  for (let i = 0; i < 260; i++) {                      // pistas en ángulos de 45°
    x.strokeStyle = r() > 0.45 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.30)';
    x.lineWidth = 0.8 + r() * 1.7;
    let px = r() * w, py = r() * h;
    x.beginPath(); x.moveTo(px, py);
    for (let s = 0; s < 3; s++) {
      const len = 14 + r() * 80;
      const dir = Math.floor(r() * 8) * Math.PI / 4;
      px += Math.cos(dir) * len; py += Math.sin(dir) * len;
      x.lineTo(px, py);
    }
    x.stroke();
  }
  for (let i = 0; i < 260; i++) {                      // vías metalizadas
    x.fillStyle = 'rgba(190,156,88,0.38)';
    x.beginPath(); x.arc(r() * w, r() * h, 1.3 + r() * 0.9, 0, 7); x.fill();
  }
  x.strokeStyle = 'rgba(255,255,255,0.16)'; x.lineWidth = 1;
  for (let i = 0; i < 46; i++) x.strokeRect(r() * w, r() * h, 8 + r() * 28, 6 + r() * 16);
  x.fillStyle = 'rgba(255,255,255,0.13)';
  x.font = '10px monospace';
  for (let i = 0; i < 30; i++) x.fillText('J' + (10 + Math.floor(r() * 80)), r() * w, r() * h);
}));

/** Mapa de rugosidad de chapa cepillada: rayas finas en una dirección. */
export const brushedRough = (rep = 3) => cache('brushed:' + rep, () => makeTex(256, 256, (x, w, h) => {
  const r = rng('brushed');
  x.fillStyle = '#6e6e6e'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 4000; i++) {
    const g = 70 + Math.floor(r() * 110);
    x.strokeStyle = 'rgb(' + g + ',' + g + ',' + g + ')';
    x.lineWidth = 0.7;
    const y = r() * h, x0 = r() * w;
    x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + 10 + r() * 70, y); x.stroke();
  }
}, { data: true, repeat: [rep, rep] }));

/** Rugosidad de plástico mate con grano fino (carcasas, ventiladores). */
export const grainRough = (rep = 6) => cache('grain:' + rep, () => makeTex(128, 128, (x, w, h) => {
  const r = rng('grain');
  const img = x.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const g = 155 + Math.floor(r() * 55);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = g;
    img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
}, { data: true, repeat: [rep, rep] }));

/** Rejilla de panal: blanco = chapa, negro = agujero (se usa como alphaMap). */
export const honeycombAlpha = (rep = 0.25) => cache('honey:' + rep, () => makeTex(256, 256, (x, w, h) => {
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#000';
  const R = 20, dx = R * Math.sqrt(3), dy = R * 1.5;
  for (let row = -1; row * dy < h + R; row++) {
    for (let col = -1; col * dx < w + dx; col++) {
      const cx = col * dx + (Math.abs(row % 2) ? dx / 2 : 0), cy = row * dy;
      x.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + Math.PI / 6;
        x[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * R * 0.84, cy + Math.sin(a) * R * 0.84);
      }
      x.closePath(); x.fill();
    }
  }
}, { data: true, repeat: [rep, rep] }));

/** Chapa perforada del frontal de las cajas (agujeros redondos al tresbolillo). */
export const meshAlpha = (rep = 0.25) => cache('meshalpha:' + rep, () => makeTex(256, 256, (x, w, h) => {
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#000';
  const step = 16;
  for (let iy = 0; iy * step < h + step; iy++) {
    for (let ix = 0; ix * step < w + step; ix++) {
      const cx = ix * step + (iy % 2 ? step / 2 : 0), cy = iy * step;
      x.beginPath(); x.arc(cx, cy, step * 0.33, 0, 7); x.fill();
    }
  }
}, { data: true, repeat: [rep, rep] }));

/** Peine de contactos dorados (bordes de RAM, gráficas y tarjetas). */
export const goldFingers = () => cache('fingers', () => makeTex(256, 64, (x, w, h) => {
  x.fillStyle = '#8a6c30'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#e8c874';
  for (let i = 0; i < 40; i++) x.fillRect(i * (w / 40) + 1, 0, w / 40 - 2.5, h);
}, { clamp: true }));

/** Panel de pines de un conector (ATX de 24, EPS, PCIe…). */
export const pinsTexture = (cols, rows) => cache('pins:' + cols + 'x' + rows, () =>
  makeTex(256, 128, (x, w, h) => {
    x.fillStyle = '#e9edf2'; x.fillRect(0, 0, w, h);
    const cw = w / cols, ch = h / rows;
    for (let c = 0; c < cols; c++) {
      for (let rr = 0; rr < rows; rr++) {
        x.fillStyle = '#23272e';
        x.fillRect(c * cw + cw * 0.14, rr * ch + ch * 0.14, cw * 0.72, ch * 0.72);
        x.fillStyle = '#c8b06a';
        x.fillRect(c * cw + cw * 0.3, rr * ch + ch * 0.3, cw * 0.4, ch * 0.4);
      }
    }
  }, { clamp: true }));

/** Puertos del panel trasero de la placa base, con sus colores habituales. */
export const rearIoTexture = wifi => cache('io:' + wifi, () => makeTex(128, 460, (x, w, h) => {
  x.fillStyle = '#1b1f26'; x.fillRect(0, 0, w, h);
  const port = (y, hh, col) => {
    x.fillStyle = '#0b0d11'; x.fillRect(14, y - 3, w - 28, hh + 6);
    x.fillStyle = col; x.fillRect(19, y, w - 38, hh);
  };
  if (wifi) {                                   // dos conectores de antena
    x.fillStyle = '#c9a227';
    x.beginPath(); x.arc(40, 28, 11, 0, 7); x.fill();
    x.beginPath(); x.arc(88, 28, 11, 0, 7); x.fill();
  }
  port(58, 26, '#2b3038');       // PS/2
  port(110, 22, '#1f5ea8');      // USB 3.0
  port(144, 22, '#1f5ea8');
  port(194, 22, '#11212e');      // USB 2.0
  port(228, 22, '#11212e');
  port(278, 30, '#111418');      // HDMI / DisplayPort
  port(328, 34, '#1c2430');      // RJ-45
  const jack = (cx, col) => {    // jacks de audio
    x.fillStyle = col; x.beginPath(); x.arc(cx, 412, 13, 0, 7); x.fill();
    x.fillStyle = '#05070a'; x.beginPath(); x.arc(cx, 412, 6, 0, 7); x.fill();
  };
  jack(30, '#3fae4a'); jack(64, '#e05a5a'); jack(98, '#5a8fe0');
}, { clamp: true }));

/** Chapa de salidas de vídeo de una gráfica: rejilla de aletas + conectores. */
export const gpuBracketTexture = () => cache('bracket', () => makeTex(128, 512, (x, w, h) => {
  x.fillStyle = '#9aa3ae'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#4b535e';                       // celosía de extracción de aire
  for (let i = 0; i < 26; i++) x.fillRect(16, 18 + i * 9, w - 32, 5);
  const conn = (y, hh, col) => {
    x.fillStyle = '#20252c'; x.fillRect(18, y, w - 36, hh);
    x.fillStyle = col; x.fillRect(24, y + 4, w - 48, hh - 8);
  };
  conn(270, 40, '#111') ;                        // HDMI
  conn(330, 36, '#111');                         // DisplayPort
  conn(378, 36, '#111');
  conn(426, 36, '#111');
}, { clamp: true }));

/**
 * Etiqueta adhesiva genérica. `lines` es una lista de
 * { text, size, y, x, color, weight, mono } en proporción (0-1) del lienzo.
 */
export function stickerTexture(key, w, h, bg, lines, extra) {
  return cache('sticker:' + key, () => makeTex(w, h, (x) => {
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }   // sin fondo = serigrafía
    if (extra) extra(x, w, h);
    x.textAlign = 'center';
    for (const l of lines) {
      x.fillStyle = l.color || '#12161c';
      x.font = (l.weight || 'bold') + ' ' + Math.round(l.size * h) + 'px ' +
               (l.mono ? 'monospace' : '"Segoe UI", Arial, sans-serif');
      x.fillText(l.text, (l.x ?? 0.5) * w, l.y * h);
    }
  }, { clamp: true }));
}

/** Color y texto del sello 80 PLUS según la certificación de la fuente. */
export function efficiencyBadge(level) {
  const col = { Bronze: '#a97142', Gold: '#d4a017', Platinum: '#9aa7b4', Titanium: '#7f8ea0' };
  const key = Object.keys(col).find(k => (level || '').includes(k));
  return { color: key ? col[key] : '#5b6472', text: key ? '80 PLUS ' + key.toUpperCase() : 'SIN CERTIFICAR' };
}

// -------------------------------------------------------------- iluminación

/**
 * Mapa de entorno tipo "estudio fotográfico": es lo que hace que el aluminio
 * parezca aluminio y no plástico gris. Se genera una sola vez.
 */
export function studioEnvironment(renderer) {
  return cache('env', () => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new THREE.Scene();
    const shell = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#aeb7c4'), side: THREE.BackSide }));
    room.add(shell);
    const panel = (color, pos, scale) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color) }));
      m.position.set(pos[0], pos[1], pos[2]);
      m.scale.set(scale[0], scale[1], scale[2]);
      room.add(m);
    };
    panel('#ffffff', [0, 5.6, 0], [14, 0.2, 14]);        // techo luminoso
    panel('#fff4e2', [-6, 2.5, 3], [0.2, 6, 8]);         // foco cálido
    panel('#e6f0ff', [6, 2.0, -2], [0.2, 5, 7]);         // foco frío
    panel('#f2f5fa', [0, -5.8, 0], [16, 0.2, 16]);       // rebote del suelo
    const tex = pmrem.fromScene(room, 0.03).texture;
    pmrem.dispose();
    return tex;
  });
}

// --------------------------------------------------------------- geometrías

export function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x0 = -w / 2, y0 = -h / 2;
  r = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001));
  s.moveTo(x0 + r, y0);
  s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}

/**
 * Caja con los cantos matados. El bisel es lo que hace que una pieza deje de
 * parecer un cubo de videojuego antiguo: recoge un brillo en cada arista.
 */
export function roundedBox(w, h, d, radius = 0.12) {
  const bev = Math.min(0.05, w / 5, h / 5, d / 5);
  const shape = roundedRectShape(Math.max(0.02, w - 2 * bev), Math.max(0.02, h - 2 * bev),
                                 Math.max(0.005, radius - bev));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.02, d - 2 * bev), bevelEnabled: true,
    bevelSize: bev, bevelThickness: bev, bevelSegments: 1, curveSegments: 4
  });
  g.center();
  return g;
}

/** Camino rectangular con esquinas redondeadas, para recortar en una chapa. */
function rectPath(cx, cy, w, h, r) {
  const p = new THREE.Path();
  r = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001));
  const x0 = cx - w / 2, y0 = cy - h / 2;
  p.moveTo(x0 + r, y0);
  p.lineTo(x0 + w - r, y0); p.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  p.lineTo(x0 + w, y0 + h - r); p.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  p.lineTo(x0 + r, y0 + h); p.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  p.lineTo(x0, y0 + r); p.quadraticCurveTo(x0, y0, x0 + r, y0);
  return p;
}

/**
 * Chapa/placa con recortes: es lo que permite que un frontal tenga ventanas,
 * que la carcasa de una gráfica tenga los huecos de los ventiladores o que el
 * panel trasero tenga el hueco de los puertos.
 * Cada recorte es { x, y, r } (círculo) o { x, y, w, h, round } (rectángulo).
 * Las coordenadas UV de las caras grandes van en centímetros, así que los mapas
 * de rejilla se repiten a escala real.
 */
export function plate(w, h, d, cutouts = [], radius = 0.25) {
  const shape = roundedRectShape(w, h, radius);
  for (const c of cutouts) {
    shape.holes.push(c.w === undefined
      ? new THREE.Path().absarc(c.x, c.y, c.r, 0, Math.PI * 2, true)
      : rectPath(c.x, c.y, c.w, c.h, c.round ?? 0.15));
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 16 });
  g.center();
  return g;
}
