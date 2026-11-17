# Ao Làng — The Village Pond
## Goal
Standalone TypeScript + Canvas 2D living pixel-art village pond, inspired by SpriteCook's six water techniques and the user's four Vietnamese village reference boards.

## Direction and contract
640 × 400 integer-pixel scene, nearest-neighbor display. Ancient banyan with aerial roots on left, northern Vietnamese communal house behind pond, worn red-brick banks, mossy water steps, raised pink lotus with 65–70% open water. No photographic backdrop or animated sprite sheet. Reference photos inform original code-drawn environmental assets.

src/types.ts is the shared integration contract. Scene owns src/scene.ts; water owns src/water.ts and its isolated tests. Main integrator owns all scaffolding, UI and integration. Both must export createScene() / createWaterRenderer(scene). Main composition: ground → water.canvas → scene.renderObjects() → foreground. Object canvas is transparent and contains reflectable temple/tree sprites at world coordinates; water samples it with per-column bankY reflection.

## Verification
npm run build; npm test; actual browser screenshots and interaction tests at desktop/mobile; verify click ripples, palette, rain, pause, controls, no errors. Independent evaluator inspects output and reports evidence. Do not claim exact fidelity to reference without visual checking.

## Model
Verified via pi --list-models luna: openai-codex/gpt-6-luna with thinking high.
