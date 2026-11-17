# Ao Làng — The Village Pond

A living pixel-art pond rooted in northern Vietnamese village imagery: a broad banyan, communal-house roof, mossy steps, worn brick and lotus. This repository preserves the approved current art phase for later polish; it is not a claim that the art or grid choice is final.

## Run locally

```sh
npm ci
npm run dev
```

Open the original app at <http://localhost:5173/>. The currently approved visual phase is the separate **Live art direction** route at <http://localhost:5173/direction.html>. The original home route remains intact. A separate native-resolution density study is at <http://localhost:5173/study.html>; comparison exports are available at `/study.html?compare=1`.

The live art page supports water interaction and controls for its scene and water. Use the visible controls; the original app also supports click/tap ripples, Space to pause outside controls and F for fullscreen. The study is an isolated experiment, not a replacement for either route.

## Checks

```sh
npm test
npm run build
node scripts/check-direction-assets.mjs
```

To regenerate the committed runtime art-direction outputs from the preserved source inputs:

```sh
node scripts/prepare-direction-assets.mjs
```

The preparation script requires the immutable 1672×941 approved master and aligned terrain guide at `.artifacts/direction/generated/01-master.png` and `02-terrain-mask.png`. These two source PNGs are intentionally tracked despite residing under the otherwise ignored `.artifacts/` directory; bulky inspection captures, generated galleries, and other local artifacts are not part of the release. Both source SHA-256 values are recorded in the runtime metadata under `public/art-direction/{640x360,960x540}/metadata.json` and documented in `docs/LIVE_ASSETS_QA.md`.

Optional browser regression scripts require a running Vite server and `agent-browser`; commands and coverage are in `AGENTS.md`, `docs/LIVE_DIRECTION_QA.md`, and `docs/PIXEL_DENSITY_AUDIT.md`.

## Scope and limits

The approved live direction is a separate route with prepared 640×360 and 960×540 assets and procedural water. This freeze records the current phase only: it does not decide between grids or imply a final art direction. Root motion affects lower buttress pixels only, not aerial roots, and canopy/root/lotus eligibility masks deform pixels rather than moving independent articulated sprites. Palette presets recolor water, not the whole scene. There is no GPU port, pond editor or gameplay character, and this is not an exact SpriteCook reproduction. See `docs/PHASE_1_FREEZE.md` for the milestone boundary and verification record.

## Credits and references

The scene is an independent reinterpretation informed by the local visual boards in `docs/references/` and technical notes in `docs/WATER_REFERENCE.md`. It does not claim identical assets or visual fidelity to SpriteCook.
