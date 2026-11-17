# Pixel-density study — independent review

**Recommendation: retain the current/original scene for now.** The experiment demonstrates that native higher-density rendering can add more detail, but the visual improvement is not clear enough to justify replacing the baseline. If the user wants a provisional study choice to inspect further, 640×360 is the most balanced; it is not an approved production resolution. No Eastward/fidelity match is claimed.

## Evidence reviewed

- Plan: [`PIXEL_DENSITY_PLAN.md`](PIXEL_DENSITY_PLAN.md).
- Original baseline: [`.artifacts/final-canvas.png`](../.artifacts/final-canvas.png).
- Final captures: [contact sheet](../.artifacts/density/contact.png), the four 1920×1080 images ([320×180](../.artifacts/density/320x180-1080p.png), [480×270](../.artifacts/density/480x270-1080p.png), [640×360](../.artifacts/density/640x360-1080p.png), [960×540](../.artifacts/density/960x540-1080p.png)), and all five crops ([banyan](../.artifacts/density/crop-banyan.png), [lotus](../.artifacts/density/crop-lotus.png), [brick](../.artifacts/density/crop-brick.png), [stairs](../.artifacts/density/crop-stairs.png), [reflection](../.artifacts/density/crop-reflection.png)). I inspected each final image/crop; `sips` confirmed the four frame dimensions are exactly 1920×1080. Earlier `*-initial.png` images predate the terrain-fill correction.
- Code read: `src/study/{types,scene,raster,water,main}.ts`.
- Browser: separate named `agent-browser` session at `http://localhost:5173/study.html`; the default selector was 640×360 and offered all four requested grids. The existing `/` route also loaded and exposed the original app and controls.

## Visual assessment

- The four canvases keep a consistent composition and proportions. Camera scale/offset pairs observed were 0.45/16, 0.675/24, 0.9/32, and 1.35/48. No anisotropic squeeze was apparent; the 640×400 source scene is centered in a wider 16:9 world viewport.
- The experiment does add authored detail as density rises: tighter interlocking canopy clusters, elongated trunk grooves, tile/brick marks, and petaled lotus highlights. These are rasterized onto each requested grid, not produced by upscaling an old rendered scene. The higher-resolution banyan crop makes the additional detail particularly clear.
- The close-ups show real gains in crispness: roots/bark, stairs and brick joints resolve more cleanly at 640/960 than at 320. The 640×360 version is the best balance in this set; at 960×540 the canopy's repeating leaf highlights become busier and compete with the silhouette. Lotus petals gain definition but stay simple; reflections are recognizable yet segmented and graphic. Across all grids, broad land, temple base and water shapes remain flat/geometric. The higher density is not automatically better and this remains a stylized study—not modern high-detail environmental pixel art on par with the stated reference.
- The corrected 16:9 captures fill the extended camera edges with terrain rather than pale vertical strips. The side extensions are still broad, simple fields, but the framing now reads as continuous. The native-scale variants are useful for comparison; the UI's preview scaling is not itself evidence of pixel quality, so judge the downloaded/output grid at 100%.

## Rendering, stability, and checks

- Native layers share each selected width/height. The integer painter maps world geometry directly to the native target; export scaling is nearest-neighbor only after rendering. Observed layer alpha was binary (ground opaque, foreground/objects/water transparent only outside their masks). The water renderer uses discrete palette entries; the browser validation found six colors actually exercised per palette in the frozen validation frame, within the ten-color palette limit.
- `scripts/density-check.js` passed **96/96** checks across all resolutions: camera/layer dimensions, mask/foreground relationship, water-only ripple acceptance and land/out-of-range rejection, binary alpha, deterministic held-time output, wind response, independent effects, distortion, palette bounds, rain clipping, and bounded ripples. Same-bucket time is stable; water changes on the next 10 Hz step. A frozen frame remained byte-identical across a pause interval.
- The supplied [`renderer-check.json`](../.artifacts/density/renderer-check.json) confirms 96/96 renderer assertions. The supplied [`ui-check-desktop.json`](../.artifacts/density/ui-check-desktop.json) confirms **30/30** UI/export assertions, including all four exact 1080p exports and integer pixel blocks. `npm run build` passed and `npm test` passed **9/9** after the framing correction. Baseline source hashes were reported intact and the original home route loaded; no physical mobile check was performed.

## Performance observed

Eight warmed full-scene `compose` samples per resolution in local headless Chromium (includes object canvas, water, and compositing; excludes the 1080p export step):

| Native grid | Mean compose | FPS observation |
|---|---:|---|
| 320×180 | 1.46 ms | ~59 FPS observed |
| 480×270 | 3.04 ms | ~60 FPS observed |
| 640×360 | 5.54 ms | 60 FPS observed |
| 960×540 | 11.49 ms | ~57 FPS observed |

The animation loop targets/caps presentation at 60 Hz, so the 60 FPS readings are **not** evidence of uncapped render throughput; render-cost timings are the relevant local measurements. All measured means were below the nominal 16.7 ms frame budget on this desktop browser. Physical mobile performance remains untested, and these measurements are not a guarantee for mobile hardware.

## Decision

Keep the original scene as the current choice: the final evidence proves a technical density progression and shows useful crispness gains in roots/stairs, but not a clear enough overall art-direction win to displace it. Among study variants, 640×360 is the most balanced; 960×540 is sharper in selected details but its canopy pattern is noticeably busier. This is a visual recommendation, not fidelity certification. The side-fill correction closes the framing break. 640×360 remains only a provisional study default, not a final app resolution. No additional art revision is recommended under this one-pass evaluation.
