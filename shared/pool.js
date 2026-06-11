/* ============================================================
   SHARED — object pool for recycled meshes/groups
   window.makePool(scene, factory, parkY, parkZ)
   get() adds to scene on first use; release() hides + parks.
   ============================================================ */
window.makePool = function (scene, factory, parkY, parkZ) {
  const free = [];
  return {
    get() { let o = free.pop(); if (!o) { o = factory(); scene.add(o); } o.visible = true; return o; },
    release(o) { o.visible = false; o.position.set(0, parkY === undefined ? -60 : parkY, parkZ === undefined ? -100 : parkZ); free.push(o); },
  };
};
