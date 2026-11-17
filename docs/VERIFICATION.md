# Final verification — Canvas demo v0.1

## Delivered scope
Original code-drawn northern Vietnamese village environment from the four supplied visual reference boards: broad banyan and aerial roots, red-tiled communal house, mossy steps, old brick, lotus pads, raised flowers, buds and seed pod. A 640×400 Canvas2D scene with a separate ten-entry indexed water renderer; no animated water sprite sheet.

Interactive features: six effect toggles, three water palettes, wind, distortion, simulation speed, rain, pointer/drag and keyboard ripples, pause, reduced-motion startup, fullscreen and 3× nearest-neighbor PNG export. Environmental palettes are not globally relit by water palette selection.

## Automated checks
- `npm run build`: passes TypeScript and production Vite build.
- `npm test`: 6/6 tests pass, covering clock/pause/resume, pointer scale mapping and arbitrary-mask shoreline distance with a dry interior hole and fully-water edge case.
- `scripts/browser-check.js`: 25/25 assertions pass at desktop 1440×1100 and mobile viewport 390×844. Tests byte-stable pause, palette changes, all six effect changes, range bindings, center-water keyboard ripple, dialog, reset, and no horizontal overflow.
- `scripts/renderer-check.js`: 23/23 assertions pass using actual offscreen renderer instances. Includes foreground land excluded from mask, wind zero stability, motion from t=0 to t=1 second, land/out-of-range/NaN rejection, fixed-time identity, all effects and distortion response, 32-ripple bound and 150-frame heavy-rain clipping.
- Jade/golden/moon renders each observed seven unique opaque colors in the sampled frame, all within the ten-entry ramp, with alpha exactly 255 inside and 0 outside the mask. Not every palette entry must appear in every frame.

## Actual browser evidence
- A trusted browser mouse click on water increased ripple count.
- Fullscreen entered successfully and expanded the canvas to 1440 px wide on a 1440 px viewport.
- Actual Save PNG download obtained as `.artifacts/ao-lang-export.png`; `sips` confirmed 1920×1200.
- Reduced-motion browser emulation started the scene paused.
- axe-core WCAG 2 A/AA audit: zero reported violations after small-text contrast corrections; two incomplete checks concern text over the canvas and a decorative pointer glyph, not a blanket accessibility certification.
- No browser page errors observed.
- Local frame render cost sampled around 8–9 ms in headless desktop Chromium. This is not a physical-mobile benchmark.

## Remediated issues
1. Wind phase originally treated seconds as milliseconds. Corrected to seconds-based `sin(time * 1.3)`, then verified by actual object-buffer comparison.
2. Using curved `bankY` as reflection plane bent the roof into an arch. Object reflection now uses fixed y=190, while bankY remains shoreline/contact information.
3. Diagonal sine interruption bands obscured reflections. Replaced with sparse broken horizontal rows and restored full-pixel sampling and true 0–6 px distortion response.
4. Visible foreground ground was initially still marked water. Foreground bank geometry now carves the authoritative mask.
5. Roof tile rectangles extended outside the sloped roof. Tile row bounds now follow the roof silhouette.
6. Added three deterministic clipped floating leaves; environmental art is stable at held simulation time.

## Visual artifacts
- `.artifacts/final-desktop.png`
- `.artifacts/final-mobile.png`
- `.artifacts/final-canvas.png`
- `.artifacts/ao-lang-export.png`

The final desktop/mobile screenshots were viewed, not merely generated. `docs/REVIEW.md` contains the independent agent's review and its own verification boundaries.

## Remaining scope
No WebGL/GPU port, arbitrary pond drawing/editor, gameplay character, complete weather lighting, real-time whole-scene day/night relighting or physical low-end device performance certification. The environmental assets are original procedural pixel drawings rather than AI-generated production sprite assets. This is an independent art/technical reinterpretation, not a claim of exact SpriteCook fidelity.
