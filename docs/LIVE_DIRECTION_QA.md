# Independent live-direction QA

**Status: technical QA passes for the reviewed implementation, including refined canopy/root/lotus motion.** This report does not choose a grid or approve the aesthetic for the user. QA changed only its own browser regression script, report, and evidence artifacts; no runtime, UI, or asset implementation files were edited.

## Environment and evidence

- Existing Vite server was already serving `http://localhost:5173/direction.html` (`HTTP 200`); no duplicate server was started.
- Browser session: `live-art-qa-e57f26eeef18` (isolated, named).
- Executable browser regression: `scripts/live-art-check.js` — **59/59 assertions passed**, covering both 640×360 and 960×540. It checks default wind 0.6 at 0.1-second samples through 20 seconds, verifies canopy/root/lotus each change and no environment pixels outside their union change, plus maximum wind at both grids.
- Refined-motion evidence from the current implementation (actual UI PNG downloads, 1920×1080, sampled back down with nearest-neighbor to native size for visual review):
  - `.artifacts/direction/inspection/live-art-640-default-t0.png`, `live-art-640-default-t1_6.png`, and `live-art-640-max-t1_6.png`
  - `.artifacts/direction/inspection/live-art-960-default-t0.png`, `live-art-960-default-t0_1.png`, and `live-art-960-max-t0_1.png`
  - Native comparisons: `.artifacts/direction/inspection/live-art-640-default-max-wind-frames.png` (t=0, default t=1.6, max t=1.6) and `live-art-960-default-max-wind-frames.png` (t=0, default t=0.1, max t=0.1)
  - Nearest-neighbor enlarged current motion regions: `.artifacts/direction/inspection/live-art-640-motion-detail-crops.png` and `live-art-960-motion-detail-crops.png`
  - UI copy and layout screenshots: `.artifacts/direction/inspection/live-art-desktop-refined.png` and `live-art-mobile-refined.png`
- Earlier pre-wind-fix screenshots and exports are retained in the same inspection directory for historical QA context; the evidence above is the current temporal recheck.

## Verified passes

- Both new art grids load at their declared native dimensions and carry canonical-master provenance (`01-master.png`, SHA-256 `da36518a45bea8cfb4ad4f33bd69ffce546c3a012e639047648af3c22e68028a`). Independent asset integrity check passes for both grids.
- For each grid and all three palettes (`jade`, `golden`, `moon`): exactly 10 distinct water RGB colors were observed in the rendered water; every masked water pixel was opaque, and every pixel outside the binary mask transparent.
- Fixed-time water output is byte-identical. Wind 0 is byte-identical from t=0 to t=20. At default wind 0.6, 0.1-second samples from t=0 through20s changed every mask at both resolutions; first common sample where canopy, root, and lotus all differ from t=0 was t=1.6 at 640×360 and t=0.1 at 960×540. Across those scans, changed environment pixels stayed entirely inside the mask union. At maximum wind 1.5 and t=0→1, all three masks also change; zero object-plate pixels change outside them. Actual app exports at default wind and max wind were compared at common times; no non-water changes outside mask regions were found. **The root mask animates lower buttress-root pixels only; it does not cover aerial roots, and these are pixel-mask deformations, not articulated/root sprites.** Scene is visibly animated in water and reflections at both grids; distortion changes output and `distortion=0` disables reflection displacement.
- All six effects independently change renderer pixels at both grids; all three palettes are present. Wind, speed and rain controls accept and propagate the selected values. Rain-on temporal output advances; no claim is made about exact rainfall visual quality.
- Water ripple API accepts water, rejects land/out-of-bounds coordinates, and caps storage at 32. Real trusted browser mouse input created a water ripple; a trusted click on a known land-mask point created none and produced the land rejection status. A trusted water drag also created a ripple.
- Pause holds pixels at frozen simulation time; reduced-motion preference forces pause. Switching to a background tab for about 1.2 seconds did not produce a simulation-time jump on return (only ~0.038 seconds elapsed after return).
- Fullscreen entered `#art-frame` and exited with Escape. Desktop layout and 390×844 mobile layout had no horizontal overflow.
- Real Save/export button downloads were inspected: both PNGs are 1920×1080 RGB. Every 3×3 block in the 640×360 export and every 2×2 block in the 960×540 export was uniform (exact integer scaling, no interpolated block pixels).
- Original home `/` and density study `/study.html` both loaded and retained their canvases.
- `npm test`: 9 passed, 0 failed. `npm run build`: passed. `node scripts/check-direction-assets.mjs`: passed for both grids.

## Visual review and remaining scope limits

The approved-master composition reads coherently in both native grids. Same-time default-wind and max-wind exports, temporal captures, and magnified motion-region crops were inspected after the refined masks and nonlinear default-wind mapping were integrated. Shifts remain restrained/subtle, especially in the 640 default-wind overview, but the native temporal scan confirms that the eligible canopy, lower buttress roots, and some lotus pixels do move at default wind; max wind increases the movement. I saw no apparent holes, duplicated foliage, conspicuous patching, magenta leaks, or grid/mixel seams in the sampled frames. Changed environment pixels remained inside the eligibility masks; temple, planter, paving and barrier stayed unchanged. The water reflection and shoreline stay legible. This is a technical QA observation, **not** user aesthetic approval and not a choice between 640 and 960.

The refined candidate eligibility masks were regenerated from the approved master and checked with `node scripts/check-direction-assets.mjs`; proof montages are `.artifacts/direction/inspection/motion-mask-proof-640x360.png` and `motion-mask-proof-960x540.png`. Actual runtime screenshots and pixel-diff checks confirm that canopy, roots and selected lotus pixels now move while all output changes remain within those masks. No remaining engineering acceptance blocker was found in this focused motion-scope recheck.

Palette presets recolor water only. These checks are real browser checks, not physical mobile-device performance profiling. No exact SpriteCook fidelity or final art/grid preference is claimed.
