# Visible-motion pass (bounded direction-route update)

This pass directly addresses the feedback that the lotus barely swayed and only a fraction of tree foliage responded. It changes only derived motion assets and the `/direction.html` preview renderer. The approved source master, `original.png`, `environment.png`, water mask, and composition remain untouched.

## Foliage coverage audit

`canopy-motion-mask.png` now contains selected foliage pixels in four source-space zones (the mask is polygon-bounded first, then filtered for green foliage material; it is not a global green threshold):

| Visible region | Source-coordinate ROI | 640×360 selected pixels | 960×540 selected pixels |
|---|---|---:|---:|
| Banyan left/outer crown | x 0–316, y 0–134 | 20,238 | 45,447 |
| Connected overhead banyan crown | x 155–557, y 0–105 | 18,045 | 40,625 |
| Middle-distance tree crowns | x 203–380, y 73–170 | 5,018 | 11,199 |
| Right-bank/background tree foliage | x 544–639, y 0–151 | 5,390 | 12,238 |
| **Total unique mask pixels** | union of hand-bounded zones | **48,691** | **109,509** |

The polygons plus material predicate exclude the temple roof, masonry, shore, moss/ground, and lotus pads. The banyan trunk, major horizontal boughs, buttress roots, and four specifically identified aerial root strands are not part of the canopy mask. `canopy-underplate.png` is a generated native-grid auxiliary layer, opaque only at selected canopy pixels and transparent elsewhere. It derives a local 4-pixel-ring fill from adjacent non-moving canonical samples (falling back to the canonical pixel at an all-selected outer edge); it is not source art and is never drawn over the fixed trunk/branch masks.

The mask audit is deliberately clear about what it means: every one of the four visible tree-foliage zones has moving eligible pixels, not that every leaf pixel or all vegetation is independently rotoscoped. Some pixels behind/overlapping the house, temple, and trunk remain attached to their original flattened-art layer. The background plants are moved with their colored foliage, not their occluded stems/trunks.

## Motion response

- Tree leaves use a `0.68 rad/s` shared field with regional phase lags, a period of about **9.24 s**, and native integer translations. Peak excursion is **2.05 px at default wind 0.6** and **3.74 px at wind 1.5**; the full cycle sweeps roughly twice that from one extreme to the other.
- The lotus field is now `0.86 rad/s` (about **7.31 s** per cycle) with coherent independent part amplitudes. At wind 0.6 the unrounded peak field is **3.10 px for heads, 2.85 px for stems, and 2.72 px for pads**; at max wind 1.5 it is **5.50/5.06/4.84 px**. The visible lower stem junction remains pinned, and its upper stem/head/leaf pieces share the field with phase lag. Integer rasterization and the existing deterministic 10 Hz scene-frame cadence are unchanged. Wind remains clamped to 0–1.5; wind zero is stationary.
- This remains a bounded lotus rig: one clearly separated left open flower + bud, two visible stem runs, and the three selected adjacent leaf/pad pieces. The other visible right-bank flowers, buds and pads remain static/flattened because their stems and leaf junctions overlap other art; no claim is made that every lotus in the scene is independently rigged. The live reflection source continues to derive from this rig's currently rasterized lotus pose.

## Verification/evidence

- `node scripts/prepare-direction-assets.mjs --motion-only` regenerates only motion masks, metadata, and derived underplate for both native grids.
- `node scripts/check-direction-assets.mjs`, `tests/direction-motion.test.ts`, `tests/direction-motion-assets.test.ts`, and `tests/direction-lotus-rig.test.ts` verify native dimensions, binary masks, four-zone nonempty coverage, underplate alpha coverage, stationary structural roots, unchanged source/environment/water-mask hashes, zero wind, pinned stem, and default/max motion envelopes.
- Before frames at wind 0.6: `.artifacts/direction/visible-motion/before/full-w06-t{0,5,10,15,20}.png` plus `.artifacts/direction/visible-motion/before/full-640.png`.
- Ordered post-pass frames are in `.artifacts/direction/visible-motion/motion/` with `{640x360,960x540}-w{0,0.6,1.5}-t{0,5,10,15,20}.png`. Captured from an isolated browser on the actual `/direction.html?compare=1&clean=1&split=0` live canvas at exact simulation times, using native selector resolution at each grid. These PNGs are visual temporal checkpoints, not interpolated video.
