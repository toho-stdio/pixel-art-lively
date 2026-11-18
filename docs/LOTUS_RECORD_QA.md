# Lotus rig + Before/After record-prep integration QA

## Scope and decision

This pass resumed the existing uncommitted work without resetting, stashing, committing, or pushing anything. It made no rendering/source-art changes. Its tracked changes are the strengthened browser regression `scripts/lotus-record-check.js` and this report; the rest of the evidence is under `.artifacts/direction/lotus-record/qa/`.

The motion claim remains intentionally bounded to the clearly separable **left pond-side lotus cluster**: one open flower, its adjacent bud, two visible stem runs, and three selected pads/leaves. The right-bank/overlapping lotus groups are not rigged. Wind response remains subtle. Static Before is the approved original plate; After is the actual live scene (water plus selected environmental motion and the lotus rig), not a video or a fake simulated clip.

## Automated verification

- `npm test`: **24/24 PASS**.
- `npm run build`: PASS; TypeScript and `/`, `/study.html`, `/direction.html` Vite entries.
- `node scripts/check-direction-assets.mjs`: PASS at 640×360 and 960×540.
- `scripts/lotus-record-check.js` in isolated `agent-browser` session `ao-lang-record-script-final4-20260322`: **103/103 PASS**. Full JSON: `.artifacts/direction/lotus-record/qa/lotus-record-check-final.json`.
  - Verifies frozen-3047513 SHA-256 for original/environment/water mask at both grids; native mask dimensions and opaque binary grayscale; nonempty canopy/strand and disjoint selected flower/stem/leaf masks; minimum per-material motion signals and pixel-identical lower-stem attachment rows; fixed scenery and 20-second source/destination envelopes at wind 0.6 and 1.5; zero-wind byte identity; deterministic source and wipe registration at split 0/25/50/75/100; updated URL split values; and the live reflection proxy's projected flower/stem/leaf samples exactly match their current visible poses while changed source/water pixels stay in the expected lotus patch and authoritative water mask.
  - Reflection samples: at 640, 797 proxy-source pixels change only within x=92..181/y=1..53, and 160 masked water pixels change within the selected lotus x-neighborhood. At 960, 1,744 source pixels change only within x=139..272/y=2..80, and 428 masked water pixels change within the lotus x-neighborhood. This is a locality/registration check for the current projected source path, not a proof of a separately authored reflection plane.
- `scripts/live-art-check.js`: **83/83 PASS**; `scripts/polish-integration-check.js`: **65/65 PASS**; `scripts/renderer-check.js`: **23/23 PASS**; `scripts/direction-water-polish-check.js`: **32/32 PASS** (these were run against the same implementation in this resumed QA session).
- Home route `scripts/browser-check.js`: **25/25 PASS**, including pause, palette changes, all six effects, ripple, reset and no-overflow checks; reported render frame cost 8.8 ms. `/study.html` also loaded with its canvas and no horizontal overflow.
- Axe on comparison `#art-frame`: **0 violations, 0 incomplete checks**.

The extra hashes in the updated regression match commit `3047513` exactly at both grids. No canonical `original.png`, `environment.png`, or `mask.png` was edited.

## Interaction and record-prep checks

- Review route: `http://localhost:5173/direction.html?compare=1`; clean: `http://localhost:5173/direction.html?compare=1&clean=1`; share example: `http://localhost:5173/direction.html?compare=1&split=72&clean=1`.
- At 390×844, review and clean views had `scrollWidth === clientWidth` (390); at 1440-wide desktop there was no horizontal overflow. Clean canvas screenshots preserve the 16:9 composition.
- A trusted desktop mouse drag on the divider moved the wipe 50→72 and kept ripple count at 0. Slider keyboard Home/End reached exactly 0/100 and the displayed slider value followed. Water click was accepted; land click was rejected. Direct split links initialize and split changes update the URL.
- Clean pause/resume updated its accessible control label and paused state. In review mode the pause button kept both simulation time and rendered canvas bytes identical across a 450 ms wait; resume advanced again. Escape exited clean mode back to review while preserving the split parameter; reloading a `?split=72` URL restored the slider at 72.
- Comparison export was triggered through the actual **Tải PNG 1080p** button at fixed t=3.25. The downloaded files are 1920×1080, named for grid and split, and the export note identifies 3×/2× plus the current wipe. The generated image contains the current art-only wipe: browser Before/After labels and divider are not part of the canvas export.
- Exact pixel-block comparison against a saved native canvas verified **0 bad blocks** across all 2,073,600 export pixels for each file: 640×360 at 3× and 960×540 at 2×.
- Screenshot of the clean mode in this headless browser could not enter fullscreen: Chromium returned `TypeError: not granted` from `requestFullscreen()`. Escape clean-mode exit worked. A previous QA record reports fullscreen/ Escape success in its own browser, but it was not independently reproduced here.
- Touch drag and pointer-cancel were **not** verified on a physical touchscreen or iOS simulator: `agent-browser -p ios device list` returned `No sessionId in response`. The mouse path, keyboard path, endpoints and no-ripple divider behavior were verified; do not describe the touch/cancel path as physically tested.

## Visual evidence reviewed

The supplied temporary Before/After reference PNG was available and inspected. The review UI follows its registered center wipe, edge labels and round divider treatment. I inspected the full desktop comparison, mobile review, clean desktop/mobile canvas screenshots, actual downloaded 1080p exports, and native-derived left-lotus crops/contact sheets at both grids and both winds. In sampled crops the selected heads/pads remain visually connected; no obvious tears, holes, double heads, detached stems or ghost motion appeared. Motion is restrained rather than dramatic; temporal sheet differences can be subtle at overview scale.

- Review desktop: `.artifacts/direction/lotus-record/qa/comparison-desktop-final.png`
- Review mobile viewport: `.artifacts/direction/lotus-record/qa/review-mobile-final.png`
- Clean 16:9 desktop canvas: `.artifacts/direction/lotus-record/qa/clean-16x9-canvas-desktop.png`
- Clean 16:9 mobile canvas: `.artifacts/direction/lotus-record/qa/clean-16x9-canvas-mobile.png`
- Clean page/controls capture: `.artifacts/direction/lotus-record/qa/clean-desktop-final.png`
- Native-grid lotus close-ups: `lotus-crop-640x360-w06-t3_25-3x.png`, `lotus-crop-960x540-w06-t3_25-2x.png` in the QA directory.
- Temporal close-up sheets (t=0,5,10,15,20): `lotus-temporal-{640x360,960x540}-w{06,15}-crop-contact.png` in the QA directory.
- Actual downloaded exports, plus the matching fixed-time native sources: `.artifacts/direction/lotus-record/qa/downloads/` (`ao-lang-comparison-25-640x360-1080p.png`, `ao-lang-comparison-75-960x540-1080p.png`).

## Limits and later recording notes

- Aesthetic acceptance is still for the user; these checks establish technical behavior and inspect sampled frames, not final art-direction approval.
- Motion/reflection scope is one selected left lotus group. The existing global rear-plane water sampler still underlies the bounded lotus reflection proxy; nearby background samples can be replaced in that narrow source patch. No claim is made for a dedicated local lotus reflection plane or scene-wide lotus rigging.
- A later recording can start from the clean URL above, drag the divider, and pause on the small pause button; press Escape or **Exit clean view** to return to review. The app prepares a clean comparison and actual PNG only—**no video recording or encoding was performed**.
- Browser PNG evidence and checks are not physical-device profiling. Touch and successful fullscreen remain the outstanding browser-environment limits in this pass.
