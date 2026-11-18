# Ao Làng polish integration QA

## Frozen reference and scope

- Frozen source: commit `30475134039429dfab2a1e692b274d92d6015e4b` (`3047513`), baseline id `direction-polish-baseline-3047513-20260320`.
- Test URL: `http://localhost:5173/direction.html`.
- Browser: named isolated `agent-browser` session `polish-qa-e57f26eeef18`.
- No commit, tag, or push. Work is limited to the art-direction route and its tests/docs/assets. `/` and `/study.html` were opened and smoke-checked.
- Canonical `original.png`, `environment.png`, and `mask.png` SHA-256 values for both grids match commit `3047513`. `node scripts/check-direction-assets.mjs` confirms exact inverse environment/water alpha and native dimensions.

## Coverage and evidence

| User proposal / risk | QA evidence | Result / limit |
|---|---|---|
| Calm reflections, legible clusters, distance fade, open pond | `scripts/direction-water-polish-check.js` (32 assertions across 640×360/960×540); integrated fixed-time palette/mask/fidelity checks; independently reviewed same-time full scenes and pond crops. | Pass. Native same-time comparisons: `.artifacts/direction/polish/qa/640x360-before-after-same-time.png`, `960x540-before-after-same-time.png`; water crops: `640x360-water-detail-before-after.png`, `960x540-water-detail-before-after.png`. Existing agent detail captures in `.artifacts/direction/polish/water/` are supplemental. This is a bounded visual change, not a claim that all reflected source texture is removed. |
| Anchored trunk/heavy roots/roof/shore, selected hanging-root motion and canopy response | `scripts/live-art-check.js` (73 assertions) and `scripts/polish-integration-check.js` (both grids; scans 20 seconds at 10Hz). Verified the empty heavy-root eligibility mask, zero-wind identity, selected-mask-only changes, fixed scenery, strands, and canopy/lotus response. | Pass for asserted material regions; trunk, buttresses, roof, shore and all pixels outside selected flexible masks had zero changes in the scan. Strand upper attachments and lotus pivot rows have focused unit tests. |
| Lotus attached motion without holes/ghosts | Integration regression compares actual `renderObjects()` frames at t=0 and t=3.25 and tests selected lower-junction pivot rows against upper head pixels. Actual images inspected at both native grids and `.artifacts/direction/polish/motion/lotus-640-new-t0-zoom.png` / `lotus-640-new-t3_25-zoom.png`. | Bounded pass only: 640 pivot 0/3 changes and distal 43/117 changes; 960 pivot 0/7 and distal 101/261 at t=3.25. Two pink head/bud masks move around inferred lower pivots. The source plate merges/occludes stem and leaf pixels; it is not a separately articulated stem+leaf rig, adjacent leaves remain still, and full lotus segmentation is not claimed. |
| Selective dark shore contact separate from reflections/highlights | Focused water helper tests and each of the six isolated renderer effect checks at both grids. Visual review of the above water details. | Pass within deliberately limited step/planter/lotus patches; these anchors are scene-proportion regions, not hand-segmented per-object contact masks. No continuous bright perimeter was introduced. |
| Local pixel noise cleanup without repainting approved art | Approved plate/environment/water-mask hashes compared to baseline; static source unchanged. Water helper tests cover isolated fleck rejection, connected mass retention and attenuation. `scripts/check-direction-assets.mjs` verifies masks remain native and binary. | Pass. Static art and the exact original binary water mask are unchanged; treatment is on live reflected palette indices / narrow motion eligibility masks, not a scene repaint. |

## Final automated checks

- `npm test`: **20/20** passed (including motion anchor/pivot and mask/hash tests, water-polish helpers, runtime pause/pointer tests).
- `npm run build`: passed (TypeScript and all Vite entries: `/`, `/study.html`, `/direction.html`).
- `node scripts/check-direction-assets.mjs`: passed both grids.
- `agent-browser --session polish-qa-e57f26eeef18 eval --stdin < scripts/live-art-check.js`: **73/73**.
- `... eval --stdin < scripts/polish-integration-check.js`: **59/59**. Includes six UI effect toggles, all three palettes, wind/speed/rain controls, actual lotus pivot pixels, both masks/grids, ten water colors, opacity/transparent-mask behavior and ripple limits.
- `... eval --stdin < scripts/renderer-check.js`: **23/23** (timing, fixed-time identity, effects, mask clipping, heavy rain).
- `... eval --stdin < scripts/direction-water-polish-check.js`: **32/32**.
- Home-route `scripts/browser-check.js`: **25/25** with frame-cost metadata; reset completed. `/` and `/study.html` loaded with canvases; study overflow was false. No page errors were reported in the tested direction session; console contained only Vite hot-reload connection messages. No route was replaced or promoted.

