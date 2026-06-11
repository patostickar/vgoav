/* ============================================================
   ARGENTINA WORLD — Endless Run scene module (Three.js)
   window.createArgentinaRun(THREE, env) -> { scene, camera, update, enter, exit }
   3-lane runner: A/D (or ←/→) snap lanes, Space jumps.
   Win at WIN_SCORE points -> LEVEL CLEARED -> back to the Warp Room.
   TNT death -> "GO HOME!" card with Return to Warp Room.
   env: {
     dom,                  // renderer canvas (pointer events)
     exitToMenu(cleared),  // hand control back to the Warp Room
   }
   ============================================================ */
window.createArgentinaRun = function (THREE, env) {
  let active = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 220);

  /* ---- sunny jungle lighting ---- */
  scene.add(new THREE.HemisphereLight(0xcfeaff, 0x9a5a30, 0.95));
  scene.add(new THREE.AmbientLight(0xfff2d8, 0.35));
  const sun = new THREE.DirectionalLight(0xfff1cf, 1.15);
  sun.position.set(-14, 26, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -16; sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 70; sun.shadow.bias = -0.0004;
  scene.add(sun);

  /* ---- world + rider ---- */
  const W = window.buildWorld1(THREE, scene);
  const LANE = W.laneX, FAR = W.FAR, BEHIND = W.BEHIND, SPAN = W.SPAN;
  const vespa = window.buildVespaRun(THREE);
  scene.add(vespa);
  const VR = vespa.userData.refs;

  /* ---- pools ---- */
  function makePool(factory) {
    const free = [];
    return {
      get() { let o = free.pop(); if (!o) { o = factory(); scene.add(o); } o.visible = true; return o; },
      release(o) { o.visible = false; o.position.set(0, -60, BEHIND - 40); free.push(o); },
    };
  }
  const cratePool = makePool(W.makeCrate);
  const cactusPool = makePool(W.makeCactus);
  const mangoPool = makePool(W.makeMango);
  const basicPool = makePool(W.makeBasicCrate);
  const tntPool = makePool(W.makeTNT);
  const akuPool = makePool(W.makeAkuCrate);
  const POOLS = { crate: cratePool, cactus: cactusPool, basic: basicPool, tnt: tntPool, aku: akuPool };
  let obstacles = [];   // {group,type,lane,topY,hit}
  let mangos = [];      // {group,lane,baseY,phase,got}
  let chips = [];       // smash particles {mesh,vx,vy,vz,life}
  const chipPool = makePool(() =>
    new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xb5763a, flatShading: true, roughness: 0.8 })));

  /* ---- HUD refs ---- */
  const elScore = document.getElementById("score");
  const elDist = document.getElementById("dist");
  const elMango = document.getElementById("mango-n");
  const elSpeed = document.getElementById("speed");
  const elBest = document.getElementById("best");
  const startCard = document.getElementById("start");
  const overCard = document.getElementById("over");
  const overEy = document.getElementById("over-ey");
  const overTitle = document.getElementById("over-title");
  const overDist = document.getElementById("over-dist");
  const overMango = document.getElementById("over-mango");
  const overScore = document.getElementById("over-score");
  const overBest = document.getElementById("over-best");
  const clearedBanner = document.getElementById("cleared");
  const flash = document.getElementById("flash");
  const popEl = document.getElementById("pop");

  const BESTKEY = "arg_run_best_v1";
  let best = 0; try { best = parseInt(localStorage.getItem(BESTKEY) || "0", 10) || 0; } catch (e) {}
  elBest.textContent = best + " m";

  /* ---- run state ---- */
  const BASE_SPEED = 26, MAX_SPEED = 50, G = 60;
  // punchy Crash-style jump: strong gravity, no hang time, quick return.
  // apex = JUMP^2 / (2*G_RISE) ≈ 4.1u — clears the tallest lane cactus (3.4u)
  const JUMP = 30, G_RISE = 110, G_FALL = 150;
  const CLEAR_CRATE = 1.1; // min car.y to clear a crate
  const AKU_MAX = 2;
  const WIN_SCORE = 500;   // reach this -> LEVEL CLEARED
  let state = "ready"; // ready | run | dead | cleared
  let lane = 1, car = { x: LANE[1], y: 0, vy: 0, grounded: true };
  let speed = BASE_SPEED, distance = 0, mangoCount = 0, score = 0, akuPoints = 0;
  let distSinceSpawn = 0, nextGap = 13, prevOpen = [0, 1, 2];
  let lean = 0, hopTilt = 0, shake = 0, deadT = 0, clearT = 0;

  /* hovering Aku Aku shield masks trailing the vespa */
  const akuMasks = [W.makeAkuMask(), W.makeAkuMask()];
  akuMasks.forEach((m) => { m.visible = false; scene.add(m); });
  function updateAkuMasks(t) {
    akuMasks.forEach((m, i) => {
      m.visible = active && state !== "dead" && i < akuPoints;
      if (!m.visible) return;
      const side = i === 0 ? 1 : -1;
      m.position.set(car.x + side * 1.1, car.y + 2.3 + Math.sin(t * 3 + i * 2) * 0.18, -1.6);
      m.rotation.y = Math.sin(t * 2 + i) * 0.25;
    });
  }

  function reset() {
    obstacles.forEach((o) => POOLS[o.type].release(o.group));
    mangos.forEach((m) => mangoPool.release(m.group));
    chips.forEach((c) => chipPool.release(c.mesh));
    obstacles = []; mangos = []; chips = [];
    lane = 1; car.x = LANE[1]; car.y = 0; car.vy = 0; car.grounded = true;
    speed = BASE_SPEED; distance = 0; mangoCount = 0; score = 0; akuPoints = 0;
    distSinceSpawn = 0; nextGap = 16; prevOpen = [0, 1, 2];
    lean = 0; hopTilt = 0; shake = 0; deadT = 0; clearT = 0;
    vespa.rotation.set(0, 0, 0); VR.tilt.rotation.set(0, 0, 0); VR.tilt.scale.set(1, 1, 1);
    updateHUD();
  }
  function updateHUD() {
    elDist.textContent = Math.floor(distance);
    elMango.textContent = mangoCount;
    elSpeed.textContent = Math.round(speed * 2);
    elScore.textContent = score;
  }

  /* ---- input ---- */
  function moveLane(d) {
    if (state !== "run") return;
    const n = Math.max(0, Math.min(2, lane + d));
    if (n !== lane) { lean = (n - lane) * 0.5; lane = n; }
  }
  function jump() {
    if (state !== "run") return;
    if (car.grounded) { car.vy = JUMP; car.grounded = false; }
  }
  function startRun() {
    if (state === "run") return;
    reset(); state = "run";
    startCard.classList.add("hide"); startCard.classList.remove("show");
    overCard.classList.remove("show");
  }
  window.addEventListener("keydown", (e) => {
    if (!active) return;
    const k = e.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    if (state === "ready") { if (k === " " || k === "arrowup" || k === "w" || k === "enter") startRun(); return; }
    if (state === "dead") {
      if (deadT > 0.6 && (k === "r" || k === "enter")) startRun();
      return;
    }
    if (state === "cleared") return;
    // camera looks down +Z, so +X is screen-left: A/left => +1 lane, D/right => -1
    if (k === "a" || k === "arrowleft") moveLane(1);
    else if (k === "d" || k === "arrowright") moveLane(-1);
    else if (k === " " || k === "w" || k === "arrowup") jump();
  });

  // pointer / touch fallback: tap left|right third to switch, tap center to jump, swipe up to jump
  let tStart = null;
  env.dom.addEventListener("pointerdown", (e) => {
    if (!active) return;
    if (state === "ready") { startRun(); return; }
    if (state === "dead" || state === "cleared") return;
    tStart = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  env.dom.addEventListener("pointerup", (e) => {
    if (!active) return;
    if (!tStart || state !== "run") { tStart = null; return; }
    const dx = e.clientX - tStart.x, dy = e.clientY - tStart.y;
    if (dy < -40 && Math.abs(dy) > Math.abs(dx)) jump();
    else if (Math.abs(dx) < 16 && Math.abs(dy) < 16) {
      const f = e.clientX / window.innerWidth;
      if (f < 0.36) moveLane(1); else if (f > 0.64) moveLane(-1); else jump();
    } else if (dx > 30) moveLane(-1);
    else if (dx < -30) moveLane(1);
    tStart = null;
  });

  /* card buttons */
  document.getElementById("start-btn").addEventListener("click", () => { if (active) startRun(); });
  document.getElementById("retry-btn").addEventListener("click", () => { if (active && state === "dead") startRun(); });
  document.getElementById("home-btn").addEventListener("click", () => { if (active) env.exitToMenu(false); });
  document.getElementById("start-home-btn").addEventListener("click", () => { if (active) env.exitToMenu(false); });

  /* ---- spawning ---- */
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };

  function spawnObstacle(laneIdx, type, z) {
    const g = POOLS[type].get();
    g.position.set(LANE[laneIdx], 0, z);  // factories are built with origin at ground
    g.rotation.y = type === "cactus" ? Math.random() * Math.PI * 2 : 0;
    obstacles.push({ group: g, type, lane: laneIdx, topY: g.userData.topY, hit: false });
  }
  function spawnMango(laneIdx, z, y) {
    const g = mangoPool.get();
    g.position.set(LANE[laneIdx], y, z);
    mangos.push({ group: g, lane: laneIdx, baseY: y, phase: Math.random() * 6.28, got: false });
  }

  function spawnRow() {
    const z = FAR;
    // ~24% chance: a mango arc to reward jumping
    if (Math.random() < 0.24) {
      const ln = prevOpen[(Math.random() * prevOpen.length) | 0];
      const n = 4 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const y = 0.9 + Math.sin(t * Math.PI) * 2.6; // arc up & over
        spawnMango(ln, z + i * 2.4, y);
      }
      prevOpen = [0, 1, 2];
      return;
    }
    // obstacle row — keep it fair: open lane must be reachable from a previous open lane
    const blocked = Math.random() < 0.34 ? 2 : 1;
    let open = [], tries = 0;
    do {
      const order = shuffle([0, 1, 2]);
      const blk = order.slice(0, blocked);
      open = [0, 1, 2].filter((l) => !blk.includes(l));
      tries++;
    } while (tries < 8 && !open.some((o) => prevOpen.some((p) => Math.abs(o - p) <= 1)));
    const blockedLanes = [0, 1, 2].filter((l) => !open.includes(l));
    blockedLanes.forEach((l) => {
      // weighted mix: cacti + labelled crates remain the staples, TNT spices it up
      const r = Math.random();
      const type = r < 0.38 ? "cactus" : r < 0.66 ? "crate" : r < 0.84 ? "tnt" : "basic";
      spawnObstacle(l, type, z + (Math.random() - 0.5) * 1.2);
    });
    // open lanes: mango, a bonus basic crate, or (rarely) an Aku Aku crate
    const r2 = Math.random();
    if (r2 < 0.06) {
      const ln = open[(Math.random() * open.length) | 0];
      spawnObstacle(ln, "aku", z);
    } else if (r2 < 0.22) {
      const ln = open[(Math.random() * open.length) | 0];
      spawnObstacle(ln, "basic", z);
    } else if (r2 < 0.62) {
      const ln = open[(Math.random() * open.length) | 0];
      spawnMango(ln, z, 0.9);
    }
    prevOpen = open;
  }

  /* ---- scoring / win ---- */
  function addScore(n) {
    score += n;
    if (state === "run" && score >= WIN_SCORE) levelCleared();
  }

  /* ---- smash / crash / clear ---- */
  function debris(o, n) {
    const p = o.group.position;
    for (let i = 0; i < n; i++) {
      const m = chipPool.get();
      m.position.set(p.x + (Math.random() - 0.5), p.y + (Math.random() - 0.5) + 0.4, p.z + (Math.random() - 0.5));
      m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      const sc = 0.5 + Math.random() * 0.8; m.scale.setScalar(sc);
      chips.push({ mesh: m, vx: (Math.random() - 0.5) * 6, vy: 4 + Math.random() * 6, vz: (Math.random() - 0.5) * 6 - speed * 0.2, life: 0.7 + Math.random() * 0.4 });
    }
  }
  function smashCrate(o) {
    debris(o, 10);
    cratePool.release(o.group);
    mangoCount += 1; // crates drop a wumpa-style bonus
    shake = Math.max(shake, 0.18);
    popText("SMASH! +25", "#ffd24a");
    addScore(25);
  }
  function smashBasic(o) {
    debris(o, 8);
    basicPool.release(o.group);
    shake = Math.max(shake, 0.15);
    popText("+10", "#ffd24a");
    addScore(10);
  }
  function collectAku(o) {
    debris(o, 6);
    akuPool.release(o.group);
    if (akuPoints < AKU_MAX) akuPoints += 1;
    popText("AKU AKU!", "#7fe0ff");
  }
  // a deadly hit (cactus or TNT): the shield absorbs it, otherwise crash
  function deadlyHit(o) {
    if (akuPoints > 0) {
      akuPoints -= 1;
      debris(o, 12);
      POOLS[o.type].release(o.group);
      shake = Math.max(shake, 0.3);
      popText("SHIELDED!", "#7fe0ff");
      return true; // survived — obstacle destroyed
    }
    crash(o.type);
    return false;
  }
  let popT = 0;
  function popText(txt, color) {
    popEl.textContent = txt; popEl.style.color = color;
    popEl.classList.remove("show"); void popEl.offsetWidth;
    popEl.classList.add("show"); popT = 0.7;
  }

  function crash(cause) {
    if (state !== "run") return;
    state = "dead"; deadT = 0;
    flash.style.setProperty("--c", "#ff3b2e");
    flash.classList.add("on"); setTimeout(() => flash.classList.remove("on"), 220);
    shake = 0.6; car.vy = 9;
    distance = Math.floor(distance);
    if (distance > best) { best = distance; try { localStorage.setItem(BESTKEY, String(best)); } catch (e) {} }
    // cartoonish TNT-specific game over
    if (cause === "tnt") { overEy.textContent = "KA-BOOM!"; overTitle.textContent = "GO HOME!"; }
    else { overEy.textContent = "Wiped Out!"; overTitle.textContent = "Run Over"; }
    overDist.textContent = distance + " m";
    overMango.textContent = mangoCount;
    overScore.textContent = score;
    overBest.textContent = best + " m";
    elBest.textContent = best + " m";
    setTimeout(() => { if (state === "dead") overCard.classList.add("show"); }, 480);
  }

  function levelCleared() {
    state = "cleared"; clearT = 0;
    distance = Math.floor(distance);
    if (distance > best) { best = distance; try { localStorage.setItem(BESTKEY, String(best)); } catch (e) {} }
    clearedBanner.classList.add("show");
    // celebrate, then hand back to the Warp Room with the level marked cleared
    setTimeout(() => { if (active) env.exitToMenu(true); }, 2800);
  }

  /* ---- camera ---- */
  const camPos = new THREE.Vector3(0, 5.4, -9.2);
  const camLook = new THREE.Vector3(0, 1.4, 6);

  /* ---- per-frame update ---- */
  function update(dt, t) {
    if (state === "run") {
      // speed ramps with distance
      speed = Math.min(MAX_SPEED, BASE_SPEED + distance * 0.014);
      distance += speed * dt;
      distSinceSpawn += speed * dt;
      if (distSinceSpawn >= nextGap) {
        distSinceSpawn = 0;
        nextGap = 11 + Math.random() * 6 - Math.min(4, speed * 0.06);
        spawnRow();
      }
      updateHUD();
    }
    if (state === "cleared") clearT += dt;

    /* lane snap (frame-independent, snappy) */
    const targetX = LANE[lane];
    car.x += (targetX - car.x) * (1 - Math.exp(-dt * 24));
    lean += (((targetX - car.x) * 0.9) - lean) * 0.25;

    /* jump arc — strong two-phase gravity: punchy rise, fast snappy fall */
    if (!car.grounded || car.y > 0) {
      const g = car.vy > 0 ? G_RISE : G_FALL;
      car.vy -= g * dt; car.y += car.vy * dt;
      if (car.y <= 0 && state !== "dead") { car.y = 0; car.vy = 0; if (!car.grounded) hopTilt = 0.42; car.grounded = true; }
    }

    /* place vespa */
    vespa.position.set(car.x, car.y, 0);
    hopTilt *= 0.84;
    VR.tilt.rotation.z = -lean;
    VR.tilt.rotation.x = hopTilt + (car.grounded ? 0 : -car.vy * 0.012);
    const sq = Math.max(0, hopTilt);
    VR.tilt.scale.set(1 + sq * 0.4, 1 - sq * 0.5, 1 + sq * 0.4);
    if (state !== "dead") {
      VR.wheelF.rotation.x += speed * dt * 1.1;
      VR.wheelR.rotation.x += speed * dt * 1.1;
    }
    if (state === "dead") { // tumble
      deadT += dt;
      vespa.rotation.z += dt * 4; vespa.rotation.x += dt * 2.4;
      car.vy -= G * dt; car.y += car.vy * dt;
      vespa.position.y = Math.max(0.4, car.y);
    }

    /* scroll world */
    if (state !== "dead" || deadT < 0.5) {
      const move = speed * dt * (state === "dead" ? 0.3 : 1);
      W.scrollers.forEach((s) => {
        s.group.position.z -= move * (s.far ? 0.55 : 1);
        if (s.group.position.z < BEHIND) s.group.position.z += SPAN;
      });
      // obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i]; o.group.position.z -= move;
        // collision check at the player plane (only while racing)
        if (state === "run" && !o.hit && o.group.position.z <= 0.7 && o.group.position.z > -1.4 && o.lane === lane) {
          o.hit = true;
          if (o.type === "cactus" || o.type === "tnt") {
            // jumpable with a clean apex; otherwise deadly unless shielded
            if (car.y > o.topY - 0.4) { /* cleanly vaulted */ }
            else if (deadlyHit(o)) { obstacles.splice(i, 1); continue; }
          } else if (o.type === "basic") {
            // any contact (driving or jumping into it) smashes for points
            if (car.y > o.topY + 0.3) { /* sailed clean over */ }
            else { smashBasic(o); obstacles.splice(i, 1); continue; }
          } else if (o.type === "aku") {
            if (car.y > o.topY + 0.3) { /* missed it */ }
            else { collectAku(o); obstacles.splice(i, 1); continue; }
          } else { // labelled crate
            if (car.y > CLEAR_CRATE) { /* cleanly vaulted */ }
            else { smashCrate(o); obstacles.splice(i, 1); continue; }
          }
        }
        if (o.group.position.z < BEHIND) {
          POOLS[o.type].release(o.group);
          obstacles.splice(i, 1);
        }
      }
      // mangos
      for (let i = mangos.length - 1; i >= 0; i--) {
        const m = mangos[i]; m.group.position.z -= move;
        m.group.rotation.y += dt * 2.4;
        m.group.position.y = m.baseY + Math.sin(t * 3 + m.phase) * 0.12;
        if (state === "run" && !m.got && m.group.position.z <= 0.9 && m.group.position.z > -1.2 && m.lane === lane
          && Math.abs(car.y + 1.4 - m.group.position.y) < 1.5) {
          m.got = true; mangoCount += 1; popText("MANGO +5", "#ffb01e");
          addScore(5);
          mangoPool.release(m.group); mangos.splice(i, 1); continue;
        }
        if (m.group.position.z < BEHIND) { mangoPool.release(m.group); mangos.splice(i, 1); }
      }
    }

    /* chips */
    for (let i = chips.length - 1; i >= 0; i--) {
      const c = chips[i]; c.life -= dt;
      c.vy -= G * dt;
      c.mesh.position.x += c.vx * dt; c.mesh.position.y += c.vy * dt; c.mesh.position.z += c.vz * dt;
      c.mesh.rotation.x += dt * 7; c.mesh.rotation.y += dt * 6;
      if (c.life <= 0 || c.mesh.position.y < -1) { chipPool.release(c.mesh); chips.splice(i, 1); }
    }

    /* aku shield masks */
    updateAkuMasks(t);

    /* pop text fade */
    if (popT > 0) { popT -= dt; if (popT <= 0) popEl.classList.remove("show"); }

    /* camera (chase, with shake) */
    shake *= 0.86;
    const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
    const want = new THREE.Vector3(car.x * 0.5 + sx, 5.4 + sy, -9.2);
    camPos.lerp(want, 0.12);
    camLook.lerp(new THREE.Vector3(car.x * 0.6, 1.5 + Math.min(car.y, 3) * 0.3, 7), 0.15);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  /* ---- enter / exit (state manager hooks) ---- */
  function enter() {
    active = true;
    reset();
    state = "ready";
    camPos.set(0, 5.4, -9.2); camLook.set(0, 1.4, 6);
    startCard.classList.remove("hide"); startCard.classList.add("show");
    overCard.classList.remove("show");
    clearedBanner.classList.remove("show");
    elBest.textContent = best + " m";
  }
  function exit() {
    active = false;
    startCard.classList.remove("show"); startCard.classList.add("hide");
    overCard.classList.remove("show");
    clearedBanner.classList.remove("show");
    akuMasks.forEach((m) => (m.visible = false));
  }

  reset();
  return { scene, camera, update, enter, exit };
};
