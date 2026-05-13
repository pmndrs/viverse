---
name: vitexec
description: Use this skill when an AI agent needs to inspect, verify, debug, or profile a live Vite app by running temporary snippets inside the browser page and reading browser logs or captured artifacts. Use for client state after interactions, imported app modules, DOM state, human-like input, canvas/WebGL/Three.js state, screenshots, videos, CPU/network/performance/heap analysis, WebXR/Three.js XR with IWER, and runtime-only behavior without editing app files.
---

# vitexec

Use `vitexec` when the truth lives in the running browser: client state, imported app modules, DOM, canvas/WebGL, screenshots, recordings, or browser-only errors.

For visual validation, prefer `vitexec` over manual Playwright and raw Vite usage. This includes screenshots, mobile or responsive checks, canvas pixel checks, WebGL/Three.js rendering checks, animations, gameplay validation, and recorded videos.

Vitexec starts and stops the Vite server itself. Do not run `npm run dev`, `pnpm dev`, `vite`, or any other long-running dev server for validation unless the user explicitly asks for manual server control.

After the requested vitexec validation passes, finish; do not add extra manual Playwright or Vite checks. Use vitexec itself for any additional browser evidence.

When adding vitexec to package.json, use the latest published package, for example `npm install -D vitexec`; do not invent a version range.

For repeatable or requested validations, create a script under `./vitexec/*.ts` and run that file with `vitexec`. Do not treat a one-off inspection or progress note as a substitute for the requested script.

Run saved scripts by passing the file path to vitexec, for example `vitexec --gpu ./vitexec/play.ts`. Do not inline a saved file with shell command substitution such as `vitexec "$(cat vitexec/play.ts)"`.

Before driving input, wait for the page, interactive target, and runtime bindings/state to be mounted; fix early-input failures by waiting for readiness, not by bypassing user interaction.

Do not broaden app input handlers or add test-only global fallbacks to satisfy automation; drive the same focused DOM target and action path a real user uses, or report the validation shortcoming.

Do not broadcast the same keyboard event to `window`, `document`, `body`, and `canvas` to make input work. Focus the correct target, probe/calibrate if needed, and dispatch one real user-like event path.

If synthetic pointer events collide with browser pointer-capture APIs, keep the app unchanged and handle that inside the vitexec script. Use the app's normal click path when possible; otherwise temporarily override `setPointerCapture`/`releasePointerCapture` before dispatching synthetic events, even when native methods exist, because native capture can throw for synthetic pointer ids.

For full gameplay validation, script a representative user session over real frames/time with sustained, overlapping controls, meaningful traversal, visible interactions, major mechanics, failure/victory conditions, and clear milestone logs. Assertions should fail with thrown errors; do not shrink the scenario, move goals, change combat routes, swap evidence criteria, or lower thresholds just to make the script pass.

After the first full-route rehearsal starts, keep gameplay geometry, target sizes, target positions, win conditions, route intent, aim criteria, evidence criteria, and assertion meanings stable. Rehearsal input timing/helper fixes are acceptable if they preserve the same route and assertions; app/game retuning is not. Do not widen targets, move goals, loosen hit tolerances, or retune thresholds just to pass.

After the first full gameplay validation run, treat game rules, level layout, win conditions, and assertion thresholds as stable; validation failures should lead to real implementation/input fixes or an explicit reported shortcoming, not test-contaminating retuning.

Use focused preflight probes before the first full run to learn normal input behavior: canvas focus, movement direction, camera key signs/granularity, aimed-shot accuracy, animation evidence timing, and victory trigger conditions. Once the full `./vitexec/*.ts` route starts, keep route logic, aim criteria, visual evidence criteria, assertion timing/thresholds, victory completion, and assertion meaning stable.

Keep disposable inline probes short. For any full-route rehearsal or script with route-following loops, save it as `./vitexec/rehearsal.ts` and run that file by path, with bounded per-step loops and milestone logs. After it passes, copy the same route and assertions into `./vitexec/play.ts` and run that file by path.

It is fine to leave `./vitexec/rehearsal.ts` in the project after `./vitexec/play.ts` passes. Do not edit or clean up app, package, or validation files after the first full `./vitexec/play.ts` run.

After a full-route rehearsal starts, do not run new one-off probes; rerun the saved rehearsal/play route or report the shortcoming. If repeated full rehearsals keep failing on route precision, the route is brittle and should be simplified before restarting from preflight.

