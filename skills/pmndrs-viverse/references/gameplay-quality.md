# Gameplay Quality

Use VIVERSE as the runtime and build games around a visible embodied player. Prefer the standard character for ordinary locomotion; choose a custom controller only when the requested mechanics need custom clips, layered animations, held items, camera-relative aim, or lower-level physics behavior.

## Mechanics

- Drive play through normal input bindings and actions. Use state reads for observation and assertions, not to bypass interaction.
- If built-in input bindings do not fit the game or validation environment, a custom input component is fine when it is the real user-facing control path and writes the same VIVERSE actions or character inputs the player uses. Do not add hidden test-only controls.
- Keep one gameplay truth for collision and interaction. Objects that block, trigger, damage, score, or get collected should participate in the same physics, sensor, raycast, or state path used by the player and validation.
- If you replace an unreliable sensor or collider with an explicit range/raycast rule, remove or restyle the old sensor so the scene does not present one interaction truth while validation uses another.
- If an object is presented as a wall, cover, platform, obstacle, door, hazard, or physical blocker, do not make it only visual or only a state/raycast rule. It should affect the player through the expected movement, physics, or sensor path unless the design clearly marks it as non-solid.
- If a dynamic physical door or gate is not robust, redesign it as a clearly non-solid activation effect, portal state, or light barrier; do not present it as a player-blocking door/gate unless collision is part of the same validated gameplay path.
- If validating contact with a moving obstacle or blocker, attach the evidence to that moving object, its sensor, or the collision path it uses. Do not prove moving-obstacle contact with a separate broad static zone.
- For `BvhPhysicsSensor`, use real trigger geometry that remains part of the BVH, and keep decorative meshes outside the sensor body. Avoid fully removed or hidden trigger meshes; prefer simple visible or nearly transparent boxes and prove intersection behavior with a preflight.
- Make mechanics visible in the scene. Counters alone do not prove pickups, shots, checkpoints, damage, building, stealth, racing, or victory.
- When a held tool, weapon, beam, or light causes a mechanic, compute that mechanic from the tool's world transform, aim ray, or light volume. Do not label a plain player-radius proximity check as torch reveal, weapon range, or tool use.
- Held weapons, tools, torches, and props should be loaded models when an asset exists or the tutorial provides one; primitive boxes/cylinders are only acceptable as explicit placeholders, not as finished character equipment.
- For pickups, stations, switches, doors, portals, badges, and completion effects, validate a mechanic-specific visual change such as object visibility/removal, material/emissive change, pose/scale/transform change, portal opening, or a focused screenshot/pixel region. HUD text, state flags, and generic nonblank-canvas checks are not enough by themselves.
- For sensors placed on a traversal path, prefer flat floor-aligned pads or planes over tall trigger volumes; route-test that the sensor does not catch or block the character while still triggering the mechanic.
- Keep the player/controller subtree stable while gameplay state changes. Avoid per-frame React state updates for character position or validation telemetry that remount/rebind input; use refs, external stores, or throttled snapshots instead.
- Keep static level collision mounted independently from suspense-heavy character models or asset loaders, so character physics does not simulate before the ground and blockers exist.
- If movement animation matters, drive actual animation actions, layers, masks, bones, or model transforms from movement/action values instead of setting labels only. If a movement probe samples `idle` while movement input is held, fix the animation/pose path before final validation.

## Common Game Shapes

