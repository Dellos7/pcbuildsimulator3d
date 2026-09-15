// ---------------------------------------------------------------------------
// Escena 3D: cámara, luces, montaje y suelo. Se reconstruye entera cada vez
// que cambia el montaje (son pocas piezas, así el código queda simple).
// ---------------------------------------------------------------------------

import * as THREE from '../../vendor/three.module.min.js';
import { OrbitControls } from '../../vendor/OrbitControls.js';
import { BY_ID } from '../data/catalog.js';
import { computeLayout, createPart } from './parts.js';
import { studioEnvironment } from './materials.js';

const ACCENT = new THREE.Color('#1d6fe0');

export function initScene(container, hooks = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Curva de exposición fotográfica: sin ella los metales se queman en blanco.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef2f8');
  scene.fog = new THREE.Fog('#eef2f8', 140, 280);
  // Reflejos de estudio: es lo que distingue el aluminio del plástico gris.
  scene.environment = studioEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 500);
  const HOME = { pos: new THREE.Vector3(52, 30, 62), target: new THREE.Vector3(0, 2, 0) };
  camera.position.copy(HOME.pos);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 25;
  controls.maxDistance = 180;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.target.copy(HOME.target);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xc4cede, 0.55));
  const key = new THREE.DirectionalLight(0xfff6ea, 1.6);
  key.position.set(45, 62, 40);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 10;
  key.shadow.camera.far = 220;
  key.shadow.bias = -0.0009;
  key.shadow.normalBias = 0.05;
  const s = 55;
  Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s });
  key.shadow.camera.updateProjectionMatrix();
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe8f0ff, 0.45);
  fill.position.set(-40, 25, -30);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(-10, 18, 55);
  scene.add(rim);

  // Suelo y rejilla de referencia.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(120, 64),
    new THREE.MeshStandardMaterial({ color: 0xe3e9f2, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(160, 32, 0xc2ccd9, 0xdbe2ec);
  grid.position.y = 0;
  scene.add(grid);

  const rig = new THREE.Group();
  scene.add(rig);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = null, selectedUid = null, explode = 0, parts = [], userMovedCamera = false;
  let hidden = new Set();

  // ------------------------------------------------------------ reconstruir
  function render(build, opts = {}) {
    explode = opts.explode ?? explode;
    while (rig.children.length) {
      const c = rig.children.pop();
      c.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      });
    }
    parts = [];

    const comp = id => BY_ID[id];
    const items = build.items;
    const caseComp = items.map(i => comp(i.compId)).find(c => c.cat === 'case') || null;
    const mbComp = items.map(i => comp(i.compId)).find(c => c.cat === 'motherboard') || null;
    const gpuComp = items.map(i => comp(i.compId)).find(c => c.cat === 'gpu') || null;
    const L = computeLayout(caseComp, mbComp);

    // Índices por categoría (para repartir módulos de RAM, discos, ranuras…).
    const nth = {}, nthKind = {};
    let slotCursor = gpuComp ? gpuComp.specs.slots : 1;

    // La caja primero, para que el resto se dibuje encima.
    const ordered = [...items].sort((a, b) =>
      (comp(a.compId).cat === 'case' ? -1 : 0) - (comp(b.compId).cat === 'case' ? -1 : 0));

    for (const item of ordered) {
      const c = comp(item.compId);
      const index = (nth[c.cat] = (nth[c.cat] ?? -1) + 1);
      const ctx = { index };
      if (c.cat === 'storage') {
        const k = c.specs.kind;
        ctx.indexByKind = (nthKind[k] = (nthKind[k] ?? -1) + 1);
      }
      if (c.cat === 'expansion') ctx.slotIndex = slotCursor++;
      ctx.build = { case: caseComp, mb: mbComp, gpu: gpuComp };
      const g = createPart(c, L, ctx);
      g.userData.uid = item.uid;
      g.userData.name = c.name;
      g.userData.cat = c.cat;
      g.visible = !hidden.has(item.uid);
      rig.add(g);
      parts.push(g);
    }

    // Centramos el montaje sobre el origen para que la órbita sea cómoda.
    rig.position.set(-(L.caseX0 + L.box.w / 2), 0, -L.box.d / 2);
    rig.userData.centerY = L.box.h / 2;
    const target = new THREE.Vector3(0, L.box.h * 0.42, 0);
    HOME.target.copy(target);
    HOME.pos.set(L.box.w * 2.4 + 20, L.box.h * 0.78, L.box.d * 0.95);
    if (!userMovedCamera) { controls.target.copy(target); camera.position.copy(HOME.pos); }

    applyExplode();
    applySelection();
  }

  /** Oculta piezas sin quitarlas del montaje (para poder mirar dentro). */
  function setHidden(uids) {
    hidden = uids instanceof Set ? uids : new Set(uids);
    for (const g of parts) g.visible = !hidden.has(g.userData.uid);
  }

  function applyExplode() {
    for (const g of parts) {
      const dir = g.userData.explode || new THREE.Vector3();
      g.position.copy(dir).multiplyScalar(explode * 6);
    }
  }

  function setExplode(v) { explode = v; applyExplode(); }

  // -------------------------------------------------------- selección/hover
  function tint(group, color, intensity) {
    group.traverse(o => {
      if (!o.material || !o.material.emissive) return;
      if (!o.userData._emis) o.userData._emis = o.material.emissive.clone();
      o.material.emissive.copy(color ? color : o.userData._emis);
      o.material.emissiveIntensity = color ? intensity : 1;
    });
  }

  function applySelection() {
    for (const g of parts) {
      const on = g.userData.uid === selectedUid;
      tint(g, on ? ACCENT : null, 0.30);
    }
  }

  function setSelected(uid) { selectedUid = uid; applySelection(); }

  /**
   * Devuelve la pieza que hay bajo el ratón. La caja se deja para el final:
   * como envuelve todo el montaje, si contara como un impacto normal sería
   * imposible pinchar en las piezas de dentro.
   */
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(parts.filter(p => p.visible), true);
    let box = null;
    for (const hit of hits) {
      let o = hit.object;
      while (o && !o.userData.uid) o = o.parent;
      if (!o) continue;
      if (o.userData.cat === 'case') { box = box || o; continue; }
      return o;
    }
    return box;
  }

  renderer.domElement.addEventListener('pointermove', ev => {
    const g = pick(ev);
    if (g === hovered) { hooks.onHoverMove?.(ev); return; }
    if (hovered && hovered.userData.uid !== selectedUid) tint(hovered, null);
    hovered = g;
    if (hovered && hovered.userData.uid !== selectedUid) tint(hovered, ACCENT, 0.10);
    renderer.domElement.style.cursor = g ? 'pointer' : 'grab';
    hooks.onHover?.(g ? { uid: g.userData.uid, name: g.userData.name } : null, ev);
  });
  renderer.domElement.addEventListener('pointerleave', () => {
    if (hovered && hovered.userData.uid !== selectedUid) tint(hovered, null);
    hovered = null;
    hooks.onHover?.(null);
  });
  // Sólo es un clic si el puntero casi no se ha movido: así girar la cámara
  // arrastrando no cambia la pieza seleccionada.
  let downAt = null;
  renderer.domElement.addEventListener('pointerdown', ev => {
    downAt = ev.button === 0 ? { x: ev.clientX, y: ev.clientY } : null;
  });
  renderer.domElement.addEventListener('pointerup', ev => {
    if (!downAt) return;
    const moved = Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y);
    downAt = null;
    if (moved > 5) return;
    const g = pick(ev);
    hooks.onSelect?.(g ? g.userData.uid : null);
  });

  controls.addEventListener('start', () => { userMovedCamera = true; });

  function resetCamera() {
    userMovedCamera = false;
    camera.position.copy(HOME.pos);
    controls.target.copy(HOME.target);
    controls.update();
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  const clock = new THREE.Clock();
  (function loop() {
    requestAnimationFrame(loop);
    const dt = clock.getDelta();
    rig.traverse(o => { if (o.userData.isFan) o.rotation.z += dt * 6; });
    controls.update();
    renderer.render(scene, camera);
  })();

  return { render, setSelected, setExplode, setHidden, resetCamera };
}
