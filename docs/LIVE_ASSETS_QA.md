# Live-direction asset QA

## Inputs and deterministic preparation

Approved source remains `.artifacts/direction/generated/01-master.png` (1672×941, SHA-256 `da36518a45bea8cfb4ad4f33bd69ffce546c3a012e639047648af3c22e68028a`). The aligned terrain segmentation guide is `02-terrain-mask.png` (SHA-256 `62a550fcff0d984e8e0300c48dda0029a2d3cf3e985c463db102a840e5ae8454`). `scripts/prepare-direction-assets.mjs` is a deterministic local pipeline; it does not call image generation or rewrite either source. It removes the final source row to obtain 1672×940 16:9, then independently nearest-neighbor samples that source to each supported grid (no scene bitmap upscale and no aspect squashing). Environmental RGB is reduced to at most 64 colors without dithering. Water is segmented from the terrain magenta guide AND the canonical master teal/shadow predicate. Each `environment.png` has alpha 0 exactly where `mask.png` is white and alpha 255 elsewhere.

The canonical master—not generated isolated cutouts—is the original appearance. The output layers under `public/art-direction/{640x360,960x540}/` are native size. The confirmed reflection-plane metadata is:

| Grid | Rear bank y | x range |
|---|---:|---:|
| 640×360 | 198 | 200–639 |
| 960×540 | 297 | 300–959 |

These values scale 5/8 from the 640×360 anchor; they are one fixed rear-bank reflection plane, not an inferred varying shoreline.

## Reproduction and validation

```sh
node scripts/prepare-direction-assets.mjs
node scripts/check-direction-assets.mjs
```

The prepare script performs its own emitted-file checks and regenerates `.artifacts/direction/inspection/direction-segmentation-contact-sheet.png`. The read-only checker independently verifies source hashes against metadata, JSON parseability, both native dimensions, original opacity, binary opaque masks, environment/mask alpha equivalence, no more than 64 opaque land colors, expected water coverage/count metadata, documented motion-mask limitations and exact reflection-plane values. Native-scale motion overlays are reproducible with `node scripts/make-direction-motion-proofs.mjs`.

Verified outputs:

- 640×360: 56,756 / 230,400 water pixels (24.6337%), 64 opaque environment colors.
- 960×540: 127,709 / 518,400 water pixels (24.6352%), 64 opaque environment colors.
- Master and guide hashes are identical in both metadata files and match the source files.
- Both metadata files are valid JSON (no non-JSON suffix); the asset contract is `metadata.json`, not `motion-layers.json`.
- `original.png` is fully opaque. The water mask is opaque binary grayscale; the environment alpha is exactly inverse to it. All three motion masks are opaque binary grayscale at native resolution.

## Visual caveats / motion safety

The initial broad eligibility masks did spill into background foliage, rear masonry, and foreground barrier. They have now been tightened deterministically from the approved master (no imagegen/redesign): canopy is limited to the dense left crown/trunk ROI; roots use a hand-bounded lower-buttress polygon ending above the planter; lotus uses two pond-side polygons with bright green leaf/pink petal colors, clipped above the foreground wall. Inspect `.artifacts/direction/inspection/motion-mask-proof-640x360.png` and `motion-mask-proof-960x540.png`; magenta is the mask overlay on each exact native grid (displayed at 2× nearest). The refined roots/lotus candidates visibly select tree buttress pixels and pond-side leaves/flowers without selecting planter masonry, paving, or foreground barrier. Counts at 640×360 are 17,978 canopy / 2,828 roots / 2,298 lotus eligible pixels; at 960×540 they are 40,399 / 6,359 / 5,126.

These are semantic source-pixel masks, **not detached cutouts**: the approved image has no independently registered root or lotus sprite/underpaint. Some shading pixels are intentionally omitted, so lateral movement would fragment forms or reveal holes. Use only very subtle in-place deformation with a matching undercoat, or keep them fixed if live frames show artifacts; never translate them as whole sprites. The canopy mask is also limited to the left x<175/y<150 source region, but still contains mixed foliage/shading. Runtime owner had disabled root and lotus pending this extraction; runtime/UI must assess the refined candidate masks before enabling them and continue to verify masonry, buildings, and foreground stay fixed. No image redesign or new image generation is part of this asset work.

This verifies asset integrity/provenance and the declared file contract. It does not establish the aesthetic acceptability of runtime motion, reflection realism, or final resolution preference; those require live browser inspection and user review.
