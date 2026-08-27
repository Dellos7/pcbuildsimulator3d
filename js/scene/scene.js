// ---------------------------------------------------------------------------
// Escena 3D: cámara, luces, montaje y suelo. Se reconstruye entera cada vez
// que cambia el montaje (son pocas piezas, así el código queda simple).
// ---------------------------------------------------------------------------

import * as THREE from '../../vendor/three.module.min.js';
import { OrbitControls } from '../../vendor/OrbitControls.js';
import { BY_ID } from '../data/catalog.js';
import { computeLayout, createPart } from './parts.js';

const ACCENT = new THREE.Color('#1d6fe0');

export function initScene(container, hooks = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef2f8');
  scene.fog = new THREE.Fog('#eef2f8', 120, 260);

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

  scene.add(new THREE.HemisphereLight(0xffffff, 0xc8d2e0, 2.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(45, 60, 40);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 10;
  key.shadow.camera.far = 200;
  const s = 60;
  Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s });
  key.shadow.camera.updateProjectionMatrix();
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(-40, 25, -30);
  scene.add(fill);

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
      const g = createPart(c, L, ctx);
      g.userData.uid = item.uid;
      g.userData.name = c.name;
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
      tint(g, on ? ACCENT : null, 0.55);
    }
  }

  function setSelected(uid) { selectedUid = uid; applySelection(); }

  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(parts, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !o.userData.uid) o = o.parent;
    return o || null;
  }

  renderer.domElement.addEventListener('pointermove', ev => {
    const g = pick(ev);
    if (g === hovered) { hooks.onHoverMove?.(ev); return; }
    if (hovered && hovered.userData.uid !== selectedUid) tint(hovered, null);
    hovered = g;
    if (hovered && hovered.userData.uid !== selectedUid) tint(hovered, ACCENT, 0.25);
    renderer.domElement.style.cursor = g ? 'pointer' : 'grab';
    hooks.onHover?.(g ? { uid: g.userData.uid, name: g.userData.name } : null, ev);
  });
  renderer.domElement.addEventListener('pointerleave', () => {
    if (hovered && hovered.userData.uid !== selectedUid) tint(hovered, null);
    hovered = null;
    hooks.onHover?.(null);
  });
  renderer.domElement.addEventListener('pointerdown', ev => {
    if (ev.button !== 0) return;
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

  return { render, setSelected, setExplode, resetCamera };
}
