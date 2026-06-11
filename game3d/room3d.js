/* ============================================================
   WARP ROOM — circular low-poly stone hub
   window.WARP_LEVELS  — level/portal definitions (shared)
   window.buildRoom(THREE, scene) -> { pads, portals, unlockBoss(), refs }
   ============================================================ */

window.WARP_LEVELS = [
  { id:"argentina", name:"Argentina", mode:"Endless Pampas Run",
    color:0xf2b705, glow:0xffd24a, accent:0xc75b39, angle: Math.PI * 0.25, boss:false,
    poster:{ emblem:"10", subject:"EL DIEZ", kicker:"VISIT",
      sky:"#74acdf", sky2:"#9cc4e8", band:"#ffffff", ink:"#1b3a5c", note:"e.g. Maradona", file:"argentina" } },
  { id:"rome", name:"Rome", mode:"City Traffic Dash",
    color:0xe4d2a4, glow:0xff5a3c, accent:0xb3261e, angle: Math.PI * 1.75, boss:false,
    poster:{ emblem:"S·P·Q·R", subject:"THE ETERNAL CITY", kicker:"VISIT",
      sky:"#c0392b", sky2:"#e85a3c", band:"#f6c453", ink:"#4a120c", note:"e.g. Colosseum", file:"rome" } },
  { id:"denmark", name:"Denmark", mode:"Viking Fjord Hop",
    color:0x2e9fd6, glow:0x00dcff, accent:0x2e6fb0, angle: Math.PI * 0.75, boss:false,
    poster:{ emblem:"ᚠᚢᚦ", subject:"FJORD & LONGSHIP", kicker:"VISIT",
      sky:"#1f6f9c", sky2:"#34a9d6", band:"#bdecff", ink:"#06283a", note:"e.g. Longship", file:"denmark" } },
  { id:"sardegna", name:"Sardegna", mode:"BOSS · The Nuragic Colossus",
    color:0xe0331f, glow:0xf68d2e, accent:0x8a8275, angle: Math.PI * 1.25, boss:true,
    poster:{ emblem:"IV", subject:"THE NURAGIC COLOSSUS", kicker:"BOSS",
      sky:"#8a1410", sky2:"#c0291c", band:"#f68d2e", ink:"#2a0805", note:"e.g. boss art", file:"sardegna" } },
];

/* representative travel-poster texture for each portal (replaces the old coin emblem).
   Pass a loaded HTMLImageElement as `img` to fill the art window with real drop-in art;
   omit it and a themed emblem placeholder is drawn instead. */
