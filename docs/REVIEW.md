# Independent implementation review

**Scope:** Read-only review of `docs/PLAN.md`, `src/types.ts`, `src/main.ts`, `src/runtime.ts`, `src/scene.ts`, and `src/water.ts`. No implementation files changed. Browser review used the already-running `http://localhost:5173/` server; no server was started.

## Verification

- `npm run build` — passed (`tsc --noEmit` and Vite production build).
- `npm test` — passed, 6/6 tests.
- Browser: desktop at 1440×1100 and mobile at 390×844. Captured `/tmp/ao-review-full.png`, `/tmp/ao-review-desktop.png`, and `/tmp/ao-mobile-viewport.png` (mobile full-page capture: `/tmp/ao-review-mobile.png`).
- Browser interactions: palette changed to `golden` and `moon`; pause button changed state to paused (also separately resumed); synthetic canvas pointer-down over the pond was accepted (`rippleCount: 1`); rain slider accepted maximum (`rain: 1`). Independently triggered Save PNG via agent-browser download; `/tmp/ao-export/ao-lang-export.png` is a valid PNG, 1920×1200, 175,395 bytes (`file` output: 8-bit/color RGBA, non-interlaced).
- `window.__AO_LANG__` reported a live render cost around 7.8–8.2 ms in the desktop browser run; this is a single local observation, not a benchmark. No page errors were reported; console contained Vite connection messages only.
- Mobile `documentElement.scrollWidth` matched viewport width (390 px), so no horizontal overflow was observed. Full-page mobile screenshot is a page capture, not evidence of duplicated DOM: DOM contained one header, one main, and one pond canvas.

## Findings

### Resolved — Banyan wind phase uses seconds-scale simulation time

The original review reported that `sin(time * .0013)` effectively froze canopy sway. The current `src/scene.ts` uses `Math.sin(time * 1.3)`, consistent with `src/runtime.ts` advancing simulation time in seconds. I independently imported `createScene()` in the running browser and compared object-canvas RGBA pixels at `t=0` and `t=1`: with wind `1`, **6,643 pixels changed**; with wind `0`, **0 pixels changed** (zero-wind invariant). This confirms both animated response and the zero-wind invariant. No further fix requested.

### Verified — Reflection uses a fixed horizontal mirror plane

`src/water.ts` sets `REFLECTION_PLANE = 190`; projected source rows are computed from `mirrorRow = y - REFLECTION_PLANE` and `rawSy = REFLECTION_PLANE - mirrorRow / REFLECTION_SQUASH`. The vertical reflection anchor is independent of the per-column `bankY`, so the shoreline clips the reflection but does not create a bank-following/V-shaped mirror plane. Desktop capture `/tmp/ao-review-postfix.png` shows the reflected tree and roof beneath the shoreline.

### Final-state note

The main integrator's final evidence is recorded in `docs/VERIFICATION.md`: renderer checks 23/23, browser checks 25/25, and `.artifacts/ao-lang-export.png` verified at 1920×1200. The final water/art refinements listed there remove interruption stripes, restore full-pixel sampling and the 0–6 distortion range, add clipped drifting leaves, and constrain roof tiles to the roof silhouette. These are integrator-reported checks; this independent review did not rerun the final full suites. The original wind P1 is resolved, with the independent pixel-buffer evidence above; no implementation issue is pending from this review.

### Visual/performance note — rendering cost deserves mobile profiling

The canvas is visually coherent and the Vietnamese motifs (banyan, red-tiled communal house, steps, lotus) are recognizable in the desktop capture. The water renderer performs a full 640×400 pixel loop, re-reads the object canvas for reflections, and regenerates moving objects at up to 30 fps. One desktop sample measured about 8 ms per frame; that leaves limited headroom on slower mobile hardware, but this review did not measure a mobile device/frame budget. Profile on representative hardware before making a performance claim or optimizing.

## Not verified

- Performance on physical/low-end mobile hardware.
- Exhaustive independent verification of every effect toggle and rain behavior over time; the integrator/other agent reports broader effect checks separately.
- Visual comparison against all supplied source photographs or SpriteCook output at matched scale. The screenshot is captured evidence, not a fidelity certification.
