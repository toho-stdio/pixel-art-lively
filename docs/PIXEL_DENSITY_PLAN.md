# One-pass pixel-density study
User requests one bounded experiment toward modern/high-detail environmental pixel art, with the current feel preserved if the experiment is not a clear win. Do not finalize a new main-app resolution before comparison evidence.

## Baseline
Current baseline is actually 640×400 (not ~200×120), code-drawn art; no AI bitmap assets or baked image pixel blocks. Keep src/scene.ts, src/water.ts, original app and existing tests untouched.

## Experimental path
Separate study.html and src/study/. Default within experiment 640×360; support 320×180, 480×270, 640×360, 960×540. All use one uniformly scaled camera/world viewport, preserving object proportions and identical composition among four study resolutions. Original 640×400 framing gains equal side extensions to fit16:9, not a squeeze.

Re-render authored geometry natively on each pixel grid. Do not drawImage-scale completed old canvases. Rasterize hard edges consistently; detail must be authored at native density with coherent clusters, not random dots. Shared scene/mask/water native dimensions, fixed planar reflection anchor transformed via camera, discrete 10-color water, thin highlights and subtle time-stepped water motion. Stable frozen comparison t=3.25, wind=.6, ripple at normalized/world reference coordinate and fixed age for all captures.

## Work split
Study scene agent owns src/study/scene.ts and optional raster.ts only. Water agent owns src/study/water.ts plus isolated study tests if needed. Integrator owns study UI, resolution contract, exports/comparison harness, build config, docs. Evaluator is read-only except docs/PIXEL_DENSITY_REVIEW.md.

## Evidence
Capture same-time scene at exactly1920×1080 for each resolution with nearest integer6×/4×/3×/2×. Produce labeled side-by-side and five close-up strips (banyan, lotus, brick, stairs, reflection). Evaluate composition anchors, single shared grid and binary-alpha layers, opaque water palette membership, fixed-time stability, actual new native detail vs nearest upscale, frame cost per resolution, motion delta/pause, original regression. Include actual images and honest recommendation/fallback; no second art-rework loop.
