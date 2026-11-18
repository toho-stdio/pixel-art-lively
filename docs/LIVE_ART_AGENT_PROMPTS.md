# Ao Làng live art: agent prompt pack

Replace the bracketed fields, then copy one brief per agent. Run diagnosis first, implementation second, and independent QA last. Give each agent the previous handoff, not just a screenshot. Use [the workflow guide](LIVE_ART_WORKFLOW.md) for setup, commands, debug colors, and evidence to collect. For fresh image generation rather than code or motion work, use the distinct [layered image prompt pack](ART_ASSET_PROMPTS.md).

## Prompt 1 — Diagnose the seam without editing

```text
Investigate a suspected motion leak in Ao Làng /direction.html.
Symptom: [what moves incorrectly]. Location: [native coordinate, object name,
or attached screenshot]. Baseline: [revision].

Read AGENTS.md, docs/LIVE_ART_WORKFLOW.md, and docs/FOLIAGE_ISOLATION.md.
Work read-only except for local artifacts. Use a dedicated agent-browser
session. Reproduce on the live After canvas, not the static Before image.
Capture the actual frame and a nearest-neighbor crop at fixed simulation time.
Compare calm, default, and max wind on 640×360 and 960×540; include a pose on
each side of the sway. Record settings and coordinates.

Distinguish four possibilities: misclassified source pixels, transformed
writes on fixed art, an underpaint or draw-order problem, or an expected water
reflection. Use the ownership checker/overlay and inspect the actual final
canvas. Check feature edges (ridge ornament, eaves, trunk/bough junction), not
just a convenient interior rectangle. A zero count only covers the existing
owner profile and sampled poses; it does not disprove the reported artifact.

Return confirmed findings versus hypotheses, the clearest repro pose, native
coordinates, proposed object ownership, and paths to before evidence. Do not
modify tracked files, reduce wind to hide the issue, commit, push, or record.
```

## Prompt 2 — Fix one motion ownership issue

```text
Fix [confirmed issue] in Ao Làng /direction.html, using [baseline revision]
and [diagnosis/evidence paths]. Keep the fix scoped to [objects/coordinates].
Read AGENTS.md, docs/LIVE_ART_WORKFLOW.md, and docs/FOLIAGE_ISOLATION.md.

Author protected silhouettes from the approved image independently of motion
eligibility. Keep canopy and thin hanging strands separate from the roof,
main boughs, trunk, buttresses, shore, and fixed lotus. Strictly reject both a
source owned by fixed art and a transformed destination that would overwrite
fixed art. Audit the underpaint and actual layer order; do not move another
object's texture, create halos, or retain a second static silhouette. Keep
ambiguous flattened edges fixed if they cannot be classified safely.

Preserve visible default-wind motion in all four canopy zones, fixed anchors,
integer/native grids, binary alpha, deterministic simulation, zero-wind dry
identity, live reflections, the left lotus rig, and ambient ripples. Keep the
approved original/environment/mask byte-identical on both grids. Keep Before
static and registered with After; don't change / or /study.html. Do not
regenerate the master or change unrelated water/UI behavior.

Use scripts/prepare-direction-assets.mjs --motion-only for derived assets.
Run assets, unit tests, build, and browser checks from the workflow guide.
Save same-pose before/after native crops and an overlay for both grids. Report
exact files, coverage and verification results, a repeatable command, and
remaining ambiguous seams. Do not commit or push unless authorized.
```

## Prompt 3 — Independently verify the fix and the debug checker

```text
Independently review [patch/revision] against [diagnosis and evidence paths].
Do not use the implementation report as test evidence. Read AGENTS.md and
follow docs/LIVE_ART_WORKFLOW.md in a fresh named browser session.

Check authored protection against the approved image, including the affected
silhouette edges. Don't infer the fixed mask as the inverse of moving pixels.
At 640×360 and 960×540, sample wind 0, 0.6 and 1.5, both sway directions and
at least a full motion cycle. Check accepted source, transformed destination,
underpaint footprint, and composited dry pixels. Compare the debug composite
with the actual canvas in full After at matched poses; exclude water using the
canonical mask. If a protected pixel changes, report owner, native x/y, grid,
wind, time, and first failing stage. Verify the approved zero-wind dry pose,
nonempty motion in every canopy zone, and that the scan includes the original
problem area. Confirm a known one-pixel change is caught; state whether the
fault was injected into a copied composite or the production path.

Review actual normal-scale frames plus native crops of roof/eaves, trunk/bough,
and the reported seam, checking for halos, ghost pixels, and detached edges.
Run check-direction-assets, npm test, npm run build, the foliage and visible
motion browser checks, and relevant lotus/water/comparison regressions. Inspect
returned failed counts, not only CLI exit status. Preserve the home/study routes
and existing controls. Never weaken an existing invariant to obtain a pass.

Return pass/fail with exact counts and scope, commands, and artifact paths.
Separate sampled technical results from aesthetic approval. Flag unverified
scenes, poses, device behaviors, and any remaining defects. No commit, push,
or actual video capture unless authorized.
```

## Suggested handoff format

```text
Baseline / candidate revision:
Affected object and coordinate space:
Repro settings (grid, wind, simulation time, split):
Confirmed cause / other hypotheses:
Files or masks changed:
Native before/after and overlay paths:
Checks (command, pass/fail count, sample range):
Still visible, unverified, or intentionally frozen:
```