For 3D gameplay, include browser visual evidence such as a screenshot, recording, canvas pixel check, or WebGL state check; state logs alone do not prove the scene is visibly playable.

Treat navigation, dev-server reconnects, page errors, or frozen video during recording as failed visual evidence; produce a clean replay or report the limitation.

For shooter-style validation, capture a screenshot/video frame or pixel-check the canvas immediately while shot feedback is active, such as muzzle flash, projectile/tracer, impact, hit marker, or enemy reaction; startup/final screenshots and final hit counters alone are not visual proof. Pick the visual metric before the first full run, then improve the visible effect or capture timing rather than loosening the assertion.

For third-person shooter validation, drive camera/aim input immediately before a specific shot and verify that shot follows the camera/crosshair rather than a nearest-target shortcut. Keep aim tolerance stable after the first full run. Include a short aiming segment with pure lateral input (`A` or `D` without `W`/`S`) when strafing or combat movement matters, assert lateral displacement dominates camera-forward drift, and validate reload/firing animation with explicit active-frame evidence such as before/during weapon or hand pose, recoil transform, muzzle movement, animation state, or focused pixels. Ammo counters and generic shot pixels alone are not enough.

For combat movement validation, include pure lateral or backward input and assert the visible character pose while that input is held. A forward-only traversal route is not enough.

If pointer movement is hard to synthesize reliably, validate through normal app camera-aim bindings such as keyboard yaw/pitch actions instead of adding test-only camera setters.

The same `./vitexec/*.ts` gameplay script should pass a clean rerun or recording replay. If it is nondeterministic, fix route-following, held-key cleanup, camera recovery, or terrain robustness instead of raising radii/timeouts.

When the browser must run outside the current process or container, connect to a remote Playwright browser with `--browser-ws-endpoint` or `VITEXEC_BROWSER_WS_ENDPOINT`. If that browser needs to reach a Vite server on the vitexec side, also pass `--browser-expose-network <loopback>` or `VITEXEC_BROWSER_EXPOSE_NETWORK=<loopback>`.

Do not use it for questions static files, unit tests, or TypeScript can answer directly.

## References

- For mouse, keyboard, pointer lock, gamepad, or other input, read [references/inputs.md](references/inputs.md).
- For CPU, network, performance timeline, or heap analysis, read [references/performance.md](references/performance.md).
- For WebXR, read [references/webxr.md](references/webxr.md).

## Workflow

1. Identify the page path if it is not `/`.
2. Write the smallest snippet that performs the user-like action or reads the browser-only state.
3. Run `vitexec '<snippet>'`, adding `--path`, `--gpu`, `--screenshot`, `--record`, `--cpu-profile`, `--network-trace`, `--performance-trace`, `--heap-snapshot`, `--timeout`, or `--config` only when needed.
4. Treat stdout as browser logs. It starts with `logs:`.

If you need a screenshot, video, viewport check, canvas/WebGL evidence, or direct browser observation, use vitexec options and in-browser snippets. Do not start Vite manually or import Playwright directly for those checks.

If `vitexec` itself is missing, install `vitexec` with the package manager already used by the project.

```sh
vitexec 'console.log("ready")'
```

For structured state, log JSON:

```sh
vitexec --path /cart '
  import { useCartStore } from "/src/store/cart.ts";
  document.querySelector("[data-testid=add-to-cart]")?.click();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  console.log("cart", JSON.stringify(useCartStore.getState()));
'
```

## Guidance

- Prefer importing exported app state over scraping DOM when state is available.
- Use direct state reads for observation and assertions, not to bypass user interaction.
- Use live progress logs and focused assertions to early-exit on failures and see current progress.
- Keep logs concise; overly verbose logs become unreadable and unnecessarily fill the context.
- Prefer browser-root imports such as `/src/store.ts`, not local filesystem paths.
- Use `--gpu` for WebGL, canvas, Three.js, and WebXR behavior.
- Use screenshots or recordings only when visual evidence matters.
- For visual evidence, use `vitexec --screenshot`, `vitexec --record`, or a vitexec snippet that reads DOM/canvas/WebGL state before considering any lower-level browser automation.
- For durable gameplay, visual, or regression checks, prefer `./vitexec/<name>.ts` scripts over inline snippets.
- Do not leave temporary code in the app when `vitexec` can inspect it from outside.
