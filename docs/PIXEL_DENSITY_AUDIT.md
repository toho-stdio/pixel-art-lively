# Native pixel-density audit — one bounded pass

## Decision
**Keep the existing main demo and its feel.** The experiment is technically useful but not a clear enough overall visual improvement to replace it. Among the four study variants, **640×360 is the most balanced provisional choice**. 960×540 sharpens bark, petals and fine edges, but its repeating leaf plates make the canopy busier; broad land/water/temple masses remain flat. This does not reach Eastward-like environmental art simply by increasing resolution. No second art revision is queued.

- Main, unchanged: http://localhost:5173/
- Isolated trial/comparison: http://localhost:5173/study.html?compare=1
- Independent visual review: [PIXEL_DENSITY_REVIEW.md](PIXEL_DENSITY_REVIEW.md)

## What the original implementation actually contained
The baseline was **640×400**, not approximately200×120. All environmental artwork is code-drawn. There are no AI-generated bitmap assets, baked2×/4× image cells, or independently upscaled tree/lotus sprite files to regenerate. Large color clusters are not automatically mixels.

Actual original layer audit at t3.25, wind0.6:
| Layer | Native size | Partially transparent pixels | Unique RGB values |
|---|---|---:|---:|
| Ground | 640×400 | 0 | 1046 |
| Foreground | 640×400 | 1227 | 973 |
| Objects | 640×400 | 1903 | 1312 |

The original Canvas path rasterization introduced anti-aliased edge colors/alpha in environmental art. Its water already used a shared native grid and a ten-entry discrete palette. The main bottleneck in the perceived style is authored shape/cluster density and lighting—not merely the render-target size.

## Experimental implementation
- Separate `study.html` and `src/study/`; original `src/{main,scene,water,types}.ts` and `src/style.css` source hashes remain identical.
- Native integer rasterizer: direct scanline polygons, Bresenham strokes, rectangles and ellipses, with alpha only0/255. Each target is rendered independently; no completed old scene is used as an upscaled input.
- Same camera in all four variants. Uniform world scale preserves proportions. The original640×400 authored view is centered in a711.111×40016:9 world frame, gaining35.556world units per side; the outer ground is extended rather than squeezed or left as sky-colored bars.
- Added denser interlocking foliage plates at higher target resolutions, elongated bark grooves, discrete masonry/step joints and petaled lotus highlights. These are actual authored primitives; they do not substitute for production-quality asset art direction.
- Objects, foreground, mask, depth distance, water, reflections and particles use one native target grid. Mask excludes visible foreground land.
- Water uses a transformed stable world-y190 mirror plane, ten-entry palette, one-native-pixel shore/ring lines, sparse glints and calibrated subtle distortion. Water animation is quantized at10Hz; presentation targets60Hz.
- Same frozen comparison time3.25, wind0.6, jade palette and ripple born2.9 at world320,270.

## Exact output evidence
Each frame is **1920×1080**:
| Internal target | Integer upscale | Output art-pixel cell |
|---|---:|---:|
| 320×180 | 6× | 6×6 |
| 480×270 | 4× | 4×4 |
| 640×360 | 3× | 3×3 |
| 960×540 | 2× | 2×2 |

Downloaded through the actual browser links:
- [320×180](../.artifacts/density/320x180-1080p.png)
- [480×270](../.artifacts/density/480x270-1080p.png)
- [640×360](../.artifacts/density/640x360-1080p.png)
- [960×540](../.artifacts/density/960x540-1080p.png)
- [Full-size labeled contact sheet](../.artifacts/density/contact.png)
- Close-ups: [banyan](../.artifacts/density/crop-banyan.png), [lotus](../.artifacts/density/crop-lotus.png), [red brick/bank](../.artifacts/density/crop-brick.png), [stairs](../.artifacts/density/crop-stairs.png), [reflections](../.artifacts/density/crop-reflection.png).

Both the integrator and independent evaluator viewed the comparisons. Small gallery thumbnails are not pixel-grid evidence; exact PNG exports and100%close-ups are. Initial images ending`-initial.png` predate dry-ground fill fixes and are not final output.

## Validation
- `npm run build`: passes; builds both original and study entries.
- `npm test`: **9/9** pass, including uniform-camera and native-raster tests.
- `scripts/density-check.js`: **96/96** renderer checks across all four grids. Includes layer dimensions, authoritative mask, binary alpha, wind, frozen identity, all six independent effects, palette bounds, distortion response,10Hz temporal stability, bounded ripples and rain clipping.
- `scripts/density-ui-check.js`: **30/30** checks at both desktop1600×1120 and mobile-emulated390×844. Actual PNGs decoded and checked1920×1080; every output6×/4×/3×/2× art-pixel block is uniform, not interpolated.
- Water frozen frame exercised6colors per palette, all within the ten-entry ramp and alpha exactly255inside/0outside the mask.
- Original regression scripts still pass:25UI and23renderer checks. All five baseline source SHA-256 checks pass.
- axe-core WCAG2A/AA study audit:0reported violations after small-text contrast correction.
- PNG dimensions additionally confirmed via`sips`. Browser tests are saved in`.artifacts/density/{renderer-check,ui-check-desktop,ui-check-mobile,baseline-ui-regression,baseline-renderer-regression}.json`.

## Local performance, not a device guarantee
Eight warmed fixed-time native-compose samples from the desktop UI test, excluding1080pPNG encoding:
| Grid | Mean compose |
|---|---:|
| 320×180 | 1.46ms |
| 480×270 | 3.04ms |
| 640×360 | 5.54ms |
| 960×540 | 11.49ms |

The independent evaluator observed approximately59/60/60/57FPS for the four modes. These are capped60Hz browser readings, not uncapped throughput. Cold rasterization/cache misses, concurrent work and physical mobile hardware can differ; no low-end device performance claim is made. Integer live preview may letterbox or scroll on small screens instead of using fractional CSS scaling.

## Practical assessment
- **320:** coherent chunky clusters, but roots and lotus petal marks lose separation.
- **480:** cleaner intermediate option, still visibly retro at1080p.
- **640:** best balance of readable silhouettes, fine detail, calm surface and cost in this pass.
- **960:** finer strokes and petals, but busier/repetitive foliage and more CPU; not an automatic art upgrade.
- **Baseline:** kept intact. Future improvement would need more intentional environmental shape, light and asset authorship—not another blanket increase in resolution. Stop this trial here unless the user explicitly requests more.
