# Lotus rig — direction preview

## Scope and authored parts

The rig covers the one clearly separated pond-side lotus cluster on the left: the open flower, its adjacent bud, the two short visible stem runs, and three adjacent floating leaf/pad pieces. See [VISIBLE_MOTION.md](./VISIBLE_MOTION.md) for the stronger motion response and four-region tree foliage audit. It deliberately does not include the overlapping right-bank flower groups. Source-coordinate selections are constrained by hand-authored per-part polygons and material tests; there is no pond-wide green/pink threshold. Head, stem and leaf eligibility masks are binary native-grid assets and disjoint.

| Grid | Flower + bud | Visible stem pixels | Leaf/pad pixels |
|---|---:|---:|---:|
| 640×360 | 320 | 26 | 451 |
| 960×540 | 715 | 59 | 970 |

Exact files are listed in each grid's `metadata.json`: `lotus-motion-mask.png` (flower and bud), `lotus-stems-motion-mask.png`, and `lotus-leaves-motion-mask.png`. The former `lotus-motion-mask.png` name is retained for compatibility, but it now covers the whole bounded flower/bud silhouette including its rose outline, not just the bright petal centers. `scripts/prepare-direction-assets.mjs --motion-only` refreshes these and leaves `original.png`, `environment.png`, and `mask.png` untouched. `scripts/check-direction-assets.mjs` verifies source provenance, native dimensions, binary/disjoint part masks, and the authored geometric envelopes.

## Motion and rendering

`src/direction/lotus-rig.ts` provides the pure `lotusRigSource` deformation used by `src/direction/motion.ts` and consumed by the existing `DirectionScene.renderObjects(time, wind)` path. The lower visible main-stem attachment is pinned around source y=292 (y=291 for the adjacent bud); upward stem rows flex progressively more. Flower pixels inherit that same coherent bend with a small 0.06-radian-field phase lag. The three selected floating pads sway together with a 0.22 lag. Since the stronger-motion correction, the field is 0.86 rad/s (~7.31s/cycle): at default wind 0.6 peak unrounded excursions are 3.10px for heads, 2.85px for stems, and 2.72px for pads; at maximum wind 1.5 these are 5.50/5.06/4.84px. Wind is clamped to 0–1.5; integer native-grid rasterization uses the existing 10 Hz object-frame cache. Each frame starts from the immutable approved source; no time-step accumulation is used. At wind 0 every selected component returns to its exact source pixel at every sampled time.

The lotus source pixels are forward-rasterized into the live environmental object canvas so connected native silhouettes do not erode during the small row-wise translations. Visible rendering continues to use that canvas. An optional `DirectionScene.renderReflectionObjects(time, wind)` produces a separate same-sized **water-only source** containing the same current live pose mapped into the rows used by the existing sampler; main passes that canvas only to `water.render`, then draws the real object canvas. No public water-renderer change or canonical image change is made. The proxy mapping in `lotusReflectionSourceY` inverts the fixed `.52` sampler squash, maps the lower stem junction (y≈292/291) to the local output-water anchor y≈274, and flips rows so a flower's reflected image hangs beneath it. For 640 the proxy sits around source rows 4–52; 960 scales this mapping with the grid. A live browser test held water time/settings at t=3.25/wind=0.6 and compared the water canvas with the ordinary scene source versus the lotus reflection source; the proxy changed 160 masked-water pixels at 640×360 and 428 at 960×540. This is a deliberate limited compromise: the existing renderer still applies its one rear-bank plane globally, so the proxy can replace source samples from nearby background objects within this narrow lotus x/y patch and shoreline/water masking clips the resulting reflection. It is not a separately authored local reflection plane/polygon, and the reflected area is constrained by the original binary water mask.

## Fixed composition and remaining limit

The visible lower attachment rows do not move. No stem deformation touches the bank/stone mask; the house, banyan trunk and buttresses, shore and the unselected scene stay anchored. The underplate is derived locally from the canonical composite to cover source pixels removed for a moving part; the water renderer naturally covers lotus cutouts that lie over water. There is no alpha interpolation, geometry rescaling, new painting, or write to approved canonical/environment/water-mask art.

This is a complete small **selected-cluster** rig, not a complete scene-wide lotus segmentation. The source remains a flattened composite: some lower petal/sepal and leaf colors overlap at the flower/leaf junction, and the far-side/right-bank stems and heads are occluded by other art. Those ambiguous pixels remain unselected rather than being guessed from broad colors. The rig therefore moves the clearly visible stems, heads, and leaf pads as separate related pieces but does not claim independently authored depth layers for every leaf or every lotus in the scene. Inspect the temporal crops before any promotion; visual acceptance remains open.

## Verification and evidence

- Focused tests: `tests/direction-motion.test.ts`, `tests/direction-motion-assets.test.ts`.
- Asset integrity: `node scripts/check-direction-assets.mjs` (both grids).
- Automated project checks: `npm test`, `npm run build`.
- Before this implementation: `.artifacts/direction/lotus-record/rig/pre-pass-canvas-640.png`, `.artifacts/direction/lotus-record/rig/pre-pass-lotus-left-6x.png`, and `.artifacts/direction/lotus-record/rig/pre-pass-lotus-right-6x.png`.
- Native same-time temporal frames and nearest-neighbor crops: `.artifacts/direction/lotus-record/rig/captures/native/`. Names carry grid, wind (`0.6` / `1.5`), and fixed simulation time (`0`–`20` s). These were captured from the live `/direction.html` canvas through an isolated `agent-browser` session `direction-lotus-rig-20260321`; the crop is source-aligned, not enlarged-and-reused art.
