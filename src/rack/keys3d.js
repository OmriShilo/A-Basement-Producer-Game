/* ============================================================
   Shared 3D keyboard for all instruments.
   One source of truth for key geometry (length/heights), materials,
   hinge animation, hold-to-press, and glissando — so every 3D
   instrument's keys feel exactly the same.
   ============================================================ */
import * as THREE from "./vendor/three.module.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";

export const KEY_DIMS = { WHITE_H: 1.0, WHITE_D: 13, BLACK_H: 1.6, BLACK_D: 8 };
const PRESS_ANGLE = 0.05; // rad of hinge rotation when fully pressed

/* Minimum gap between two note triggers, simulating the time it takes a
   hand/finger to actually move to a new key. A trained pianist's fastest
   sustained trill tops out around 10-12 notes/sec, i.e. ~80-100ms between
   attacks at the very limit of human speed -- 90ms sits right in that
   range: fast enough for legitimate quick playing, slow enough to stop
   instant machine-gun triggering. */
const MIN_HIT_GAP_MS = 90;

const isBlack = (m) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
const rbox = (w, h, d, r, mat) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat);

const whiteBase = new THREE.MeshPhysicalMaterial({
  color: 0xf1efe6, roughness: 0.42, metalness: 0.0, envMapIntensity: 0.35,
  clearcoat: 0.5, clearcoatRoughness: 0.3, // lacquered key sheen
});
const blackBase = new THREE.MeshPhysicalMaterial({
  color: 0x121214, roughness: 0.42, metalness: 0.05, envMapIntensity: 0.5,
  clearcoat: 0.4, clearcoatRoughness: 0.3,
});

/* Each key hangs from a pivot Group hinged at its REAR edge, so pressing
   rocks it down like a real key instead of sinking it vertically. */
export function buildKeyboard3D({ root, x0, x1, bedY, zCenter, startMidi = 60, numWhite = 14 }) {
  const { WHITE_H, WHITE_D, BLACK_H, BLACK_D } = KEY_DIMS;
  const keyMeshes = [];
  const PITCH = (x1 - x0) / numWhite, WHITE_W = PITCH * 0.92;
  const whiteTopY = bedY + WHITE_H / 2;

  function makeKey(cx, topY, zC, depth) {
    const pivot = new THREE.Group();
    pivot.position.set(cx, topY, zC - depth / 2); // rear hinge
    root.add(pivot);
    pivot.userData = { cur: 0, target: 0 };
    const attach = (mesh, dz) => { mesh.position.z = dz; pivot.add(mesh); };
    return { pivot, attach };
  }

  let placed = 0, m = startMidi; const whites = [];
  while (placed < numWhite) {
    if (!isBlack(m)) {
      const cx = x0 + placed * PITCH + PITCH / 2;
      const mat = whiteBase.clone();
      mat.color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.015); // subtle ivory variation
      const { pivot, attach } = makeKey(cx, whiteTopY, zCenter, WHITE_D);
      const k = rbox(WHITE_W, WHITE_H, WHITE_D, 0.1, mat);
      attach(k, WHITE_D / 2);
      // waterfall front lip
      const lip = rbox(WHITE_W, WHITE_H * 0.55, 0.5, 0.06, mat);
      lip.position.y = -WHITE_H * 0.5;
      attach(lip, WHITE_D - 0.25);
      k.userData = { midi: m, pivot };
      keyMeshes.push(k); whites.push({ m, idx: placed, cx }); placed++;
    }
    m++;
  }
  const BLACK_W = PITCH * 0.56;
  const blackTopY = bedY + BLACK_H / 2 + 0.02;
  const blackZ = zCenter - (WHITE_D - BLACK_D) / 2;
  whites.forEach((wk) => {
    if (isBlack(wk.m + 1) && wk.idx < numWhite - 1) {
      const cx = wk.cx + PITCH / 2;
      const mat = blackBase.clone();
      const { pivot, attach } = makeKey(cx, blackTopY, blackZ, BLACK_D);
      const k = rbox(BLACK_W, BLACK_H, BLACK_D, 0.07, mat);
      attach(k, BLACK_D / 2);
      // tapered top cap
      const cap = rbox(BLACK_W * 0.72, 0.24, BLACK_D * 0.86, 0.06, mat);
      cap.position.y = BLACK_H / 2 + 0.1;
      attach(cap, BLACK_D / 2 - 0.3);
      k.userData = { midi: wk.m + 1, pivot };
      keyMeshes.push(k);
    }
  });
  return keyMeshes;
}

/* Pointer wiring: hold-to-press + glissando drag. Returns { update } for
   the instrument's render loop (damped press/release motion). */
export function wireKeys({ renderer, camera, keyMeshes, probeName }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let heldKey = null;
  let lastHitTime = -Infinity;

  function raycastKey(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(keyMeshes, false);
    return hits.length ? hits[0].object : null;
  }
  let heldVoice = null; // sustained-note handle from window.hit(), if any
  const press = (mesh) => { mesh.userData.pivot.userData.target = 1; };
  const release = (mesh) => { mesh.userData.pivot.userData.target = 0; };
  function canTrigger() {
    const now = performance.now();
    if (now - lastHitTime < MIN_HIT_GAP_MS) return false;
    lastHitTime = now;
    return true;
  }
  function releaseVoice() {
    if (heldVoice && heldVoice.release) heldVoice.release();
    heldVoice = null;
  }
  function trigger(mesh, e) {
    heldVoice = window.hit ? window.hit(mesh.userData.midi, null, e) : null;
    window.dispatchEvent(new CustomEvent("note-hit")); // pixel accents react to this (pixel3d.js)
    press(mesh);
    heldKey = mesh;
  }

  renderer.domElement.addEventListener("pointerdown", (e) => {
    releaseVoice();
    if (heldKey) { release(heldKey); heldKey = null; }
    const mesh = raycastKey(e);
    if (mesh && canTrigger()) {
      trigger(mesh, e);
      try { renderer.domElement.setPointerCapture(e.pointerId); } catch {}
    }
  });
  renderer.domElement.addEventListener("pointermove", (e) => {
    if (!heldKey) return;
    const mesh = raycastKey(e);
    if (mesh && mesh !== heldKey && canTrigger()) { // glissando: slide across keys while holding
      releaseVoice();
      release(heldKey);
      trigger(mesh, e);
    }
  });
  const endHold = () => { releaseVoice(); if (heldKey) { release(heldKey); heldKey = null; } };
  renderer.domElement.addEventListener("pointerup", endHold);
  renderer.domElement.addEventListener("pointercancel", endHold);
  window.addEventListener("pointerup", endHold);

  if (probeName) {
    // read-only probe for automated verification
    window[probeName] = {
      held: () => (heldKey ? heldKey.userData.midi : null),
      maxRot: () => Math.max(...keyMeshes.map((k) => k.userData.pivot.rotation.x)),
    };
  }

  return {
    /* endHold is the one listener that lives outside the canvas (a pointerup
       that lands anywhere must still lift the key), so it is the one the host
       has to take back when the rack unmounts. */
    dispose() {
      endHold();
      window.removeEventListener("pointerup", endHold);
      if (probeName) delete window[probeName];
    },
    update() {
      // damped key motion: quick press, softer release
      for (const k of keyMeshes) {
        const u = k.userData.pivot.userData;
        const speed = u.target === 1 ? 0.45 : 0.16;
        u.cur += (u.target - u.cur) * speed;
        if (Math.abs(u.target - u.cur) < 0.0008) u.cur = u.target;
        k.userData.pivot.rotation.x = u.cur * PRESS_ANGLE;
      }
    },
  };
}
