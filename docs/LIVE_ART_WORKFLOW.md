# Ao Làng live art: from approved plate to motion review

This guide is the entry point for reproducing the live preview or making a small, testable motion edit. For copy-paste briefs, see [Agent prompts](LIVE_ART_AGENT_PROMPTS.md). This is a workflow for the **existing approved art**, not a request to regenerate it.

## 1. Start from a known baseline

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

| View | Local URL | Purpose |
|---|---|---|
| Live direction | <http://127.0.0.1:5173/direction.html> | Animate the current scene and test interactions. |
| Before / After | <http://127.0.0.1:5173/direction.html?compare=1> | Compare the static approved plate with the live scene using one registered wipe. |
| Full After | <http://127.0.0.1:5173/direction.html?compare=1&split=0> | Inspect the entire moving scene, including the lotus on the left. |
| Clean comparison | <http://127.0.0.1:5173/direction.html?compare=1&clean=1> | Review or capture the 16:9 comparison without the normal control panel. |

Use the URL printed by Vite if port 5173 is occupied. The original app (`/`) and density study (`/study.html`) are separate and should remain unchanged by a direction-only fix.

Record `git status --short` and `git rev-parse --short HEAD` before editing. Use 640×360 and 960×540 as two native grids of the same composition, not a lower/higher-quality verdict. Save native-frame baseline crops at the same grid, settings, and simulation times you will use after the change. The live page exposes `window.__LIVE_ART__` for controlled checks: use `setResolution(key)` and `freeze(timeInSeconds)` when a repeatable pose matters. For ownership diagnosis, use the [opt-in checker](#5-check-source-destination-and-the-final-frame); it excludes procedural water from the protected dry-pixel comparison.

## 2. Know which assets are canonical

- The approved source plate and aligned terrain guide are `.artifacts/direction/generated/01-master.png` and `02-terrain-mask.png`. These two source PNGs are tracked; most other files in `.artifacts/` are local evidence and are not in a fresh checkout.
- For each grid, `public/art-direction/<grid>/original.png` is the static Before plate. `environment.png` and `mask.png` provide the canonical environment and pond boundary. Preserve those files byte-for-byte for a motion-only pass.
- The motion masks, owner raster, underpaint, and motion metadata are derived assets. Edit their authored profiles in `scripts/prepare-direction-assets.mjs`, not the generated PNGs by hand.
- For a **new** art pass, start with [Layered image prompts](ART_ASSET_PROMPTS.md) and [Generation provenance](ART_GENERATION_LOG.md). The prompt sizes, alpha and placement are targets, not guarantees. Check original PNGs for registration, transparency and grid size; do not paste mismatched generated cutouts onto the approved plate. For the current scene, derive motion from approved source pixels rather than regenerating the art.

## 3. Separate what moves from what must not move

1. **Locate the seam.** Reproduce at normal wind (`0.6`) and maximum wind (`1.5`). Inspect the roof ridge and ornaments, tiles, eaves, posts, banyan trunk/crown junctions, planter/stone contacts, and fixed lotus on the right. Include the boundary, not just the middle of each object.
2. **Mark ownership from the static art.** In the asset-prep script, author a protected silhouette independently of motion eligibility. Owner IDs are `0` free, `1` roof/house, `2` banyan structure, `3` planter/shore, `4` fixed lotus. Do not define protection as the inverse of a motion mask: that would hide source misclassification from the test.
3. **Select moving material.** Keep canopy and hanging strands separate. Keep the canopy responsive across the outer and overhead banyan crowns, middle-distance trees, and far-right foliage. Main boughs, the trunk, and buttress roots stay fixed. If a thin twig and a roof edge cannot be separated from the flattened plate, protect the ambiguous pixels instead of guessing.
4. **Gate both ends of the transform.** An eligible source can still land on protected art. Check source ownership before sampling or cutting it out, and destination ownership after displacement and integer rounding. Preserve draw order and occlusion. Repair only the vacated cutout with local underpaint; do not sample a protected or water pixel to fill a foliage hole. Leave the separate lotus rig and its reflection path intact.
5. **Keep motion visible and deterministic.** Preserve default-wind movement in all four regions. Test both directions of sway, not one lucky frame. Use simulation time, integer pixel writes and binary alpha; zero wind must restore the approved dry pose. The water renderer still samples the live scene and clips to the unchanged binary water mask using its ten-color palette. Water changes are expected when foliage reflections move; they are not evidence of dry-land leakage.

For the current implementation and owner profile, see [Foliage motion ownership](FOLIAGE_ISOLATION.md). See [Lotus rig](LOTUS_RIG.md) and [Ambient ripples](AMBIENT_RIPPLES.md) before touching those independent systems.

## 4. Regenerate and verify the derived assets

Run from the repo root:

```sh
node scripts/prepare-direction-assets.mjs --motion-only
node scripts/check-direction-assets.mjs
npm test
npm run build
git diff --check
```

Check the diff before staging. A foliage-only change should not alter the approved plate, canonical environment, binary pond mask, home route, or density study. `--motion-only` is appropriate here; full asset regeneration is not necessary for an ownership fix.

## 5. Check source, destination, and the final frame

With Vite still running, use a dedicated browser session:

```sh
agent-browser --session foliage-review open 'http://127.0.0.1:5173/direction.html?compare=1&split=0'
agent-browser --session foliage-review wait --fn '!!window.__LIVE_ART__'
agent-browser --session foliage-review eval --stdin < scripts/foliage-isolation-check.js
agent-browser --session foliage-review eval --stdin < scripts/visible-motion-check.js
```

The first check scans both grids at winds `0.6` and `1.5`, from `t=0` through `t=20` in 0.5-second steps. Read the JSON result; a successful CLI invocation is not enough if its returned `failed` count is nonzero. The check reports the first failing `{index,x,y}` and the pose for source, destination, underpaint, and final dry deltas. It also injects a one-pixel mutation into a **copy** of the debug composite to test the detector, not the production renderer. The second check makes sure real selected pixels still move in all four foliage zones at default wind. Start it with default wind and ambient ripples enabled.

Generate a diagnostic image for the selected grid (`t=6.633`, wind `1.5`), then repeat on the other grid:

```sh
agent-browser --session foliage-review eval --stdin < scripts/foliage-isolation-overlay.js
agent-browser --session foliage-review screenshot '#foliage-isolation-debug-output' /absolute/path/foliage-diagnostic.png
```

| Panel | How to read it |
|---|---|
| Source | Cyan = selected source; red highlight = selected pixel also owned by fixed art. |
| Destination | Green = accepted transformed write; red highlight = accepted write on a protected owner. |
| Owner IDs | Red = roof/house, blue = banyan structure, yellow = planter/shore, purple = fixed lotus. These colors are expected in this panel. |
| Final dry delta | Magenta = changed pixel within the foliage footprint versus the zero-wind pose at the same time. Use checker counts for protected pixels across the entire owner raster. |
| Underpaint | Amber = fill beneath selected cutouts. It must not overlap protected owners. |

If the numbers are clean but something still looks wrong, inspect the **actual production canvas** at the same pose. Compare dry RGB against `scene.foliageDebug(time, wind).finalDry` with the wipe fully on After (`split=0`); exclude authoritatively masked water. Review matching native crops with nearest-neighbor zoom and a short sequence at normal scale. Look for a halo, a static duplicate leaf edge, a seam jumping across a roof ornament, or a branch detached from its anchor. Do not change tests to match a faulty mask. See [Independent QA and examples](FOLIAGE_ISOLATION_QA.md) for the measured checkpoint and original evidence paths; regenerate screenshots locally if the ignored evidence is absent.

## 6. Review, hand off, and prepare a take

- Record baseline revision, grid, wind, simulation time, coordinates, file paths, and whether evidence came from the production canvas or a debug composite. Include which close-up issue remains, even if every sampled assertion passes.
- Require zero sampled protected source/destination/underpaint overlaps and zero protected dry-pixel deltas, exact zero-wind dry identity, and visible motion in all four regions. A passing finite sample does not guarantee every pose or solve ambiguous occlusions in flattened art.
- Run the existing direction regressions relevant to the edit and smoke-check `/` and `/study.html`. See [Recording and lotus QA](LOTUS_RECORD_QA.md) for the keyboard/pointer, pause, and native export checks. Keep local evidence under `.artifacts/direction/`, not in the commit unless explicitly intended.
- For recording, use the clean comparison URL with a chosen `split` (`0` = full After, `50` = centered, `100` = full Before). Use pause/resume and Escape to return to the review. PNG export produces a 1920×1080 art-only wipe with exact 3×/2× scaling; UI labels and the divider are **not** baked into it. The app prepares the view but does not capture or encode video. See [Recording preparation](RECORD_COMPARISON.md).
- Have a second agent review the patch and evidence before reporting success. Commit and push only when the maintainer requests it; don't tag an unresolved visual pass as final.
