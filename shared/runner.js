/* ============================================================
   SHARED — generic 3-lane endless-runner engine (Three.js)
   window.createRunner(THREE, env, pack) -> { scene, camera, update, enter, exit }

   All level-specific content comes from the world pack:
     pack.buildWorld(THREE, scene) — playfield, scenery, mesh factories
     pack.obstacles — per-type behavior {kind, points, clearAt/clearMargin, deathCopy, …}
     pack.blockedMix / pack.openSpawns — spawn tables
     pack.winScore / pack.collectible / pack.title / startTitle / startDesc / bestKey

   Mechanics owned here: lane snapping, punchy two-phase jump,
   pooled spawning, fair-row generation, collision dispatch by kind,
   shield (Aku) system, scoring + win, death/game-over, chase cam.
   env: { dom, exitToMenu(cleared) }
   ============================================================ */
window.createRunner = function (THREE, env, pack) {
  let active = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 220);

  /* ---- sunny lighting rig (pack can override later if needed) ---- */
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
  const W = pack.buildWorld(THREE, scene);
  const LANE = W.laneX, FAR = W.FAR, BEHIND = W.BEHIND, SPAN = W.SPAN;
  const vespa = window.buildCharacter(THREE);
  scene.add(vespa);
  const VR = vespa.userData.refs;

  /* ---- pools (one per obstacle type, + collectible + debris) ---- */
  const POOLS = {};
  Object.keys(pack.obstacles).forEach((type) => {
    POOLS[type] = window.makePool(scene, W.make[type], -60, BEHIND - 40);
  });
  const collectPool = window.makePool(scene, W.makeCollectible, -60, BEHIND - 40);
  const chipPool = window.makePool(scene, () =>
    new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xb5763a, flatShading: true, roughness: 0.8 })), -60, BEHIND - 40);
  let obstacles = [];   // {group,type,lane,topY,hit}
  let collectibles = []; // {group,lane,baseY,phase,got}
  let chips = [];       // smash particles {mesh,vx,vy,vz,life}

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
  const titleName = document.getElementById("run-title-name");
  const titleSub = document.getElementById("run-title-sub");
  const startTitle = document.getElementById("start-title");
  const startDesc = document.getElementById("start-desc");

  let best = 0; try { best = parseInt(localStorage.getItem(pack.bestKey) || "0", 10) || 0; } catch (e) {}

  /* ---- tuning (pack.physics can override) ---- */
  const PH = Object.assign({
    BASE_SPEED: 26, MAX_SPEED: 50, G: 60,
    // punchy Crash-style jump: strong gravity, no hang time, quick return.
    // apex = JUMP^2 / (2*G_RISE) ≈ 4.1u — clears the tallest lane cactus (3.4u)
    JUMP: 30, G_RISE: 110, G_FALL: 150,
    SHIELD_MAX: 2,
  }, pack.physics || {});
  const WIN_SCORE = pack.winScore || 500;

  let state = "ready"; // ready | run | dead | cleared
  let lane = 1, car = { x: LANE[1], y: 0, vy: 0, grounded: true };
  let speed = PH.BASE_SPEED, distance = 0, collectCount = 0, score = 0, shieldPoints = 0;
  let distSinceSpawn = 0, nextGap = 13, prevOpen = [0, 1, 2];
  let lean = 0, hopTilt = 0, shake = 0, deadT = 0;

  /* hovering shield icons trailing the rider */
  const shieldIcons = [W.makeShieldIcon(), W.makeShieldIcon()];
  shieldIcons.forEach((m) => { m.visible = false; scene.add(m); });
  function updateShieldIcons(t) {
    shieldIcons.forEach((m, i) => {
      m.visible = active && state !== "dead" && i < shieldPoints;
      if (!m.visible) return;
      const side = i === 0 ? 1 : -1;
      m.position.set(car.x + side * 1.1, car.y + 2.3 + Math.sin(t * 3 + i * 2) * 0.18, -1.6);
      m.rotation.y = Math.sin(t * 2 + i) * 0.25;
    });
  }

  function reset() {
    obstacles.forEach((o) => POOLS[o.type].release(o.group));
    collectibles.forEach((m) => collectPool.release(m.group));
    chips.forEach((c) => chipPool.release(c.mesh));
    obstacles = []; collectibles = []; chips = [];
    lane = 1; car.x = LANE[1]; car.y = 0; car.vy = 0; car.grounded = true;
    speed = PH.BASE_SPEED; distance = 0; collectCount = 0; score = 0; shieldPoints = 0;
    distSinceSpawn = 0; nextGap = 16; prevOpen = [0, 1, 2];
    lean = 0; hopTilt = 0; shake = 0; deadT = 0;
    vespa.rotation.set(0, 0, 0); VR.tilt.rotation.set(0, 0, 0); VR.tilt.scale.set(1, 1, 1);
    updateHUD();
  }
  function updateHUD() {
    elDist.textContent = Math.floor(distance);
    elMango.textContent = collectCount;
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
    if (car.grounded) { car.vy = PH.JUMP; car.grounded = false; }
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

  /* card buttons (shared DOM — guard on active so only the live runner reacts) */
  document.getElementById("start-btn").addEventListener("click", () => { if (active) startRun(); });
  document.getElementById("retry-btn").addEventListener("click", () => { if (active && state === "dead") startRun(); });
  document.getElementById("home-btn").addEventListener("click", () => { if (active) env.exitToMenu(false); });
  document.getElementById("start-home-btn").addEventListener("click", () => { if (active) env.exitToMenu(false); });

  /* ---- spawning ---- */
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };
  const blockedTotal = pack.blockedMix.reduce((s, m) => s + m[1], 0);
  function pickBlockedType() {
    let r = Math.random() * blockedTotal;
    for (const [type, w] of pack.blockedMix) { if ((r -= w) <= 0) return type; }
    return pack.blockedMix[0][0];
  }

  function spawnObstacle(laneIdx, type, z) {
    const g = POOLS[type].get();
    g.position.set(LANE[laneIdx], 0, z);  // factories are built with origin at ground
    g.rotation.y = pack.obstacles[type].spin === false ? 0 : (type === "cactus" ? Math.random() * Math.PI * 2 : 0);
    obstacles.push({ group: g, type, lane: laneIdx, topY: g.userData.topY, hit: false });
  }
  function spawnCollectible(laneIdx, z, y) {
    const g = collectPool.get();
    g.position.set(LANE[laneIdx], y, z);
    collectibles.push({ group: g, lane: laneIdx, baseY: y, phase: Math.random() * 6.28, got: false });
  }

  function spawnRow() {
    const z = FAR;
    // ~24% chance: a collectible arc to reward jumping
    if (Math.random() < 0.24) {
      const ln = prevOpen[(Math.random() * prevOpen.length) | 0];
      const n = 4 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const y = 0.9 + Math.sin(t * Math.PI) * 2.6; // arc up & over
        spawnCollectible(ln, z + i * 2.4, y);
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
    blockedLanes.forEach((l) => spawnObstacle(l, pickBlockedType(), z + (Math.random() - 0.5) * 1.2));
    // open lanes: pack-defined bonus spawns (cumulative chances)
    const r2 = Math.random();
    let acc = 0;
    for (const [what, chance] of pack.openSpawns) {
      acc += chance;
      if (r2 < acc) {
        const ln = open[(Math.random() * open.length) | 0];
        if (what === "collectible") spawnCollectible(ln, z, 0.9);
        else spawnObstacle(ln, what, z);
        break;
      }
    }
    prevOpen = open;
  }

  /* ---- scoring / win ---- */
  function addScore(n) {
    score += n;
    updateHUD(); // immediate, so the final score shows even when the win freezes the run
    if (state === "run" && score >= WIN_SCORE) levelCleared();
  }

  /* ---- effects + collision outcomes ---- */
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
  function smash(o, cfg) {
    debris(o, 10);
    POOLS[o.type].release(o.group);
    if (cfg.drops) collectCount += cfg.drops;
    shake = Math.max(shake, 0.18);
    popText(cfg.pop || "+" + cfg.points, "#ffd24a");
    addScore(cfg.points || 0);
  }
  function collectShield(o) {
    debris(o, 6);
    POOLS[o.type].release(o.group);
    if (shieldPoints < PH.SHIELD_MAX) shieldPoints += 1;
    popText("AKU AKU!", "#7fe0ff");
  }
  // a deadly hit: the shield absorbs it, otherwise crash
  function deadlyHit(o, cfg) {
    if (shieldPoints > 0) {
      shieldPoints -= 1;
      debris(o, 12);
      POOLS[o.type].release(o.group);
      shake = Math.max(shake, 0.3);
      popText("SHIELDED!", "#7fe0ff");
      return true; // survived — obstacle destroyed
    }
    crash(cfg.deathCopy);
    return false;
  }
  let popT = 0;
  function popText(txt, color) {
    popEl.textContent = txt; popEl.style.color = color;
    popEl.classList.remove("show"); void popEl.offsetWidth;
    popEl.classList.add("show"); popT = 0.7;
  }

  function saveBest() {
    distance = Math.floor(distance);
    if (distance > best) { best = distance; try { localStorage.setItem(pack.bestKey, String(best)); } catch (e) {} }
  }

  function crash(deathCopy) {
    if (state !== "run") return;
    state = "dead"; deadT = 0;
    flash.style.setProperty("--c", "#ff3b2e");
    flash.classList.add("on"); setTimeout(() => flash.classList.remove("on"), 220);
    shake = 0.6; car.vy = 9;
    saveBest();
    overEy.textContent = (deathCopy && deathCopy.ey) || "Wiped Out!";
    overTitle.textContent = (deathCopy && deathCopy.title) || "Run Over";
    overDist.textContent = distance + " m";
    overMango.textContent = collectCount;
    overScore.textContent = score;
    overBest.textContent = best + " m";
    elBest.textContent = best + " m";
    setTimeout(() => { if (state === "dead") overCard.classList.add("show"); }, 480);
  }

  function levelCleared() {
    state = "cleared";
    saveBest();
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
      speed = Math.min(PH.MAX_SPEED, PH.BASE_SPEED + distance * 0.014);
      distance += speed * dt;
      distSinceSpawn += speed * dt;
      if (distSinceSpawn >= nextGap) {
        distSinceSpawn = 0;
        nextGap = 11 + Math.random() * 6 - Math.min(4, speed * 0.06);
        spawnRow();
      }
      updateHUD();
    }

    /* lane snap (frame-independent, snappy) */
    const targetX = LANE[lane];
    car.x += (targetX - car.x) * (1 - Math.exp(-dt * 24));
    lean += (((targetX - car.x) * 0.9) - lean) * 0.25;

    /* jump arc — strong two-phase gravity: punchy rise, fast snappy fall */
    if (!car.grounded || car.y > 0) {
      const g = car.vy > 0 ? PH.G_RISE : PH.G_FALL;
      car.vy -= g * dt; car.y += car.vy * dt;
      if (car.y <= 0 && state !== "dead") { car.y = 0; car.vy = 0; if (!car.grounded) hopTilt = 0.42; car.grounded = true; }
    }

    /* place rider */
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
      car.vy -= PH.G * dt; car.y += car.vy * dt;
      vespa.position.y = Math.max(0.4, car.y);
    }

    /* scroll world */
    if (state !== "dead" || deadT < 0.5) {
      const move = speed * dt * (state === "dead" ? 0.3 : 1);
      W.scrollers.forEach((s) => {
        s.group.position.z -= move * (s.far ? 0.55 : 1);
        if (s.group.position.z < BEHIND) s.group.position.z += SPAN;
      });
      // obstacles — collision dispatch is driven by the pack's behavior table
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i]; o.group.position.z -= move;
        if (state === "run" && !o.hit && o.group.position.z <= 0.7 && o.group.position.z > -1.4 && o.lane === lane) {
          o.hit = true;
          const cfg = pack.obstacles[o.type];
          const clearY = cfg.clearAt !== undefined ? cfg.clearAt : o.topY + (cfg.clearMargin || 0);
          if (car.y > clearY) { /* cleanly vaulted */ }
          else if (cfg.kind === "deadly") { if (deadlyHit(o, cfg)) { obstacles.splice(i, 1); continue; } }
          else if (cfg.kind === "smash") { smash(o, cfg); obstacles.splice(i, 1); continue; }
          else if (cfg.kind === "shield") { collectShield(o); obstacles.splice(i, 1); continue; }
        }
        if (o.group.position.z < BEHIND) {
          POOLS[o.type].release(o.group);
          obstacles.splice(i, 1);
        }
      }
      // collectibles
      for (let i = collectibles.length - 1; i >= 0; i--) {
        const m = collectibles[i]; m.group.position.z -= move;
        m.group.rotation.y += dt * 2.4;
        m.group.position.y = m.baseY + Math.sin(t * 3 + m.phase) * 0.12;
        if (state === "run" && !m.got && m.group.position.z <= 0.9 && m.group.position.z > -1.2 && m.lane === lane
          && Math.abs(car.y + 1.4 - m.group.position.y) < 1.5) {
          m.got = true; collectCount += 1;
          popText(pack.collectible.name + " +" + pack.collectible.points, "#ffb01e");
          addScore(pack.collectible.points);
          collectPool.release(m.group); collectibles.splice(i, 1); continue;
        }
        if (m.group.position.z < BEHIND) { collectPool.release(m.group); collectibles.splice(i, 1); }
      }
    }

    /* chips */
    for (let i = chips.length - 1; i >= 0; i--) {
      const c = chips[i]; c.life -= dt;
      c.vy -= PH.G * dt;
      c.mesh.position.x += c.vx * dt; c.mesh.position.y += c.vy * dt; c.mesh.position.z += c.vz * dt;
      c.mesh.rotation.x += dt * 7; c.mesh.rotation.y += dt * 6;
      if (c.life <= 0 || c.mesh.position.y < -1) { chipPool.release(c.mesh); chips.splice(i, 1); }
    }

    /* shield icons */
    updateShieldIcons(t);

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
    // brand the shared run HUD for this world
    titleName.textContent = pack.title;
    titleSub.textContent = pack.subtitle;
    startTitle.textContent = pack.startTitle;
    startDesc.innerHTML = pack.startDesc;
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
    shieldIcons.forEach((m) => (m.visible = false));
  }

  reset();
  return { scene, camera, update, enter, exit };
};
