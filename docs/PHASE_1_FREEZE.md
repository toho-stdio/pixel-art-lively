# Phase 1 freeze: approved live art direction

**Status:** Frozen for release and later polish. The user approved this current phase (“Ổn hơn nhiều rồi”). This freeze preserves that approved state; it is not a request to continue polishing now and does not select a final resolution or declare the visual work finished.

## Included boundary

- Keep the original home app (`/`) and the independent density study (`/study.html`) intact.
- Preserve the separate live art-direction page at `/direction.html`, with native 640×360 and 960×540 art-direction assets, water interaction, and its current controls.
- Track the exact canonical master and aligned terrain segmentation guide needed to reproduce the prepared runtime assets, without tracking the wider local `.artifacts` collection.
- Preserve existing project documentation, reference boards, source, tests, and asset preparation/check scripts. No runtime or visual implementation was changed for this release-hygiene task.

## Verification record

The checked-in QA record for the current implementation reports:

- `npm test`: 9 passing tests.
- `npm run build`: successful TypeScript check and Vite build.
- `node scripts/check-direction-assets.mjs`: both grids pass source hash, native dimensions, alpha/mask, palette, motion-mask and reflection-plane integrity checks.
- `scripts/live-art-check.js`: 59/59 browser assertions, including both grids, palettes, effects, wind, ripples, pause, exports, fullscreen, and desktop/mobile layout. The recorded QA explicitly bounds root motion to lower buttress pixels; roots are mask deformations, not articulated sprites.

QA details and caveats: `docs/LIVE_DIRECTION_QA.md`, `docs/LIVE_ASSETS_QA.md`, and `docs/VERIFICATION.md`. Build, unit tests, and the read-only asset checker are rerun for this release snapshot; browser regression evidence is the existing recorded evidence and is not represented as a newly rerun browser session.

## Known limits (intentionally not addressed by this freeze)

- No final preference between 640×360 and 960×540; neither grid is promoted as the canonical final choice.
- Aerial roots do not move. Lower buttress-root movement, canopy movement and lotus movement use bounded pixel masks, not detached/articulated sprites or underpainted cutouts; subtle deformation can expose image-integrity limits.
- The fixed rear-bank reflection plane and mask-derived shoreline are current approximations, not a general pond-authoring system.
- Water palette presets do not relight the environment. No GPU port, editor, gameplay character, production-device performance certification, or exact SpriteCook fidelity is claimed.
- Browser QA is not physical-device profiling. The visual direction remains open to later user-guided polish.

## Non-binding later-polish ideas

When work resumes, review the two grids side by side with the user, then decide whether any localized motion/reflection/shoreline refinement is worth doing. Keep the original route unchanged unless separately requested. Any future visual changes should be a new reviewed phase, preserve source provenance, and rerun relevant asset, renderer, UI, and browser checks. These ideas are not requirements or approval to start that work now.
