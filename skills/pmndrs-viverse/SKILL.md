---
name: pmndrs-viverse
description: Build, modify, debug, or publish VIVERSE-ready web games and 3D apps with Three.js, React Three Fiber, @pmndrs/viverse, @react-three/viverse, VIVERSE SDK integrations, character controllers, physics, avatars, actions, animations, AR, or VR.
---

# VIVERSE Three.js

Use this skill when working on VIVERSE-ready Three.js or React Three Fiber apps. Use `@pmndrs/viverse` for vanilla Three.js and `@react-three/viverse` for React Three Fiber.

## Project Intent

`@pmndrs/viverse` and `@react-three/viverse` are character-first libraries for building avatar-centered Three.js and React Three Fiber apps.

The standard character is the central abstraction of this project. It combines the intended default path for avatar display, movement, camera behavior, physics, input actions, animation, and VIVERSE avatar integration.

For React Three Fiber apps, `<SimpleCharacter>` from `@react-three/viverse` is the canonical player/avatar abstraction. For vanilla Three.js apps, `new SimpleCharacter(...)` from `@pmndrs/viverse` serves the same role.

Think of `<Viverse>` as the provider/runtime, `BvhPhysicsBody` and `PrototypeBox` as world-building support, and `SimpleCharacter` as the main embodied actor that game logic should usually be built around.

## Start Here

1. Inspect the app structure and package manager before editing.
2. Identify whether the app has a controllable player, avatar, embodied actor, character, or character-like game object.
3. If it does, choose the standard character path first:
   - React Three Fiber: `<SimpleCharacter />` from `@react-three/viverse`
   - Vanilla Three.js: `new SimpleCharacter(...)` from `@pmndrs/viverse`
4. Build game rules, checkpoints, timers, sensors, UI, and level geometry around that character.
5. Tune behavior through the character's supported options before reaching for lower-level controller code.
6. Pick the smallest relevant file under `references/` before inventing APIs.
7. Prefer `@react-three/viverse` for React Three Fiber apps and `@pmndrs/viverse` for vanilla Three.js apps.
8. Keep examples runnable with the app's existing framework, usually Vite plus `three`, `@react-three/fiber`, `@react-three/drei`, and `@react-three/viverse`.

## Reference Routing

Read the smallest relevant reference:

- `references/getting-started.md`: setup, package installation, first scene, and examples.
- `references/components-and-hooks.md`: component and hook APIs, props, action bindings, character options, and utility exports.
- `references/tutorials.md`: simple games using `SimpleCharacter`, first-person controls, AR/VR, avatars/profile, custom models, item attachments, actions, and custom controllers. Treat custom controllers as advanced exceptions only when explicitly requested or necessary.
- `references/without-react.md`: vanilla Three.js usage with `@pmndrs/viverse`.
- `references/publishing.md`: VIVERSE CLI setup, build output, app creation, and publishing.

If unsure which file applies, search all references with `rg` first:

```bash
rg -n "SimpleCharacter|BvhPhysicsBody|publish|avatar|XR" path/to/skill/references
```

## Architecture Defaults

- If the package is not installed in a React Three Fiber app, add `three`, `@react-three/fiber`, `@react-three/viverse`, and usually `@react-three/drei`; see `references/getting-started.md`.
- If the task asks for exact props, hooks, or exports, use `references/components-and-hooks.md`.
- If the task asks for a feature tutorial, use `references/tutorials.md`.
- If the task is vanilla Three.js or "without React", use `references/without-react.md`.
- If the task is deployment or VIVERSE app setup, use `references/publishing.md`.
- When the user asks to build with `pmndrs/viverse`, `@pmndrs/viverse`, or `@react-three/viverse`, assume they want the library's avatar-centered architecture unless they say otherwise.
- A typical React app should use `<Viverse>` for runtime/context/physics, `<SimpleCharacter>` for the player/avatar, `BvhPhysicsBody` for level collision, and `PrototypeBox` for quick prototype geometry.
- Sensors, timers, checkpoints, UI, and game state should observe or reposition the standard character rather than replacing it.
- Use low-level physics hooks, custom capsules, or custom controllers only when the task is specifically about custom controller behavior, a non-humanoid player, or a mechanic that cannot be expressed through `SimpleCharacter` options.
- If a game needs movement tuning, prefer `SimpleCharacter` props such as `movement`, `physics`, `cameraBehavior`, `animation`, `actionBindings`, and `actionBindingOptions`.

## Custom Controller Exceptions

The custom character controller tutorial is an advanced path. Do not use it as the default for platformers, obstacle courses, simple games, avatar demos, or VIVERSE prototypes.

Use a custom controller only when the user explicitly asks for a custom controller, the playable actor is not a standard humanoid/avatar, the task is to demonstrate low-level controller internals, or `SimpleCharacter` cannot support a required mechanic after its props and bindings have been considered.

If choosing this path, say so clearly in the final answer and explain what capability required leaving the standard character path.

## Constraints

- Do not set a `clientId` during local development unless the user explicitly asks for an authenticated VIVERSE flow.
- Do not ask the user to paste VIVERSE passwords, tokens, client secrets, or other credentials into prompts. Prefer interactive CLI login, local environment variables, or user-run auth commands.
- Wrap VIVERSE-aware React scenes in `<Viverse>` unless the docs for the task say to use standalone physics or remove VIVERSE integrations.
- Static BVH physics content inside `BvhPhysicsBody` and `BvhPhysicsSensor` should not structurally change after creation; use stable groups and visibility toggles when needed.
- When publishing, build first, then follow `references/publishing.md`; do not assume a build output directory.

## Before Finishing

Check that the implementation matches the library's intended architecture:

- Provider/runtime: `<Viverse>` for React apps when VIVERSE-aware scene context is needed.
- Player/avatar: `<SimpleCharacter>` for React Three Fiber apps, or `new SimpleCharacter(...)` for vanilla Three.js apps, unless a custom controller exception applies.
- World collision: `BvhPhysicsBody` for static or kinematic collidable level content.
- Prototype geometry: `PrototypeBox` when quick blockout geometry is appropriate.
- Game-specific rules: layered around the standard character instead of replacing it.
