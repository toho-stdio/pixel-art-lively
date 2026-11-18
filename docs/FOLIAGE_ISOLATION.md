# `/direction.html` foliage motion ownership

## Purpose and bounds

This is a bounded runtime segmentation fix for the observed collateral sway. It does not repaint `original.png`, regenerate the environment master, change the water mask, or alter the approved scene composition. Foliage stays meaningfully animated at the existing motion field and amplitudes; the source mask is narrowed only where independent protected-object ownership says the source is not foliage. Root/trunk/bough junctions, roof details, and visually ambiguous pixels remain fixed rather than being guessed into a moving layer.

The selected moving source remains material-filtered and polygon-limited to the existing four tree zones: banyan outer crown, overhead banyan crown, middle-distance trees, and the exposed far-right crown. This is eligible-material coverage, not a claim that every visible leaf is separately rotoscoped. Architecture-overlapping canopy pixels inside the protected silhouettes are intentionally stationary. The four thin hanging-strand selections remain a separate material. The existing left lotus rig remains separate and keeps its motion/reflection behavior.

## Independent owner profile

`public/art-direction/{640x360,960x540}/foliage-protected-owners.png` is an opaque grayscale owner-ID raster, authored from independent geometry in `scripts/prepare-direction-assets.mjs`, then scaled to each native grid. It is not `NOT canopy-motion-mask` and never uses candidate-mask pixels to define protection:

| ID | Owner | Authored profile |
|---:|---|---|
| 0 | Unprotected destination | No protection polygon covers the pixel. |
| 1 | Roof and house | Hand-bounded, irregular temple silhouette including ridge ornaments, both roof ends, tiles, eaves, facade and posts. |
| 2 | Banyan structure | Hand-bounded trunk, major bough junctions and buttress/root mass. |
| 3 | Planter / shore | Separate planter, adjacent left-bank shoreline/stone, and foreground stone profile; excludes the intentionally articulated left lotus footprint. |
| 4 | Other fixed lotus clusters | Two hand-bounded right-bank lotus silhouettes; kept distinct from the deliberately rigged left lotus group. |

`scene.ts` validates the owner raster's dimensions, opaque grayscale encoding, and ID range at load. Canopy/strand candidate writes require an eligible source pixel with owner 0 **and** a destination with owner 0. A destination crossing is rejected even when the source is eligible. The separately authored protection profile therefore guards source segmentation, destination sweep, and foliage-underplate footprint independently. Lotus remains its existing distinct rig; it is never promoted into the canopy layer.

## Underpaint and compositing

`canopy-underplate.png` and `aerial-strands-underplate.png` are separately derived on each native grid beneath accepted canopy and hanging-strand source pixels. Their local 4-pixel rings sample adjacent canonical colors only where neighbors are nonmoving, non-water, and owner ID 0; the exact original sample is a conservative fallback if a ring has no eligible neighbors. At zero wind the original object layer covers these auxiliary plates, preserving the exact original pose. At nonzero wind they fill source cutouts so an unmoved flattened duplicate is not left at the original position. Underpaint is never painted into an owner-protected pixel. Main boughs/roots are not cut out or reconstructed.

The visible foliage remains in the live reflectable environmental object canvas, so the existing water sampler sees its current pose. The fixed roof, structural trunk/bough, shore and other fixed lotus stay in their original object locations. Water rendering itself is unchanged.

## Opt-in diagnostic and invariants

There is no standard-render debug work. On demand, `scene.foliageDebug(time, wind)` returns `{ source, destination, owners, underpaint, finalDry }`: the first four are one-byte-per-native-pixel arrays (255 means selected/written/opaque; `source`/`destination` include canopy and hanging strands, `underpaint` is the union of the two generated underpaint assets, and `owners` is the ID above), and `finalDry` is a canvas compositing ground + live environmental objects + foreground, without water. It is read-only and creates its debug masks/canvas only on explicit invocation. `src/direction/foliage-isolation.ts` contains the source/destination predicate and a protected-final-pixel comparator.

`tests/direction-foliage-isolation.test.ts` covers valid ownership, unselected/protected source, protected destination, out-of-bounds destination, and an adversarial protected final-composite mutation. `scripts/check-direction-assets.mjs` validates owner IDs/classes on both grids, zero source/underpaint overlap with protection, native binaries, both underpaint alpha masks, and nonempty coverage in each foliage zone.

### Measured isolation sample

On the live `/direction.html?compare=1&clean=1&split=0` renderer, the independently defined canopy-zone source counts at 640×360 were 23,396 left/outer, 19,078 overhead, 3,585 middle-distance, and 2,256 exposed far-right; at 960×540 they were 52,502, 42,811, 7,840 and 5,084 respectively. Zone rectangles overlap intentionally, so these are coverage evidence, not unique-union totals. The live visible-motion check also measured actual selected-material changes over t=0→2.4 at default wind: 640×360 left/overhead/middle/right = 23,334/18,748/3,470/4,519 changed pixels (eligible: 23,362/19,014/3,509/4,878); 960×540 = 52,266/41,628/7,641/10,521 (eligible: 52,443/42,777/7,939/11,073). A 41-point t=0..20s dry-composition scan at both default wind 0.6 and max wind 1.5 found zero changed pixels in owner IDs 1–4 and zero source/destination/underpaint owner overlap on each grid. A second comparison against the **actual production `layers.canvas`** (split 0, wind 0.6; t=0,1,2.4,5,10,20) found exact RGB equivalence on all 173,644 dry pixels/frame at 640×360 and all 390,691 dry pixels/frame at 960×540 (zero deltas). Zero-wind `finalDry` also matches the approved original exactly. These are bounded sampled-frame results, not a proof for every possible time/subpixel condition.

The independent browser audit is in `scripts/foliage-isolation-check.js` with QA-directed evidence under `.artifacts/direction/foliage-isolation/qa/`; its handoff report is being completed separately. Before/fixed actual-scene crops at matched native regions/t=6.633s/wind=1.5 are `.artifacts/direction/foliage-isolation/baseline/{roof-contact,trunk-bough}-w1.5-t6.633-3x.png` and `.artifacts/direction/foliage-isolation/live-{roof,trunk-bough}-w1.5-t6.633-3x.png`. The independent source-mask overlays and baseline interpretation are in `baseline/REPORT.md` plus `baseline/{roof,trunk}-640x360-mask-overlay-2x.png`. Full live captures are `live-640-w06-t2.016.png` and `live-640-w15-t6.633.png`. The independent `scripts/foliage-isolation-check.js` browser regression passes 27/27. `scripts/visible-motion-check.js` passes 26/26 after its precondition is reset to default wind 0.6. These are inspection evidence, not an aesthetic sign-off. QA also scans final dry output over time and checks the production canvas rather than trusting a second compositor; intended lotus-only motion remains separate from the foliage ownership contract.

Recreate/check generated layers:

```sh
node scripts/prepare-direction-assets.mjs --motion-only
node scripts/check-direction-assets.mjs
npm test
npm run build
```

## Limits

- Protection polygons are conservative silhouettes, not pixel-perfect manual cutouts. Some adjacent foliage is held fixed near roof, bough, planter and other lotus contours by design. This favors no collateral motion over detaching every tiny branch.
- Flattened art cannot reliably reveal hidden background surfaces. Local ring underpaint is a small derived fill, not new canonical art, and is only used for the moving canopy cutout.
- No claim is made that every leaf/strand is independently isolated or that overlapping flattened plants have been rigged. Water reflections remain a separate visual review concern.