## Real browser, interaction, time, and export checks

- Named browser screenshots: `.artifacts/direction/polish/qa/direction-desktop.png`, `direction-mobile-viewport.png`, and `direction-mobile-canvas.png`. At 1440×1100 and 390×844 respectively, `document.documentElement.scrollWidth === clientWidth`; no horizontal overflow. The mobile page capture is the viewport screenshot, not Chromium's stitched full-page image.
- Trusted pointer events in the browser (mobile viewport): click at the pond accepted a ripple; click on left-bank land was rejected with the land status; a water drag accepted a ripple. Water/land/OOB acceptance is also checked offscreen in the regression scripts.
- Pause/resume: at fixed t=7.4, captured water canvas bytes before/after 400ms while paused; pixels remained byte-identical. Resuming advanced simulation time (t=7.4→7.7), then pausing again froze it.
- Hidden-tab continuity with a second study tab and direction animation running: visibility events captured time `3.2666` on hide and again on return; the hidden duration did not advance the simulation clock.
- Fullscreen: real button entered fullscreen on `#art-frame`; Escape exited it.
- PNG export used the actual app's `#export` button and browser download flow: `.artifacts/direction/polish/qa/640x360-after-w06-t3_25-export.png` and `960x540-after-w06-t3_25-export.png`. Both are 1920×1080. Per-pixel checks verified every output pixel repeats its corresponding native pixel in exact 3×3 blocks (640 grid) or 2×2 blocks (960 grid), **2,073,600 output pixels per export**.

## Image review and exact comparison recipe

All comparisons use the approved live baseline `t=3.25`, jade, wind `0.6`, distortion `1`, speed `1`, rain `0`, all six effects on, and the same native aspect/grid. Native images come directly from the live canvas at frozen simulation times; the `*-export.png` files come from the real download button. The frame set is exactly `t=0, 0.5, 1, 1.5, 2, 2.5, 3.25` for both grids, at default wind 0.6.

- Same-time native overviews: `.artifacts/direction/polish/qa/640x360-before-after-same-time.png`, `960x540-before-after-same-time.png`.
- Same-time pond/lotus details: `.artifacts/direction/polish/qa/640x360-water-detail-before-after.png`, `960x540-water-detail-before-after.png`.
- Exact ordered default-wind frames: `640x360-after-w06-t*-native.png`, `960x540-after-w06-t*-native.png` in `.artifacts/direction/polish/qa/`.
- Temporal comparisons: `640x360-motion-before-after-contact-sheet.png`, `960x540-motion-before-after-contact-sheet.png` show paired baseline/after frames at the exact timestamps above. After-only contact sheets are next to them.
- Approved baseline originals: `.artifacts/direction/polish/baseline/` (see its README for capture recipe and hashes). Water-side agent comparisons: `.artifacts/direction/polish/water/`. Motion agent captures: `.artifacts/direction/polish/motion/`.

Reviewed at native 640 and 960, at overview scale, and in exact time pairs. Reflection masses near the rear plane remain recognizable; middle/near pond has fewer detached high-contrast reflection fragments and more quiet open water; the approved roof, banyan silhouette, roots, steps, lotus/shore and composition remain legible. The paired frames show small bounded motion, not dramatic wind animation. This visual review describes the observed result, not a user-approved aesthetic verdict.

## Caveats and decision

- Lotus stems are not independently rigged because their visible pixels merge into surrounding leaves/shore. Only two flower/bud heads tilt around inferred fixed lower junctions. This is the cleanest bounded correction from the existing composite plate without repainting or inventing art.
- Water-side step/planter/lotus contact locations remain local normalized anchors, not semantically segmented object masks.
- `agent-browser a11y --selector '.direction-shell'` reported one serious axe color-contrast rule affecting 26 existing direction UI nodes. This pass changed only the motion description copy as requested; it did not broaden into a UI palette redesign. Review contrast separately if the direction page is promoted.
- No physical mobile-device performance, GPU port, full authored lotus rig, or aesthetic user sign-off is claimed.
- The preview remains `http://localhost:5173/direction.html`. Both grids remain available; 640×360 is still provisional and 960×540 is only a comparison, not an automatic upgrade.
