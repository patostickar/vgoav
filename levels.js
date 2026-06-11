/* ============================================================
   LEVEL REGISTRY — the ONE file to touch when adding a world.

   Each entry drives everything:
   - the Warp Room portal + pressure pad (name, mode, colors, angle)
   - the unlock chain (unlockedBy: id | null | "ALL" for the boss)
   - the playable scene (create: factory, or null = simulated clear)

   To add a world: write worlds/<id>/world.js (a pack for
   shared/runner.js, or any custom scene factory), add a <script>
   tag in index.html, and fill in `create` below. Done.
   ============================================================ */
window.LEVELS = [
  {
    id: "argentina", name: "Argentina", mode: "Endless Pampas Run",
    color: 0xf2b705, glow: 0xffd24a, accent: 0xc75b39,
    angle: Math.PI * 0.25, boss: false, unlockedBy: null,
    create: (THREE, env) => window.createRunner(THREE, env, window.ARGENTINA_PACK),
  },
  {
    id: "rome", name: "Rome", mode: "City Traffic Dash",
    color: 0xe4d2a4, glow: 0xff5a3c, accent: 0xb3261e,
    angle: Math.PI * 1.75, boss: false, unlockedBy: "argentina",
    create: null, // no scene yet — warping simulates a clear
  },
  {
    id: "denmark", name: "Denmark", mode: "Viking Fjord Hop",
    color: 0x2e9fd6, glow: 0x00dcff, accent: 0x2e6fb0,
    angle: Math.PI * 0.75, boss: false, unlockedBy: "rome",
    create: null, // no scene yet — warping simulates a clear
  },
  {
    id: "sardegna", name: "Sardegna", mode: "BOSS · The Nuragic Colossus",
    color: 0xe0331f, glow: 0xf68d2e, accent: 0x8a8275,
    angle: Math.PI * 1.25, boss: true, unlockedBy: "ALL",
    create: null,
  },
];
