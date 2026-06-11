/* ============================================================
   WARP ROOM — Low-poly Viking Gaucho on a green Vespa
   Built from THREE primitives. Faces +Z. Returns refs for anim.
   window.buildVespa(THREE) -> { group, tilt, wheelF, wheelR, headlight }
   ============================================================ */
window.buildVespa = function (THREE) {
  const C = {
    green: 0x27b34a, greenD: 0x1b8838, chrome: 0xd7dde3, tire: 0x2a2a30,
    hub: 0xc9ccd2, poncho: 0xc8542f, ponchoD: 0x9c3c20, skin: 0xe7b483,
    beard: 0xe0a92e, steel: 0x9aa4b0, horn: 0xf2e6c8, seat: 0x5b3a1f,
    light: 0xfff2a8,
  };
  const mat = (color, o = {}) =>
    new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.65, metalness: 0.08 }, o));

  const group = new THREE.Group();
  const tilt = new THREE.Group(); // lean / pitch / squash live here
  group.add(tilt);

  const add = (geo, m, x, y, z, parent = tilt) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  /* ---- wheels (spin around local X) ---- */
  function makeWheel() {
    const g = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.32, 16), mat(C.tire, { roughness: 0.9 }));
    tire.rotation.z = Math.PI / 2; tire.castShadow = true;
    g.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.36, 12), mat(C.hub, { metalness: 0.5, roughness: 0.3 }));
    hub.rotation.z = Math.PI / 2; g.add(hub);
    for (let i = 0; i < 3; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.5), mat(C.hub));
      spoke.rotation.x = (i * Math.PI) / 3; g.add(spoke);
    }
    return g;
  }
  const wheelR = makeWheel(); wheelR.position.set(0, 0.5, -0.86); tilt.add(wheelR);
  const wheelF = makeWheel(); wheelF.position.set(0, 0.5, 0.92); tilt.add(wheelF);

  /* ---- vespa body (green) ---- */
  add(new THREE.BoxGeometry(0.92, 0.86, 1.06), mat(C.green), 0, 0.86, -0.5);      // rear cowl
  add(new THREE.CylinderGeometry(0.5, 0.52, 1.04, 14), mat(C.greenD), 0, 0.88, -0.5).rotation.z = Math.PI / 2;
  add(new THREE.BoxGeometry(0.8, 0.24, 1.5), mat(C.greenD), 0, 0.56, 0.05);        // floor deck
  const shield = add(new THREE.BoxGeometry(0.86, 1.04, 0.34), mat(C.green), 0, 1.0, 0.92); // front leg shield
  shield.rotation.x = -0.12;
  add(new THREE.BoxGeometry(0.9, 0.34, 0.7), mat(C.green), 0, 0.62, 1.0);          // front fender top
  // name plate
  add(new THREE.BoxGeometry(0.5, 0.16, 0.04), mat(0xeafff0, { metalness: 0.3 }), 0, 0.95, -1.04);
  // seat
  add(new THREE.BoxGeometry(0.66, 0.2, 0.9), mat(C.seat, { roughness: 0.85 }), 0, 1.2, -0.32);
  // handlebar
  const stem = add(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8), mat(C.chrome, { metalness: 0.6, roughness: 0.3 }), 0, 1.55, 0.98);
  stem.rotation.x = -0.2;
  const bar = add(new THREE.CylinderGeometry(0.05, 0.05, 0.84, 8), mat(C.chrome, { metalness: 0.6, roughness: 0.3 }), 0, 1.78, 0.9);
  bar.rotation.z = Math.PI / 2;
  // headlight (emissive)
  const headlight = add(new THREE.SphereGeometry(0.16, 12, 10), mat(C.light, { emissive: C.light, emissiveIntensity: 0.9 }), 0, 1.3, 1.12);

  /* ---- rider: viking gaucho ---- */
  add(new THREE.BoxGeometry(0.6, 0.5, 0.7), mat(C.seat), 0, 1.45, -0.2);            // hips
  // legs forward to deck
  const legL = add(new THREE.CylinderGeometry(0.13, 0.13, 0.8, 8), mat(C.seat), 0.22, 1.2, 0.35); legL.rotation.x = 0.9;
  const legR = add(new THREE.CylinderGeometry(0.13, 0.13, 0.8, 8), mat(C.seat), -0.22, 1.2, 0.35); legR.rotation.x = 0.9;
  // boots
  add(new THREE.BoxGeometry(0.2, 0.18, 0.34), mat(0x3a2410), 0.22, 0.78, 0.62);
  add(new THREE.BoxGeometry(0.2, 0.18, 0.34), mat(0x3a2410), -0.22, 0.78, 0.62);
  // torso (lean forward)
  const torso = add(new THREE.BoxGeometry(0.72, 0.78, 0.5), mat(C.poncho), 0, 2.0, -0.02);
  torso.rotation.x = 0.22;
  // poncho drape (flattened cone)
  const poncho = add(new THREE.ConeGeometry(0.66, 0.7, 8), mat(C.ponchoD), 0, 1.92, -0.06);
  poncho.scale.set(1, 1, 0.7);
  // cape flap behind
  const cape = add(new THREE.BoxGeometry(0.62, 0.6, 0.12), mat(C.ponchoD), 0, 1.85, -0.4);
  cape.rotation.x = -0.35;
  // arms to handlebar
  const armL = add(new THREE.CylinderGeometry(0.1, 0.1, 0.95, 8), mat(C.poncho), 0.3, 2.0, 0.45); armL.rotation.x = 1.05;
  const armR = add(new THREE.CylinderGeometry(0.1, 0.1, 0.95, 8), mat(C.poncho), -0.3, 2.0, 0.45); armR.rotation.x = 1.05;
  // head
  add(new THREE.SphereGeometry(0.32, 14, 12), mat(C.skin), 0, 2.62, 0.12);
  // beard (cone down)
  const beard = add(new THREE.ConeGeometry(0.3, 0.5, 10), mat(C.beard), 0, 2.42, 0.26); beard.rotation.x = Math.PI;
  // helmet dome
  const helm = add(new THREE.SphereGeometry(0.34, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.steel, { metalness: 0.5, roughness: 0.4 }), 0, 2.7, 0.1);
  add(new THREE.TorusGeometry(0.33, 0.06, 8, 16), mat(0x6f7884, { metalness: 0.5 }), 0, 2.72, 0.1).rotation.x = Math.PI / 2;
  // horns
  const hornL = add(new THREE.ConeGeometry(0.1, 0.5, 8), mat(C.horn), 0.34, 2.95, 0.08); hornL.rotation.z = -0.7; hornL.rotation.x = -0.2;
  const hornR = add(new THREE.ConeGeometry(0.1, 0.5, 8), mat(C.horn), -0.34, 2.95, 0.08); hornR.rotation.z = 0.7; hornR.rotation.x = -0.2;

  group.userData.refs = { tilt, wheelF, wheelR, headlight };
  return group;
};
