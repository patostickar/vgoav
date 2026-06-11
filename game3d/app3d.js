/* ============================================================
   WARP ROOM — controller (Three.js)
   Drive the Vespa (steer + accelerate + jump), third-person chase
   cam, pressure-pad selection, ENTER to warp, boss padlock + unlock.
   ============================================================ */
(function () {
  "use strict";
  const THREE = window.THREE;
  const host = document.getElementById("app");

  /* ---- renderer / scene / camera ---- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

  /* ---- lights ---- */
  scene.add(new THREE.HemisphereLight(0xbcdcff, 0x4a3a5a, 0.75));
  scene.add(new THREE.AmbientLight(0x6a5a7a, 0.4));
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.0);
  sun.position.set(10, 22, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 60; sun.shadow.bias = -0.0004;
  scene.add(sun);

  /* ---- build world + character ---- */
  const refs = window.buildRoom(THREE, scene);
  const vespa = window.buildVespa(THREE);
  scene.add(vespa);
  const VR = vespa.userData.refs;

  /* ---- progression ---- */
  const SAVE = "warp_progress_v1";
  let cleared = [];
  try { const s = JSON.parse(localStorage.getItem(SAVE)); if (s && Array.isArray(s.cleared)) cleared = s.cleared; } catch (e) {}
  const bossUnlocked = () => ["argentina", "rome", "denmark"].every((id) => cleared.includes(id));
  function saveProg() { try { localStorage.setItem(SAVE, JSON.stringify({ cleared })); } catch (e) {} }
  if (bossUnlocked() && refs.bossRefs) refs.bossRefs.blk.visible = false;

  /* ---- vehicle state ---- */
  const car = { x: 0, z: 6, y: 0, h: Math.PI, speed: 0, vy: 0, grounded: true };
  const ACCEL = 26, MAXF = 12, MAXR = 5, FRICT = 2.4, TURN = 2.4, G = 30, JUMP = 11, WALL = 16;
  let lean = 0, pitch = 0, squash = 0;

  /* ---- input ---- */
  const keys = {};
  const down = (e) => { keys[e.key.toLowerCase()] = true;
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) e.preventDefault();
    if (e.key === "Enter") tryWarp();
    if (e.key.toLowerCase() === "v") toggleView();
    if (e.key.toLowerCase() === "b") toggleBlueprint();
  };
  const up = (e) => { keys[e.key.toLowerCase()] = false; };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);

  /* ---- HUD ---- */
  const hudName = document.getElementById("hud-name");
  const hudMode = document.getElementById("hud-mode");
  const hudPrompt = document.getElementById("hud-prompt");
  const hudBanner = document.getElementById("hud-banner");
  const toastEl = document.getElementById("toast");
  const flash = document.getElementById("flash");
  const progEl = document.getElementById("prog-count");
  let toastT;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 1200); }
  function updateProg() { progEl.textContent = cleared.filter((c) => c !== "sardegna").length + " / 3"; }
  updateProg();

  /* ---- selection ---- */
  let activePad = null;
  function updateSelection() {
    let best = null, bestD = 2.5;
    if (car.grounded) {
      refs.pads.forEach((p) => {
        const d = Math.hypot(car.x - p.pos.x, car.z - p.pos.z);
        if (d < bestD) { bestD = d; best = p; }
      });
    }
    activePad = best;
    refs.pads.forEach((p) => {
      const on = p === activePad;
      p.padMat.emissiveIntensity += ((on ? 1.5 : 0.28) - p.padMat.emissiveIntensity) * 0.2;
      p.light.intensity += ((on ? 2.2 : 0.0) - p.light.intensity) * 0.2;
      p.group.scale.y += (((on ? 0.55 : 1)) - p.group.scale.y) * 0.2;
    });
    if (activePad) {
      const L = activePad.level, locked = L.boss && !bossUnlocked();
      hudBanner.classList.add("show");
      hudBanner.classList.toggle("locked", locked);
      hudName.textContent = L.name;
      hudMode.textContent = L.mode;
      hudPrompt.innerHTML = locked
        ? "&#128274; SEALED — clear all regions"
        : "Press <b>ENTER</b> to warp";
    } else {
      hudBanner.classList.remove("show");
    }
  }

  let warping = false;
  function tryWarp() {
    if (!activePad || warping) return;
    const L = activePad.level, locked = L.boss && !bossUnlocked();
    if (locked) { rattleLock(); toast("SEALED!"); return; }
    warping = true;
    flash.style.setProperty("--c", "#" + L.glow.toString(16).padStart(6, "0"));
    flash.classList.add("on");
    toast("WARPING TO " + L.name.toUpperCase());
    setTimeout(() => {
      if (!cleared.includes(L.id)) { cleared.push(L.id); saveProg(); updateProg(); if (bossUnlocked()) { refs.unlockBoss(); toast("SEAL BROKEN!"); } }
      flash.classList.remove("on");
      warping = false;
    }, 900);
  }

  let lockShakeT = 0;
  function rattleLock() { lockShakeT = 0.5; }

  /* ---- camera modes ---- */
  let topView = false;
  function toggleView() { topView = !topView; }
  const camPos = new THREE.Vector3(0, 6, 13);
  const camLook = new THREE.Vector3();

  /* ---- blueprint panel ---- */
  function toggleBlueprint() { document.getElementById("blueprint").classList.toggle("open"); }
  document.getElementById("bp-toggle").addEventListener("click", toggleBlueprint);
  document.getElementById("view-toggle").addEventListener("click", toggleView);

  /* ---- loop ---- */
  const clock = new THREE.Clock();
  let _shown = false;
  function tick() {
    let dt = clock.getDelta(); if (dt > 0.05) dt = 0.05;
    const t = clock.elapsedTime;

    /* drive */
    const fwd = keys["arrowup"] || keys["w"], back = keys["arrowdown"] || keys["s"];
    const sl = keys["arrowleft"] || keys["a"], sr = keys["arrowright"] || keys["d"];
    if (fwd) car.speed += ACCEL * dt;
    else if (back) car.speed -= ACCEL * dt;
    else { const s = Math.sign(car.speed); car.speed -= s * FRICT * Math.max(1, Math.abs(car.speed)) * dt; if (Math.sign(car.speed) !== s) car.speed = 0; }
    car.speed = Math.max(-MAXR, Math.min(MAXF, car.speed));
    const turn = (sl ? 1 : 0) - (sr ? 1 : 0);
    car.h += turn * TURN * dt * (0.45 + Math.min(Math.abs(car.speed), 4) / 4 * 0.55) * (car.speed < 0 ? -1 : 1);

    if (keys[" "] && car.grounded) { car.vy = JUMP; car.grounded = false; }
    car.vy -= G * dt; car.y += car.vy * dt;
    if (car.y <= 0) { if (!car.grounded) squash = 0.4; car.y = 0; car.vy = 0; car.grounded = true; }

    car.x += Math.sin(car.h) * car.speed * dt;
    car.z += Math.cos(car.h) * car.speed * dt;
    // wall
    const rr = Math.hypot(car.x, car.z);
    if (rr > WALL - 1.6) { const k = (WALL - 1.6) / rr; car.x *= k; car.z *= k; car.speed *= 0.4; }
    // dais
    if (car.y < 1.3 && rr < 3.9 && rr > 0.001) { const k = 3.9 / rr; car.x *= k; car.z *= k; car.speed *= 0.6; }

    vespa.position.set(car.x, car.y, car.z);
    vespa.rotation.y = car.h;
    VR.wheelF.rotation.x += car.speed * dt * 3.2;
    VR.wheelR.rotation.x += car.speed * dt * 3.2;
    // body english
    lean += (-turn * Math.min(Math.abs(car.speed), 4) * 0.05 - lean) * 0.2;
    pitch += (((fwd ? -0.06 : back ? 0.06 : 0) + (car.grounded ? 0 : car.vy * 0.015)) - pitch) * 0.2;
    squash *= 0.85;
    VR.tilt.rotation.z = lean;
    VR.tilt.rotation.x = pitch;
    VR.tilt.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);

    /* selection */
    updateSelection();

    /* lock shake */
    if (lockShakeT > 0 && refs.bossRefs) { lockShakeT -= dt; refs.bossRefs.lock.rotation.z = Math.sin(t * 60) * 0.18 * Math.max(0, lockShakeT); }

    /* ambient anim */
    refs.portals.forEach((p, i) => { p.portal.rotation.z += dt * 0.6; p.swirl.rotation.z -= dt * 1.4; p.portal.material.opacity = 0.78 + Math.sin(t * 2 + i) * 0.14; });
    refs.core.rotation.z += dt * 0.4; refs.coreRing.rotation.z -= dt * 0.3;
    refs.stars.rotation.y += dt * 0.01;
    refs.torchFlames.forEach((f, i) => { const s = 1 + Math.sin(t * 12 + i) * 0.18; f.flame.scale.set(s, 1 + Math.sin(t * 9 + i) * 0.22, s); f.fl.intensity = 0.9 + Math.sin(t * 14 + i * 2) * 0.3; });

    /* camera */
    if (topView) {
      camPos.lerp(new THREE.Vector3(0.01, 40, 0.01), 0.08);
      camLook.lerp(new THREE.Vector3(0, 0, 0), 0.1);
    } else {
      const behind = new THREE.Vector3(car.x - Math.sin(car.h) * 8.5, car.y + 6.0, car.z - Math.cos(car.h) * 8.5);
      camPos.lerp(behind, 0.09);
      // keep camera inside the room so we never look through the wall
      const cr = Math.hypot(camPos.x, camPos.z);
      if (cr > 13.5) { const k = 13.5 / cr; camPos.x *= k; camPos.z *= k; }
      if (camPos.y < 2.4) camPos.y = 2.4;
      camLook.lerp(new THREE.Vector3(car.x, car.y + 1.6, car.z), 0.14);
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    renderer.render(scene, camera);
    if (!_shown) { _shown = true; const l = document.getElementById("loading"); if (l) l.classList.add("hide"); }
    requestAnimationFrame(tick);
  }
  tick();

  /* ---- resize ---- */
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
