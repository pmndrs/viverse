---
name: pmndrs-viverse
description: Build, modify, debug, or publish VIVERSE-ready web games and 3D apps with Three.js, React Three Fiber, @pmndrs/viverse, @react-three/viverse, VIVERSE SDK integrations, character controllers, physics, avatars, actions, animations, AR, or VR.
---

# VIVERSE Three.js

Use this skill for VIVERSE-ready Three.js and React Three Fiber apps. Use `@react-three/viverse` for React apps and `@pmndrs/viverse` for vanilla Three.js.

## Start Here

1. Inspect the app structure and package manager before editing.
2. Identify whether the task needs React Three Fiber or vanilla Three.js.
3. Pick the smallest relevant reference before inventing APIs.
4. Keep VIVERSE apps character-first: prefer the standard character/avatar path unless the requested controls or animation semantics require a custom controller.
5. Build game rules, sensors, UI, level geometry, and validation around normal user inputs and the visible player.
6. Validate live gameplay with the app's browser/runtime behavior, not only static state.
7. Use the bundled skill references and installed package types as the example source. For tutorial assets, use only exact asset URLs or package asset exports named by the references; you may download those binary assets into the app `public/` folder, but do not fetch remote example source unless the user explicitly asks for it.

## Reference Routing

- `references/getting-started.md`: installation, first scenes, basic examples.
- `references/components-and-hooks.md`: exact React component, hook, action, character, physics, and animation APIs.
- `references/gameplay-quality.md`: game architecture and validation heuristics for playable demos.
- `references/tutorials/index.md`: tutorial index. Read one focused tutorial file rather than loading all tutorials.
- `references/tutorials/custom-character-controller.md`: custom humanoid controller with BVH character physics, directional locomotion, camera aim, held items, and layered upper-body actions.
- `references/without-react.md`: vanilla Three.js usage.
- `references/publishing.md`: VIVERSE CLI, build output, app creation, publishing.

If unsure which reference applies, search first:

```bash
rg -n "SimpleCharacter|BvhPhysicsBody|avatar|actions|XR|publish" path/to/skill/references
```

## Architecture Defaults

- Wrap VIVERSE-aware React scenes in `<Viverse>`.
- Use `<SimpleCharacter />` for ordinary embodied React gameplay and `new SimpleCharacter(...)` for ordinary vanilla Three.js gameplay.
- Keep the standard character visibly embodied; do not hide it or use `model={false}` unless the user asked for a placeholder or non-avatar actor.
- Put collidable level geometry in `BvhPhysicsBody`; dynamic blockers should share the same collision truth used by character movement and game logic.
- Tune movement, camera, physics, animation, and input through supported character options and action bindings before reaching for low-level controller code.
- Choose the custom controller tutorial when a game needs custom model/clip stacks, directional strafe/backpedal clips, camera-relative aiming, held weapon actions, reload/shoot layers, or other animation semantics beyond `SimpleCharacter`.
- Treat third-person shooter, battle royale, Fortnite-style, and action-combat prompts as custom-controller tasks. Use the architecture from `references/tutorials/custom-character-controller.md`: VIVERSE character physics, model/provider, bone attachments, and animation actions/layers.
- Do not satisfy those prompts with only `<Viverse>`, `BvhPhysicsBody`, and a hand-rolled mesh/capsule player. The controllable player itself must use the VIVERSE character/controller/model/action/animation primitives.
- Use a loaded VIVERSE character model for custom controllers, such as `useCharacterModelLoader` or `loadCharacterModel`. Do not fabricate the player model by casting a `Group` of boxes/cylinders/spheres to `CharacterModel`.
- A custom combat controller is incomplete if it collapses the animation setup to an idle layer plus counters or weapon-only transforms. Adapt the reference lower-body and upper-body timelines, or an equivalent action-driven character/bone pose system, so movement, aim, attack, and reload visibly affect the character while the action is active.
- For held weapons, tools, lights, or props, attach a loaded asset (`<Gltf />`, `useGLTF`, or equivalent) under `CharacterModelBone`; primitive boxes/cylinders are placeholders, not a finished held item, when an asset or tutorial model exists.
- Crosshair shooting should use the full camera/player-view ray, including pitch; do not flatten the aim ray or choose a nearest target just because it is in front of the player. Validate at least one off-crosshair miss and one crosshair hit.
- Directional combat movement should visibly distinguish side/back/diagonal movement from forward movement through directional clips, animation weights, bone/model pose, or equivalent player-visible feedback.
- For games or interactive demos, read `references/gameplay-quality.md` before final validation.
- For greenfield apps, ask the package manager for current published versions and install a compatible set for `react`, `react-dom`, `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/viverse`, and companion packages such as `@react-three/timeline`; do not copy stale tutorial dependency caps or invent future ranges.
- If an existing app already uses an older compatible React/R3F stack, preserve that stack and add packages that match it.
- For TypeScript apps, include matching type packages such as `@types/react`, `@types/react-dom`, and `@types/three`.

## Constraints

- Do not set a `clientId` during local development unless the user explicitly asks for authenticated VIVERSE behavior.
- Do not ask for VIVERSE passwords, tokens, client secrets, or other credentials in prompts.
- Static BVH physics content inside `BvhPhysicsBody` and `BvhPhysicsSensor` should not structurally change after creation; use stable groups and visibility toggles when needed.
- When publishing, build first, then follow `references/publishing.md`.

## Before Finishing

Check the essentials:

- The app uses the intended VIVERSE runtime/library path for its framework.
- The player is visible, embodied, and driven by normal input/action bindings.
- Collision, sensors, shots, pickups, checkpoints, or blockers use one coherent gameplay truth.
- Meaningful mechanics are validated through live browser play, with assertions that would fail if the feature were missing.
- The saved `vitexec/play.ts` route reuses the same helpers and milestones proven by any disposable probes.
- The recorded route shows gameplay after readiness and can pass again without changing the app or weakening the route.