- Obstacle course, platformer, parkour: use the standard character unless custom movement is the point; validate traversal, jumps, falls or hazards, checkpoints, and finish.
- Racing, time trial, checkpoint chase: validate route progression, checkpoint order, timing or score, collisions, and finish state.
- Collection or exploration: validate navigation to multiple pickups/areas, pickup visibility/removal, scoring, and completion.
- Physics puzzles: validate object movement through the same collision/sensor path the player uses, switch or pressure-plate activation, gate/key state, and exit completion.
- Social hubs or guided spaces: validate embodied navigation plus real interactions with NPCs, stations, emote/action pads, portals, badges, or tour milestones.
- Dark exploration or flashlight/torch games: attach the light/tool to the player or hand, keep the environment genuinely low-light, and validate that the held light itself visibly reveals paths, objects, hazards, or objectives during movement. In `vitexec/play.ts`, assert active visual evidence such as objective/path mesh visibility, scale, opacity, or material emissive values while the torch is revealing it.
- Combat or shooter: aim should come from camera/crosshair/player view; weapon feedback should be visible through held item, projectile/tracer, muzzle flash, impact, recoil, or target reaction.
- Third-person shooters, battle royale, and action-combat games should use the custom character controller architecture, including VIVERSE character physics, model/provider, bone attachments, and animation layers, when the game needs camera aim, directional combat movement, held weapons/tools, or attack/reload actions.
- Custom humanoid controllers should load a character model through VIVERSE model helpers. A homemade humanoid assembled from primitive meshes is not a substitute for the character model.
- When combat has aim, attack, reload, cast, or tool-use actions, connect those actions to visible weapon/tool pose, recoil, muzzle, upper-body, or character-layer feedback and validate the active frames, not only ammo or hit counters.
- For held weapons/tools under `CharacterModelBone`, use the hand attachment convention from the tutorials: local `+X` is side offset, local `+Y` is vertical/grip-up, and local `-Z` is forward/muzzle/aim direction. The tutorial `pistol.glb` has its barrel authored along model `+Y`, so `rotation-x={-Math.PI / 2}` maps it to attachment `-Z`; if another glTF is authored on a different barrel axis, rotate the wrapper so its muzzle also points `-Z`.
- For custom humanoid combat controllers, keep aim poses and tool overlays as separate animation layers: blend aim-up/forward/down with normal `CharacterAnimationAction`, then layer weapon/tool idle, shoot, reload, cast, or use clips with `AdditiveCharacterAnimationAction` against the forward aim reference pose.
- For recorded gameplay, pace the final route so a viewer can see each mechanic happen; do not compress traversal, aiming, attacks, reloads, blockers, and victory into a rapid state-machine run.
- Keep full gameplay routes representative, not repetitive. Prove each major mechanic with the smallest meaningful count, such as one miss, one block, one pickup, a few successful interactions, and completion, rather than adding extra targets or waypoints that only increase route brittleness.
- Do not satisfy minimum recording duration by idling after completion or victory. Pace traversal and mechanic dwell time before completion so the video shows representative play throughout.
- Shooter validation should prove aim fidelity: an off-crosshair shot should miss or be blocked, and a correctly aimed shot should hit. Avoid flattened aim rays or nearest-target hit selection unless the game explicitly has lock-on targeting.
- For camera-aim validation, use the same aim input a player would use. Prefer pointer/mouse-look controls for shooters; if keyboard aim is also a real control path, set its sensitivity and target margins before the first full-route rehearsal so precise crosshair hits do not require post-rehearsal control retuning.
- If the saved route needs adaptive crosshair aiming, expose observable screen-space aim evidence such as target projection, aim error, or camera ray distance during implementation/preflight. Do not add new aiming telemetry after the first full-route rehearsal.
- Match saved-route aim tolerances to the actual gameplay hit volume. Do not make the validation helper stricter than the shot rule; if the camera ray is already inside the visible hit volume, take the shot and assert the gameplay result instead of chasing exact screen-center alignment.
- Keep combat routes and targets inside generous camera-control margins. Do not place required hits so close, high, low, or occluded that the validation route must aim at pitch/yaw limits or thread a narrow collision gap.
- Keep the complete validation route playable rather than precision-scripted. Preflight the finish/completion path before the first full-route rehearsal, and place the final objective so it remains reachable with ordinary movement after the last major mechanic.
- Directional movement validation should prove visible side/back/diagonal feedback when the game uses combat strafing, not just that the player position changes sideways.
- Building or dynamic cover: build previews may be visual, but placed objects that block the player or shots must become collidable or otherwise share the gameplay collision path.
- AR, VR, avatar, publishing, or vanilla Three.js tasks: route to the specific tutorial/reference for that topic.

## Validation

- Create a `vitexec` script for repeatable gameplay validation when the task asks for a playable game or demo.
- Use sustained, human-like input over real frames/time; include early, middle, and final milestones.
- Assert the core mechanics directly. Examples: checkpoint order, pickup count, hazard collision, lap completion, target hit, blocked shot, player-body collision, animation/pose evidence, score/victory.
- For collection and interaction games, pair state assertions with visible before/after evidence for representative pickups, activated stations, opened gates, or completion effects.
- Match validation to the game shape. A good route for a parkour course proves traversal and hazards; a racing route proves checkpoint order and timing; a puzzle route proves object/switch/gate causality; a social route proves actual station/NPC/pad interactions.
- Include browser visual evidence when visual behavior matters: canvas pixels, screenshot, recording, WebGL state, or an active-frame visual probe.
- For visual mechanics, capture evidence during the active mechanic window: before/after pixels, focused screenshot regions, or actual rendered object material/visibility state read from refs or the Three scene. A final screenshot plus computed snapshot flags is not enough.
- Before freezing a final route, use disposable probes to learn readiness, focus target, input signs, timing, and visual evidence windows.
- Save long route rehearsals as `vitexec/rehearsal.ts` with bounded per-step loops and milestone logs; avoid huge inline vitexec scripts for full gameplay routes. Once the rehearsal passes, copy the same route and assertions into `vitexec/play.ts`.
- For traversal-heavy games, probe representative segments before a full-route rehearsal: spawn settling, each jump or narrow obstacle type, hazard/reset behavior, checkpoint sensors, and finish trigger. If a segment is physically brittle, make the level more playable rather than baking a fragile route.
- Once a complete rehearsal works, save that same route into `vitexec/play.ts` and run the saved file by path. Reuse the same assertion timing, thresholds, helpers, and evidence checks; do not add stricter active-frame assertions while freezing the file unless those exact checks already passed in rehearsal.
- After copying a passing rehearsal into `vitexec/play.ts`, run `vitexec/play.ts` next; do not insert extra smoke, screenshot, or one-off probes between the proven route and the saved-route run.
- After a full-route rehearsal starts, avoid new one-off probes. If repeated rehearsal reruns keep failing on route precision, report the validation shortcoming or simplify the route before restarting from preflight.
- Treat navigation, dev-server reconnects, page errors, or frozen video during recording as failed visual evidence; produce a clean replay or report the limitation.
- Keep final visual assertions stable under recording replay. Prefer screenshots, recordings, WebGL state, or app-visible state over fragile canvas readback unless the canvas is configured and proven reliable.
- Run the production app build before the first full route. If the `vitexec` script uses browser-root imports such as `/src/...`, keep it outside the app TypeScript build before final validation starts.
- Finalize package scripts, dependencies, and TypeScript config before the first full route. After that route runs, do not edit the app or validation setup except to report a limitation.
- After the first full-route rehearsal starts, keep gameplay geometry, target sizes, target positions, win conditions, route intent, aim criteria, evidence criteria, and assertion meanings stable. Rehearsal input timing/helper fixes are acceptable if they preserve the same route and assertions; app/game retuning is not. Do not widen targets, move goals, loosen hit tolerances, or retune thresholds just to pass.
- Start recording after the app is ready and the camera has settled enough to show the avatar, world, and active mechanics.
