# Foliage-isolation independent QA

## Scope and repeat

Independent QA of `/direction.html` foliage ownership, on top of the implementation contract in [`FOLIAGE_ISOLATION.md`](FOLIAGE_ISOLATION.md). No runtime/source remediation was needed in this pass. It started from the stated `d3447ca` baseline with the implementation worktree intact; no commit, push, or recording was made.

```sh
npm run dev -- --host 127.0.0.1
# In an isolated named agent-browser session:
agent-browser --session <name> open 'http://127.0.0.1:5173/direction.html?compare=1&split=0'
agent-browser --session <name> wait --fn '!!window.__LIVE_ART__'
agent-browser --session <name> eval --stdin < scripts/foliage-isolation-check.js
agent-browser --session <name> eval --stdin < scripts/visible-motion-check.js
# Optional false-color diagnostics at t=6.633, wind=1.5 (then screenshot the named output canvas):
agent-browser --session <name> eval --stdin < scripts/foliage-isolation-overlay.js
agent-browser --session <name> screenshot '#foliage-isolation-debug-output' /absolute/path/foliage-diagnostic.png
```

`foliage-isolation-check.js` is an opt-in browser audit (not part of normal rendering). It exercises both native grids and winds 0.6/1.5 at 41 simulation times from 0 through 20 seconds in 0.5-second steps. It compares the actual `finalDry` output over independently-authored owner IDs, checks source and posed destinations against protection, audits the underpaint mask, checks zero-wind original identity, and mutates one protected composite pixel to prove the final-pixel comparator catches a leak. It restores the initial browser controls. The implementation-side debug contract is read-only and allocates debug buffers only when called.

## Results

- `scripts/foliage-isolation-check.js`: **27/27 PASS** in isolated session `foliage-qa-independent-20260322`.
- Per grid: zero protected-owner final-dry pixel changes at every sampled time and wind; zero protected-source, protected-destination, and protected-underpaint writes; zero source-mask mismatch and zero underpaint-mask mismatch. Zero-wind final dry matched the approved original (0 deltas). Fault injection was caught exactly once at the injected pixel on each grid.
- The authored owner-ID mask matched runtime owner IDs byte-for-byte. Owner coverage at 640×360 (free/roof-house/banyan/shore-other-fixed-lotus) was `98,819 / 43,651 / 28,241 / 56,887 / 2,802` pixels; at 960×540: `222,380 / 98,225 / 63,582 / 127,862 / 6,351`.
- Across the sampled full 20-second range, free eligible foliage source counts were `38,309` (640) and `86,100` (960); candidate-to-destination counts varied by pose, with no protected overlap. At `t=2.5s`, free changed dry pixels / accepted destinations at wind 0.6 and 1.5 were 640: `38,383 / 37,616` and `38,506 / 37,110`; 960: `86,331 / 85,111` and `86,579 / 84,370`.
- Separately sampled each of the four canopy audit zones (outer, overhead, middle, far-right) through the 20-second timeline at both winds on both grids. Every zone showed changed eligible material in both positive/negative phase windows. At default wind 0.6 the maximum zone deltas at 640 were `23,334 / 18,866 / 3,474 / 4,875`; at 960 `52,269 / 42,370 / 7,852 / 11,065`. Maximum-wind maxima were 640 `23,344 / 18,882 / 3,488 / 4,875`; 960 `52,302 / 42,384 / 7,862 / 11,065`. Zone rectangles overlap, so counts are not additive. These are material-change checks, not proof of individually rotoscoped leaves.
- Existing visible-motion regression: **26/26 PASS**. Prior browser regressions were retained and passed unchanged: lotus-record **107/107**, live-art **88/88**, polish integration **70/70**, water polish **32/32**, renderer **23/23**, home UI **25/25**.
- `npm test`: **29/29 PASS**; `npm run build`: PASS; `node scripts/check-direction-assets.mjs`: PASS at both grids; `git diff --check`: PASS.
- `/study.html` loaded its native 640×360 canvas with no horizontal overflow. Home smoke passed. Actual direction full-scene browser captures at 640 and 960 and a clean-route view are under `.artifacts/direction/foliage-isolation/qa/`; the clean screenshot was inspected at overview scale. The older baseline folder contains source-mask overlays on the actual approved plate and roof/trunk close-ups.

## Reading the diagnostic and limits

Owner IDs are independent of the moving mask: 1 roof/house, 2 banyan structure, 3 planter/shore, 4 other fixed lotus; 0 is unprotected. The checker deliberately scans final composited dry pixels, so a passing source/destination predicate alone cannot hide a composite leak. Water/ripples/reflections are excluded from that comparison to avoid treating water motion as land damage; the existing water and lotus regressions separately cover those systems.

The QA script returns machine-readable assertion details and per-time source/destination/change totals directly in the `agent-browser eval` result. On any observed overlap or protected final delta, the affected wind/time record now includes the first failing `{index,x,y}` separately for source, destination, underpaint and final-dry pixels. `scripts/foliage-isolation-overlay.js` is a separate opt-in browser diagnostic that screenshots a five-panel PNG at actual scene pixels (shown nearest-neighbor by the browser): selected source on original (cyan; any protected source red), accepted posed destination on live dry art (green; any protected destination red), independent protected silhouettes (roof red, banyan blue, shore yellow, fixed lotus purple), final dry deltas within the foliage footprint against zero-wind at the same simulation time (magenta), and generated underpaint footprint (amber). The live output `foliage-diagnostic-{640,960}.png` plus nearest-neighbor roof/eaves and trunk/bough source-overlay crops are under `.artifacts/direction/foliage-isolation/qa/`. Full-scene captures are `independent-browser-live-{640,960}.png`; clean-view capture is `clean-review-640.png`. Flattened/occluded pixels remain inherently ambiguous, and protection polygons conservatively keep some adjacent foliage fixed. Zero sampled deltas are technical evidence, not an aesthetic certification or a proof for every continuous simulation time.
