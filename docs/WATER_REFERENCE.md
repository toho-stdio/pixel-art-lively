# Water implementation reference findings

Inspected 17 Nov 2026 (the article metadata reports publication 2026-11-16):

- SpriteCook, “How to make a pixel art pond with reflections and ripples,” https://www.spritecook.ai/blog/pixel-art-pond-water-reflections-ripples
- Companion source: https://www.spritecook.ai/blog/pixel-art-pond-water-reflections-ripples/pond.py (downloaded successfully; 16,197 bytes)

The article describes six separable layers: shore-distance depth tones, sky light, vertically flipped/compressed and row-wobbled sprite reflections, shoreline/contact edges, back-bank mirroring, and small life details (glints, drops/rings, floating leaves). Its implementation computes shore distance once, keeps a small fixed palette ramp, and orders layers so later effects modify existing water tones. The companion Python code uses a 5-second looping phase, reflection squash 0.55, whole-pixel row offsets that increase farther from the reflected object base, a broken pulsing near-shore dash, and a short dark bank-contact/mirror band. Its example ten-color ramp distinguishes deep through light water, mud-shallow water, and two reflected bank tones.

This project adapts those structural ideas to a 640x400 Canvas renderer, the supplied per-pixel mask and `bankY` contract, live object-canvas sampling, settings toggles, and elapsed simulation time. The renderer caches a chamfer distance field, samples and compresses live object pixels from a fixed y=190 mirror plane (never the curved `bankY` contour) into color-classified broad reflections, lifts shadow tones, interrupts reflection runs, and adds sparse broad foreground value patches. Shoreline, rear-bank reflection, particles, and rain are independently switchable. It does not copy the Python/NumPy implementation or its art palette verbatim. No claim of exact visual fidelity to the article is made.

## Verification evidence

Browser-checked the actual Vite app at `http://localhost:5173` using offscreen `createScene()`/`createWaterRenderer()` instances via Vite module imports. With each of depth, sky, reflections, shoreline, back-bank, and particles toggled independently, each produced a pixel difference. For jade/golden/moon renders, observed 6–8 unique RGB colors per frame (within the fixed 10-color palette), only alpha 0/255, and no pixels outside the scene mask. Water clicks were accepted; land and out-of-range clicks were rejected; a held simulation time rendered byte-identical output; a 150-frame heavy-rain run stayed clipped to mask; ambient particles produced visible glint pixels. `npm run build` and `npm test` pass. Pure distance tests cover shoreline/cardinal and diagonal distances, an interior dry hole, and a fully-water edge case.
