# Ao Làng water polish

**Scope:** live water renderer for `/direction.html`, across the existing 640×360 and 960×540 native grids. This is a bounded renderer treatment, not a grid selection, scene repaint, or change to `/` or `/study.html`.

## What changed

- Live reflection sampling still uses the actual `renderObjects(time, wind)` canvas passed into the existing `WaterRenderer.render(time, settings, objects)` contract. It now classifies a 3×3 source neighborhood instead of promoting every lone alpha pixel into a reflection. Sparse source noise is rejected more aggressively farther from the reflection plane; connected roof, trunk and foliage marks remain eligible.
- Reflected values recede toward the middle-water index as distance increases. The operation changes palette indices only: the renderer retains the exact ten RGB entries per selected palette, with alpha 255 inside the authoritative mask and alpha 0 outside it.
- Back-bank reflections are broken into restrained grouped marks and use mid-ramp tones rather than painting a near-continuous bright shoreline stripe.
- The shoreline toggle now applies sparse, dark contact marks along limited rear step/planter spans and small local lotus patches. Very sparse surface glints remain a separate, dim treatment; there is no continuous bright perimeter. Ripples remain a separate, higher-salience particle effect.
- No source/environment artwork, water-mask pixels, land palette, simulation clock, shared renderer, or study renderer was changed. The six effect toggles and all three water-only palettes retain their existing contracts.

## Verification

- Final integrated `npm test`: **20/20 passed**, including four `tests/direction-water-polish.test.ts` tests for isolated-fleck rejection, coherent cluster acceptance, tone attenuation, and local contact bounds, plus motion/runtime tests.
- Final integrated `npm run build`: passed.
- `scripts/direction-water-polish-check.js`, run in isolated named browser session `direction-water-polish-20260320` at `http://localhost:5173/direction.html`: **32/32 passed**. Both grids were checked for all three palettes, exact mask alpha, byte-stable fixed time, distortion response, independent `depth`, `sky`, `reflections`, `shoreline`, `backBank`, and `particles` effects, water-vs-land ripple acceptance, and the 32-ripple cap.
- Final `scripts/live-art-check.js` run passed **73/73** for both grids, including revised motion semantics: the legacy heavy-root mask is intentionally empty; canopy, lotus-head and aerial-strand masks are flexible; structural and unselected scenery remain stationary. `scripts/polish-integration-check.js` passed **59/59**, including fixed lotus-junction rows and moving distal flower-head pixels. Renderer- and water-focused browser checks passed **23/23** and **32/32** respectively.

## Visual evidence

The final integrated same-time/temporal captures after the lotus-anchor correction are in `.artifacts/direction/polish/qa/` and indexed in `docs/POLISH_QA.md`; the `water/` files below are the focused water-side agent captures. Baseline evidence and exact t=3.25 capture settings/recipe are in `.artifacts/direction/polish/baseline/README.md`. This implementation's captures use the same wind 0.6, default jade palette/effect settings, simulation-time freezes, actual native layer canvas, and exact 3×/2× nearest-neighbor 1080p exports. They were made in the named session above.

- Same-time before/after overviews: `.artifacts/direction/polish/water/640x360-before-after-overview.png`, `.artifacts/direction/polish/water/960x540-before-after-overview.png`; pond-only detail comparisons: `640x360-water-detail-before-after.png` and `960x540-water-detail-before-after.png`.
- Current native t=3.25 frames: `.artifacts/direction/polish/water/640x360-after-w06-t3_25-native.png`, `.artifacts/direction/polish/water/960x540-after-w06-t3_25-native.png` (matching 1080p files are alongside them).
- Seven ordered after frames at t=0, 0.5, 1, 1.5, 2, 2.5 and 3.25 seconds for both grids: filenames `*-after-w06-t*-native.png`; compact overviews `.artifacts/direction/polish/water/640x360-after-animation-contact-sheet.png` and `960x540-after-animation-contact-sheet.png`.
- Zero-wind references: `640x360-after-w00-t3_25-native.png` and `960x540-after-w00-t3_25-native.png`.
- Real full-page browser capture: `.artifacts/direction/polish/water/browser-desktop.png`.

The visual review shows materially quieter middle/foreground water and fewer detached, high-contrast mirror flecks at both grids; the temple roof and broad tree/root masses remain legible near their reflection plane. Native views were reviewed rather than inferring fidelity from pixel counts. The 960 grid preserves sharper source detail but is not treated as automatically preferable.

## Caveat

Contact locations are currently small scene-proportion regions (step/planter shore spans and two lotus-adjacent patches), not hand-segmented per-object contact masks. The renderer deliberately leaves static art untouched. If final integrated inspection finds a lotus patch misses a true stem/leaf base, refine only those local normalized anchors; do not widen into a global shoreline outline or smooth the canopy.
