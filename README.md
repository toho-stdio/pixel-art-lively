# Ao Làng — The Village Pond

A living pixel-art pond rooted in northern Vietnamese village imagery: a broad banyan, communal-house roof, mossy steps, worn brick and lotus. This repository preserves the approved current art phase for later polish; it is not a claim that the art or grid choice is final.

## Run locally

```sh
npm ci
npm run dev
```

Open the original app at <http://localhost:5173/>. The currently approved visual phase is the separate **Live art direction** route at <http://localhost:5173/direction.html>. The original home route remains intact. A separate native-resolution density study is at <http://localhost:5173/study.html>; comparison exports are available at `/study.html?compare=1`.

The live art page supports water interaction and scene controls. Use `/direction.html?compare=1` for the static Before / lively After wipe, or `/direction.html?compare=1&clean=1` for a clean 16:9 review and recording view. The original app also supports click/tap ripples, Space to pause outside controls, and F for fullscreen. The study is an isolated experiment, not a replacement for either route.

## Guides and prompts

- [Live art workflow](docs/LIVE_ART_WORKFLOW.md): setup, asset preparation, motion layers, browser checks, debug overlays, and recording preparation.
- [Copy-paste agent prompts](docs/LIVE_ART_AGENT_PROMPTS.md): diagnose a motion leak, implement a scoped fix, and independently verify it.
- [Layered image prompts](docs/ART_ASSET_PROMPTS.md) and [generation provenance](docs/ART_GENERATION_LOG.md): the separate art-generation workflow, not required for motion-only edits.

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

For motion-only edits, run `node scripts/prepare-direction-assets.mjs --motion-only` instead. Optional browser regressions require a running Vite server and `agent-browser`; see the [live art workflow](docs/LIVE_ART_WORKFLOW.md) and [foliage isolation QA](docs/FOLIAGE_ISOLATION_QA.md) for commands.

## Scope and limits

The live direction is a separate route with native 640×360 and 960×540 assets and no final grid selection. Four foliage zones, selected hanging strands, and the left lotus cluster move; the trunk, major boughs, buttresses, buildings, and shoreline stay fixed. Some leaves at ambiguous overlaps stay still by design. The pond supports procedural reflections and both automatic and interactive ripples. Palette presets recolor water, not the whole scene. The comparison can export PNGs, but the app does not record video. There is no GPU port, pond editor, or gameplay character. See [the original freeze](docs/PHASE_1_FREEZE.md) for the historical milestone and [foliage isolation](docs/FOLIAGE_ISOLATION.md) for the current ownership model.

## Credits and references

The scene is an independent reinterpretation informed by the local visual boards in `docs/references/` and technical notes in `docs/WATER_REFERENCE.md`. It does not claim identical assets or visual fidelity to SpriteCook.
