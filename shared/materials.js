/* ============================================================
   SHARED — material helpers
   window.matHelpers(THREE) -> { mat, emis }
   mat(color, overrides)  — flat-shaded standard material
   emis(color, intensity) — self-glowing material
   ============================================================ */
window.matHelpers = function (THREE) {
  const mat = (color, o = {}) =>
    new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.85, metalness: 0.05 }, o));
  const emis = (color, i = 1) =>
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: i, flatShading: true, roughness: 0.5 });
  return { mat, emis };
};
