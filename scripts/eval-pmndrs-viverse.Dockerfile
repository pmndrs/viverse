FROM node:22-bookworm-slim

ENV SHELL=/bin/bash

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates curl git procps ripgrep zsh \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
  && corepack prepare pnpm@9.4.0 --activate \
  && npm install -g @openai/codex@0.128.0

RUN cat > /usr/local/bin/install-vitexec-skill <<'EOF' \
  && chmod +x /usr/local/bin/install-vitexec-skill
#!/usr/bin/env bash
set -euo pipefail

npx --yes skills add drawcall-ai/vitexec --yes

node --input-type=module <<'NODE'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const notes = [
  "vitexec doesn't require a running Vite server. Do not start or leave running a Vite server, including after validation.",
  "After the requested vitexec validation passes, finish; do not add extra manual Playwright or Vite checks. Use vitexec itself for any additional browser evidence.",
  "When adding vitexec to package.json, use the latest published package, for example `npm install -D vitexec`; do not invent a version range.",
  "Before driving input, wait for the page, interactive target, and runtime bindings/state to be mounted; fix early-input failures by waiting for readiness, not by bypassing user interaction.",
  "Use focused disposable preflight probes before writing or running the final `vitexec/play.ts` route: readiness, focus target, input direction/signs, mechanic timing, visual evidence windows, collision/sensor behavior, and victory or completion trigger. The first `vitexec/play.ts` run freezes route logic, evidence criteria, completion conditions, and assertion meaning; if it fails, fix implementation/input issues or report the shortcoming.",
  "Before the first full `vitexec/play.ts` run, preflight the critical route segments that could invalidate gameplay, such as hazards, checkpoints, combat encounters, pickups, gates, jumps, blockers, late-route traversal, and finish triggers. Do not treat an early partial route as proof that the finish path works. The full route should be the last validation step, not the first time pathing and obstacle timing are tried together.",
  "Preflight the exact saved-route helpers, tolerances, and first/late waypoint coordinates before the first full `vitexec/play.ts` run. Nearby probe coordinates or different navigation helpers do not prove the saved route will pass.",
  "Before saving `./vitexec/play.ts`, run one disposable rehearsal of the same full route in order with the same helpers and assertions; isolated segment probes do not prove accumulated gameplay state.",
  "After the first full-route rehearsal starts, keep gameplay geometry, target sizes, target positions, win conditions, route intent, aim criteria, evidence criteria, and assertion meanings stable. Rehearsal input timing/helper fixes are acceptable if they preserve the same route and assertions; app/game retuning is not. Do not widen targets, move goals, loosen hit tolerances, or retune thresholds just to pass.",
  "After a full-route rehearsal starts, do not run new one-off probes; rerun the saved rehearsal/play route or report the shortcoming. If repeated full rehearsals keep failing on route precision, the route is brittle and should be simplified before restarting from preflight.",
  "Once a complete rehearsal works, save that same route into `./vitexec/play.ts` and run the saved file by path. Reuse the same assertion timing, thresholds, helpers, and evidence checks; do not add stricter active-frame assertions while freezing the file unless those exact checks already passed in rehearsal.",
  "Do not broaden app input handlers or add test-only global fallbacks to satisfy automation; drive the same DOM target and action path a real user uses, or report the validation shortcoming.",
  "Do not broadcast the same keyboard event to `window`, `document`, `body`, and `canvas` to make input work. Focus the correct target, probe/calibrate if needed, and dispatch one real user-like event path.",
  "If synthetic pointer events collide with browser pointer-capture APIs, keep the app unchanged and handle that inside the vitexec script. Use the app's normal click path when possible; otherwise temporarily override `setPointerCapture`/`releasePointerCapture` before dispatching synthetic events, even when native methods exist, because native capture can throw for synthetic pointer ids.",
  "For full gameplay validation, script a representative user session over real frames/time with sustained, overlapping controls, meaningful traversal, visible interactions, major mechanics, failure/victory conditions, and clear milestone logs. Assertions should fail with thrown errors; do not shrink the scenario, move goals, change combat routes, swap evidence criteria, or lower thresholds just to make the script pass.",
  "For custom combat characters, do not collapse animation to a single idle layer plus counters or weapon-only transforms. Movement, aim, shoot, and reload should drive visible character animation, bone pose, or equivalent character-body feedback while the action is active.",
  "For custom combat characters, load the player model with VIVERSE model helpers such as `useCharacterModelLoader` or `loadCharacterModel`. Do not fake the CharacterModel with a hand-built Group of boxes, cylinders, or spheres.",
  "For held weapons, tools, lights, or props, attach a loaded asset under the character hand or relevant bone; primitive boxes/cylinders are only placeholders, not finished equipment, when an asset or tutorial model exists.",
  "For combat movement validation, include pure lateral or backward input and assert the visible character pose while that input is held. A forward-only traversal route is not enough.",
  "For crosshair or camera-aim shooting, final validation should include an off-crosshair miss or blocked shot and a correctly aimed hit. A flattened camera ray or nearest-target hit does not prove aim fidelity.",
  "For camera-aim validation, use the same aim input a player would use. Prefer pointer/mouse-look controls for shooters; if keyboard aim is also a real control path, set its sensitivity and target margins before the first full-route rehearsal so precise crosshair hits do not require post-rehearsal control retuning.",
  "If the saved route needs adaptive crosshair aiming, expose observable screen-space aim evidence such as target projection, aim error, or camera ray distance during implementation/preflight. Do not add new aiming telemetry after the first full-route rehearsal.",
  "Match saved-route aim tolerances to the actual gameplay hit volume. Do not make the validation helper stricter than the shot rule; if the camera ray is already inside the visible hit volume, take the shot and assert the gameplay result instead of chasing exact screen-center alignment.",
  "Keep full gameplay routes representative, not repetitive. Prove each major mechanic with the smallest meaningful count, such as one miss, one block, one pickup, a few successful interactions, and completion, rather than adding extra targets or waypoints that only increase route brittleness.",
  "For gameplay recordings, count gameplay time after the app is ready, not asset-loading time. Wait for the camera to settle with avatar, world, and targets visible before starting the route, then pace early, middle, and final milestones for at least 12 seconds so the recording shows gameplay rather than sky, loading, HUD-only frames, or a rapid state-machine run.",
  "If the final route will use vitexec artifact flags such as `--screenshot` or `--record`, verify the exact CLI syntax with a tiny non-gameplay snippet before the first full `vitexec/play.ts` run.",
  "If package.json wraps vitexec, include artifact flag values and the code file separately, for example `vitexec --gpu --screenshot ./vitexec/final.png ./vitexec/play.ts`; `--screenshot ./vitexec/play.ts` is missing the code file.",
  "Before the first full `vitexec/play.ts` run, make sure the saved script uses the same readiness, canvas focus, and input helper code that passed disposable probes. Do not leave unprobed startup or focus logic in the final script.",
  "Run the production app build before the first full `vitexec/play.ts` run. If the vitexec script uses browser-root imports such as `/src/...`, exclude `vitexec` from the app `tsc` build or otherwise settle TypeScript config before the full route.",
  "Finalize package.json dependencies, scripts, and TypeScript config before the first full `vitexec/play.ts` run. Do not edit package.json after the full route has started.",
  "After the first full gameplay validation run, treat game rules, level layout, win conditions, and assertion thresholds as stable; validation failures should lead to real implementation/input fixes or an explicit reported shortcoming, not test-contaminating retuning.",
  "For 3D gameplay, include browser visual evidence such as a screenshot, recording, canvas pixel check, or WebGL state check; state logs alone do not prove the scene is visibly playable.",
  "Treat navigation, dev-server reconnects, page errors, or frozen video during recording as failed visual evidence; produce a clean replay or report the limitation.",
  "For any visually important mechanic, capture evidence while the mechanic is active, such as pixels, model/pose transforms, WebGL state, a screenshot, or a recording frame. Startup/final screenshots and counters alone are not visual proof.",
  "For combat or tool gameplay, the final `./vitexec/play.ts` should throw if active-frame feedback such as muzzle, recoil, reload, cast, pose, animation, or held-item movement is absent immediately after the corresponding input.",
  "For WebGL canvas pixel checks, only use canvas readback when the app is configured for reliable readback, for example `preserveDrawingBuffer`; otherwise choose vitexec screenshots, recordings, WebGL state, or app-visible state before freezing the final route.",
  "Do not use `console.error` for non-fatal diagnostics or optional visual evidence; browser error logs count as validation failures. Throw for real failures and use `console.log` for milestones or diagnostics.",
  "Any assertion kept in `./vitexec/play.ts` must be stable in a clean recording replay, not only in the first interactive run. If a visual probe is flaky during replay, replace it with a more reliable screenshot, recording, WebGL-state, or app-visible assertion before the first full route.",
  "For dynamic blockers, hazards, pickups, checkpoints, projectiles, or buildable objects, validate the same collision/sensor/raycast path the user experiences rather than only game-state flags.",
  "For pickups, stations, switches, doors, portals, badges, and completion effects, assert mechanic-specific visual changes such as object visibility/removal, material/emissive changes, pose/scale/transform changes, portal opening, or focused screenshot/pixel regions. HUD text, state flags, and generic nonblank-canvas checks are not enough by themselves.",
  "For sensors placed on a traversal path, prefer flat floor-aligned pads or planes over tall trigger volumes; route-test that the sensor does not catch or block the character while still triggering the mechanic.",
  "If pointer movement is hard to synthesize reliably, validate through normal app camera-aim bindings such as keyboard yaw/pitch actions instead of adding test-only camera setters.",
  "The same `./vitexec/*.ts` gameplay script should pass a clean rerun or recording replay. If it is nondeterministic, fix route-following, held-key cleanup, camera recovery, or terrain robustness instead of raising radii/timeouts.",
  "Run saved vitexec scripts by passing the file path, for example `vitexec --gpu ./vitexec/play.ts`. Do not inline a saved file with shell command substitution such as `vitexec \"$(cat vitexec/play.ts)\"`.",
]
const noteBlock = notes.join('\n\n')

const skillPath = '.agents/skills/vitexec/SKILL.md'
if (existsSync(skillPath)) {
  let text = readFileSync(skillPath, 'utf8')
  if (!notes.every((note) => text.includes(note))) {
    text = text.replace(/(# vitexec\s*)/, `$1\n\n${noteBlock}\n`)
    writeFileSync(skillPath, text)
  }
}

const openaiPath = '.agents/skills/vitexec/agents/openai.yaml'
if (existsSync(openaiPath)) {
  let text = readFileSync(openaiPath, 'utf8')
  if (!notes.every((note) => text.includes(note))) {
    text = text.replace(/default_prompt: ['"]?/, (match) => `${match}${notes.join(' ')} `)
    writeFileSync(openaiPath, text)
  }
}
NODE
EOF

WORKDIR /workspace/app
