# Ao Làng development

## Goal and art direction
A living procedural pixel-art pond rooted in northern Vietnamese village imagery. The supplied reference boards are preserved under `docs/references/`. Keep the banyan's wide crown, aerial roots and buttress roots, a northern communal-house terracotta roof, mossy stone steps, worn brick, and raised lotus stems/flowers. Water is the focal point; preserve large open areas and legible reflections. Avoid generic fantasy oak silhouettes, modern urban skylines, photographic backdrops, oversized geometric placeholders and disconnected pixel noise.

## Stack and commands
- TypeScript, Vite, Canvas 2D. `npm install`, `npm run dev`, `npm run build`, `npm test`.
- Logical canvas is 640×400. Preserve nearest-neighbor display and integer-pixel environmental rasterization.
- `src/types.ts`: shared contracts, dimensions, settings.
- `src/scene.ts`: cached static ground/foreground, water mask, per-column rear bank, dynamic reflectable objects.
- `src/water.ts`: palette-indexed per-pixel water renderer and distance transform.
- `src/main.ts`, `src/style.css`: composition, native accessible controls, interaction, export.
- `src/runtime.ts`: pure simulation clock and pointer mapping.

## Rendering invariants
Water pixels must be one of exactly ten palette entries, fully opaque inside the mask and transparent outside. Effects mutate palette indices, not alpha overlays. Recompute shoreline distance only when mask changes. Reflections sample the live environmental object canvas, invert/compress vertically and displace integer rows. Keep back-bank reflection separate from object reflections and shoreline highlights.

Use simulation time, not wall clock, for animation. Pause must freeze pixel output. Bound ripple/rain counts; reject land/out-of-bounds interactions. Static land can have its own richer fixed colors. Palette presets currently recolor water only; do not claim whole-scene day/night relighting.

## Verification
Build and tests are required but not sufficient for visual changes. Use an isolated named `agent-browser` session, inspect real desktop/mobile screenshots, check no horizontal overflow, all six effect toggles and three palettes, rain/wind/speed, trusted pointer ripple creation, pause/resume, PNG export and fullscreen. Browser UI regression script: `agent-browser --session <your-session> eval --stdin < scripts/browser-check.js` after opening the local page. It returns 25 assertions and frame-cost metadata; it resets controls at the end. It uses synthetic keyboard events; verify a real pointer click separately. For screenshot filenames use explicit selector and absolute path: `agent-browser ... screenshot '#pond' /absolute/path.png`.

Offscreen renderer regression script: `agent-browser --session <your-session> eval --stdin < scripts/renderer-check.js`. It returns 23 assertions for actual mask clipping, palette bounds, seconds-based wind, zero-wind stability, fixed-time identity, distortion response, independent effects, bounded ripples and heavy rain. Run it against the Vite dev server because it imports TypeScript module URLs directly.

Read `docs/WATER_REFERENCE.md` for upstream access/provenance. `docs/PLAN.md` describes the starting scope. Do not claim exact SpriteCook fidelity or completion of unimplemented GPU/editor/gameplay extensions.

## Bounded density study
The user prefers one bounded visual trial and accepts retaining the existing feel if the change is not a clear win. Keep the original home route intact. The isolated `study.html` / `src/study/` path supports 320×180, 480×270, 640×360 and 960×540; default640×360 is provisional only. `vite.config.ts` builds both HTML entries. `NativePainter` rasterizes geometry directly on a shared native grid with binary alpha; never scale up an old completed scene bitmap to claim new detail. A uniform camera extends original640×400 framing by35.556world units per side for16:9; do not squash proportions. Water mirrors around transformed worldy190, runs10Hz visual steps with60Hz presentation target, and keeps ten discrete colors.

Comparison: `/study.html?compare=1` generates same-time t3.25 four1920×1080 PNGs using exact6×/4×/3×/2× scales and five close-ups. `scripts/density-check.js` verifies96 renderer invariants across grids; `scripts/density-ui-check.js` verifies30 UI/export invariants including every output pixel block. Baseline-source hashes live in `.artifacts/density/baseline-source-sha256.txt`. Review and visual decision live in `docs/PIXEL_DENSITY_AUDIT.md` and `docs/PIXEL_DENSITY_REVIEW.md`: no promotion to main app;640 is the balanced study variant,960 is not automatically a better feel.
