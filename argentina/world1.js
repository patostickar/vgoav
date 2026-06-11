/* ============================================================
   ARGENTINA WORLD — Caminito, La Boca: cobblestone road,
   vivid painted facades, tourists, dogs, gold coins.
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
    // cobblestone road
    cob: 0x8a7e72, cobDark: 0x5a5248, cobLight: 0xa89a8e, mortar: 0x4a4240,
    // sidewalk / plaza
    slab: 0x9e9590, slabL: 0xb5afa8,
    // La Boca building hues — matched to Caminito photo
    bBlue:   0x5b9bc8,  // cornflower blue corrugated (the main blue building)
    bCobalt: 0x3a5ccc,  // deep cobalt smooth wall (right side of photo)
    bAmber:  0xc8820a,  // golden amber corrugated
    bRed:    0xc43020,  // brick-red corrugated
    bGreen:  0x3a8830,  // green painted brick (lower sections)
    bYellow: 0xe8b800,  // vivid yellow (also used for railings)
    bPink:   0xcc2838,  // pink-red left wall
    bOrange: 0xd46010,  // warm orange accent
    bCyan:   0x00a8c8,  // teal/cyan
    bLime:   0x7ac420,  // lime green
    // building details
    trim:       0x1e1a16,  // dark metal (lamp, bench, trim)
    winGlass:   0x7fd8f8,  // window glass
    door:       0x2a1810,  // dark door
    frameColor: 0xcc2020,  // red window/door frames
    railing:    0xe8b800,  // yellow iron balcony railing
    // tourist
    skin: 0xf0c89a, shirtR: 0xe03020, shirtB: 0x1a58b8, shirtY: 0xf5c500, shirtG: 0x2aaa2a,
    pants: 0x4a5a8a, hat: 0xf5e8c0, camera_: 0x222222,
    // dog
    dogBrown: 0x8b4513, dogTan: 0xd2a068, dogDark: 0x5a2a08,
    // gold coin
    gold: 0xffd700, goldRim: 0xffed50,
    // tiki (aku)
    tikiFace: 0xc75b39,
    // wood (kept for aku/tnt crates)
    wood: 0xb5763a, woodD: 0x7a4a22, woodL: 0xcb8b48,
  };

  /* ---- geometry constants ---- */
  const laneX = [-3.4, 0, 3.4];
  const ROAD_HALF = 5.6;
  const FAR = 124;
  const BEHIND = -18;
  const SPAN = FAR - BEHIND;

  /* ---- sky + haze (overcast BA sky, like reference photo) ---- */
  scene.background = new THREE.Color(0xa8c4d8);
  scene.fog = new THREE.Fog(0xb8ccd8, 56, 140);

  const root = new THREE.Group(); scene.add(root);
  const scrollers = [];

  /* ---- cobblestone canvas texture ---- */
  function cobbleTex() {
    const c = document.createElement("canvas"); c.width = 256; c.height = 256;
    const x = c.getContext("2d");
    x.fillStyle = "#4a4240"; x.fillRect(0, 0, 256, 256); // mortar base
    const stoneColors = ["#8a7e72", "#7a7268", "#96887c", "#8c8078", "#746c62", "#9a8e84", "#807668"];
    const sw = 30, sh = 20, pad = 2;
    for (let row = 0; row <= Math.ceil(256 / sh) + 1; row++) {
      for (let col = -1; col <= Math.ceil(256 / sw) + 1; col++) {
        const offset = row % 2 === 0 ? 0 : sw * 0.5;
        const sx = col * sw + offset;
        const sy = row * sh;
        x.fillStyle = stoneColors[(row * 7 + col * 5) % stoneColors.length];
        x.fillRect(sx + pad, sy + pad, sw - pad * 2, sh - pad * 2);
        x.fillStyle = "rgba(255,255,255,0.07)";
        x.fillRect(sx + pad, sy + pad, sw - pad * 2, 3);
        x.fillStyle = "rgba(0,0,0,0.07)";
        x.fillRect(sx + pad, sy + sh - pad * 2 - 1, sw - pad * 2, 3);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  /* ---- sidewalk canvas texture ---- */
  function slabTex() {
    const c = document.createElement("canvas"); c.width = 128; c.height = 128;
    const x = c.getContext("2d");
    x.fillStyle = "#9e9590"; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = "#888278"; x.lineWidth = 2;
    for (let i = 0; i < 128; i += 36) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke();
      x.beginPath(); x.moveTo(0, i); x.lineTo(128, i); x.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  /* ---- corrugated metal canvas texture (La Boca zinc walls) ---- */
  const _corrTexCache = {};
  function corrugatedTex(hexColor) {
    if (_corrTexCache[hexColor]) return _corrTexCache[hexColor];
    const c = document.createElement("canvas"); c.width = 128; c.height = 64;
    const x = c.getContext("2d");
    const r = (hexColor >> 16) & 255, g = (hexColor >> 8) & 255, b = hexColor & 255;
    x.fillStyle = `rgb(${r},${g},${b})`; x.fillRect(0, 0, 128, 64);
    // horizontal ridges every 5px: bright highlight on top row, dark shadow on bottom
    for (let py = 0; py < 64; py++) {
      const phase = py % 5;
      if (phase === 0) { x.fillStyle = "rgba(255,255,255,0.30)"; x.fillRect(0, py, 128, 1); }
      else if (phase === 4) { x.fillStyle = "rgba(0,0,0,0.22)"; x.fillRect(0, py, 128, 1); }
    }
    // subtle vertical weathering streaks
    for (let col = 0; col < 128; col += 4) {
      const v = ((col * 17 + 3) % 7) - 3; // deterministic variation
      if (v > 0) { x.fillStyle = `rgba(255,255,255,${v * 0.015})`; x.fillRect(col, 0, 4, 64); }
      else if (v < 0) { x.fillStyle = `rgba(0,0,0,${Math.abs(v) * 0.015})`; x.fillRect(col, 0, 4, 64); }
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    _corrTexCache[hexColor] = t; return t;
  }

  /* ---- painted brick canvas texture (lower building sections) ---- */
  const _brickTexCache = {};
  function brickWallTex(hexColor) {
    if (_brickTexCache[hexColor]) return _brickTexCache[hexColor];
    const c = document.createElement("canvas"); c.width = 128; c.height = 64;
    const x = c.getContext("2d");
    const r = (hexColor >> 16) & 255, g = (hexColor >> 8) & 255, b = hexColor & 255;
    // mortar (slightly darker than base)
    x.fillStyle = `rgb(${Math.max(0,r-28)},${Math.max(0,g-28)},${Math.max(0,b-28)})`;
    x.fillRect(0, 0, 128, 64);
    const bw = 30, bh = 12, pad = 2;
    for (let row = 0; row <= Math.ceil(64 / bh) + 1; row++) {
      for (let col = -1; col <= Math.ceil(128 / bw) + 1; col++) {
        const ox = row % 2 === 0 ? 0 : bw / 2;
        const bx = col * bw + ox, by = row * bh;
        const v = (row * 7 + col * 5) % 3 - 1;
        x.fillStyle = `rgb(${Math.min(255,r+v*10)},${Math.min(255,g+v*10)},${Math.min(255,b+v*10)})`;
        x.fillRect(bx + pad, by + pad, bw - pad * 2, bh - pad * 2);
        x.fillStyle = "rgba(255,255,255,0.11)"; x.fillRect(bx + pad, by + pad, bw - pad * 2, 2);
        x.fillStyle = "rgba(0,0,0,0.13)"; x.fillRect(bx + pad, by + bh - pad - 2, bw - pad * 2, 2);
      }
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    _brickTexCache[hexColor] = t; return t;
  }

  /* ---- Boca Juniors vertical stripe texture (azul y oro — the xeneize colors) ---- */
  let _bocaStripesTex = null;
  function bocaStripesTex() {
    if (_bocaStripesTex) return _bocaStripesTex;
    const c = document.createElement("canvas"); c.width = 128; c.height = 128;
    const x = c.getContext("2d");
    const sw = 14; // stripe width in px
    for (let col = 0; col < 128; col += sw) {
      x.fillStyle = (Math.floor(col / sw) % 2 === 0) ? "#003380" : "#f5d800";
      x.fillRect(col, 0, sw, 128);
    }
    // subtle sheen lines along each stripe edge
    for (let col = 0; col < 128; col += sw) {
      x.fillStyle = "rgba(255,255,255,0.14)"; x.fillRect(col, 0, 2, 128);
      x.fillStyle = "rgba(0,0,0,0.10)";       x.fillRect(col + sw - 2, 0, 2, 128);
    }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    _bocaStripesTex = t; return t;
  }

  /* ---- "CAMINITO" hand-painted wall lettering texture ---- */
  let _caminitoPanelTex = null;
  function caminitoPanelTex() {
    if (_caminitoPanelTex) return _caminitoPanelTex;
    const c = document.createElement("canvas"); c.width = 512; c.height = 256;
    const x = c.getContext("2d");
    // aged plaster background
    x.fillStyle = "#e8dcc8"; x.fillRect(0, 0, 512, 256);
    // subtle texture variation
    for (let i = 0; i < 800; i++) {
      x.fillStyle = `rgba(0,0,0,${0.02 + (i % 5) * 0.008})`;
      x.fillRect((i * 47) % 512, (i * 31) % 256, 3 + (i % 4), 3 + (i % 3));
    }
    // main title "CAMINITO"
    x.fillStyle = "#003380";
    x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "900 110px 'Arial Black', Impact, sans-serif";
    x.fillText("CAMINITO", 256, 110);
    // slight shadow/depth
    x.fillStyle = "rgba(0,0,0,0.18)";
    x.font = "900 110px 'Arial Black', Impact, sans-serif";
    x.fillText("CAMINITO", 259, 113);
    x.fillStyle = "#003380"; x.fillText("CAMINITO", 256, 110);
    // subtitle
    x.fillStyle = "#7a6030";
    x.font = "600 38px Arial, sans-serif";
    x.fillText("Calle Museo · La Boca · Buenos Aires", 256, 200);
    // decorative border
    x.strokeStyle = "#003380"; x.lineWidth = 8;
    x.strokeRect(10, 10, 492, 236);
    x.strokeStyle = "#f5d800"; x.lineWidth = 3;
    x.strokeRect(16, 16, 480, 224);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    _caminitoPanelTex = t; return t;
  }

  /* ---- tango couple silhouette mural texture ---- */
  let _tangoMuralTex = null;
  function tangoMuralTex() {
    if (_tangoMuralTex) return _tangoMuralTex;
    const c = document.createElement("canvas"); c.width = 256; c.height = 384;
    const x = c.getContext("2d");
    // vivid red background (like La Boca painted walls)
    x.fillStyle = "#c43020"; x.fillRect(0, 0, 256, 384);
    // geometric silhouette — man (left figure, in embrace)
    x.fillStyle = "#0a0a0a";
    // man: body leaning right
    x.save(); x.translate(100, 180); x.rotate(0.18);
    x.fillRect(-18, -55, 36, 72);   // torso
    x.fillRect(-8, 17, 14, 60);     // left leg (weight leg)
    x.fillRect(2, 17, 12, 50);      // right leg bent back
    x.beginPath(); x.arc(0, -72, 22, 0, Math.PI * 2); x.fill(); // head
    x.fillRect(-38, -48, 18, 12);   // left arm extended
    x.fillRect(18, -48, 22, 10);    // right arm
    x.restore();
    // woman: figure with dress flare, leg kicked out
    x.save(); x.translate(158, 185); x.rotate(-0.12);
    x.fillRect(-14, -52, 28, 62);   // torso
    // dress triangle
    x.beginPath(); x.moveTo(-14, 10); x.lineTo(14, 10); x.lineTo(38, 90); x.lineTo(-36, 90); x.closePath(); x.fill();
    // kicked leg
    x.save(); x.translate(28, 40); x.rotate(-1.1);
    x.fillRect(-8, 0, 12, 52); x.restore();
    x.beginPath(); x.arc(0, -68, 18, 0, Math.PI * 2); x.fill(); // head
    x.restore();
    // "TANGO" text at bottom
    x.fillStyle = "#f5d800";
    x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "900 44px 'Arial Black', Impact, sans-serif";
    x.fillText("TANGO", 128, 345);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    _tangoMuralTex = t; return t;
  }

  /* ---- ground (plaza slabs) ---- */
  const groundTex = slabTex();
  groundTex.repeat.set(20, 28);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(280, 360),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.94, flatShading: false }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.06, 50);
  ground.receiveShadow = true; root.add(ground);

  /* ---- cobblestone road ---- */
  const roadTex = cobbleTex();
  roadTex.repeat.set(2, 48);
  const road = new THREE.Mesh(new THREE.BoxGeometry(ROAD_HALF * 2, 0.3, 360),
    new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.96 }));
  road.position.set(0, -0.02, 50); road.receiveShadow = true; root.add(road);

  /* ---- stone curbs ---- */
  [-1, 1].forEach((s) => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 360), mat(C.cobDark));
    curb.position.set(s * (ROAD_HALF + 0.1), 0.12, 50); curb.receiveShadow = true; root.add(curb);
  });

  /* ---- subtle depth-cue bands (slightly darker cobblestone strips) ---- */
  const RUNG_GAP = 4.2;
  const nRungs = Math.ceil(SPAN / RUNG_GAP) + 2;
  for (let i = 0; i < nRungs; i++) {
    const g = new THREE.Group();
    const slat = new THREE.Mesh(new THREE.BoxGeometry(ROAD_HALF * 2 - 0.4, 0.06, 0.38), mat(C.cobDark));
    slat.position.y = 0.16; slat.receiveShadow = true; g.add(slat);
    g.position.z = BEHIND + i * RUNG_GAP;
    root.add(g); scrollers.push({ group: g });
  }

  /* ============================================================
     LA BOCA SCENERY BUILDERS
     ============================================================ */
  function buildBuilding(scale) {
    const g = new THREE.Group();
    const s = scale || 1;
    const bw = (2.6 + Math.random() * 2.0) * s;
    const bh = (4.8 + Math.random() * 4.2) * s;
    const bd = (1.0 + Math.random() * 0.8) * s;

    // 2-section building: corrugated upper + brick/corrugated lower
    const upperColors = [C.bBlue, C.bCobalt, C.bAmber, C.bRed, C.bYellow, C.bPink, C.bOrange, C.bCyan];
    const lowerColors = [C.bGreen, C.bCobalt, C.bBlue, C.bRed, C.bAmber, C.bYellow];
    const upperColor = upperColors[(Math.random() * upperColors.length) | 0];
    const lowerColor = lowerColors[(Math.random() * lowerColors.length) | 0];
    const useBrickLower = Math.random() > 0.28;

    const lowerH = bh * (0.28 + Math.random() * 0.14);
    const upperH = bh - lowerH;

    // lower section
    const lowerMat = useBrickLower
      ? new THREE.MeshStandardMaterial({ map: brickWallTex(lowerColor), roughness: 0.92 })
      : new THREE.MeshStandardMaterial({ map: corrugatedTex(lowerColor), roughness: 0.82, metalness: 0.04 });
    const lower = new THREE.Mesh(new THREE.BoxGeometry(bw, lowerH, bd), lowerMat);
    lower.position.y = lowerH / 2; lower.castShadow = true; lower.receiveShadow = true; g.add(lower);

    // upper section (corrugated metal)
    const upperMat = new THREE.MeshStandardMaterial({ map: corrugatedTex(upperColor), roughness: 0.80, metalness: 0.05 });
    const upper = new THREE.Mesh(new THREE.BoxGeometry(bw, upperH, bd), upperMat);
    upper.position.y = lowerH + upperH / 2; upper.castShadow = true; g.add(upper);

    // metal ledge between sections
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.24, 0.24, bd + 0.16), mat(C.trim));
    ledge.position.y = lowerH; g.add(ledge);

    // roof parapet (contrasting vivid color)
    const parapetColor = [C.bYellow, C.bRed, C.bBlue, C.bGreen, C.bOrange][(Math.random() * 5) | 0];
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.32, 0.52, bd + 0.22), mat(parapetColor));
    parapet.position.y = bh + 0.26; g.add(parapet);

    // corrugated metal overhang canopy at section divide (~42% chance)
    if (Math.random() > 0.58) {
      const canopyMat = new THREE.MeshStandardMaterial({ map: corrugatedTex(C.trim), roughness: 0.85, metalness: 0.06 });
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.82, 0.18, 1.0), canopyMat);
      canopy.position.set(0, lowerH + 0.09, bd / 2 + 0.5); g.add(canopy);
      [-bw * 0.32, bw * 0.32].forEach((dx) => {
        const br = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.38, 0.38), mat(C.trim));
        br.position.set(dx, lowerH - 0.19, bd / 2 + 0.19); g.add(br);
      });
    }

    // windows — upper section
    const upperFloors = Math.max(1, Math.round(upperH / 2.5));
    for (let f = 0; f < upperFloors; f++) {
      const wc = 1 + ((Math.random() * 2) | 0);
      for (let wi = 0; wi < wc; wi++) {
        const wx = (wi - (wc - 1) / 2) * (bw / wc);
        const wy = lowerH + 0.9 + f * (upperH / upperFloors) + upperH / (upperFloors * 2);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.1, 0.12), mat(C.frameColor));
        frame.position.set(wx, wy, bd / 2 + 0.01); g.add(frame);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.88, 0.14),
          new THREE.MeshStandardMaterial({ color: C.winGlass, emissive: 0x3a6a8a, emissiveIntensity: 0.3, flatShading: true }));
        glass.position.set(wx, wy, bd / 2 + 0.08); g.add(glass);
      }
    }

    // windows — lower section
    if (lowerH > 1.9) {
      const wc = 1 + ((Math.random() * 2) | 0);
      for (let wi = 0; wi < wc; wi++) {
        const wx = (wi - (wc - 1) / 2) * (bw / wc);
        const wy = lowerH * 0.58;
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.92, 0.12), mat(C.frameColor));
        frame.position.set(wx, wy, bd / 2 + 0.01); g.add(frame);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.72, 0.14),
          new THREE.MeshStandardMaterial({ color: C.winGlass, emissive: 0x3a6a8a, emissiveIntensity: 0.22, flatShading: true }));
        glass.position.set(wx, wy, bd / 2 + 0.08); g.add(glass);
      }
    }

    // door with red frame
    const doorFr = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.08, 0.1), mat(C.frameColor));
    doorFr.position.set(0, 1.04, bd / 2 + 0.0); g.add(doorFr);
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.84, 0.14), mat(C.door));
    doorMesh.position.set(0, 0.92, bd / 2 + 0.07); g.add(doorMesh);

    // Boca Juniors stripe panel (~28% chance) — blue-and-gold vertical stripes on upper facade
    if (Math.random() > 0.72) {
      const panelW = bw * 0.72, panelH = upperH * 0.55;
      const stripePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(panelW, panelH),
        new THREE.MeshStandardMaterial({ map: bocaStripesTex(), roughness: 0.75 })
      );
      stripePlane.position.set(0, lowerH + upperH * 0.55, bd / 2 + 0.06);
      g.add(stripePlane);
    }

    // balcony (~55% chance) with yellow iron railings
    if (Math.random() > 0.45 && upperFloors > 0) {
      const bf = (Math.random() * upperFloors) | 0;
      const by = lowerH + 0.72 + bf * (upperH / Math.max(1, upperFloors));
      const balW = bw * 0.64;

      // slab (dark metal)
      const balSlab = new THREE.Mesh(new THREE.BoxGeometry(balW, 0.18, 0.78), mat(C.trim));
      balSlab.position.set(0, by + 0.09, bd / 2 + 0.39); g.add(balSlab);

      // yellow iron railing: 3 horizontal bars + end posts + balusters
      const railMat = mat(C.railing);
      [0.2, 0.5, 0.8].forEach((dy) => {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(balW, 0.07, 0.07), railMat);
        bar.position.set(0, by + dy, bd / 2 + 0.78); g.add(bar);
      });
      [-balW / 2, balW / 2].forEach((dx) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.84, 0.08), railMat);
        post.position.set(dx, by + 0.42, bd / 2 + 0.78); g.add(post);
      });
      const nBal = Math.max(2, Math.round(balW / 0.28));
      for (let bi = 1; bi < nBal; bi++) {
        const bal = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), railMat);
        bal.position.set(-balW / 2 + bi * (balW / nBal), by + 0.4, bd / 2 + 0.78); g.add(bal);
      }
    }

    return g;
  }

  function buildStreetLamp() {
    const g = new THREE.Group();
    // black iron pole with slight taper
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 4.8, 8), mat(C.trim));
    pole.position.y = 2.4; pole.castShadow = true; g.add(pole);
    // curved arm (two segments)
    const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 6), mat(C.trim));
    arm1.rotation.z = Math.PI / 2; arm1.position.set(0.55, 4.68, 0); g.add(arm1);
    const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), mat(C.trim));
    arm2.rotation.x = Math.PI / 2; arm2.position.set(1.1, 4.58, 0); g.add(arm2);
    // lantern housing
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.38, 6), mat(C.trim));
    housing.position.set(1.1, 4.36, 0); g.add(housing);
    // glowing globe
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0xffee44, emissiveIntensity: 1.0, roughness: 0.3 }));
    globe.position.set(1.1, 4.36, 0); g.add(globe);
    return g;
  }

  function buildPottedPlant() {
    const g = new THREE.Group();
    const potColor = [C.bRed, C.bAmber, C.bBlue][(Math.random() * 3) | 0];
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.22, 0.44, 9), mat(potColor));
    pot.position.y = 0.22; g.add(pot);
    const dirt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 9), mat(0x5a3a18));
    dirt.position.y = 0.46; g.add(dirt);
    const nc = 3 + ((Math.random() * 4) | 0);
    for (let i = 0; i < nc; i++) {
      const a = (i / nc) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.18 + Math.random() * 0.1, 0.6 + Math.random() * 0.4, 5),
        mat(i % 3 === 0 ? C.bGreen : i % 3 === 1 ? C.bLime : 0x28882a));
      leaf.position.set(Math.sin(a) * 0.16, 0.6 + Math.random() * 0.2, Math.cos(a) * 0.16);
      leaf.rotation.z = Math.sin(a) * 0.38; g.add(leaf);
    }
    return g;
  }

  function buildBench() {
    const g = new THREE.Group();
    const dark = C.trim;
    const slat = 0x3a2e28; // dark wood slat

    // two end frames (angled legs)
    [-0.7, 0.7].forEach((dz) => {
      // front leg
      const fl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.1), mat(dark));
      fl.position.set(0.3, 0.31, dz); g.add(fl);
      // back leg
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.1), mat(dark));
      bl.position.set(-0.3, 0.31, dz); g.add(bl);
      // cross brace
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.08), mat(dark));
      br.position.set(0, 0.16, dz); g.add(br);
    });

    // seat slats (3)
    [-0.08, 0.0, 0.08].forEach((dx) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 1.5), mat(slat));
      s.position.set(dx, 0.64, 0); g.add(s);
    });

    // backrest posts + slats
    [-0.7, 0.7].forEach((dz) => {
      const bp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), mat(dark));
      bp.position.set(-0.28, 0.88, dz); g.add(bp);
    });
    [-0.08, 0.08].forEach((dx) => {
      const rs = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 1.5), mat(slat));
      rs.position.set(dx - 0.24, 0.82 + dx * 2, 0); g.add(rs);
    });

    return g;
  }

  /* ---- scatter roadside scenery ---- */
  // Buildings dominate (5/8), lamps/plants/benches add variety
  const sideBuilders = [
    () => buildBuilding(1.0 + Math.random() * 0.5),
    () => buildBuilding(0.8 + Math.random() * 0.4),
    () => buildBuilding(1.1 + Math.random() * 0.4),
    () => buildBuilding(0.9 + Math.random() * 0.5),
    () => buildBuilding(1.0 + Math.random() * 0.3),
    buildStreetLamp,
    buildPottedPlant,
    buildBench,
  ];
  for (let side = -1; side <= 1; side += 2) {
    let z = BEHIND + Math.random() * 8;
    while (z < FAR) {
      const item = sideBuilders[(Math.random() * sideBuilders.length) | 0]();
      // tighter offset — Caminito streets are narrow
      const off = 6.5 + Math.random() * 10;
      item.position.set(side * off, 0, z);
      item.rotation.y = side > 0 ? Math.PI + (Math.random() - 0.5) * 0.18 : (Math.random() - 0.5) * 0.18;
      root.add(item); scrollers.push({ group: item });
      z += 4 + Math.random() * 6;  // denser spacing
    }
  }

  /* ---- big horizon buildings (slow parallax) ---- */
  for (let i = 0; i < 14; i++) {
    const h = buildBuilding(1.6 + Math.random() * 1.4);
    const side = i % 2 === 0 ? 1 : -1;
    h.position.set(side * (28 + Math.random() * 24), 0, BEHIND + Math.random() * SPAN);
    h.rotation.y = side > 0 ? Math.PI : 0;
    root.add(h); scrollers.push({ group: h, far: true });
  }

  /* ---- distant Caminito skyline at horizon ---- */
  (function () {
    const colors = [C.bBlue, C.bAmber, C.bRed, C.bGreen, C.bYellow, C.bCobalt, C.bPink, C.bOrange];
    for (let i = 0; i < 18; i++) {
      const bw = 5 + Math.random() * 9;
      const bh = 10 + Math.random() * 22;
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 1.5),
        mat(colors[i % colors.length], { roughness: 0.99 }));
      const side = i % 2 === 0 ? 1 : -1;
      b.position.set(side * (46 + Math.random() * 26), bh / 2, 40 + Math.random() * 80);
      root.add(b); scrollers.push({ group: b, far: true });
    }
  })();

  /* ---- colorful La Boca building block straight ahead ---- */
  (function () {
    const g = new THREE.Group();
    const colors = [C.bBlue, C.bAmber, C.bRed, C.bGreen, C.bCobalt];
    for (let i = 0; i < 5; i++) {
      const bw = 6 + Math.random() * 3;
      const bh = 14 + Math.random() * 12;
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 4),
        new THREE.MeshStandardMaterial({ map: corrugatedTex(colors[i]), roughness: 0.80, metalness: 0.05 }));
      b.position.set((i - 2) * 7, bh / 2, 0);
      b.castShadow = true; g.add(b);
      const parapetC = [C.bYellow, C.bRed, C.bBlue, C.bOrange, C.bGreen][i];
      const parapet = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.4, 1.2, 4.2), mat(parapetC));
      parapet.position.set((i - 2) * 7, bh + 0.6, 0); g.add(parapet);
    }
    g.position.set(0, 0, 118);
    root.add(g);
  })();

  /* ---- Caminito sign — large painted lettering on a building wall ---- */
  (function () {
    // Wide plaster panel mounted on a building-height box
    const bw = 10, bh = 7, bd = 1.2;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat(C.bBlue));
    wall.position.y = bh / 2;
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(bw * 0.88, bh * 0.72),
      new THREE.MeshStandardMaterial({ map: caminitoPanelTex(), roughness: 0.82 })
    );
    panel.position.set(0, bh / 2, bd / 2 + 0.05);
    const g = new THREE.Group();
    g.add(wall); g.add(panel);
    g.position.set(-14, 0, 22);  // left side, close enough to see clearly early
    root.add(g); scrollers.push({ group: g });
  })();

  /* ---- Tango mural — silhouette couple on a vivid wall ---- */
  (function () {
    const pw = 4.5, ph = 6.8, bd = 1.0;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(pw + 1.0, ph + 1.2, bd), mat(C.bAmber));
    wall.position.y = (ph + 1.2) / 2;
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(pw, ph),
      new THREE.MeshStandardMaterial({ map: tangoMuralTex(), roughness: 0.8 })
    );
    panel.position.set(0, (ph + 1.2) / 2, bd / 2 + 0.05);
    const g = new THREE.Group();
    g.add(wall); g.add(panel);
    g.position.set(13, 0, 38);   // right side, slightly further along
    root.add(g); scrollers.push({ group: g });
  })();

  /* ============================================================
     OBSTACLE + PICKUP FACTORIES
     ============================================================ */

  /* Tourist — acts as "cactus" type: deadly unless jumped over */
  function buildTourist() {
    const g = new THREE.Group();
    const shirtColors = [C.shirtR, C.shirtB, C.shirtY, C.shirtG];
    const shirtColor = shirtColors[(Math.random() * shirtColors.length) | 0];

    // shoes
    [-0.22, 0.22].forEach((dx) => {
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.38), mat(0x222222));
      shoe.position.set(dx, 0.08, 0.06); shoe.castShadow = true; g.add(shoe);
    });
    // legs
    [-0.22, 0.22].forEach((dx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.92, 7), mat(C.pants));
      leg.position.set(dx, 0.56, 0); leg.castShadow = true; g.add(leg);
    });
    // torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.9, 0.42), mat(shirtColor));
    torso.position.y = 1.38; torso.castShadow = true; g.add(torso);
    // arms
    [-0.54, 0.54].forEach((dx) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.78, 6), mat(shirtColor));
      arm.rotation.z = dx > 0 ? -0.38 : 0.38;
      arm.position.set(dx * 0.94, 1.3, 0); arm.castShadow = true; g.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), mat(C.skin));
      hand.position.set(dx * 1.22, 1.04, 0.12); g.add(hand);
    });
    // neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 6), mat(C.skin));
    neck.position.y = 1.88; g.add(neck);
    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 10, 8), mat(C.skin));
    head.position.y = 2.22; head.castShadow = true; g.add(head);
    // hat brim
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.1, 11), mat(C.hat));
    brim.position.y = 2.43; g.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.35, 9), mat(C.hat));
    crown.position.y = 2.6; g.add(crown);
    // camera hanging from neck
    const camBody = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.18), mat(C.camera_));
    camBody.position.set(0.24, 1.62, 0.3); g.add(camBody);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 8), mat(0x111111));
    lens.rotation.x = Math.PI / 2; lens.position.set(0.24, 1.62, 0.42); g.add(lens);

    g.userData = { type: "cactus", topY: 2.72 };
    return g;
  }

  /* Dog — acts as "crate" type: smashable */
  function buildDog(size) {
    const g = new THREE.Group();
    const sc = size === "small" ? 0.78 : 1.0;
    const col = Math.random() > 0.5 ? C.dogBrown : C.dogTan;
    const dark = C.dogDark;

    // legs (4)
    const legPositions = [[-0.3, 0.22], [0.3, 0.22], [-0.3, -0.22], [0.3, -0.22]];
    legPositions.forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * sc, 0.08 * sc, 0.56 * sc, 6), mat(col));
      leg.position.set(dx * sc, 0.28 * sc, dz * sc); leg.castShadow = true; g.add(leg);
    });
    // body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.04 * sc, 0.62 * sc, 0.52 * sc), mat(col));
    body.position.y = 0.66 * sc; body.castShadow = true; g.add(body);
    // tummy patch
    const tummy = new THREE.Mesh(new THREE.BoxGeometry(0.6 * sc, 0.3 * sc, 0.54 * sc),
      mat(Math.random() > 0.5 ? C.dogTan : 0xe8c898));
    tummy.position.y = 0.58 * sc; g.add(tummy);
    // neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * sc, 0.22 * sc, 0.28 * sc, 7), mat(col));
    neck.position.set(0.5 * sc, 0.84 * sc, 0); g.add(neck);
    // head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5 * sc, 0.46 * sc, 0.48 * sc), mat(col));
    head.position.set(0.64 * sc, 0.94 * sc, 0); head.castShadow = true; g.add(head);
    // snout
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24 * sc, 0.22 * sc, 0.44 * sc), mat(C.dogTan));
    snout.position.set(0.86 * sc, 0.88 * sc, 0); g.add(snout);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07 * sc, 6, 5), mat(0x111111));
    nose.position.set(0.99 * sc, 0.92 * sc, 0); g.add(nose);
    // eyes
    [-0.12, 0.12].forEach((dz) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055 * sc, 6, 5), mat(0x111111));
      eye.position.set(0.86 * sc, 1.0 * sc, dz * sc); g.add(eye);
    });
    // ears
    [-0.16, 0.16].forEach((dz) => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.14 * sc, 0.24 * sc, 0.12 * sc), mat(dark));
      ear.position.set(0.58 * sc, 1.18 * sc, dz * sc); ear.rotation.z = 0.15; g.add(ear);
    });
    // tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * sc, 0.04 * sc, 0.56 * sc, 5), mat(col));
    tail.rotation.z = -0.72; tail.position.set(-0.6 * sc, 0.86 * sc, 0); g.add(tail);

    const topY = 1.24 * sc;
    const type = size === "small" ? "basic" : "crate";
    g.userData = { type, topY, label: "DOG" };
    return g;
  }

  function makeCactus() {
    const g = buildTourist();
    const CAP = 3.2;
    if (g.userData.topY > CAP) {
      const k = CAP / g.userData.topY;
      g.scale.setScalar(k);
      g.userData.topY = CAP;
    }
    return g;
  }

  function makeCrate() { return buildDog("large"); }
  function makeBasicCrate() { return buildDog("small"); }

  /* Gold coin pickup */
  function makeGoldCoin() {
    const g = new THREE.Group();
    const coinMat = new THREE.MeshStandardMaterial({
      color: C.gold, emissive: C.gold, emissiveIntensity: 0.5,
      metalness: 0.85, roughness: 0.15, flatShading: false,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: C.goldRim, emissive: C.goldRim, emissiveIntensity: 0.6,
      metalness: 0.9, roughness: 0.1, flatShading: false,
    });
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.14, 18), coinMat);
    face.rotation.x = Math.PI / 2;
    g.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.07, 8, 18), rimMat);
    g.add(rim);
    // star emboss
    const star = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.18, 5), coinMat);
    star.rotation.x = Math.PI / 2; star.position.z = 0.02;
    g.add(star);
    g.userData = { type: "mango" };
    return g;
  }

  /* TNT crate (unchanged) */
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
  function makeTNT() {
    const g = new THREE.Group();
    const s = 1.4;
    const m = new THREE.MeshStandardMaterial({ map: tntTex(), roughness: 0.8, flatShading: true });
    const box = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), m);
    box.position.y = s / 2; box.castShadow = true; box.receiveShadow = true; g.add(box);
    g.userData = { type: "tnt", topY: s };
    return g;
  }

  /* Aku Aku tiki mask (unchanged) */
  function buildTikiMask(sc) {
    const g = new THREE.Group();
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.9, 0.18), mat(C.tikiFace));
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
    [-0.2, 0, 0.2].forEach((fx, i) => {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.34, 5),
        mat([0xf2b705, 0x46a04f, 0xf25c8a][i]));
      f.position.set(fx, 0.55, 0); g.add(f);
    });
    if (sc) g.scale.setScalar(sc);
    return g;
  }

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

  function makeAkuMask() { return buildTikiMask(0.8); }

  return {
    root, laneX, ROAD_HALF, FAR, BEHIND, SPAN,
    scrollers, makeCrate, makeCactus, makeMango: makeGoldCoin,
    makeBasicCrate, makeTNT, makeAkuCrate, makeAkuMask,
  };
};