window.makePosterCanvas = function (P, name, mode, existing, img) {
  const W = 880, H = 520, c = existing || document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.clearRect(0, 0, W, H);
  const rr = (a, b, w, h, r) => {
    x.beginPath();
    x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r);
    x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath();
  };
  // base field
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, P.sky2); g.addColorStop(1, P.sky);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // kicker ribbon
  x.fillStyle = P.ink; x.fillRect(0, 0, W, 70);
  x.fillStyle = P.band; x.textAlign = "center"; x.textBaseline = "middle";
  x.font = "700 30px 'Baloo 2', system-ui, sans-serif";
  x.fillText(P.kicker + "  ·  LOOP WORLD TOUR", W / 2, 36);

  // central art window
  const wx = 46, wy = 92, ww = W - 92, wh = 304, rad = 22;
  x.save(); rr(wx, wy, ww, wh, rad); x.clip();
  if (img && img.width) {
    // cover-fit the real drop-in image
    const ir = img.width / img.height, wr = ww / wh; let dw, dh, dx, dy;
    if (ir > wr) { dh = wh; dw = wh * ir; dx = wx - (dw - ww) / 2; dy = wy; }
    else { dw = ww; dh = ww / ir; dx = wx; dy = wy - (dh - wh) / 2; }
    x.drawImage(img, dx, dy, dw, dh);
    // subject caption strip over the photo
    x.fillStyle = "rgba(0,0,0,.42)"; x.fillRect(wx, wy + wh - 54, ww, 54);
    x.fillStyle = "#fff"; x.font = "800 26px 'Baloo 2', system-ui, sans-serif";
    x.fillText(P.subject, W / 2, wy + wh - 26);
  } else {
    // themed placeholder: sun-rays + emblem disc + drop-art hint
    const gg = x.createLinearGradient(0, wy, 0, wy + wh);
    gg.addColorStop(0, P.sky2); gg.addColorStop(1, P.sky); x.fillStyle = gg; x.fillRect(wx, wy, ww, wh);
    x.save(); x.translate(W / 2, wy + wh * 0.44); x.globalAlpha = 0.16;
    for (let i = 0; i < 24; i++) {
      x.rotate((Math.PI * 2) / 24); x.fillStyle = i % 2 ? P.band : P.ink;
      x.beginPath(); x.moveTo(0, 0); x.lineTo(40, -640); x.lineTo(-40, -640); x.closePath(); x.fill();
    }
    x.restore();
    x.beginPath(); x.arc(W / 2, wy + wh * 0.42, 96, 0, Math.PI * 2); x.fillStyle = P.band; x.fill();
    x.lineWidth = 8; x.strokeStyle = P.ink; x.stroke();
    x.fillStyle = P.ink; x.font = "400 96px 'Luckiest Guy', 'Baloo 2', sans-serif";
    x.fillText(P.emblem, W / 2, wy + wh * 0.42 + 4);
    x.fillStyle = "#fff"; x.font = "800 24px 'Baloo 2', system-ui, sans-serif";
    x.fillText(P.subject, W / 2, wy + wh - 46);
    x.fillStyle = "rgba(255,255,255,.62)"; x.font = "600 16px ui-monospace, monospace";
    x.fillText("▢ drop art → assets/posters/" + P.file + ".jpg  (" + P.note + ")", W / 2, wy + wh - 18);
  }
  x.restore();
  // window frame
  rr(wx, wy, ww, wh, rad); x.lineWidth = 8; x.strokeStyle = P.band; x.stroke();

  // country name plaque
  x.fillStyle = P.ink; x.fillRect(0, H - 96, W, 96);
  x.fillStyle = "#fff"; x.textBaseline = "middle"; x.textAlign = "center";
  x.font = "400 72px 'Luckiest Guy', 'Baloo 2', sans-serif";
  x.fillText(name.toUpperCase(), W / 2, H - 48);
  // mode caption on the ribbon
  x.fillStyle = "rgba(255,255,255,.6)"; x.textAlign = "right"; x.textBaseline = "middle";
  x.font = "600 16px ui-monospace, monospace"; x.fillText(mode, W - 22, 36);
  // outer frame
  x.strokeStyle = P.band; x.lineWidth = 16; x.strokeRect(8, 8, W - 16, H - 16);
  x.strokeStyle = P.ink; x.lineWidth = 4; x.strokeRect(22, 22, W - 44, H - 44);
  return c;
};

/* try a list of urls in order, call ok(img) with the first that loads */
window.loadFirstImage = function (urls, ok) {
  let i = 0;
  (function next() {
    if (i >= urls.length) return;
    const im = new Image();
    im.onload = function () { if (im.width) ok(im); };
    im.onerror = function () { i++; next(); };
    im.src = urls[i];
  })();
};

