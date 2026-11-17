# Applied direction A — cluster-first afternoon

> Updated workflow: the user logged into a dedicated headed ChatGPT browser and authorized agent-controlled generation of multiple separate layers. Successful original PNGs and provenance are tracked in `ART_GENERATION_LOG.md`; reusable briefs are in `ART_ASSET_PROMPTS.md`. The single-plate API plan below is historical. All spawned implementation agents were stopped; do not assume their preliminary files are integrated. No final resolution or baseline replacement is approved.

User explicitly requests one research/docs-grounded direction applied visibly for THEIR judgment. Do not replace delivery with a recommendation to retain the old version. Retain old routes for reversibility but ship a materially distinct candidate at direction.html.

## Chosen method
640×360 native, 1920×1080 integer3× export. Connected pixel clusters, clear silhouette and volume before texture, one warm upper-left light and cooler occlusion; calm static-readable compressed reflection before low-amplitude motion. These are documented practices, not proof that the resulting aesthetic is superior.
Primary readings fetched: PixelJoint cure tutorial (.firecrawl/pixeljoint-clusters.md), SLYNYRD Pixelblog10 (.firecrawl/slynyrd-water-motion.md); SpriteCook companion architecture already docs/WATER_REFERENCE.md.

## Artwork pipeline
Use the original reference boards for Vietnamese materials and a bounded one-image environmental art plate generation. Main owns this generation. Source plate is artwork ONLY, with a deliberately flat vivid-magenta pond reserved as a chroma mask; no baked water/reflection/ripples. Process to native640×360 with an explicit limited environmental palette (no diffusion dithering), extract binary water mask, preserve lotus holes. Runtime water is still a procedural ten-color indexed buffer with interactive ripples, sky/depth/contact and live row-distorted reflection. This follows SpriteCook's separation of environmental asset generation from procedural water, not a static animated photograph.

Main will provide generated source path to asset agent. Do not generate images independently or pay for retries. If generation fails, coordinate an explicit fallback; do not pretend art was generated.

## Contract and ownership
- Asset agent: scripts/prepare-direction-assets.mjs and src/direction/scene.ts only. Outputs public/art-direction/environment.png (transparent WATER, opaque environment), mask.png (white water/black land), palette.json metadata. Export async createDirectionScene():Promise<StudyScene> at native640×360, camera=createCamera(640,360). Derive bankY from binary mask; ground opaque underpainting, objects native environment cutout so water is not covered, foreground empty or reconstructed as needed. Warm lighting is baked only into environment. Wind subtle, canopy only above bank; held time deterministic.
- Water agent: src/direction/water.ts only. Export createDirectionWaterRenderer(scene:StudyScene):WaterRenderer. Reuse study water if helpful but suppress geometric foreground sine patches. Calm teal ramp, readable reflection with distortion0 truly flat, default1px at640,10Hz stable water. Fixed mirror plane initially worldy190(native171), never variablebankY; align to actual art after inspection. All effects clipped and ten colors exact.
- Main: image generation, UI direction.html/main/style, build config, captures and validation.
- Evaluator: docs/ART_DIRECTION_QA.md and source grounding; do NOT choose art direction for the user.

## Deliverable
Live default candidate plus quick before/candidate toggle and same-time export pair. Pause/static reflection control, click/drag water, wind, PNG1080p, original/density routes still available. View actual images; user decides aesthetic. One direction, not four new styles or endless revision loops.
