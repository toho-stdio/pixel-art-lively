# Direction motion polish — material-aware pass

This is a bounded runtime pass for `/direction.html` only. It does not alter the approved static image, environment art, water mask, or shared legacy/study renderers.

## Implemented

- `roots-motion-mask.png` now intentionally contains zero selected pixels. Trunk and heavy buttress roots stay anchored; the former broad moving-root ROI is removed.
- New `aerial-root-strands-motion-mask.png` is derived from four narrow hand-bounded locations on the canonical master. At the 640 grid it contains 161 selected pixels (230 at 960). Motion is horizontal, integer-rasterized, slow, and weighted from a fixed upper attachment toward the distal ends. The selected strands are a small subset, not a complete segmentation of every visible aerial root.
- Canopy eligibility is narrowed to three source-coordinate upper-leaf-cluster polygons. A shared slow wind field with a small phase offset moves those selected foliage pixels; it excludes the trunk/buttress region.
- `src/direction/motion.ts` holds the pure deterministic integer source-sampling rule: zero wind is unchanged, heavy roots cannot enter the motion pass, strand attachment weight is zero at its anchor, and motion is bounded by the wind clamp. Time is sampled through the existing 10Hz `renderObjects` cache.
- Lotus rig follow-up: the one clear left pond-side cluster now has disjoint flower/bud, short visible stem, and three leaf/pad masks at both native grids; the stems flex from fixed lower waterline/shore attachments and carry the bloom, while leaves respond at lower amplitude with lag. Exact implementation, part counts, evidence, and residual composite-art limits are in `docs/LOTUS_RIG.md`. Visible drawing uses the unchanged live object canvas; optional `renderReflectionObjects` maps its current lotus pose into a separate water-only source for the existing rear-plane sampler.
- `scripts/prepare-direction-assets.mjs --motion-only` refreshes motion masks and metadata without writing `original.png`, `environment.png`, or `mask.png`. `scripts/check-direction-assets.mjs` distinguishes anchored roots from eligible aerial strands. Focused unit and asset tests cover both native grids.

## Deliberate limits / unmet coverage

The original pass was head-only. The bounded follow-up in `docs/LOTUS_RIG.md` adds selected visible stems and adjacent leaf/pad pieces for one clear left lotus pair. This still is not an authored scene-wide plant rig: the source plate has overlapping petal/sepal/leaf colors, the far bank groups are occluded, and the masks intentionally leave ambiguous pixels still rather than guess from broad colors. Local undercoat repair remains neighboring-color derived rather than hand-painted per-material inpainting; exact residual coverage is documented with native crops in the rig note.

Canopy and lotus pixels remain mask-derived from the approved master rather than independent authored sprites. Selected regions use integer native-grid displacements and binary masks; no new art or subpixel/alpha blending is used.

## Integrity / evidence

- Baseline source: `.artifacts/direction/polish/baseline/README.md`, commit `3047513`.
- Current named browser session: `direction-motion-polish-20260320` on the existing `http://localhost:5173/direction.html` Vite server.
- Temporal captures inspected at wind 0.6: `.artifacts/direction/polish/motion/after-640-t0.png`, `after-640-t3_25.png`, `after-960-t0.png`, `after-960-t3_25.png`. They use fixed simulation time; 960 remains a comparison grid, not a promotion.
- Runtime pixel scan at 640, wind 0.6, t=0 compared with t=.5/1/1.6/3.25: heavy roots changed 0 selected pixels throughout; at t=3.25 the selected canopy changed 6484/6492 pixels, lotus heads 43/120, and hanging strands 53/161. Earlier samples change the strands; integer motion can remain stationary for a given material at some samples. These are selected-pixel counts, not a perceptual-quality score.
- `tests/direction-motion.test.ts` verifies deterministic zero wind, anchored strand weighting, lotus head pivot/distal tilt, default-wind response, and bounded max-wind offsets. `tests/direction-motion-assets.test.ts` pins exact SHA-256 hashes for original/environment/water-mask files at both grids, validates binary/ROI masks, local lotus-head segmentation, and zero heavy-root selection.
- After the lotus-rig and reflection-source integration: `npm test` passed 24/24, `npm run build` passed, and `node scripts/check-direction-assets.mjs` passed both grids. Re-run all three after any further changes.

## QA handoff semantics

`canopy-motion-mask.png` = selected crown clusters; `roots-motion-mask.png` = empty by design; `aerial-root-strands-motion-mask.png` = selected flexible distal strands; `lotus-motion-mask.png` = the clear pair's flower/bud silhouettes; `lotus-stems-motion-mask.png` and `lotus-leaves-motion-mask.png` = its selected short stems and three leaves/pads. See `docs/LOTUS_RIG.md` for exact anchors and swept-motion semantics. QA must keep trunk/buttress/roof/shore invariants, assert the fixed stem lower rows and live distal stem/head/leaf changes, and classify only these named flexible components plus their bounded native-pixel swept destinations as motion. Do not expand regions to hide structural changes. Do not retain the old assertion that the heavy-root mask itself moves; do not claim fully articulated lotus motion.
