# Ao Làng Before / After recording preparation

The original `/` home route is unchanged. Open the art-direction review at `/direction.html?compare=1` for a single native-grid 16:9 wipe: **Before** is the approved original static plate; **After** is the current fully lively scene (water, selected tree/root motion, and the concurrent lotus rig). This is not a frozen fake video or a pre-polish state. The two halves are rendered into one registered frame with the exact same canvas dimensions, camera, scale and crop at 640×360 or 960×540. The image remains nearest-neighbor; only UI chrome is softened.

**Live lotus reflection:** `DirectionScene.renderReflectionObjects(time, wind)` now supplies a separate same-grid canvas to the existing water renderer. It keeps the normal live environmental source and maps selected, currently posed lotus pixels into the rows sampled by the fixed rear-plane reflection transform, registered to a lower-water anchor; the visible live object canvas remains unchanged. No `water.ts` change or frozen/fabricated video frame was introduced. At fixed `t=3.25`, wind `0.6`, comparing the renderer's water output with the normal object source versus this reflection source changed 160 masked-water pixels at 640×360 and 428 at 960×540. This is a bounded projection into the current plane sampler, not a new per-object shoreline-plane renderer.

## Preparing a take

- Use `/direction.html?compare=1` for the full review UI and `/direction.html?compare=1&clean=1` for a clean 16:9 recording view without the sidebar, metrics, page chrome or status copy. The clean view has a discreet pause/resume button and **Exit clean view**; Escape also exits to the comparison review. Browser chrome is not hidden by the app.
- Wipe starts at 50%. Drag the divider, focus its accessible slider and use Left/Right, Home/End, or set a shareable URL such as `/direction.html?compare=1&split=72`. Moving the slider preserves the `split` URL parameter. Labels always mean original Before on the left and lively After on the right.
- Pause/resume using the normal panel in review mode or the small pause button in clean mode. The pause freezes simulation output. Reloading starts the normal simulation clock; there is no fabricated timeline or “reset video” control.
- In comparison mode, only the divider and its 32 px-wide invisible hit target control the wipe. The rest of the canvas keeps normal trusted mouse/touch water interactions (water-mask checks still reject land); dragging the divider does not create ripples. The full-frame native range remains keyboard-operable.
- The default grid remains 640×360 (provisional); 960×540 remains an optional same-composition grid, not an automatic upgrade. The preview fits responsive screens without asserting an integer pixel scale on small displays.

## Export behavior

The existing **Tải PNG 1080p** export remains a native-resolution 16:9 image enlarged with nearest-neighbor blocks: 640×360 → 1920×1080 at 3×; 960×540 → 1920×1080 at 2×. In comparison mode the export captures the **current wipe position**, with the same registered full-frame crop. The generated filename and export note identify that composition. The PNG is the art-only canvas: the Before/After glass labels and divider/round handle are browser UI and are not included in the exported pixels. Outside comparison mode, export remains the selected normal view (approved original static or live scene). Export is still PNG; this task does not record, encode or simulate video.

## Recording URLs and controls

- Review: `http://localhost:5173/direction.html?compare=1`
- Clean frame: `http://localhost:5173/direction.html?compare=1&clean=1`
- Example saved position: `http://localhost:5173/direction.html?compare=1&split=50&clean=1`
- Toggle split via draggable/keyboard slider. Pause for a still; resume for the real simulation. Close clean mode via its Exit control or Escape.

The browser viewport/OS capture controls and recording settings are intentionally left for the later recording task.