window.buildRoom = function (THREE, scene) {
  const mat = (color, o = {}) =>
    new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.85, metalness: 0.05 }, o));
  const emis = (color, i = 1) =>
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: i, flatShading: true, roughness: 0.5 });

  const STONE = 0xcdb185, STONE_D = 0xb2986b, STONE_L = 0xe0c79a, MOSS = 0x6f8a3a;
  const WALL_R = 16, WALL_H = 11, FRAME_R = 14.6, PAD_R = 9.2;

  const room = new THREE.Group(); scene.add(room);

  /* ---- floor ---- */
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(WALL_R - 0.2, WALL_R - 0.2, 0.8, 40), mat(STONE));
  floor.position.y = -0.4; floor.receiveShadow = true; room.add(floor);
  // ring inlays
  [13.6, 9.2, 5].forEach((r, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.16, 6, 48), mat(i === 1 ? STONE_L : STONE_D));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; room.add(ring);
  });
  // tile speckle (scattered darker quads)
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 12.5;
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.9 + Math.random(), 0.06, 0.9 + Math.random()), mat(Math.random() > .5 ? STONE_D : STONE_L));
    t.position.set(Math.sin(a) * r, 0.04, Math.cos(a) * r); t.rotation.y = Math.random() * Math.PI; room.add(t);
  }

  /* ---- outer wall + pilasters + rim ---- */
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(WALL_R, WALL_R, WALL_H, 40, 1, true), mat(STONE_D, { side: THREE.BackSide }));
  wall.position.y = WALL_H / 2 - 0.4; room.add(wall);
  // lower wainscot band
  const band = new THREE.Mesh(new THREE.CylinderGeometry(WALL_R - 0.15, WALL_R - 0.15, 1.6, 40, 1, true), mat(STONE, { side: THREE.BackSide }));
  band.position.y = 0.4; room.add(band);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const pil = new THREE.Mesh(new THREE.BoxGeometry(1.1, WALL_H, 0.9), mat(STONE_L));
    pil.position.set(Math.sin(a) * (WALL_R - 0.4), WALL_H / 2 - 0.4, Math.cos(a) * (WALL_R - 0.4));
    pil.rotation.y = a; pil.castShadow = true; room.add(pil);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.3), mat(STONE));
    cap.position.set(Math.sin(a) * (WALL_R - 0.4), WALL_H - 0.7, Math.cos(a) * (WALL_R - 0.4)); cap.rotation.y = a; room.add(cap);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(WALL_R - 0.2, 0.5, 8, 48), mat(STONE_L));
  rim.rotation.x = Math.PI / 2; rim.position.y = WALL_H - 0.6; room.add(rim);

  /* ---- central dais + glowing core ---- */
  const dais = new THREE.Group(); room.add(dais);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.7, 10), mat(STONE_L));
  plinth.position.y = -0.05; plinth.receiveShadow = true; dais.add(plinth);
  const plinth2 = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.8, 0.5, 10), mat(STONE));
  plinth2.position.y = 0.35; dais.add(plinth2);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.12, 24), emis(0xffd24a, 0.7));
  core.position.y = 0.62; dais.add(core);
  const coreRing = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.12, 8, 32), emis(0x00dcff, 0.8));
  coreRing.rotation.x = Math.PI / 2; coreRing.position.y = 0.66; dais.add(coreRing);
  // glyph spokes
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.9), emis(0xff8a1e, 0.7));
    s.position.set(Math.sin(i / 8 * Math.PI * 2) * 1.1, 0.7, Math.cos(i / 8 * Math.PI * 2) * 1.1); s.rotation.y = i / 8 * Math.PI * 2; dais.add(s);
  }
  const coreLight = new THREE.PointLight(0xffc24a, 1.1, 22, 2); coreLight.position.set(0, 2.2, 0); room.add(coreLight);

  /* ---- torches (between portals) ---- */
  const torchFlames = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2; // cardinal
    const x = Math.sin(a) * (WALL_R - 1.6), z = Math.cos(a) * (WALL_R - 1.6);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.2, 8), mat(0x5b3a1f));
    post.position.set(x, 1.2, z); room.add(post);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.25, 0.4, 10), mat(0x2a2a30, { metalness: 0.4 }));
    bowl.position.set(x, 2.9, z); room.add(bowl);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.0, 8), emis(0xff8a1e, 1.4));
    flame.position.set(x, 3.5, z); room.add(flame);
    const fl = new THREE.PointLight(0xff7a1e, 1.0, 14, 2); fl.position.set(x, 3.6, z); room.add(fl);
    torchFlames.push({ flame, fl, base: 3.5 });
  }

  /* ---- portals + pressure pads ---- */
  const pads = [], portals = [], posters = [];
  let bossRefs = null;

  WARP_LEVELS.forEach((L) => {
    const a = L.angle, dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));

    /* portal frame group (faces room center) */
    const pg = new THREE.Group();
    pg.position.set(dir.x * FRAME_R, 3.5, dir.z * FRAME_R);
    pg.lookAt(0, 3.5, 0);
    room.add(pg);

    // stone arch backing
    const backing = new THREE.Mesh(new THREE.BoxGeometry(6.4, 7.6, 0.8), mat(STONE_L));
    backing.position.z = -0.3; pg.add(backing);
    // arch frame (torus)
    const frame = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.5, 10, 28), mat(STONE));
    pg.add(frame);
    // keystone + side blocks
    const key = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), mat(STONE_L)); key.position.set(0, 2.7, 0.1); key.rotation.z = Math.PI / 4; pg.add(key);

    // representative travel-poster billboard mounted over the door (replaces the old coin emblem)
    const PB = L.poster;
    const pcv = window.makePosterCanvas(PB, L.name, L.mode);
    const ptex = new THREE.CanvasTexture(pcv); ptex.anisotropy = 8;
    const PW = 4.8, PH = PW * (pcv.height / pcv.width);
    const posterTrim = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.46, PH + 0.46, 0.34), emis(L.glow, 0.55));
    posterTrim.position.set(0, 4.7, 0.30); pg.add(posterTrim);
    const posterFrame = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.26, PH + 0.26, 0.42), mat(0x5b3a1f));
    posterFrame.position.set(0, 4.7, 0.34); pg.add(posterFrame);
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH),
      new THREE.MeshBasicMaterial({ map: ptex, toneMapped: false }));
    poster.position.set(0, 4.7, 0.57); pg.add(poster);
    // little bracket posts joining the sign to the arch
    [-1, 1].forEach((s) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.0, 0.18), mat(0x5b3a1f));
      post.position.set(s * 1.6, 3.35, 0.34); pg.add(post);
    });
    posters.push({ canvas: pcv, tex: ptex, P: PB, name: L.name, mode: L.mode, img: null });
    // load real drop-in art if present (assets/posters/<id>.{jpg,png,jpeg,webp})
    (function (rec) {
      const base = "assets/posters/" + rec.P.file;
      window.loadFirstImage([base + ".jpg", base + ".png", base + ".jpeg", base + ".webp"], function (im) {
        rec.img = im;
        window.makePosterCanvas(rec.P, rec.name, rec.mode, rec.canvas, rec.img);
        rec.tex.needsUpdate = true;
      });
    })(posters[posters.length - 1]);

    // swirling portal surface
    const portal = new THREE.Mesh(new THREE.CircleGeometry(2.15, 32),
      new THREE.MeshBasicMaterial({ color: L.glow, transparent: true, opacity: 0.92, side: THREE.DoubleSide }));
    portal.position.z = 0.05; pg.add(portal);
    const swirl = new THREE.Mesh(new THREE.RingGeometry(0.6, 2.0, 24, 1),
      new THREE.MeshBasicMaterial({ color: L.color, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    swirl.position.z = 0.08; pg.add(swirl);
    const portalLight = new THREE.PointLight(L.glow, 1.4, 18, 2);
    portalLight.position.set(dir.x * (FRAME_R - 2.5), 3.4, dir.z * (FRAME_R - 2.5)); room.add(portalLight);

    /* boss blocking — boards + iron padlock + chains */
    if (L.boss) {
      const blk = new THREE.Group(); pg.add(blk);
      const plank = (y, rot) => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.9, 0.5), mat(0x7a4a22));
        p.position.set(0, y, 0.5); p.rotation.z = rot;
        for (let s = -1; s <= 1; s += 2) { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 6), mat(0x2a2a30, { metalness: 0.6 })); n.rotation.x = Math.PI / 2; n.position.set(s * 2.6, y, 0.78); p.add(n); }
        blk.add(p); return p;
      };
      plank(1.4, 0.16); plank(-0.2, -0.12); plank(-1.6, 0.2);
      const diag = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.8, 0.45), mat(0x69401e)); diag.position.set(0, 0, 0.62); diag.rotation.z = -0.7; blk.add(diag);
      // chains
      [-0.6, 0.6].forEach((o) => {
        const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 7, 8), mat(0x6b6f76, { metalness: 0.6, roughness: 0.5 }));
        ch.position.set(0, 0, 0.95); ch.rotation.z = o > 0 ? 0.7 : -0.7; blk.add(ch);
      });
      // giant iron padlock
      const lock = new THREE.Group(); lock.position.set(0, 0, 1.25);
      const lbody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 0.9), mat(0x565d66, { metalness: 0.6, roughness: 0.45 }));
      const bgeo = lbody.geometry; bgeo.translate(0, -0.1, 0); lock.add(lbody);
      const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.2, 8, 16, Math.PI), mat(0xaeb4bd, { metalness: 0.7, roughness: 0.3 }));
      shackle.position.set(0, 0.95, 0); lock.add(shackle);
      const kh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.0, 10), emis(0x15181d, 0)); kh.rotation.x = Math.PI / 2; kh.position.set(0, -0.05, 0.45); lock.add(kh);
      [[-0.7, 0.6], [0.7, 0.6], [-0.7, -0.8], [0.7, -0.8]].forEach((p) => { const r = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mat(0x2a2e34)); r.position.set(p[0], p[1], 0.46); lock.add(r); });
      blk.add(lock);
      bossRefs = { blk, lock, group: pg };
    }

    /* pressure pad on the floor */
    const padG = new THREE.Group();
    padG.position.set(dir.x * PAD_R, 0, dir.z * PAD_R); room.add(padG);
    const padMat = emis(L.glow, 0.25);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.1, 0.22, 20), padMat);
    pad.position.y = 0.12; pad.receiveShadow = true; padG.add(pad);
    const padRing = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.16, 8, 24), emis(L.color, 0.5));
    padRing.rotation.x = Math.PI / 2; padRing.position.y = 0.24; padG.add(padRing);
    // chevrons pointing to portal
    for (let c = 0; c < 3; c++) {
      const chev = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), emis(L.color, 0.4));
      chev.position.set(0, 0.25, -0.7 + c * 0.6); chev.rotation.y = Math.PI / 4; padG.add(chev);
    }
    padG.rotation.y = a; // orient chevrons toward portal
    const padLight = new THREE.PointLight(L.glow, 0.0, 10, 2); padLight.position.set(dir.x * PAD_R, 1.6, dir.z * PAD_R); room.add(padLight);

    pads.push({ level: L, group: padG, pad, padMat, ring: padRing, light: padLight, pos: new THREE.Vector3(dir.x * PAD_R, 0, dir.z * PAD_R) });
    portals.push({ level: L, group: pg, portal, swirl, light: portalLight });
  });

  /* redraw poster textures once the display fonts have loaded */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      posters.forEach((p) => {
        window.makePosterCanvas(p.P, p.name, p.mode, p.canvas, p.img);
        p.tex.needsUpdate = true;
      });
    });
  }

  /* ---- warped-space backdrop ---- */
  scene.background = new THREE.Color(0x190a36);
  scene.fog = new THREE.Fog(0x190a36, 28, 60);
  const starGeo = new THREE.BufferGeometry();
  const sp = [];
  for (let i = 0; i < 500; i++) {
    const r = 30 + Math.random() * 24, t = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.55;
    sp.push(Math.sin(t) * Math.cos(ph) * r, 8 + Math.abs(Math.cos(ph)) * r * 0.7, Math.cos(t) * Math.cos(ph) * r);
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xbfa8ff, size: 0.5, sizeAttenuation: true }));
  scene.add(stars);

  function unlockBoss() {
    if (!bossRefs) return;
    const start = performance.now();
    function fall(now) {
      const t = Math.min(1, (now - start) / 900);
      bossRefs.blk.position.y = -t * t * 14;
      bossRefs.blk.rotation.z = t * 0.5;
      bossRefs.blk.children.forEach((c, i) => { c.rotation.x = t * (i % 2 ? 2 : -2); });
      if (t < 1) requestAnimationFrame(fall); else bossRefs.blk.visible = false;
    }
    requestAnimationFrame(fall);
  }

  return { room, pads, portals, posters, dais, core, coreRing, stars, torchFlames, bossRefs, unlockBoss };
};
