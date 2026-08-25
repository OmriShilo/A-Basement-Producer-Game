/* ============================================================
   Shared 3D stage — the renderer, camera, softbox lighting, resize
   and render loop that every instrument used to duplicate. An
   instrument now just builds geometry into `root`, then calls
   start(probeName, keyMeshes).
   ============================================================ */
import * as THREE from "./vendor/three.module.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { wireKeys } from "./keys3d.js";

export function createStage(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearAlpha(0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.touchAction = "none";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(31, 2, 0.1, 1000);
  camera.position.set(0, 76, 25);
  camera.lookAt(0, 0, -2);

  scene.add(new THREE.AmbientLight(0xffffff, 0.32));
  const key = new THREE.DirectionalLight(0xfff2e0, 1.9);
  key.position.set(16, 52, 30);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 10; key.shadow.camera.far = 140;
  key.shadow.camera.left = -44; key.shadow.camera.right = 44;
  key.shadow.camera.top = 44; key.shadow.camera.bottom = -44;
  key.shadow.bias = -0.0004; key.shadow.radius = 7;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbcd2ff, 0.45);
  fill.position.set(-34, 26, 10);
  scene.add(fill);

  const root = new THREE.Group();
  scene.add(root);

  // pixel-accent hooks: fn(tSeconds, dtSeconds), called once per frame
  const tickers = [];
  function addTicker(fn) { tickers.push(fn); }

  // call once geometry + keys are built
  function start(probeName, keyMeshes) {
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.ShadowMaterial({ opacity: 0.3 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    scene.add(ground);

    keys = wireKeys({ renderer, camera, keyMeshes, probeName });
    const keyCtl = keys;

    function resize() {
      const w = host.clientWidth; if (!w) return;
      const h = Math.round(w * 0.52);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      renderer.domElement.style.height = h + "px";
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.render(scene, camera);   // paint now; rAF pauses when backgrounded
    }
    // resize() changes the canvas's own height, and `host` (an auto-height div)
    // grows/shrinks to match -- since that's the same element being observed,
    // mutating it synchronously inside the observer's callback re-triggers the
    // observation within the same delivery cycle. The browser can't settle
    // that in one frame and logs "ResizeObserver loop completed with
    // undelivered notifications." Deferring the mutation to the next frame
    // keeps it out of the observer's own synchronous notification cycle.
    let resizePending = false;
    function scheduleResize() {
      if (resizePending) return;
      resizePending = true;
      requestAnimationFrame(() => { resizePending = false; resize(); });
    }
    ro = new ResizeObserver(scheduleResize);
    ro.observe(host);
    window.addEventListener("resize", resize);
    onResize = resize;
    resize();

    let last = performance.now();
    (function animate() {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = (now - last) / 1000; last = now;
      keyCtl.update();
      for (const fn of tickers) fn(now / 1000, dt);
      if (host.clientWidth) renderer.render(scene, camera);
    })();
  }

  /* The host game mounts and unmounts the rack repeatedly across a career, and
     each mount opens five WebGL contexts (one per instrument). Browsers cap
     live contexts somewhere around 16 and silently drop the oldest past that,
     so without this a player who visits the rack four times would watch the
     earlier instruments go black. Everything acquired in start() is released
     here, and forceContextLoss() hands the GPU context back immediately rather
     than waiting on garbage collection. */
  let raf = null, ro = null, onResize = null, keys = null;
  function dispose() {
    if (raf !== null) cancelAnimationFrame(raf);
    if (ro) ro.disconnect();
    if (onResize) window.removeEventListener("resize", onResize);
    if (keys) keys.dispose();
    scene.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (!m) return;
        Object.values(m).forEach((v) => { if (v && v.isTexture) v.dispose(); });
        m.dispose();
      });
    });
    scene.environment?.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  }

  return { host, renderer, scene, camera, root, start, addTicker, dispose };
}
