/* ============================================================
   LOOP WORLD TOUR — unified state manager
   gameState: 'MENU' (3D Warp Room) | <level id> ('argentina', …)
   Owns the single renderer + rAF loop, scene switching with a
   flash transition, and the shared level-progress store.
   Levels come from window.LEVELS (levels.js) — any entry with a
   `create` factory is playable; scenes are created lazily.
   ============================================================ */
(function () {
  "use strict";
  const THREE = window.THREE;
  const host = document.getElementById("app");

  /* ---- single shared renderer ---- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  /* ---- shared progress store (cleared level ids) ---- */
  const SAVE = "warp_progress_v1";
  const progress = {
    list() {
      try {
        const s = JSON.parse(localStorage.getItem(SAVE));
        if (s && Array.isArray(s.cleared)) return s.cleared.slice();
      } catch (e) {}
      return [];
    },
    add(id) {
      const c = progress.list();
      if (!c.includes(id)) {
        c.push(id);
        try { localStorage.setItem(SAVE, JSON.stringify({ cleared: c })); } catch (e) {}
      }
    },
  };

  /* ---- HUD layers + transition flash ---- */
  const hudMenu = document.getElementById("hud-menu");
  const hudRun = document.getElementById("hud-run");
  const flash = document.getElementById("flash");

  /* ---- state machine ---- */
  let gameState = "MENU";
  const scenes = {}; // 'MENU' + one per entered level id
  let current = null;
  let switching = false;

  function setState(next, beforeEnter) {
    if (switching || gameState === next) return;
    switching = true;
    flash.style.setProperty("--c", "#ffffff");
    flash.classList.add("on");
    setTimeout(() => {
      if (current) current.exit();
      if (beforeEnter) beforeEnter();
      gameState = next;
      current = scenes[next];
      hudMenu.classList.toggle("hidden", next !== "MENU");
      hudRun.classList.toggle("hidden", next === "MENU");
      current.enter();
      flash.classList.remove("on");
      switching = false;
    }, 320);
  }

  /* ---- environment handed to the scene modules ---- */
  const env = {
    dom: renderer.domElement,
    progress,
    // MENU -> level (any registry entry with a create factory)
    enterLevel(id) {
      const L = window.LEVELS.find((l) => l.id === id);
      if (!L || !L.create) return;
      if (!scenes[id]) scenes[id] = L.create(THREE, env);
      setState(id);
    },
    // level -> MENU (cleared: did the player beat it?)
    exitToMenu(cleared) {
      const id = gameState;
      setState("MENU", () => { if (cleared && id !== "MENU") progress.add(id); });
    },
  };

  /* dev/debug handle (also used by automated checks).
     step(dt, n): manually advance the sim n frames — works even when
     rAF is throttled (backgrounded preview/test runners). */
  let simT = 0;
  window.__loopTour = {
    env, progress,
    get state() { return gameState; },
    step(dt, n) {
      dt = dt || 1 / 60; n = n || 1;
      for (let i = 0; i < n; i++) { simT += dt; current.update(dt, simT); }
      renderer.render(current.scene, current.camera);
    },
  };

  /* ---- boot in the warp room ---- */
  scenes.MENU = window.createWarpRoom(THREE, env);
  current = scenes.MENU;
  hudRun.classList.add("hidden");
  current.enter();

  /* ---- main loop ---- */
  const clock = new THREE.Clock();
  let _shown = false;
  function tick() {
    let dt = clock.getDelta(); if (dt > 0.05) dt = 0.05;
    const t = clock.elapsedTime;
    current.update(dt, t);
    renderer.render(current.scene, current.camera);
    if (!_shown) { _shown = true; const l = document.getElementById("loading"); if (l) l.classList.add("hide"); }
    requestAnimationFrame(tick);
  }
  tick();

  /* ---- resize ---- */
  window.addEventListener("resize", () => {
    Object.keys(scenes).forEach((k) => {
      const s = scenes[k];
      s.camera.aspect = window.innerWidth / window.innerHeight;
      s.camera.updateProjectionMatrix();
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
