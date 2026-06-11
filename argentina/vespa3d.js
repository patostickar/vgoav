/* ============================================================
   ARGENTINA — Viking Gaucho on a green Vespa (same character as Warp Room)
   Uses the detailed smooth-shaded model from game3d, plus the
   headlight spotlight + visible beam cone from the runner scene.
   window.buildVespaRun(THREE) ->
     { group, userData.refs:{ tilt, wheelF, wheelR, headlight, spot, cone } }
   ============================================================ */
window.buildVespaRun = function (THREE) {
  const C = {
    green: 0x2bb24c, greenD: 0x1c8a3a, greenL: 0x49c866,
    chrome: 0xdfe5ea, steel: 0x9aa4b0, dark: 0x2a2a30,
    tire: 0x232227, hub: 0xccd0d6,
    poncho: 0xc8542f, ponchoD: 0x9c3c20, ponchoBand: 0xf0e3c2, ponchoStripe: 0x6a2f18,
    skin: 0xe3ab7d, skinD: 0xcf976a, beard: 0xe4ad33, beardD: 0xc89020,
    helm: 0xaeb6c0, helmD: 0x6f7884, horn: 0xf2e6c8, hornD: 0xddcca4,
    seat: 0x4a2f17, boot: 0x35200f, light: 0xfff2a8,
  };
  const smat = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: false, roughness: 0.6, metalness: 0.08 }, o));
  const fmat = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.7, metalness: 0.06 }, o));

  const group = new THREE.Group();
  const tilt = new THREE.Group();
  group.add(tilt);

  const add = (geo, m, x, y, z, parent = tilt) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  /* ============ wheels ============ */
  function makeWheel() {
    const g = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.14, 12, 24), smat(C.tire, { roughness: 0.95 }));
    tire.rotation.y = Math.PI / 2; tire.castShadow = true; g.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 18), smat(C.hub, { metalness: 0.5, roughness: 0.3 }));
    rim.rotation.z = Math.PI / 2; g.add(rim);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), smat(C.chrome, { metalness: 0.7, roughness: 0.2 }));
    cap.scale.set(0.6, 1, 1); cap.rotation.z = Math.PI / 2; g.add(cap);
    return g;
  }
  const wheelR = makeWheel(); wheelR.position.set(0, 0.5, -0.92); tilt.add(wheelR);
  const wheelF = makeWheel(); wheelF.position.set(0, 0.5, 0.96); tilt.add(wheelF);

  /* ============ vespa body ============ */
  const bodyProfile = [
    new THREE.Vector2(0.02, 0.0), new THREE.Vector2(0.5, 0.04), new THREE.Vector2(0.62, 0.34),
    new THREE.Vector2(0.6, 0.66), new THREE.Vector2(0.44, 0.92), new THREE.Vector2(0.16, 1.04),
    new THREE.Vector2(0.02, 1.06),
  ];
  const rearBody = add(new THREE.LatheGeometry(bodyProfile, 22), smat(C.green), 0, 0.5, -0.5);
  rearBody.scale.set(1.0, 0.96, 1.18);
  [-1, 1].forEach((s) => {
    const cowl = add(new THREE.SphereGeometry(0.46, 18, 14), smat(C.greenD), s * 0.34, 0.74, -0.5);
    cowl.scale.set(0.62, 0.9, 1.12);
  });
  add(new THREE.SphereGeometry(0.3, 14, 12), smat(C.greenD), 0.28, 0.42, -0.62).scale.set(1, 0.8, 1.2);
  const deck = add(new THREE.BoxGeometry(0.74, 0.14, 1.46), smat(C.greenD), 0, 0.5, 0.05);
  deck.geometry.translate(0, 0, 0);
  add(new THREE.BoxGeometry(0.8, 0.06, 0.66), smat(C.dark, { roughness: 0.9 }), 0, 0.58, 0.18);
  const shieldProfile = [
    new THREE.Vector2(0.02, 0.0), new THREE.Vector2(0.34, 0.02), new THREE.Vector2(0.42, 0.3),
    new THREE.Vector2(0.4, 0.62), new THREE.Vector2(0.3, 0.82), new THREE.Vector2(0.02, 0.9),
  ];
  const shield = add(new THREE.LatheGeometry(shieldProfile, 20, 0, Math.PI), smat(C.green), 0, 0.66, 0.92);
  shield.scale.set(1.05, 1.18, 0.5); shield.rotation.y = Math.PI / 2; shield.rotation.z = -0.06;
  add(new THREE.BoxGeometry(0.05, 0.86, 0.05), smat(C.chrome, { metalness: 0.7, roughness: 0.2 }), 0, 1.12, 1.04);
  const fender = add(new THREE.TorusGeometry(0.5, 0.11, 10, 22, Math.PI * 0.95), smat(C.green), 0, 0.5, 0.96);
  fender.rotation.y = Math.PI / 2; fender.rotation.z = Math.PI * 0.52;
  add(new THREE.SphereGeometry(0.1, 10, 8), smat(C.chrome, { metalness: 0.6 }), 0, 0.86, 1.12);
  const seat = add(new THREE.SphereGeometry(0.34, 16, 12), smat(C.seat, { roughness: 0.85, metalness: 0.05 }), 0, 1.12, -0.34);
  seat.scale.set(0.86, 0.5, 1.25);
  add(new THREE.TorusGeometry(0.16, 0.05, 8, 14), smat(C.seat), 0, 1.16, -0.66).rotation.x = Math.PI / 2;
  const stem = add(new THREE.CylinderGeometry(0.07, 0.09, 0.74, 10), smat(C.steel, { metalness: 0.6, roughness: 0.3 }), 0, 1.36, 1.0);
  stem.rotation.x = -0.16;
  const headset = add(new THREE.SphereGeometry(0.17, 14, 10), smat(C.green), 0, 1.5, 1.04); headset.scale.set(1.1, 0.7, 1);
  const bar = add(new THREE.CylinderGeometry(0.045, 0.045, 0.86, 10), smat(C.chrome, { metalness: 0.7, roughness: 0.2 }), 0, 1.62, 0.94);
  bar.rotation.z = Math.PI / 2;
  [-1, 1].forEach((s) => add(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 10), smat(C.dark, { roughness: 0.9 }), s * 0.38, 1.62, 0.94).rotation.z = Math.PI / 2);
  const mstem = add(new THREE.CylinderGeometry(0.022, 0.022, 0.26, 6), smat(C.chrome, { metalness: 0.7 }), 0.4, 1.78, 0.92); mstem.rotation.z = 0.2;
  add(new THREE.CircleGeometry(0.09, 16), smat(C.chrome, { metalness: 0.8, roughness: 0.15, side: THREE.DoubleSide }), 0.46, 1.9, 0.9).rotation.y = -0.3;
  const headlight = add(new THREE.SphereGeometry(0.15, 14, 12), smat(C.light, { emissive: C.light, emissiveIntensity: 1.0, metalness: 0.2, roughness: 0.3 }), 0, 1.42, 1.12);
  add(new THREE.TorusGeometry(0.15, 0.03, 8, 16), smat(C.chrome, { metalness: 0.7 }), 0, 1.42, 1.13);
  add(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 16), smat(C.greenD), 0, 0.92, -1.08).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 12), smat(C.tire), 0, 0.92, -1.1).rotation.x = Math.PI / 2;

  /* ============ rider: the Viking Gaucho ============ */
  const rider = new THREE.Group(); tilt.add(rider);
  const radd = (geo, m, x, y, z) => add(geo, m, x, y, z, rider);

  radd(new THREE.SphereGeometry(0.34, 16, 12), smat(C.boot), 0, 1.4, -0.16).scale.set(1.1, 0.8, 1.0);
  [-1, 1].forEach((s) => {
    const thigh = radd(new THREE.CylinderGeometry(0.15, 0.13, 0.62, 10), smat(C.boot), s * 0.22, 1.2, 0.16); thigh.rotation.x = 0.95;
    const shin = radd(new THREE.CylinderGeometry(0.12, 0.1, 0.56, 10), smat(C.boot), s * 0.24, 0.92, 0.5); shin.rotation.x = 0.5;
    radd(new THREE.SphereGeometry(0.13, 10, 8), smat(C.boot), s * 0.24, 1.05, 0.42);
    const boot = radd(new THREE.BoxGeometry(0.2, 0.18, 0.4), fmat(C.boot), s * 0.24, 0.74, 0.66); boot.geometry.translate(0, 0, 0.04);
    radd(new THREE.BoxGeometry(0.22, 0.08, 0.18), fmat(C.dark), s * 0.24, 0.66, 0.56);
  });

  radd(new THREE.CylinderGeometry(0.26, 0.3, 0.7, 12), smat(C.ponchoD), 0, 1.92, -0.04).rotation.x = 0.18;

  const poncho1 = radd(new THREE.ConeGeometry(0.76, 0.92, 12), fmat(C.poncho), 0, 1.84, -0.04);
  poncho1.scale.set(1.0, 1.0, 0.82); poncho1.rotation.x = 0.05;
  const poncho2 = radd(new THREE.ConeGeometry(0.82, 0.5, 12), fmat(C.ponchoD), 0, 1.55, -0.04);
  poncho2.scale.set(1.0, 1.0, 0.82);
  add(new THREE.TorusGeometry(0.6, 0.05, 8, 16), fmat(C.ponchoBand), 0, 1.62, -0.04, rider).scale.set(1.0, 1.0, 0.82);
  add(new THREE.TorusGeometry(0.66, 0.035, 8, 16), fmat(C.ponchoStripe), 0, 1.55, -0.04, rider).scale.set(1.0, 1.0, 0.82);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const fr = radd(new THREE.ConeGeometry(0.03, 0.16, 5), fmat(C.ponchoBand), Math.sin(a) * 0.78, 1.34, -0.04 + Math.cos(a) * 0.62);
    fr.rotation.x = Math.PI;
  }
  radd(new THREE.SphereGeometry(0.42, 16, 12), fmat(C.poncho), 0, 2.1, -0.02).scale.set(1.0, 0.62, 0.9);

  [-1, 1].forEach((s) => {
    const upper = radd(new THREE.CylinderGeometry(0.12, 0.1, 0.6, 10), fmat(C.poncho), s * 0.36, 2.0, 0.18); upper.rotation.x = 0.8; upper.rotation.z = s * 0.18;
    const fore = radd(new THREE.CylinderGeometry(0.09, 0.08, 0.62, 10), smat(C.skin), s * 0.42, 1.74, 0.62); fore.rotation.x = 1.15; fore.rotation.z = s * 0.1;
    radd(new THREE.SphereGeometry(0.1, 10, 8), smat(C.skinD), s * 0.4, 1.62, 0.92);
  });

  radd(new THREE.CylinderGeometry(0.13, 0.16, 0.2, 10), smat(C.skin), 0, 2.4, 0.06);
  const head = radd(new THREE.SphereGeometry(0.32, 18, 14), smat(C.skin), 0, 2.62, 0.1);
  head.scale.set(0.96, 1.04, 1.0);
  radd(new THREE.ConeGeometry(0.07, 0.16, 8), smat(C.skinD), 0, 2.6, 0.42).rotation.x = Math.PI / 2;
  [-1, 1].forEach((s) => radd(new THREE.SphereGeometry(0.035, 8, 8), smat(C.dark), s * 0.12, 2.68, 0.34));

  const beard = radd(new THREE.ConeGeometry(0.3, 0.46, 12), fmat(C.beard), 0, 2.42, 0.24); beard.rotation.x = Math.PI - 0.12; beard.scale.set(1.0, 1.0, 0.85);
  radd(new THREE.SphereGeometry(0.26, 14, 12), fmat(C.beard), 0, 2.5, 0.18).scale.set(1.05, 0.9, 0.9);
  [-1, 1].forEach((s) => { const fork = radd(new THREE.ConeGeometry(0.08, 0.26, 7), fmat(C.beardD), s * 0.1, 2.18, 0.28); fork.rotation.x = Math.PI - 0.1; });
  [-1, 1].forEach((s) => { const mus = radd(new THREE.CylinderGeometry(0.05, 0.03, 0.2, 7), fmat(C.beard), s * 0.12, 2.55, 0.34); mus.rotation.z = s * 0.9; mus.rotation.x = 0.3; });

  const helm = radd(new THREE.SphereGeometry(0.35, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), smat(C.helm, { metalness: 0.55, roughness: 0.35 }), 0, 2.74, 0.08);
  helm.scale.set(1.0, 1.05, 1.0);
  add(new THREE.TorusGeometry(0.345, 0.06, 10, 20), smat(C.helmD, { metalness: 0.55, roughness: 0.35 }), 0, 2.76, 0.08, rider).rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; radd(new THREE.SphereGeometry(0.028, 8, 8), smat(C.chrome, { metalness: 0.7 }), Math.sin(a) * 0.345, 2.76, 0.08 + Math.cos(a) * 0.345); }
  add(new THREE.BoxGeometry(0.1, 0.34, 0.07), smat(C.helmD, { metalness: 0.5 }), 0, 2.66, 0.4, rider).rotation.x = -0.12;
  [-1, 1].forEach((s) => {
    const hg = new THREE.Group();
    hg.position.set(s * 0.26, 2.82, 0.06);
    hg.rotation.z = -s * 0.45; hg.rotation.x = -0.1;
    rider.add(hg);
    const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.3, 10), smat(C.horn));
    seg1.position.y = 0.14; seg1.castShadow = true; hg.add(seg1);
    const k = new THREE.Group(); k.position.y = 0.28; k.rotation.z = -s * 0.6; k.rotation.x = -0.28; hg.add(k);
    const seg2 = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.42, 10), smat(C.hornD));
    seg2.position.y = 0.21; seg2.castShadow = true; k.add(seg2);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 14), smat(C.hornD, { metalness: 0.4 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; hg.add(ring);
  });

  /* ============ headlight beam: visible cone + real spotlight ============ */
  const coneGrp = new THREE.Group();
  coneGrp.position.set(0, 1.42, 1.18);
  coneGrp.rotation.x = 0.14;
  group.add(coneGrp);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.95, 3.4, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  cone.rotation.x = -Math.PI / 2;
  cone.position.z = 1.7;
  coneGrp.add(cone);

  const spot = new THREE.SpotLight(0xfff0c0, 2.2, 16, 0.55, 0.5, 1.3);
  spot.position.set(0, 1.42, 1.2);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, -0.2, 6);
  group.add(spot); group.add(spotTarget);
  spot.target = spotTarget;

  group.userData.refs = { tilt, wheelF, wheelR, headlight, spot, cone, rider };
  return group;
};
