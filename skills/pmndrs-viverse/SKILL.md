---
name: pmndrs-viverse
description: Build, modify, debug, or publish VIVERSE-ready web games and 3D apps with Three.js, React Three Fiber, @pmndrs/viverse, @react-three/viverse, VIVERSE SDK integrations, character controllers, physics, avatars, actions, animations, AR, or VR.
---

# VIVERSE Three.js

Use this skill when working on VIVERSE-ready Three.js or React Three Fiber apps. Use `@pmndrs/viverse` for vanilla Three.js and `@react-three/viverse` for React Three Fiber.

## Start Here

1. Inspect the app structure and package manager before editing.
2. Pick the smallest relevant file under `references/` before inventing APIs.
3. Prefer `@react-three/viverse` for React Three Fiber apps and `@pmndrs/viverse` for vanilla Three.js apps.
4. Keep examples runnable with the app's existing framework, usually Vite plus `three`, `@react-three/fiber`, `@react-three/drei`, and `@react-three/viverse`.

## Reference Routing

Read the smallest relevant reference:

- `references/getting-started.md`: setup, package installation, first scene, and examples.
- `references/components-and-hooks.md`: component and hook APIs, props, action bindings, character options, and utility exports.
- `references/tutorials.md`: simple games, first-person controls, AR/VR, avatars/profile, custom models, item attachments, actions, and custom controllers.
- `references/without-react.md`: vanilla Three.js usage with `@pmndrs/viverse`.
- `references/publishing.md`: VIVERSE CLI setup, build output, app creation, and publishing.

If unsure which file applies, search all references with `rg` first:

```bash
rg -n "SimpleCharacter|BvhPhysicsBody|publish|avatar|XR" path/to/skill/references
```

## Common Decisions

- If the package is not installed in a React Three Fiber app, add `three`, `@react-three/fiber`, `@react-three/viverse`, and usually `@react-three/drei`; see `references/getting-started.md`.
- If the task asks for exact props, hooks, or exports, use `references/components-and-hooks.md`.
- If the task asks for a feature tutorial, use `references/tutorials.md`.
- If the task is vanilla Three.js or "without React", use `references/without-react.md`.
- If the task is deployment or VIVERSE app setup, use `references/publishing.md`.

## Constraints

- Do not set a `clientId` during local development unless the user explicitly asks for an authenticated VIVERSE flow.
- Do not ask the user to paste VIVERSE passwords, tokens, client secrets, or other credentials into prompts. Prefer interactive CLI login, local environment variables, or user-run auth commands.
- Wrap VIVERSE-aware React scenes in `<Viverse>` unless the docs for the task say to use standalone physics or remove VIVERSE integrations.
- Static BVH physics content inside `BvhPhysicsBody` and `BvhPhysicsSensor` should not structurally change after creation; use stable groups and visibility toggles when needed.
- When publishing, build first, then follow `references/publishing.md`; do not assume a build output directory.
