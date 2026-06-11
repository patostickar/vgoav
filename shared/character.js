/* ============================================================
   SHARED — the hero: stylized low-poly "Viking Gaucho on a Vespa"
   Logo-matched model built from THREE primitives. Faces +Z.
   window.buildCharacter(THREE, opts) ->
     group with userData.refs:{ tilt, wheelF, wheelR, headlight, spot, cone }
   opts.body / opts.bodyD / opts.bodyL — Vespa paint job
   (blue for the runner worlds, green in the Warp Room, etc.)
   Animation contract:
     refs.tilt   — lean / pitch / squash group (children get the english)
     refs.wheelF / refs.wheelR — spin around local X
   ============================================================ */
window.buildCharacter = function (THREE, opts) {
  opts = opts || {};
  const C = {
    body: opts.body !== undefined ? opts.body : 0x2f63c8,
    bodyD: opts.bodyD !== undefined ? opts.bodyD : 0x21489c,
    bodyL: opts.bodyL !== undefined ? opts.bodyL : 0x5a8cea,
    cream: 0xf4ead2,
    chrome: 0xdfe5ec, tire: 0x222229, hub: 0xc9ccd2,
    poncho: 0x9a5a2c, ponchoD: 0x73411d, weave: 0xc88a4a,
    skin: 0xeab487, skinD: 0xd79b6e, beard: 0xe5a32a, beardD: 0xc8861a,
    steel: 0x9aa6b4, steelD: 0x6f7d8c, horn: 0xf2e6c8, hornD: 0xd9c9a0,
    seat: 0x4a2f18, leather: 0x6e421f, boot: 0x3a2410, light: 0xfff4b0,
  };
  const mat = (color, o = {}) =>
    new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.62, metalness: 0.1 }, o));

  const group = new THREE.Group();
  const tilt = new THREE.Group();           // lean / pitch / squash live here
  group.add(tilt);

  const add = (geo, m, x, y, z, parent = tilt) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  /* ---------- wheels (spin around local X) ---------- */
  function makeWheel(r) {
    const g = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.34, 18), mat(C.tire, { roughness: 0.9 }));
    tire.rotation.z = Math.PI / 2; tire.castShadow = true; g.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.38, 16), mat(C.chrome, { metalness: 0.6, roughness: 0.28 }));
    rim.rotation.z = Math.PI / 2; g.add(rim);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, 0.42, 10), mat(C.bodyL, { metalness: 0.3 }));
    cap.rotation.z = Math.PI / 2; g.add(cap);
    for (let i = 0; i < 4; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.07, r * 0.9), mat(C.hub));
      spoke.rotation.x = (i * Math.PI) / 4; g.add(spoke);
    }
    return g;
  }
  const wheelR = makeWheel(0.52); wheelR.position.set(0, 0.52, -0.92); tilt.add(wheelR);
  const wheelF = makeWheel(0.52); wheelF.position.set(0, 0.52, 0.98); tilt.add(wheelF);

  /* ---------- Vespa body ---------- */
  // foot deck / running board
  add(new THREE.BoxGeometry(0.78, 0.2, 1.5), mat(C.bodyD), 0, 0.52, 0.02);
  // central spine cowl
  add(new THREE.BoxGeometry(0.66, 0.62, 1.2), mat(C.body), 0, 0.92, -0.42);
  // iconic rounded rear haunches (bulging side panels)
  [-1, 1].forEach((s) => {
    const haunch = add(new THREE.SphereGeometry(0.62, 16, 12), mat(C.body), s * 0.34, 0.95, -0.5);
    haunch.scale.set(0.85, 1.0, 1.25);
  });
  // rear top cowl cap
  add(new THREE.SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.bodyL), 0, 1.22, -0.55).scale.set(1.1, 0.8, 1.35);
  // chrome trim strip along the side
  [-1, 1].forEach((s) => add(new THREE.BoxGeometry(0.06, 0.1, 1.1), mat(C.chrome, { metalness: 0.7, roughness: 0.25 }), s * 0.62, 0.86, -0.45));
  // round Vespa side emblem
  [-1, 1].forEach((s) => add(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 14), mat(C.cream, { metalness: 0.3 }), s * 0.66, 1.0, -0.55).rotation.z = Math.PI / 2);

  // front leg shield (apron) — tall curved panel
  const shield = add(new THREE.BoxGeometry(0.82, 1.12, 0.3), mat(C.body), 0, 1.04, 0.92);
  shield.rotation.x = -0.14;
  add(new THREE.BoxGeometry(0.7, 0.5, 0.28), mat(C.bodyL), 0, 1.5, 0.86).rotation.x = -0.14; // upper shield highlight
  // front fender hugging the wheel
  add(new THREE.BoxGeometry(0.5, 0.34, 0.92), mat(C.body), 0, 0.78, 0.98);
  add(new THREE.CylinderGeometry(0.62, 0.62, 0.46, 14, 1, true), mat(C.bodyD), 0, 0.98, 0.98).rotation.z = Math.PI / 2; // fender arch

  // handlebar mast + bars + grips
  const mast = add(new THREE.BoxGeometry(0.34, 0.7, 0.34), mat(C.bodyL), 0, 1.74, 0.9);
  mast.rotation.x = -0.16;
  const bar = add(new THREE.CylinderGeometry(0.05, 0.05, 0.92, 10), mat(C.chrome, { metalness: 0.7, roughness: 0.25 }), 0, 1.96, 0.86);
  bar.rotation.z = Math.PI / 2;
  [-1, 1].forEach((s) => add(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 10), mat(0x1c1c22, { roughness: 0.85 }), s * 0.4, 1.96, 0.86).rotation.z = Math.PI / 2); // grips

  // headlight — chrome bezel + emissive lens (faces +Z)
  add(new THREE.CylinderGeometry(0.21, 0.23, 0.16, 16), mat(C.chrome, { metalness: 0.8, roughness: 0.2 }), 0, 1.78, 1.06).rotation.x = Math.PI / 2;
  const headlight = add(new THREE.SphereGeometry(0.17, 14, 12), mat(C.light, { emissive: C.light, emissiveIntensity: 1.0 }), 0, 1.78, 1.14);

  /* ---------- rider: Viking Gaucho ---------- */
  // hips on the seat
  add(new THREE.BoxGeometry(0.58, 0.46, 0.66), mat(C.leather), 0, 1.4, -0.18);
  add(new THREE.BoxGeometry(0.66, 0.22, 0.86), mat(C.seat, { roughness: 0.85 }), 0, 1.18, -0.28); // saddle
  // legs forward to the deck
  const legL = add(new THREE.CylinderGeometry(0.14, 0.13, 0.86, 8), mat(C.cream, { roughness: 0.8 }), 0.24, 1.16, 0.36); legL.rotation.x = 0.95;
  const legR = add(new THREE.CylinderGeometry(0.14, 0.13, 0.86, 8), mat(C.cream, { roughness: 0.8 }), -0.24, 1.16, 0.36); legR.rotation.x = 0.95;
  // boots
  add(new THREE.BoxGeometry(0.22, 0.2, 0.4), mat(C.boot), 0.24, 0.74, 0.66);
  add(new THREE.BoxGeometry(0.22, 0.2, 0.4), mat(C.boot), -0.24, 0.74, 0.66);

  // torso (leans forward)
  const torso = add(new THREE.BoxGeometry(0.74, 0.8, 0.5), mat(C.poncho), 0, 2.02, -0.04);
  torso.rotation.x = 0.24;
  // poncho drape (flattened cone) + woven hem
  const poncho = add(new THREE.ConeGeometry(0.72, 0.78, 8), mat(C.ponchoD), 0, 1.92, -0.06);
  poncho.scale.set(1, 1, 0.72);
  add(new THREE.TorusGeometry(0.62, 0.06, 6, 18), mat(C.weave, { metalness: 0.2 }), 0, 1.62, -0.06).rotation.x = Math.PI / 2;
  // cape flap behind (catches the wind)
  const cape = add(new THREE.BoxGeometry(0.66, 0.66, 0.12), mat(C.ponchoD), 0, 1.86, -0.42);
  cape.rotation.x = -0.4;
  // arms reaching to the bars
  const armL = add(new THREE.CylinderGeometry(0.11, 0.1, 1.0, 8), mat(C.poncho), 0.33, 2.0, 0.46); armL.rotation.x = 1.08;
  const armR = add(new THREE.CylinderGeometry(0.11, 0.1, 1.0, 8), mat(C.poncho), -0.33, 2.0, 0.46); armR.rotation.x = 1.08;
  // forearms / leather bracers + hands on grips
  [-1, 1].forEach((s) => {
    add(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8), mat(C.leather), s * 0.37, 1.98, 0.74).rotation.x = 1.25;
    add(new THREE.SphereGeometry(0.12, 10, 8), mat(C.skin), s * 0.4, 1.98, 0.9); // hand
  });

  // head + expressive face
  const head = add(new THREE.SphereGeometry(0.33, 16, 14), mat(C.skin), 0, 2.62, 0.14);
  head.scale.set(1, 1.05, 1);
  // ruddy cheeks
  [-1, 1].forEach((s) => add(new THREE.SphereGeometry(0.1, 8, 8), mat(0xe08a64, { roughness: 0.8 }), s * 0.2, 2.55, 0.4));
  // eyes (white + dark pupil)
  [-1, 1].forEach((s) => {
    add(new THREE.SphereGeometry(0.075, 10, 8), mat(0xffffff, { roughness: 0.5 }), s * 0.13, 2.68, 0.42);
    add(new THREE.SphereGeometry(0.04, 8, 6), mat(0x231a14), s * 0.13, 2.68, 0.475);
    add(new THREE.BoxGeometry(0.16, 0.05, 0.08), mat(C.beardD), s * 0.14, 2.78, 0.42); // bushy brow
  });
  // nose
  add(new THREE.SphereGeometry(0.075, 8, 6), mat(C.skinD), 0, 2.62, 0.46);

  // big braided beard
  const beard = add(new THREE.ConeGeometry(0.32, 0.6, 10), mat(C.beard), 0, 2.36, 0.3); beard.rotation.x = Math.PI;
  add(new THREE.SphereGeometry(0.26, 12, 10), mat(C.beard), 0, 2.5, 0.34).scale.set(1.15, 0.7, 0.7); // moustache/cheeks fur
  [-1, 1].forEach((s) => { // two braids
    const br = add(new THREE.CylinderGeometry(0.07, 0.05, 0.5, 7), mat(C.beardD), s * 0.22, 2.2, 0.34);
    add(new THREE.SphereGeometry(0.06, 8, 6), mat(C.weave, { metalness: 0.3 }), s * 0.22, 1.96, 0.34); // braid bead
    br.rotation.x = 0.15;
  });

  // metallic helmet dome + brow band + nose guard
  const helm = add(new THREE.SphereGeometry(0.36, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(0xbcc6d4, { metalness: 0.45, roughness: 0.4 }), 0, 2.72, 0.1);
  helm.scale.set(1, 1.05, 1.05);
  add(new THREE.TorusGeometry(0.36, 0.07, 8, 18), mat(0x8c97a6, { metalness: 0.5, roughness: 0.4 }), 0, 2.73, 0.1).rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.12, 0.34, 0.1), mat(0x8c97a6, { metalness: 0.5 }), 0, 2.6, 0.44); // nose guard
  add(new THREE.SphereGeometry(0.09, 10, 8), mat(C.cream, { metalness: 0.3 }), 0, 3.06, 0.1); // dome rivet

  // bold stylized horns — smooth tapered sweep up & out with a forward curl at the tip
  function horn(side) {
    const hg = new THREE.Group();
    const N = 16;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const x = side * (0.05 + 0.42 * t + 0.22 * t * t);   // sweep outward
      const y = 1.05 * t - 0.12 * t * t;                    // up, easing at tip
      const z = 0.34 * t * t;                               // curl forward
      const r = 0.185 * (1 - t * 0.82);                     // taper to a point
      const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 9, 7), mat(t > 0.82 ? C.hornD : C.horn));
      seg.position.set(x, y, z); seg.castShadow = true; hg.add(seg);
    }
    hg.position.set(side * 0.26, 2.82, 0.05);
    tilt.add(hg);
    return hg;
  }
  horn(1); horn(-1);

  /* ---------- headlight beam: visible cone + real spotlight ---------- */
  // translucent additive cone (the visible "light cone") — on group so squash/jump don't distort it
  const coneGrp = new THREE.Group();
  coneGrp.position.set(0, 1.74, 1.18);
  coneGrp.rotation.x = 0.14; // dip toward the road ahead
  group.add(coneGrp);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.95, 3.4, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  cone.rotation.x = -Math.PI / 2;     // axis along +Z, apex at lamp, widening forward
  cone.position.z = 1.7;
  coneGrp.add(cone);

  // real spotlight for a soft warm pool on the road
  const spot = new THREE.SpotLight(0xfff0c0, 2.2, 16, 0.55, 0.5, 1.3);
  spot.position.set(0, 1.74, 1.2);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, -0.2, 6);
  group.add(spot); group.add(spotTarget);
  spot.target = spotTarget;

  group.userData.refs = { tilt, wheelF, wheelR, headlight, spot, cone };
  return group;
};
