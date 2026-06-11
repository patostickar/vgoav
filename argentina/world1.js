/* ============================================================
   ARGENTINA WORLD — Northwest pampas: red dirt road, cardón cacti,
   Jujuy colored hills, empanada/dulce crates, distant Obelisco.
   3-lane endless runner playfield. Forward = +Z (into screen).
   window.buildWorld1(THREE, scene) -> {
     laneX, FAR, BEHIND, SPAN, scrollers:[{group,far?}],
     makeCrate(), makeCactus(), makeMango()
   }
   ============================================================ */
window.buildWorld1 = function (THREE, scene) {
  const mat = (color, o = {}) =>
    new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.88, metalness: 0.03 }, o));
  const emis = (color, i = 1) =>
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: i, flatShading: true, roughness: 0.5 });

  /* ---- palette ---- */
  const C = {
    dirt: 0xc8642f, dirtD: 0xa44e22, dirtL: 0xdc8048, rung: 0x97431f,
    pampas: 0x9caa50, pampasD: 0x84944a, dryGold: 0xd9b15a,
    cact: 0x46a04f, cactD: 0x2f7d3a, cactL: 0x6cc46f, spine: 0xe7e0b0, flower: 0xf25c8a,
    wood: 0xb5763a, woodD: 0x7a4a22, woodL: 0xcb8b48,
    redrock: 0xb2552c, redrockD: 0x8c3f20,
    // Jujuy "seven colours" bands
    h1: 0x9c3b2e, h2: 0xc9692f, h3: 0xe2b352, h4: 0x7f9a46, h5: 0x6a5c8e, h6: 0xb5485a,
    obel: 0xeae4d6, obelD: 0xd6cdba,
  };

  /* ---- geometry tuning ---- */
  const laneX = [-3.4, 0, 3.4];
  const ROAD_HALF = 5.6;
  const FAR = 124;       // spawn distance ahead
  const BEHIND = -18;    // recycle threshold behind camera
  const SPAN = FAR - BEHIND;

  /* ---- sky + fog (clear Andean blue, haze far away) ---- */
  scene.background = new THREE.Color(0x8ed2ef);
  scene.fog = new THREE.Fog(0xbfe0ee, 64, 150);

  const root = new THREE.Group(); scene.add(root);
  const scrollers = [];

  /* ---- dusty dirt canvas texture ---- */
  function dustTex(base, specks, n) {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d");
    x.fillStyle = base; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < (n || 900); i++) {
      x.fillStyle = specks[(Math.random() * specks.length) | 0];
      x.globalAlpha = 0.25 + Math.random() * 0.5;
      const s = 1 + Math.random() * 3.5;
      x.fillRect(Math.random() * 128, Math.random() * 128, s, s);
    }
    x.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  /* ---- base ground (dry pampas) ---- */
  const groundTex = dustTex("#9caa50", ["#84944a", "#b0bb62", "#caa84e"], 700);
  groundTex.repeat.set(20, 28);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(280, 360), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, flatShading: false }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(0, -0.06, 50);
  grass.receiveShadow = true; root.add(grass);

  /* ---- the red dirt road ---- */
  const roadTex = dustTex("#c8642f", ["#a44e22", "#dc8048", "#8c3f20", "#e09a5a"], 1400);
  roadTex.repeat.set(3, 60);
  const road = new THREE.Mesh(new THREE.BoxGeometry(ROAD_HALF * 2, 0.3, 360),
    new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.96 }));
  road.position.set(0, -0.02, 50); road.receiveShadow = true; root.add(road);
  // earthen shoulders
  [-1, 1].forEach((s) => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 360), mat(C.dirtD));
    curb.position.set(s * (ROAD_HALF + 0.1), 0.12, 50); curb.receiveShadow = true; root.add(curb);
  });

  /* ---- scrolling speed rungs + lane dashes ---- */
  const RUNG_GAP = 4.2;
  const nRungs = Math.ceil(SPAN / RUNG_GAP) + 2;
  for (let i = 0; i < nRungs; i++) {
    const g = new THREE.Group();
    const slat = new THREE.Mesh(new THREE.BoxGeometry(ROAD_HALF * 2 - 0.4, 0.06, 0.5), mat(C.rung));
    slat.position.y = 0.16; slat.receiveShadow = true; g.add(slat);
    [-1.7, 1.7].forEach((dx) => {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 1.6), mat(C.dryGold));
      dash.position.set(dx, 0.17, 0); g.add(dash);
    });
    g.position.z = BEHIND + i * RUNG_GAP;
    root.add(g); scrollers.push({ group: g });
  }

  /* ============================================================
     SHARED BUILDERS
     ============================================================ */
  // Cardón cactus (also reused, scaled, as roadside scenery)
  function buildCactus(scale) {
    const g = new THREE.Group();
    const H = (2.6 + Math.random() * 1.4) * (scale || 1);
    const R = 0.5 * (scale || 1);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.9, R, H, 10), mat(C.cact));
    trunk.position.y = H / 2; trunk.castShadow = true; trunk.receiveShadow = true; g.add(trunk);
    g.add(capDome(R * 0.9, H, C.cactL));
    ribs(g, R, H, 0);
    spines(g, R, H);
    // 1–2 arms
    const arms = 1 + (Math.random() < 0.55 ? 1 : 0);
    const usedSide = [];
    for (let a = 0; a < arms; a++) {
      let side = Math.random() < 0.5 ? 1 : -1;
      if (usedSide.includes(side)) side = -side; usedSide.push(side);
      addArm(g, side, H * (0.4 + Math.random() * 0.2), R, scale || 1);
    }
    g.userData = { type: "cactus", topY: H + 0.4 };
    return g;
    function capDome(rr, hh, col) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(rr, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(col));
      d.position.y = hh; d.castShadow = true; return d;
    }
    function ribs(grp, rr, hh, baseY) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.06, hh * 0.9, 0.1), mat(C.cactD));
        rib.position.set(Math.sin(a) * rr * 0.94, baseY + hh / 2, Math.cos(a) * rr * 0.94);
        rib.rotation.y = a; grp.add(rib);
      }
    }
    function spines(grp, rr, hh) {
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2, y = 0.3 + Math.random() * (hh - 0.5);
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 5), mat(C.spine));
        sp.position.set(Math.sin(a) * rr, y, Math.cos(a) * rr);
        sp.rotation.z = -Math.sin(a) * 1.4; sp.rotation.x = Math.cos(a) * 1.4; grp.add(sp);
      }
      // a couple of flowers on top
      if (Math.random() < 0.7) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), emis(C.flower, 0.25));
        f.position.set((Math.random() - 0.5) * rr, hh + 0.1, (Math.random() - 0.5) * rr); f.scale.y = 0.6; grp.add(f);
      }
    }
    function addArm(grp, side, aY, rr, sc) {
      const horiz = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.42, rr * 0.46, 0.6 * sc, 9), mat(C.cact));
      horiz.rotation.z = Math.PI / 2; horiz.position.set(side * (rr + 0.25 * sc), aY, 0); horiz.castShadow = true; grp.add(horiz);
      const upH = (0.8 + Math.random() * 0.5) * sc;
      const vert = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.42, rr * 0.46, upH, 9), mat(C.cact));
      vert.position.set(side * (rr + 0.5 * sc), aY + upH / 2, 0); vert.castShadow = true; grp.add(vert);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(rr * 0.46, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.cactL));
      cap.position.set(side * (rr + 0.5 * sc), aY + upH, 0); grp.add(cap);
    }
  }

  // Jujuy colored-band hill (Cerro de los Siete Colores)
  function buildHill(scale) {
    const g = new THREE.Group();
    const bands = [C.h1, C.h2, C.h3, C.h4, C.h6, C.h5];
    let r = 7 * (scale || 1), y = 0;
    const start = (Math.random() * 2) | 0;
    for (let i = 0; i < 5; i++) {
      const h = (1.7 + Math.random() * 1.3) * (scale || 1);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r, h, 6), mat(bands[(i + start) % bands.length]));
      seg.position.y = y + h / 2; seg.rotation.y = Math.random() * 1.0; seg.castShadow = true; g.add(seg);
      y += h - 0.1; r *= 0.66;
    }
    return g;
  }

  // Red sandstone mesa rock
  function buildRedRock() {
    const g = new THREE.Group();
    const n = 1 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const r = 0.9 + Math.random() * 1.6;
      const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat(Math.random() > 0.5 ? C.redrock : C.redrockD));
      rk.position.set((Math.random() - 0.5) * 2.6, r * 0.55, (Math.random() - 0.5) * 2.6);
      rk.rotation.set(Math.random(), Math.random(), Math.random());
      rk.castShadow = true; rk.receiveShadow = true; g.add(rk);
    }
    return g;
  }

  // Dry golden pampas grass clump
  function buildPampas() {
    const g = new THREE.Group();
    const n = 5 + ((Math.random() * 5) | 0);
    for (let i = 0; i < n; i++) {
      const hh = 1.3 + Math.random() * 1.8;
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.16, hh, 4), mat(Math.random() > 0.4 ? C.dryGold : C.pampasD));
      blade.position.set((Math.random() - 0.5) * 2, hh / 2, (Math.random() - 0.5) * 2);
      blade.rotation.z = (Math.random() - 0.5) * 0.4; g.add(blade);
    }
    return g;
  }

  /* ---- scatter roadside scenery (scrollers) ---- */
  const builders = [
    () => buildCactus(1.1 + Math.random() * 0.6),
    () => buildHill(0.5 + Math.random() * 0.3),
    buildPampas, buildRedRock,
    () => buildCactus(1.0 + Math.random() * 0.8),
    buildPampas,
  ];
  for (let side = -1; side <= 1; side += 2) {
    let z = BEHIND + Math.random() * 8;
    while (z < FAR) {
      const item = builders[(Math.random() * builders.length) | 0]();
      const off = 7.5 + Math.random() * 22;
      item.position.set(side * off, 0, z);
      item.rotation.y = Math.random() * Math.PI * 2;
      root.add(item); scrollers.push({ group: item });
      z += 5 + Math.random() * 9;
    }
  }

  /* ---- big Jujuy hills on the horizon (slow parallax) ---- */
  for (let i = 0; i < 9; i++) {
    const h = buildHill(2.0 + Math.random() * 1.4);
    const side = Math.random() > 0.5 ? 1 : -1;
    h.position.set(side * (34 + Math.random() * 34), -1, BEHIND + Math.random() * SPAN);
    root.add(h); scrollers.push({ group: h, far: true });
  }

  /* ---- the Obelisco, looming dead ahead on the horizon (static) ---- */
  (function () {
    const g = new THREE.Group();
    const H = 50;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 3.4, H, 4), mat(C.obel, { roughness: 0.7 }));
    shaft.rotation.y = Math.PI / 4; shaft.position.y = H / 2; g.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(1.7, 5.5, 4), mat(C.obelD));
    tip.rotation.y = Math.PI / 4; tip.position.y = H + 2.0; g.add(tip);
    const base = new THREE.Mesh(new THREE.BoxGeometry(8, 3.2, 8), mat(C.obelD)); base.position.y = 1.6; g.add(base);
    // little windows near the top
    [0, 1, 2, 3].forEach((q) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.2), emis(0x3a3530, 0));
      const a = q * Math.PI / 2 + Math.PI / 4;
      w.position.set(Math.sin(a) * 1.5, H - 5, Math.cos(a) * 1.5); w.rotation.y = a; g.add(w);
    });
    g.position.set(0, 0, 118);
    root.add(g);
  })();

  /* ============================================================
     OBSTACLE + PICKUP FACTORIES (pooled by controller; origin at ground)
     ============================================================ */
  // tall, prickly cardón cactus — jumpable with a well-timed hop
  const CACTUS_MAX_TOP = 3.4; // lane cacti are clamped so the jump apex clears them
  function makeCactus() {
    const g = buildCactus(1.0 + Math.random() * 0.35);
    if (g.userData.topY > CACTUS_MAX_TOP) {
      const k = CACTUS_MAX_TOP / g.userData.topY;
      g.scale.setScalar(k);
      g.userData.topY = CACTUS_MAX_TOP;
    }
    return g;
  }

  // text-label canvas for a produce crate (cached per label string)
  const _labelTexCache = {};
  function labelTex(text) {
    if (_labelTexCache[text]) return _labelTexCache[text];
    const c = document.createElement("canvas"); c.width = 256; c.height = 150;
    const x = c.getContext("2d");
    // wood plaque
    x.fillStyle = "#e9d3a3"; x.fillRect(0, 0, 256, 150);
    x.fillStyle = "#cbab73"; x.fillRect(0, 0, 256, 14); x.fillRect(0, 136, 256, 14);
    x.strokeStyle = "#7a4a22"; x.lineWidth = 8; x.strokeRect(4, 4, 248, 142);
    // bulky cartoon text (fit to width, wrap to 2 lines if needed)
    const words = text.split(" ");
    let lines = [text];
    if (words.length > 1 && text.length > 9) {
      const mid = Math.ceil(words.length / 2);
      lines = [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
    }
    x.fillStyle = "#5a3212"; x.textAlign = "center"; x.textBaseline = "middle";
    const lh = lines.length > 1 ? 52 : 0;
    lines.forEach((ln, i) => {
      let fs = 60;
      x.font = "900 " + fs + "px 'Arial Black', Impact, sans-serif";
      while (x.measureText(ln).width > 224 && fs > 14) { fs -= 2; x.font = "900 " + fs + "px 'Arial Black', Impact, sans-serif"; }
      x.fillText(ln, 128, 75 + (i - (lines.length - 1) / 2) * lh);
    });
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    _labelTexCache[text] = t;
    return t;
  }
  const CRATE_LABELS = ["EMPANADAS", "DULCE DE LECHE"];

  // low stack of labelled wooden crates — the SMASH/JUMP obstacle
  function makeCrate() {
    const g = new THREE.Group();
    const s = 1.5;
    const woodMat = mat(C.wood);
    const box = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), woodMat);
    box.position.y = s / 2; box.castShadow = true; box.receiveShadow = true; g.add(box);
    // plank rails top & bottom
    [s - 0.08, 0.08].forEach((yy) => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(s + 0.08, 0.18, s + 0.08), mat(C.woodD));
      e.position.y = yy; g.add(e);
    });
    // corner posts
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((p) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, s, 0.16), mat(C.woodD));
      post.position.set(p[0] * s / 2, s / 2, p[1] * s / 2); g.add(post);
    });
    // a small crate stacked on the back for a "stack" silhouette
    const s2 = 0.82;
    const box2 = new THREE.Mesh(new THREE.BoxGeometry(s2, s2, s2), mat(C.woodL));
    box2.position.set(0.05, s + s2 / 2 - 0.06, -0.28); box2.castShadow = true; g.add(box2);
    // label panel on the front face (+Z, toward player)
    const label = CRATE_LABELS[(Math.random() * CRATE_LABELS.length) | 0];
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.9, s * 0.55),
      new THREE.MeshStandardMaterial({ map: labelTex(label), roughness: 0.85 }));
    panel.position.set(0, s * 0.5, s / 2 + 0.02); g.add(panel);
    g.userData = { type: "crate", topY: s, label };
    return g;
  }

  // basic crate — plain brown cube, +10 points and smashes on any contact
  function makeBasicCrate() {
    const g = new THREE.Group();
    const s = 1.4;
    const box = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat(C.wood));
    box.position.y = s / 2; box.castShadow = true; box.receiveShadow = true; g.add(box);
    // simple cross slats so it reads as a Crash crate
    [0.35, -0.35].forEach((r) => {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(s * 1.34, 0.14, 0.06), mat(C.woodD));
      slat.position.set(0, s / 2, s / 2 + 0.02); slat.rotation.z = r; g.add(slat);
    });
    g.userData = { type: "basic", topY: s };
    return g;
  }

  // TNT text canvas (cached)
  let _tntTexCache = null;
  function tntTex() {
    if (_tntTexCache) return _tntTexCache;
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d");
    x.fillStyle = "#d8281e"; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = "#8c0f0a"; x.lineWidth = 10; x.strokeRect(5, 5, 118, 118);
    x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "900 52px 'Arial Black', Impact, sans-serif";
    x.fillText("TNT", 64, 68);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    _tntTexCache = t;
    return t;
  }

  // TNT crate — vibrant red cube, instant death on contact
  function makeTNT() {
    const g = new THREE.Group();
    const s = 1.4;
    const m = new THREE.MeshStandardMaterial({ map: tntTex(), roughness: 0.8, flatShading: true });
    const box = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), m);
    box.position.y = s / 2; box.castShadow = true; box.receiveShadow = true; g.add(box);
    g.userData = { type: "tnt", topY: s };
    return g;
  }

  // geometric multi-colored tiki mask (shared by the crate face + the hover shield)
  function buildTikiMask(sc) {
    const g = new THREE.Group();
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.9, 0.18), mat(0xc75b39));
    g.add(face);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.2), mat(0xf2b705));
    brow.position.set(0, 0.3, 0.02); g.add(brow);
    [-0.16, 0.16].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 8), emis(0x7fe0ff, 0.6));
      eye.rotation.x = Math.PI / 2; eye.position.set(ex, 0.12, 0.08); g.add(eye);
    });
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.16), mat(0x46a04f));
    nose.position.set(0, -0.08, 0.06); g.add(nose);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.14), mat(0xf25c8a));
    mouth.position.set(0, -0.32, 0.06); g.add(mouth);
    // feathers on top
    [-0.2, 0, 0.2].forEach((fx, i) => {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.34, 5), mat([0xf2b705, 0x46a04f, 0xf25c8a][i]));
      f.position.set(fx, 0.55, 0); g.add(f);
    });
    if (sc) g.scale.setScalar(sc);
    return g;
  }

  // Aku Aku crate — yellow cube with a tiki mask on the front; rare shield pickup
  function makeAkuCrate() {
    const g = new THREE.Group();
    const s = 1.4;
    const box = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat(0xf2b705));
    box.position.y = s / 2; box.castShadow = true; box.receiveShadow = true; g.add(box);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(s + 0.06, 0.14, s + 0.06), mat(C.woodD));
    edge.position.y = s - 0.06; g.add(edge);
    const edge2 = edge.clone(); edge2.position.y = 0.06; g.add(edge2);
    const mask = buildTikiMask(0.9);
    mask.position.set(0, s / 2, s / 2 + 0.12); g.add(mask);
    g.userData = { type: "aku", topY: s };
    return g;
  }

  // the hovering shield mask that follows the player
  function makeAkuMask() { return buildTikiMask(0.8); }

  function makeMango() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), emis(0xffa31e, 0.35));
    body.scale.set(1, 0.86, 1.12); g.add(body);
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), emis(0xff5a2c, 0.4));
    blush.position.set(0.16, 0.04, 0.12); blush.scale.set(0.8, 0.7, 0.7); g.add(blush);
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 5), mat(C.cact));
    leaf.position.set(0, 0.42, 0); leaf.rotation.z = 0.5; g.add(leaf);
    g.userData = { type: "mango" };
    return g;
  }

  return {
    root, laneX, ROAD_HALF, FAR, BEHIND, SPAN,
    scrollers, makeCrate, makeCactus, makeMango,
    makeBasicCrate, makeTNT, makeAkuCrate, makeAkuMask,
  };
};
