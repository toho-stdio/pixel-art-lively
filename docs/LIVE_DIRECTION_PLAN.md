# Approved-art live integration

User approved the generated art. Goal: a separate visible `/direction.html` with that composition, procedural masked water/reflections/click ripples, gentle localized canopy/root/lotus wind, pause, native-resolution comparison and integer PNG export. Original home and study remain unchanged. No more image generation.

Canonical appearance is the approved `01-master.png`; isolated generated sprites changed scale, so do not blindly paste them and change the art. Prefer deriving binary environment/motion masks on the canonical master, using isolated layers as segmentation guides only. Extract pond from canonical teal water with bounded color/topology checks and compare it visually with the terrain mask. Normalize newly generated high-resolution art separately at640×360and960×540; neither is an upscale of the old demo. These are trial grids, not a final user resolution decision.

Files: rewrite preliminary scripts/prepare-direction-assets.mjs; replace src/direction/scene.ts; tune src/direction/water.ts; add direction.html, src/direction/main.ts, style.css; add Vite entry and focused asset/runtime browser checks. Output runtime binaries under public/art-direction/. Keep original source PNGs untouched.

Risks: mask leaks onto stone/lotus, layering duplicates or distorted proportions, reflection plane mismatch, antialiasing/mixels, pause/hidden-tab time jumps, false wind from moving buildings/ground. Check before/after real frames; all water colors remain indexed and clip to the exact mask. Default subtle motion, not whole-scene wobble.

Verify: asset alpha/mask/palette integrity, npm test/build; browser fixed-frame identity, water/time/wind differences, zero-wind stability, effect toggles, trusted water/land clicks, bounded ripples, pause/resume, grid switch, integer1920×1080PNG, desktop/mobile/no overflow and actual screenshots. Passing tests does not establish aesthetic quality; user judges the live candidate.
