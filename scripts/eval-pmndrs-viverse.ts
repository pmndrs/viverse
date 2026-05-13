#!/usr/bin/env node

import { execFile, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const BUILDER_PROMPTS = {
  fortnite:
    'Create a Fortnite style game using $pmndrs-viverse. Validate it with $vitexec. Create ./vitexec/play.ts that simulates full gameplay.',
  parkour:
    'Create a VIVERSE parkour obstacle-course game using $pmndrs-viverse. Validate it with $vitexec. Create ./vitexec/play.ts that simulates full gameplay from spawn through checkpoints, hazards, jumps, and finish.',
  scavenger:
    'Create a VIVERSE exploration scavenger-hunt game using $pmndrs-viverse. Validate it with $vitexec. Create ./vitexec/play.ts that simulates full gameplay through navigation, pickups, interactions, and completion.',
  racing:
    'Create a VIVERSE checkpoint time-trial racing game using $pmndrs-viverse. Validate it with $vitexec. Create ./vitexec/play.ts that simulates full gameplay through route traversal, checkpoints, collisions, and finish.',
  'physics-puzzle':
    'Create a VIVERSE physics puzzle room using $pmndrs-viverse. Validate it with $vitexec. Create ./vitexec/play.ts that simulates full gameplay through moving an object, activating pressure plates or switches, opening a gate, collecting a key or reward, and reaching the exit.',
  'social-hub':
    'Create a VIVERSE social hub mini game using $pmndrs-viverse. Validate it with $vitexec. Create ./vitexec/play.ts that simulates full gameplay through avatar navigation, NPC or station interactions, emote or action pads, collecting badges, and completing a tour.',
  'dark-torch':
    'Create a VIVERSE dark exploration game using $pmndrs-viverse where the player runs around in the dark with a torch in their hand. Validate it with $vitexec. Create ./vitexec/play.ts that simulates full gameplay through dark navigation, using the handheld torch to reveal paths or objects, collecting or interacting with objectives, and reaching completion.',
} as const
const DEFAULT_SCENARIO = 'fortnite'
const IMAGE = process.env.EVAL_DOCKER_IMAGE ?? 'pmndrs-viverse-eval-codex:0.128.0-node22-vitexec-skill'
const DOCKERFILE = 'scripts/eval-pmndrs-viverse.Dockerfile'
const CONTAINER_WORKSPACE = '/workspace'
const CONTAINER_APP = `${CONTAINER_WORKSPACE}/app`

type CommandResult = {
  stdout: string
  stderr: string
  exitCode: number
}

type CodexRun = {
  text: string
  history: string
  exitCode: number
  issue?: string
}

type Runtime = {
  repoCwd: string
  runDir: string
  appDir: string
  codexHomeDir: string
  nodeModulesVolume: string
  browserWsEndpoint: string
  browserExposeNetwork: string
}

type PlaywrightServer = {
  close: () => Promise<void>
}

function getScenarioName() {
  const name = process.env.EVAL_SCENARIO ?? DEFAULT_SCENARIO
  return name in BUILDER_PROMPTS ? name : 'custom'
}

function getBuilderPrompt() {
  if (process.env.EVAL_BUILDER_PROMPT) return process.env.EVAL_BUILDER_PROMPT
  const scenario = process.env.EVAL_SCENARIO ?? DEFAULT_SCENARIO
  if (scenario in BUILDER_PROMPTS) {
    return BUILDER_PROMPTS[scenario as keyof typeof BUILDER_PROMPTS]
  }
  throw new Error(`Unknown EVAL_SCENARIO "${scenario}". Use one of: ${Object.keys(BUILDER_PROMPTS).join(', ')}`)
}

async function main() {
  const repoCwd = process.cwd()
  const keepRun = process.env.EVAL_KEEP === '1'
  const runDir = path.join(
    process.env.EVAL_RUN_ROOT ?? tmpdir(),
    `pmndrs-viverse-eval-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  )
  const appDir = path.join(runDir, 'app')
  const videoPath = path.join(runDir, 'play.webm')
  const nodeModulesVolume = `pmndrs-viverse-eval-node-modules-${process.pid}-${Date.now()}`
  let browserServer: PlaywrightServer | undefined

  try {
    log(`run: ${runDir}`)
    log(`scenario: ${getScenarioName()}`)
    log('docker: image')
    await ensureDockerImage(repoCwd)

    log('setup: workspace')
    await prepareWorkspace(repoCwd, appDir)
    const codexHomeDir = await prepareCodexHome(runDir)

    const browser = await startPlaywrightServer(repoCwd)
    browserServer = browser.server
    const runtime: Runtime = {
      repoCwd,
      runDir,
      appDir,
      codexHomeDir,
      nodeModulesVolume,
      browserWsEndpoint: browser.dockerWsEndpoint,
      browserExposeNetwork: process.env.VITEXEC_BROWSER_EXPOSE_NETWORK ?? '<loopback>',
    }

    log('setup: vitexec skill')
    const skillInstall = await dockerExec(runtime, ['install-vitexec-skill'], {
      workdir: CONTAINER_APP,
      timeoutMs: 2 * 60_000,
    })
    if (skillInstall.exitCode !== 0) {
      return stopWithIssue(
        `vitexec skill install failed.\n${truncate(skillInstall.stderr || skillInstall.stdout, 3000)}`,
      )
    }

    const builderPrompt = getBuilderPrompt()
    let builder = await runBuilderUntilQualityPass(runtime, builderPrompt)
    if (builder.exitCode !== 0) {
      return stopWithIssue(builder.issue ?? `Builder failed.\n${truncate(builder.history, 3000)}`)
    }
    log('builder: done')

    let builderHistory = builder.history
    let durationSeconds = 0
    let artifactDir: string | undefined
    const recordingAttempts = Number(process.env.EVAL_RECORDING_ATTEMPTS ?? 2)

    for (let attempt = 1; attempt <= recordingAttempts; attempt += 1) {
      const playScriptPath = path.join(appDir, 'vitexec', 'play.ts')
      if (!(await isFile(playScriptPath))) {
        return stopWithIssue('Missing ./vitexec/play.ts after builder finished.')
      }

      const vitexecCliCheck = await dockerExec(runtime, ['bash', '-lc', 'test -f node_modules/.bin/vitexec'], {
        workdir: CONTAINER_APP,
        timeoutMs: 30_000,
      })
      if (vitexecCliCheck.exitCode !== 0) {
        return stopWithIssue('Missing local vitexec CLI after builder finished.')
      }

      await rm(videoPath, { force: true })
      log(attempt === 1 ? 'recording: start' : `recording: retry ${attempt}/${recordingAttempts}`)
      const vitexecResult = await runVitexecRecord(runtime, playScriptPath, videoPath)
      await writeRunFile(runDir, 'vitexec-stdout.txt', vitexecResult.stdout)
      await writeRunFile(runDir, 'vitexec-stderr.txt', vitexecResult.stderr)

      const recordingIssue = await getRecordingIssue(videoPath, vitexecResult)
      if (recordingIssue == null) {
        durationSeconds = await getVideoDurationSeconds(videoPath)
        log(`recording: ${durationSeconds.toFixed(2)}s`)
        await writeRunFile(runDir, 'builder-history-combined.txt', builderHistory)
        artifactDir = await saveArtifacts(runDir, appDir, videoPath)
        break
      }

      if (attempt === recordingAttempts) return stopWithIssue(recordingIssue)

      log(`recording: failed\n${recordingIssue}`)
      const repair = await runBuilderUntilQualityPass(runtime, recordingRepairPrompt(builderPrompt, recordingIssue))
      builderHistory += `\n\n=== recording-repair-${attempt + 1} ===\n\n${repair.history}`
      builder = { ...repair, history: builderHistory }
      if (repair.exitCode !== 0) {
        return stopWithIssue(repair.issue ?? `Recording repair failed.\n${truncate(repair.history, 3000)}`)
      }
      log('builder: recording repair done')
    }

    if (artifactDir == null) {
      return stopWithIssue('Recording did not complete.')
    }

    const humanReview = await getHumanReview(videoPath)
    console.log(`[pmndrs-viverse-eval] Human review: ${humanReview}`)

    const agentReview = await runAgentReview(runtime, builder.history, appDir)
    log('agent review: done')
    await copyIfFile(path.join(runDir, 'agent-review.txt'), path.join(artifactDir, 'agent-review.txt'))
    console.log(`[pmndrs-viverse-eval] Agent review: ${agentReview}`)

    const reviewIssue = getAgentReviewIssue(agentReview)
    if (reviewIssue != null) {
      return stopWithIssue(`Agent review flagged a quality issue.\n${reviewIssue}`)
    }
  } catch (error) {
    return stopWithIssue(error instanceof Error ? (error.stack ?? error.message) : String(error))
  } finally {
    await browserServer?.close()
    if (keepRun) {
      log(`Kept run directory: ${runDir}`)
    } else {
      await rm(runDir, { recursive: true, force: true })
    }
    if (process.env.EVAL_KEEP_NODE_MODULES === '1') {
      log(`Kept Docker node_modules volume: ${nodeModulesVolume}`)
    } else {
      try {
        await execFileAsync('docker', ['volume', 'rm', '-f', nodeModulesVolume], { timeout: 30_000 })
      } catch {
        // The volume may not have been created if setup failed early.
      }
    }
  }
}

async function runAgentReview(runtime: Runtime, builderHistory: string, appDir: string) {
  const generatedContext = await generatedContextForReview(appDir)
  const result = await runCodexExec(runtime, {
    label: 'review',
    prompt: `Review this primary agent message history and answer: what went wrong, if anything?

Focus on issues that invalidate the final gameplay evaluation. Disposable probes before the first full ./vitexec/play.ts run are allowed to fail and drive implementation fixes, capture-timing fixes, or clearer visible effects. The full-run boundary starts only when ./vitexec/play.ts itself is first executed. Flag moved goals, weakened tests, changed route/input/visual criteria after the first full play.ts run, post-full-run retuning of tolerances/ranges/timing, test-only shortcuts, nondeterministic scripts that only pass once, missing visible gameplay, validation contamination, mechanics validated only by counters or state flags, collision/sensor mismatches, player interactions that bypass normal input, or recordings that do not show representative gameplay. For shooter/combat prompts, also flag nearest-enemy shooting that ignores camera/crosshair aim, missing held weapon or equivalent visible attack affordance, missing attack/reload/aim animation evidence, or combat movement that never validates visible strafing/backpedal animation when those mechanics are requested.

The outer static quality gate already checks for VIVERSE character/player evidence, prompt-relevant interaction evidence, and explicit assertions in source/play files. The outer harness also records the final play.ts route and enforces minimum video length. Do not fail only because the message history does not paste every visual frame; fail when the history or generated source shows contrary evidence or final validation semantics are invalid.

Start your final answer with exactly one line: VERDICT: pass or VERDICT: fail.

Do not edit files. Return a concise final review only.

${historyForReview(builderHistory)}

Generated source/play context:

${generatedContext}`,
    outputPath: path.join(runtime.runDir, 'agent-review.txt'),
    jsonlPath: path.join(runtime.runDir, 'agent-review-history.jsonl'),
    historyPath: path.join(runtime.runDir, 'agent-review-history.txt'),
    stderrPath: path.join(runtime.runDir, 'agent-review-stderr.txt'),
    timeoutMs: Number(process.env.EVAL_REVIEW_TIMEOUT_MS ?? 5 * 60_000),
    idleTimeoutMs: Number(process.env.EVAL_REVIEW_IDLE_TIMEOUT_MS ?? 2 * 60_000),
  })
  if (result.exitCode !== 0) {
    throw new Error(`Agent review failed.\n${result.issue ?? truncate(result.history, 3000)}`)
  }
  const text = result.text.trim()
  if (text.length === 0) {
    throw new Error('Agent review returned no final text.')
  }
  return text
}

async function runBuilderUntilQualityPass(runtime: Runtime, originalPrompt: string) {
  const maxAttempts = Number(process.env.EVAL_QUALITY_ATTEMPTS ?? process.env.EVAL_BUILDER_ATTEMPTS ?? 2)
  let prompt = originalPrompt
  let combinedHistory = ''
  let last: CodexRun | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    log(attempt === 1 ? 'builder: start' : `builder: quality repair ${attempt}/${maxAttempts}`)
    const runName = attempt === 1 ? 'builder' : `builder-repair-${attempt}`
    const builder = await runBuilder(runtime, prompt, runName)
    combinedHistory += `${combinedHistory ? '\n\n' : ''}=== ${runName} ===\n\n${builder.history}`
    last = { ...builder, history: combinedHistory }

    if (builder.exitCode !== 0) {
      const detail = builder.issue ?? truncate(builder.history, 3000)
      return { ...last, issue: `Builder failed.\n${detail}`, exitCode: 1 } satisfies CodexRun
    }

    if (
      needsCustomCharacterControllerTutorial(originalPrompt) &&
      !didReadCustomCharacterControllerTutorial(combinedHistory)
    ) {
      return {
        ...last,
        issue: 'Builder did not read references/tutorials/custom-character-controller.md.',
        exitCode: 1,
      } satisfies CodexRun
    }

    const qualityIssues = await getGeneratedQualityIssues(runtime.appDir, originalPrompt)
    if (qualityIssues.length === 0) return last

    const issueText = qualityIssues.join('\n')
    if (attempt === maxAttempts) {
      return {
        ...last,
        issue: `Generated game quality gate failed.\n${issueText}`,
        exitCode: 1,
      } satisfies CodexRun
    }

    log(`builder: quality failed\n${issueText}`)
    prompt = repairPrompt(originalPrompt, issueText)
  }

  return last ?? { text: '', history: 'Builder did not start.', exitCode: 1 }
}

function repairPrompt(originalPrompt: string, issueText: string) {
  return `${originalPrompt}

The existing generated app failed these evaluator quality gates:
${issueText}

Fix the existing app and ./vitexec/play.ts in place. Preserve the requested game concept and normal player input path. Use disposable vitexec probes before the next full ./vitexec/play.ts run, then save and run the repaired script by path. Do not weaken the route, remove requested mechanics, or replace visual gameplay with counters.`
}

function recordingRepairPrompt(originalPrompt: string, issueText: string) {
  return `${originalPrompt}

The existing generated app reached ./vitexec/play.ts, but the recorded saved-route replay failed:
${issueText}

Fix the existing app and ./vitexec/play.ts in place. Focus on deterministic saved-route replay, robust camera aim margins, active animation evidence, collision/shot truth, and representative gameplay pacing. Use disposable probes or a rehearsal before the next full ./vitexec/play.ts run, then run ./vitexec/play.ts by path. Do not weaken assertions, skip mechanics, or add test-only controls.`
}

async function runBuilder(runtime: Runtime, prompt: string, runName = 'builder') {
  let last: CodexRun | undefined
  const maxAttempts = Number(process.env.EVAL_BUILDER_ATTEMPTS ?? 2)
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (attempt > 1) log(`builder: retry ${attempt}/${maxAttempts}`)
    const suffix = attempt === 1 ? '' : `-${attempt}`
    last = await runCodexExec(runtime, {
      label: 'builder',
      prompt,
      outputPath: path.join(runtime.runDir, `${runName}-output${suffix}.txt`),
      jsonlPath: path.join(runtime.runDir, `${runName}-history${suffix}.jsonl`),
      historyPath: path.join(runtime.runDir, `${runName}-history${suffix}.txt`),
      stderrPath: path.join(runtime.runDir, `${runName}-stderr${suffix}.txt`),
      timeoutMs: Number(process.env.EVAL_AGENT_TIMEOUT_MS ?? 60 * 60_000),
      idleTimeoutMs: Number(process.env.EVAL_AGENT_IDLE_TIMEOUT_MS ?? 15 * 60_000),
    })
    if (last.exitCode === 0) return last
    if (!/produced no JSONL progress/.test(last.history)) return last
  }
  return last ?? { text: '', history: 'Builder did not start.', exitCode: 1 }
}

async function runVitexecRecord(runtime: Runtime, playScriptPath: string, videoPath: string) {
  const command = [
    'node_modules/.bin/vitexec',
    '--gpu',
    '--record',
    toContainerPath(runtime, videoPath),
    toContainerPath(runtime, playScriptPath),
  ]
  return await dockerExec(runtime, command, { workdir: CONTAINER_APP, timeoutMs: 5 * 60_000 })
}

async function getRecordingIssue(videoPath: string, vitexecResult: CommandResult) {
  if (vitexecResult.exitCode !== 0) {
    return `vitexec failed with exit code ${vitexecResult.exitCode}.\nstdout:\n${truncate(
      vitexecResult.stdout,
      3000,
    )}\nstderr:\n${truncate(vitexecResult.stderr, 3000)}`
  }

  const vitexecLogIssue = getVitexecLogIssue(vitexecResult)
  if (vitexecLogIssue != null) {
    return `vitexec reported browser errors.\n${vitexecLogIssue}`
  }

  if (!(await isNonEmptyFile(videoPath))) {
    return `vitexec did not create a non-empty video at ${videoPath}`
  }

  const durationSeconds = await getVideoDurationSeconds(videoPath)
  const minVideoSeconds = Number(process.env.EVAL_MIN_VIDEO_SECONDS ?? 12)
  if (durationSeconds <= minVideoSeconds) {
    return `Recorded video is too short: ${durationSeconds.toFixed(2)}s`
  }
  const maxVideoSeconds = Number(process.env.EVAL_MAX_VIDEO_SECONDS ?? 180)
  if (durationSeconds > maxVideoSeconds) {
    return `Recorded video is too long: ${durationSeconds.toFixed(2)}s`
  }

  return null
}

async function runCodexExec(
  runtime: Runtime,
  options: {
    label: string
    prompt: string
    outputPath: string
    jsonlPath: string
    historyPath: string
    stderrPath: string
    timeoutMs: number
    idleTimeoutMs: number
  },
) {
  await mkdir(path.dirname(options.outputPath), { recursive: true })
  const promptHistory = `Prompt:\n${options.prompt}`
  await writeFile(options.historyPath, `${promptHistory}\n\n`)

  const codexArgs = [
    'codex',
    '--disable',
    'plugins',
    '--disable',
    'apps',
    '--disable',
    'remote_plugin',
    '-m',
    process.env.EVAL_MODEL ?? 'gpt-5.5',
    '-c',
    `model_reasoning_effort="${process.env.EVAL_REASONING_EFFORT ?? 'high'}"`,
    '-s',
    'danger-full-access',
    '-a',
    'never',
    'exec',
    '--ignore-user-config',
    '--json',
    '--skip-git-repo-check',
    '-C',
    CONTAINER_APP,
    '-o',
    toContainerPath(runtime, options.outputPath),
    options.prompt,
  ]
  const containerName = `pmndrs-viverse-eval-${options.label}-${process.pid}`
  const child = spawn('docker', dockerRunArgs(runtime, codexArgs, { name: containerName, workdir: CONTAINER_APP }), {
    cwd: runtime.repoCwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const jsonl = createWriteStream(options.jsonlPath)
  const stderr = createWriteStream(options.stderrPath)
  const history: string[] = [promptHistory]
  let stdoutBuffer = ''
  let stopped = false
  let stopIssue: string | undefined
  let fullPlayRunStarted = false
  let fullRouteRehearsalStarted = false
  let fullRouteRehearsalPassed = false
  let fullRouteRehearsalRuns = 0
  let playScriptFrozenFromRehearsal = false
  let preflightVitexecCommands = 0
  let completedAfterFinalMessage = false
  const commandTimers = new Map<string, NodeJS.Timeout>()
  let finalMessageTimer: NodeJS.Timeout | undefined

  const stop = async (message: string) => {
    if (stopped) return
    stopped = true
    stopIssue = message
    await appendHistory(options.historyPath, `Error:\n${message}`)
    try {
      await execFileAsync('docker', ['rm', '-f', containerName], { timeout: 5000 })
    } catch {
      // The container may already be gone.
    }
    child.kill('SIGTERM')
  }

  const finishAfterFinalMessage = async () => {
    if (stopped) return
    stopped = true
    completedAfterFinalMessage = true
    await appendHistory(options.historyPath, 'Harness: stopped after final agent message.')
    try {
      await execFileAsync('docker', ['rm', '-f', containerName], { timeout: 5000 })
    } catch {
      // The container may already be gone.
    }
    child.kill('SIGTERM')
  }

  const clearFinalMessageTimer = () => {
    if (finalMessageTimer == null) return
    clearTimeout(finalMessageTimer)
    finalMessageTimer = undefined
  }

  const scheduleFinalMessageTimer = () => {
    clearFinalMessageTimer()
    finalMessageTimer = setTimeout(
      () => void finishAfterFinalMessage(),
      Number(process.env.EVAL_FINAL_MESSAGE_GRACE_MS ?? 60_000),
    )
  }

  const clearCommandTimer = (id: string) => {
    const timer = commandTimers.get(id)
    if (timer == null) return
    clearTimeout(timer)
    commandTimers.delete(id)
  }

  const startCommandTimer = (id: string, command: string) => {
    clearCommandTimer(id)
    const timeoutMs = getCommandTimeoutMs(command)
    const timer = setTimeout(
      () =>
        void stop(
          `Codex command timed out after ${formatDuration(timeoutMs)}: ${truncate(
            command.replace(/\s+/g, ' ').trim(),
            500,
          )}`,
        ),
      timeoutMs,
    )
    commandTimers.set(id, timer)
  }

  const totalTimer = setTimeout(
    () => void stop(`Codex timed out after ${formatDuration(options.timeoutMs)}.`),
    options.timeoutMs,
  )
  let idleTimer = setTimeout(
    () => void stop(`Codex produced no JSONL progress for ${formatDuration(options.idleTimeoutMs)}.`),
    options.idleTimeoutMs,
  )
  const resetIdleTimer = () => {
    clearTimeout(idleTimer)
    idleTimer = setTimeout(
      () => void stop(`Codex produced no JSONL progress for ${formatDuration(options.idleTimeoutMs)}.`),
      options.idleTimeoutMs,
    )
  }

  child.stdout.on('data', (chunk: Buffer) => {
    const text = chunk.toString('utf8')
    jsonl.write(text)
    stdoutBuffer += text
    let newline = stdoutBuffer.indexOf('\n')
    while (newline !== -1) {
      const line = stdoutBuffer.slice(0, newline).trim()
      stdoutBuffer = stdoutBuffer.slice(newline + 1)
      if (line.length > 0) {
        resetIdleTimer()
        if (isCodexWorkStartedEvent(line)) clearFinalMessageTimer()
        const commandEvent = getCodexCommandEvent(line)
        if (commandEvent?.phase === 'started') {
          startCommandTimer(commandEvent.id, commandEvent.command)
        } else if (commandEvent?.phase === 'completed') {
          clearCommandTimer(commandEvent.id)
        }
        if (isCodexFinalAgentMessageEvent(line)) scheduleFinalMessageTimer()
        if (isCodexTurnCompletedEvent(line)) void finishAfterFinalMessage()
        const codexError = getCodexErrorMessage(line)
        const entry = formatCodexEvent(line)
        if (codexError != null) {
          history.push(`Error:\n${codexError}`)
          void stop(codexError)
        }
        if (entry != null) {
          history.push(entry)
          streamCodexEvent(options.label, entry)
          void appendHistory(options.historyPath, entry)
        }
        const fileChangeIssue =
          options.label === 'builder' && (fullPlayRunStarted || fullRouteRehearsalStarted)
            ? getPostFrozenRouteFileChangeIssue(
                line,
                fullPlayRunStarted ? 'play' : 'rehearsal',
                fullRouteRehearsalPassed,
              )
            : null
        if (fileChangeIssue != null) {
          void stop(fileChangeIssue)
        }
        const fullPlayResultIssue =
          options.label === 'builder' && fullPlayRunStarted ? getFullPlayCommandResultIssue(line) : null
        if (fullPlayResultIssue != null) {
          void stop(fullPlayResultIssue)
        }
        if (options.label === 'builder' && isSuccessfulFullRouteRehearsalResult(line)) {
          fullRouteRehearsalPassed = true
        }
        const command = getCodexEventCommand(line)
        if (command != null) {
          if (options.label === 'builder' && isPlayScriptFreezeCommand(command)) {
            playScriptFrozenFromRehearsal = true
          }
          if (options.label === 'builder' && isLongInlineVitexecRouteCommand(command)) {
            void stop(
              'Agent ran a long inline vitexec route. Save full-route rehearsals as ./vitexec/rehearsal.ts and run that file by path before copying it to ./vitexec/play.ts.',
            )
          }
          if (
            options.label === 'builder' &&
            !fullPlayRunStarted &&
            playScriptFrozenFromRehearsal &&
            isVitexecCommand(command) &&
            !isFullPlayRunCommand(command)
          ) {
            void stop(
              'Agent copied a passing rehearsal into ./vitexec/play.ts, then ran another disposable vitexec probe. Run ./vitexec/play.ts next, or report the validation shortcoming.',
            )
          }
          if (
            options.label === 'builder' &&
            !fullPlayRunStarted &&
            isVitexecCommand(command) &&
            !isFullPlayRunCommand(command)
          ) {
            preflightVitexecCommands += 1
            const preflightLimit = getPreflightVitexecLimit(options.prompt)
            if (preflightVitexecCommands > preflightLimit) {
              void stop(
                `Agent ran ${preflightVitexecCommands} disposable vitexec probes before saving/running ./vitexec/play.ts. Save the proven route into ./vitexec/play.ts and run it, or report the shortcoming.`,
              )
            }
          }
          if (
            options.label === 'builder' &&
            (fullPlayRunStarted || fullRouteRehearsalStarted) &&
            isLikelyFileEditCommand(command) &&
            !isAllowedPostPlayCleanupCommand(command)
          ) {
            void stop(
              fullPlayRunStarted
                ? 'Agent ran a likely file edit after the first full ./vitexec/play.ts run. Use disposable probes before the full run, or report the validation shortcoming.'
                : 'Agent ran a likely file edit after the first full-route rehearsal started. Probe and settle route/gameplay before the full rehearsal, or report the validation shortcoming.',
            )
          }
          if (options.label === 'builder' && isFullPlayRunCommand(command)) {
            fullPlayRunStarted = true
          }
          if (options.label === 'builder' && isFullRouteRehearsalRunCommand(command)) {
            fullRouteRehearsalStarted = true
            fullRouteRehearsalPassed = false
            fullRouteRehearsalRuns += 1
            const rehearsalLimit = Number(process.env.EVAL_FULL_ROUTE_REHEARSAL_LIMIT ?? 5)
            if (fullRouteRehearsalRuns > rehearsalLimit) {
              void stop(
                `Agent ran ${fullRouteRehearsalRuns} full-route rehearsals without producing ./vitexec/play.ts. The route is brittle; simplify or preflight the failing segment before the full rehearsal, or report the shortcoming.`,
              )
            }
          }
          if (
            options.label === 'builder' &&
            fullRouteRehearsalStarted &&
            isVitexecCommand(command) &&
            !isFullRouteRehearsalRunCommand(command) &&
            !isFullPlayRunCommand(command)
          ) {
            void stop(
              'Agent ran a disposable vitexec command after the first full-route rehearsal started. Use focused probes before the full rehearsal; after that, rerun the saved rehearsal/play route or report the shortcoming.',
            )
          }
          const forbiddenIssue = getForbiddenCommandIssue(command)
          if (forbiddenIssue != null) {
            void stop(forbiddenIssue)
          } else if (isDevServerCommand(command)) {
            void stop('Agent started a long-running dev server instead of using vitexec.')
          }
        }
      }
      newline = stdoutBuffer.indexOf('\n')
    }
  })
  child.stderr.on('data', (chunk: Buffer) => stderr.write(chunk))

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code, signal) => resolve(typeof code === 'number' ? code : signal == null ? 1 : 128))
  })
  clearTimeout(totalTimer)
  clearTimeout(idleTimer)
  clearFinalMessageTimer()
  for (const timer of commandTimers.values()) clearTimeout(timer)
  await closeStream(jsonl)
  await closeStream(stderr)

  const text = await readOptionalText(options.outputPath)
  return {
    text,
    history: history.join('\n\n'),
    issue: stopIssue,
    exitCode: stopIssue == null ? (completedAfterFinalMessage ? 0 : exitCode) : 1,
  } satisfies CodexRun
}

async function prepareWorkspace(repoCwd: string, appDir: string) {
  await mkdir(path.join(appDir, '.agents', 'skills'), { recursive: true })
  await cp(path.join(repoCwd, 'skills', 'pmndrs-viverse'), path.join(appDir, '.agents', 'skills', 'pmndrs-viverse'), {
    recursive: true,
  })
}

async function getGeneratedQualityIssues(appDir: string, prompt: string) {
  const issues: string[] = []
  const srcText = await readGeneratedTreeText(path.join(appDir, 'src'))
  const playText = await readEffectivePlayText(appDir)
  const packageText = await readOptionalText(path.join(appDir, 'package.json'))
  const combinedText = `${prompt}\n${srcText}\n${playText}`
  const packageJson = parsePackageJson(packageText)
  const dependencies = { ...packageJson?.dependencies, ...packageJson?.devDependencies }
  const wantsShooter = isShooterLike(combinedText)
  const wantsBuildableCover = /\b(fortnite|battle royale|build(?:ing)?|buildable|wall|ramp|cover)\b/i.test(combinedText)
  const wantsParkour = /\b(parkour|obstacle[-\s]?course|platformer|hazard|jump)\b/i.test(prompt)
  const wantsRacing = /\b(racing|race|time[-\s]?trial|checkpoint|lap|route traversal)\b/i.test(prompt)
  const wantsCollection = /\b(scavenger|hunt|exploration|pickup|collect|badge|reward|tour)\b/i.test(prompt)
  const wantsPuzzle = /\b(physics puzzle|puzzle room|pressure plate|switch|gate|key|push|moving an object)\b/i.test(
    prompt,
  )
  const wantsSocial = /\b(social hub|npc|station|emote|action pad|tour|badge)\b/i.test(prompt)
  const wantsTorch = /\b(dark|night|cave|dungeon|torch|lantern|flashlight|held light|handheld light)\b/i.test(prompt)
  const wantsDirectionalCombat =
    wantsShooter || /\b(strafe|backpedal|camera[-\s]?relative|held weapon|reload|upper[-\s]?body)\b/i.test(combinedText)

  const reactMajor = getSemverMajor(dependencies.react)
  const fiberMajor = getSemverMajor(dependencies['@react-three/fiber'])
  const typescriptMajor = getSemverMajor(dependencies.typescript)
  const reactViverseMinor = getZeroMajorMinor(dependencies['@react-three/viverse'])
  const pmndrsViverseMinor = getZeroMajorMinor(dependencies['@pmndrs/viverse'])
  if (reactMajor === 18 && fiberMajor === 8 && typescriptMajor != null && typescriptMajor !== 5) {
    issues.push('- React 18 / @react-three/fiber 8 project should use TypeScript 5.x, not a newer unverified major.')
  }
  if (reactViverseMinor != null && pmndrsViverseMinor != null && pmndrsViverseMinor < reactViverseMinor) {
    issues.push(
      '- Direct `@pmndrs/viverse` dependency is older than `@react-three/viverse`; use the current matching package instead of a stale direct install.',
    )
  }

  const hasSimpleCharacter = /(?:<SimpleCharacter\b|new\s+SimpleCharacter\b)/.test(srcText)
  const hasCustomController =
    /\b(useBvhCharacterPhysics|CharacterModelProvider|CharacterAnimationLayer|CharacterAnimationAction|AdditiveCharacterAnimationAction|useCharacterModelLoader)\b/.test(
      srcText,
    )
  const hasEmbodiedViversePlayer =
    /\bViverse\b/.test(srcText) &&
    /\bBvhPhysicsBody\b/.test(srcText) &&
    /\b(?:PlayerAvatar|PlayerRig|CharacterRig|AvatarRig|useGLTF|Gltf|GLTFLoader)\b/i.test(srcText) &&
    /\b(?:playerRef|player|pose|movement|locomotion)\b/i.test(srcText)

  if (!hasSimpleCharacter && !hasCustomController && !hasEmbodiedViversePlayer) {
    issues.push('- Missing visible/player VIVERSE character usage in generated source.')
  }

  if (wantsShooter && !hasCustomController) {
    issues.push(
      '- Shooter/combat prompt did not use VIVERSE custom-controller primitives such as character physics, model provider, bone attachments, or animation actions/layers.',
    )
  }

  const hasLoadedViverseCharacterModel =
    /\b(useCharacterModelLoader|loadCharacterModel|loadVrmCharacterModel|loadGltfCharacterModel)\b/.test(srcText) &&
    /\bCharacterModelProvider\b/.test(srcText)
  const hasProceduralCharacterModel =
    /\b(?:create|make|build)\w*Character\w*Model\b[\s\S]{0,7000}\bnew\s+Group\(\)[\s\S]{0,7000}\b(?:new\s+Mesh|BoxGeometry|CylinderGeometry|SphereGeometry|CapsuleGeometry|\bbone\s*\()/i.test(
      srcText,
    ) ||
    /\b(?:as|satisfies)\s+CharacterModel\b[\s\S]{0,3000}\b(?:new\s+Group\(\)|BoxGeometry|CylinderGeometry|SphereGeometry|CapsuleGeometry)/i.test(
      srcText,
    )

  if (wantsShooter && hasProceduralCharacterModel) {
    issues.push(
      '- Shooter/combat source builds a procedural humanoid mesh as the CharacterModel instead of loading a VIVERSE character model.',
    )
  }

  if (wantsShooter && !hasLoadedViverseCharacterModel) {
    issues.push(
      '- Shooter/combat source does not load a VIVERSE character model with `useCharacterModelLoader` or `loadCharacterModel`.',
    )
  }

  if (/raw\.githubusercontent\.com\/pmndrs\/viverse\/main\/examples\/fortnite\/public\/idle\.glb/i.test(srcText)) {
    issues.push(
      '- Source references a non-existent Fortnite tutorial `idle.glb`; use `IdleAnimationUrl` from `@react-three/viverse` for idle defaults.',
    )
  }

  if (hasSimpleCharacter && /<SimpleCharacter[\s\S]{0,800}\bmodel\s*=\s*{\s*false\s*}/.test(srcText)) {
    issues.push(
      '- `<SimpleCharacter>` disables its model with `model={false}` instead of rendering the standard/avatar character.',
    )
  }

  const inputDrivenValidation =
    /\b(?:KeyboardEvent|PointerEvent|MouseEvent|keydown|keyup|pointerdown|click|dispatchEvent)\b/.test(playText) &&
    /\b(?:assert|throw\s+new\s+Error)\b/.test(playText)
  if (!inputDrivenValidation) {
    issues.push('- ./vitexec/play.ts does not appear to drive user-like input with failing assertions.')
  }

  const hasCompletionAssertion =
    /\b(?:victory|complete|completed|finish(?:ed)?|exit|win|tourComplete|raceComplete|puzzleComplete)\b/i.test(
      playText,
    ) && /\b(?:assert|throw\s+new\s+Error)\b/i.test(playText)
  if (!hasCompletionAssertion) {
    issues.push('- ./vitexec/play.ts does not appear to assert a real completion or victory condition.')
  }

  const postCompletionPaddingPattern =
    /\b(?:complete|completed|victory|finish(?:ed)?|win|exit)[\s\S]{0,2400}\b(?:performance\.now\(\)\s*-\s*\w+\s*<\s*1[0-9]_?000|(?:pause|sleep|wait|delay)\(\s*1[0-9]_?000|(?:pause|sleep|wait|delay)\(\s*1[0-9]_?000\s*-)/i
  const minimumDurationPaddingPattern =
    /\bperformance\.now\(\)\s*-\s*\w+\s*<\s*1[0-9]_?000[\s\S]{0,500}\b(?:pause|sleep|wait|delay)\(/i
  if (
    postCompletionPaddingPattern.test(playText) ||
    (hasCompletionAssertion && minimumDurationPaddingPattern.test(playText))
  ) {
    issues.push(
      '- ./vitexec/play.ts appears to pad duration after completion/victory instead of pacing representative gameplay before completion.',
    )
  }

  const traversalValidationPattern =
    /\b(?:moveTo|goTo|navigateTo|walkTo|runTo|hold|keydown|keyup|playerPosition|position|distance)\b[\s\S]{0,900}\b(?:assert|throw\s+new\s+Error|checkpoint|finish|complete|victory)\b/i
  if (
    (wantsParkour || wantsRacing || wantsCollection || wantsPuzzle || wantsSocial) &&
    !traversalValidationPattern.test(playText)
  ) {
    issues.push('- ./vitexec/play.ts does not appear to validate traversal through the gameplay space.')
  }

  const checkpointPattern = /\b(checkpoint|gate|finish|lap|stage|progress|route)\b/i
  if ((wantsParkour || wantsRacing) && (!checkpointPattern.test(srcText) || !checkpointPattern.test(playText))) {
    issues.push(
      '- Checkpoint/traversal game does not clearly implement and validate ordered checkpoints or finish progress.',
    )
  }

  const hazardOrCollisionPattern = /\b(hazard|fall|damage|lava|pit|spike|collision|collider|blocked|obstacle)\b/i
  if (wantsParkour && (!hazardOrCollisionPattern.test(srcText) || !hazardOrCollisionPattern.test(playText))) {
    issues.push('- Parkour game does not clearly implement and validate hazards, falls, or obstacle collision.')
  }

  const pickupPattern = /\b(pickup|collect|collected|badge|reward|token|gem|item|cache)\b/i
  if ((wantsCollection || wantsSocial) && (!pickupPattern.test(srcText) || !pickupPattern.test(playText))) {
    issues.push('- Collection/social game does not clearly implement and validate visible pickups, badges, or rewards.')
  }

  const mechanicVisualAssertionPattern =
    /\b(?:pickup|collect|collected|objective|rune|shard|station|switch|portal|gate|door|badge|reward|completion|complete|interaction|interacted|reveal|revealed)\b[\s\S]{0,1600}\b(?:objectVisible|meshVisible|isVisible|visibility|visibleScale|opacity|emissive|emissiveIntensity|material|scale|transform|removed|disappear|lit|focused\s+(?:screenshot|pixel)|(?:pixel|screenshot)\s+region|querySelector\([^)]*(?:pickup|station|portal|gate|badge|completion|objective|rune|shard)|getBoundingClientRect\(\)[\s\S]{0,300}(?:pickup|station|portal|gate|badge|completion|objective|rune|shard))\b/i
  const mechanicVisualStateAssertionPattern =
    /\b(?:visibleScale|emissive|emissiveIntensity|revealed|lit|opacity|torchVisualScale)\b[\s\S]{0,600}\b(?:assert|throw\s+new\s+Error|if\s*\()/i
  const genericCanvasOnlyPattern =
    /\b(?:canvasEvidence|nonblank|lit|colors\.size|drawImage|getImageData)\b/i.test(playText) &&
    !mechanicVisualAssertionPattern.test(playText) &&
    !mechanicVisualStateAssertionPattern.test(playText)
  if (
    (wantsCollection || wantsSocial || wantsPuzzle) &&
    !mechanicVisualAssertionPattern.test(playText) &&
    !mechanicVisualStateAssertionPattern.test(playText)
  ) {
    issues.push(
      '- Collection/interaction validation lacks mechanic-specific visual assertions for pickups, stations, gates, portals, or completion effects.',
    )
  } else if ((wantsCollection || wantsSocial || wantsPuzzle) && genericCanvasOnlyPattern) {
    issues.push(
      '- Collection/interaction validation appears to rely on generic nonblank-canvas evidence instead of mechanic-specific visual changes.',
    )
  }

  const interactionPattern =
    /\b(interact|interaction|npc|station|emote|action[-\s]?pad|switch|press|activate|trigger)\b/i
  if ((wantsSocial || wantsPuzzle) && (!interactionPattern.test(srcText) || !interactionPattern.test(playText))) {
    issues.push(
      '- Interaction-heavy game does not clearly implement and validate stations, switches, NPCs, pads, or triggers.',
    )
  }

  const heldLightSourcePattern =
    /\b(?:CharacterModelBone|rightHand|leftHand|handRef|attach|parent)\b[\s\S]{0,2200}\b(?:torch|lantern|flashlight|lamp|heldLight|handLight|HandTorch|PlayerTorchLight)\b/i
  const lightSourcePattern =
    /\b(?:torch|lantern|flashlight|lamp|heldLight|handLight|HandTorch|PlayerTorchLight)\b[\s\S]{0,2200}\b(?:PointLight|SpotLight|pointLight|spotLight)\b|\b(?:PointLight|SpotLight|pointLight|spotLight)\b[\s\S]{0,2200}\b(?:torch|lantern|flashlight|lamp|heldLight|handLight|HandTorch|PlayerTorchLight)\b/i
  if (wantsTorch && (!heldLightSourcePattern.test(srcText) || !lightSourcePattern.test(srcText))) {
    issues.push('- Dark/torch game does not clearly attach a visible light source or torch to the player/hand.')
  }

  const darknessPattern =
    /\b(fog|ambientLight|background|dark|night|cave|dungeon|black|#0|intensity\s*=\s*{?\s*0\.[0-4]|color\s*=\s*["']#0)/i
  if (wantsTorch && !darknessPattern.test(srcText)) {
    issues.push('- Dark/torch game does not clearly create a low-light environment for the held light to matter.')
  }

  const playerRadiusTorchRevealPattern =
    /\b(?:torchDistance|revealed|reveal|lit|visibleScale)\b[\s\S]{0,900}\bplayer\.distanceTo\(|\bplayer\.distanceTo\([^)]*\)[\s\S]{0,900}\b(?:torchDistance|revealed|reveal|lit|visibleScale)\b/i
  const torchOriginRevealPattern =
    /\b(?:torch|lantern|flashlight|heldLight|handLight|light)\w*(?:World|Position|Ref|Light)\b[\s\S]{0,1400}\bdistanceTo\([^)]*(?:objective|target|position|marker|path|stone|sigil|rune|shard)|\b(?:objective|target|position|marker|path|stone|sigil|rune|shard)\w*\b[\s\S]{0,1400}\bdistanceTo\([^)]*(?:torch|lantern|flashlight|heldLight|handLight|light)\w*(?:World|Position|Ref|Light)/i
  if (wantsTorch && playerRadiusTorchRevealPattern.test(srcText) && !torchOriginRevealPattern.test(srcText)) {
    issues.push(
      '- Dark/torch reveal appears to be driven by player-radius proximity instead of the held light/tool world position.',
    )
  }

  const torchValidationPattern =
    /\b(torchFocused|torchVisualScale|torch|lantern|flashlight|heldLight|handLight|light)\b[\s\S]{0,1600}\b(?:visible|visibleScale|intensity|illuminat|reveal|revealed|lit|shadow|pixel|screenshot|dark|bright|PointLight|SpotLight|hand|attached)\b[\s\S]{0,1200}\b(?:assert|throw\s+new\s+Error|if\s*\()/i
  const torchRevealAssertionPattern =
    /\b(?:revealed|lit|visibleScale|torchFocused|torchVisualScale)\b[\s\S]{0,700}\b(?:assert|throw\s+new\s+Error|if\s*\()/i
  if (wantsTorch && !torchValidationPattern.test(playText) && !torchRevealAssertionPattern.test(playText)) {
    issues.push(
      '- ./vitexec/play.ts does not appear to assert held-torch lighting or reveal behavior during dark navigation.',
    )
  }

  const activeTorchVisualEvidencePattern =
    /\b(?:getImageData|drawImage|pixel|pixels|screenshot|toDataURL|readRenderTargetPixels|WebGLRenderer|material|emissive|opacity)\b[\s\S]{0,1800}\b(?:torch|lantern|flashlight|light|reveal|revealed|lit|dark|bright|objective|path|marker|sigil|rune|shard|relic)\b[\s\S]{0,1200}\b(?:assert|throw\s+new\s+Error|if\s*\()/i
  const renderedStateSourcePattern =
    /\b(?:mesh|portal|crystal|ring|objective)\.current\.(?:visible|scale|scale\.setScalar)\b[\s\S]{0,1800}\bsnapshot\.(?:visible|visualScale|emissiveIntensity)\b|\bmaterial\.(?:emissiveIntensity|opacity)\b[\s\S]{0,1800}\bsnapshot\.(?:visible|visualScale|emissiveIntensity)\b/i
  const renderedStatePlayAssertionPattern =
    /\b(?:distanceToTorch|torch)\b[\s\S]{0,1200}\b(?:visualScale|emissiveIntensity|visible)\b[\s\S]{0,800}\b(?:assert|throw\s+new\s+Error|if\s*\()/i
  if (
    wantsTorch &&
    !activeTorchVisualEvidencePattern.test(playText) &&
    !(renderedStateSourcePattern.test(srcText) && renderedStatePlayAssertionPattern.test(playText))
  ) {
    issues.push(
      '- ./vitexec/play.ts does not capture active-frame visual evidence for torch reveal or darkness behavior.',
    )
  }

  const puzzlePhysicsPattern =
    /\b(push|crate|box|object|pressure[-\s]?plate|switch|gate|door|key|BvhPhysicsBody|collid)\b/i
  if (wantsPuzzle && (!puzzlePhysicsPattern.test(srcText) || !puzzlePhysicsPattern.test(playText))) {
    issues.push(
      '- Physics puzzle does not clearly implement and validate object movement, gate/key state, or collision truth.',
    )
  }

  const validatesMovingObstacle =
    /\b(movingObstacleContacts|moving[-\s]?(?:obstacle|blocker|hazard).{0,80}(?:contact|hit|collid|encounter)|sweeper.{0,80}(?:contact|hit|collid|encounter)|obstacleContacts)\b/i.test(
      combinedText,
    )
  const hasMovingObstacle = /\b(moving[-\s]?(?:obstacle|blocker|hazard|platform)|sweeper|kinematic)\b/i.test(srcText)
  const movingObstacleSensorEvidence =
    /\b(?:Moving\w*|Sweeper\w*)[\s\S]{0,5000}<BvhPhysicsSensor\b[^>]*\bonIntersectedChanged\b/i.test(srcText) ||
    /<BvhPhysicsSensor\b(?=[^>]*\bisStatic\s*=\s*{?\s*false)(?=[^>]*\bonIntersectedChanged\b)/i.test(srcText) ||
    /\b(?:moving|sweeper|kinematic|obstacle)\b[\s\S]{0,2200}\b(?:shapecast|raycast|collision|collided|blocked)\b/i.test(
      srcText,
    )
  if (hasMovingObstacle && validatesMovingObstacle && !movingObstacleSensorEvidence) {
    issues.push(
      '- Moving obstacle validation is not clearly tied to the actual moving object, sensor, or collision path.',
    )
  }

  const racingPattern = /\b(time|timer|checkpoint|lap|split|finish|route|collision|speed|boost)\b/i
  if (wantsRacing && (!racingPattern.test(srcText) || !racingPattern.test(playText))) {
    issues.push(
      '- Racing/time-trial game does not clearly implement and validate timing, checkpoint order, route, or collisions.',
    )
  }

  const visibleShootingPattern =
    /\b(muzzle(?:Flash)?|tracer|projectile|bullet|impact|hit[-\s]?(?:marker)?|hitMarker|laser|beam|shot(?:Effect|Effects)?|activeShotVisible|lastShot)\b/i
  if (wantsShooter && !visibleShootingPattern.test(srcText)) {
    issues.push(
      '- Shooter-style game source has no obvious visible shooting feedback such as muzzle flash, projectile/tracer, impact, or hit marker.',
    )
  }

  const cameraAimPattern =
    /\b(getWorldDirection|Raycaster|unproject|camera\.rotation|camera\.quaternion|RotateYawAction|RotatePitchAction|aimRay|crosshairRay|lineOfSight|camera\.lookAt|lastShot[\s\S]{0,240}aimYaw|aimAt|forwardFromYaw|yaw)\b/i
  if (wantsShooter && !cameraAimPattern.test(srcText)) {
    issues.push('- Shooter-style source has no obvious camera/crosshair/player-view aiming path for shots.')
  }

  const flattenedAimPattern =
    /\b(?:fireShot|shoot|resolveShot|raycast|hitTarget)[\s\S]{0,2600}\b(?:cameraForward|tmpForward|shotDirection|aimDirection|rayDirection)\.(?:y\s*=\s*0|set\([^,\n]+,\s*0\s*,)/i
  if (wantsShooter && flattenedAimPattern.test(srcText)) {
    issues.push(
      '- Shooter-style source flattens the camera/crosshair aim ray, so shots can ignore vertical crosshair aim.',
    )
  }

  const aimValidationPattern =
    /\b(?:off[-\s]?(?:crosshair|aim|target)|miss(?:es|ed)?|should\s+miss|not\s+(?:hit|eliminate)|crosshair\s+hit|aim\s+fidelity|wrong\s+aim)\b/i
  const aimValidationAssertionPattern =
    /\b(?:assert|throw\s+new\s+Error)\b[\s\S]{0,500}\b(?:off[-\s]?(?:crosshair|aim|target)|miss(?:es|ed)?|should\s+miss|not\s+(?:hit|eliminate)|crosshair|aim)\b/i
  if (wantsShooter && (!aimValidationPattern.test(playText) || !aimValidationAssertionPattern.test(playText))) {
    issues.push(
      '- ./vitexec/play.ts does not appear to assert camera/crosshair aim fidelity with an off-crosshair miss and aimed hit.',
    )
  }

  const loadedWeaponModelPattern =
    /\b(?:Gltf|useGLTF|GLTFLoader)\b[\s\S]{0,1200}\b(?:pistol|gun|rifle|weapon|blaster)(?!-(?:idle|shoot|reload))[^'"`\s]*\.glb\b/i.test(
      srcText,
    ) ||
    /\b(?:src|url)\s*=\s*(?:{)?\s*["'`][^"'`]*(?:pistol|gun|rifle|weapon|blaster)(?!-(?:idle|shoot|reload))[^"'`]*\.glb/i.test(
      srcText,
    ) ||
    (/\b(?:Gltf|useGLTF|GLTFLoader)\b[\s\S]{0,1200}\b(?:src|url)\s*=\s*{\s*FortniteAsset\.(?:pistol|gun|rifle|weapon|blaster)\s*}/i.test(
      srcText,
    ) &&
      /\b(?:pistol|gun|rifle|weapon|blaster)\s*:\s*["'`][^"'`]*(?!-(?:idle|shoot|reload))[^"'`]*\.glb/i.test(srcText))
  const primitiveHeldWeaponPattern =
    /<CharacterModelBone\b[^>]*\bbone\s*=\s*["']rightHand["'][\s\S]{0,2200}\b(?:boxGeometry|cylinderGeometry|capsuleGeometry|sphereGeometry|coneGeometry)\b/i.test(
      srcText,
    ) && !loadedWeaponModelPattern
  if (wantsShooter && !loadedWeaponModelPattern) {
    issues.push(
      '- Shooter-style source should attach a loaded weapon model such as pistol.glb/gun.glb/rifle.glb; a primitive mesh is not enough for held weapon orientation.',
    )
  }
  if (wantsShooter && primitiveHeldWeaponPattern) {
    issues.push(
      '- Shooter-style source appears to build the held weapon from primitive geometry under rightHand, which can hide axis/orientation mistakes; use a loaded weapon model and align its muzzle to hand local -Z.',
    )
  }

  const hasBuildPieces = /\b(?:builds?|covers?)\b/i.test(srcText) && /\b(?:wall|ramp|covers?)\b/i.test(srcText)
  const hasBuildPhysics =
    /<BvhPhysicsBody\b[\s\S]{0,2500}\b(?:builds?|covers?)\.map\b/i.test(srcText) ||
    /\b(?:builds?|covers?)\.map\b[\s\S]{0,2500}<BvhPhysicsBody\b/i.test(srcText) ||
    /<BvhPhysicsBody\b[^>]*(?:kinematic)?[\s\S]{0,1800}\b(?:wall|panel|cover)\b/i.test(srcText) ||
    /\b(?:wall|panel|cover)\b[\s\S]{0,1800}<BvhPhysicsBody\b/i.test(srcText) ||
    /\b(?:blocksShots|blockedByBuild|blockedShots|raycastObstacle|playerBuildCollision|buildColliders|coverHit|world\.raycast)\b/i.test(
      srcText,
    )
  if (wantsBuildableCover && hasBuildPieces && !hasBuildPhysics) {
    issues.push(
      '- Build pieces appear to be visual only; placed walls/ramps/cover need physics or shot/player collision.',
    )
  }

  const directionalAnimationPattern =
    /\b(rightRef|leftRef|backwardRef|forwardRightRef|forwardLeftRef|backwardRightRef|backwardLeftRef|strafe(?:Animation|Pose|Clip)?|backpedal|jog[-\s]?(?:left|right|back)|walk[-\s]?(?:left|right|back)|run[-\s]?(?:left|right|back)|sideways)\b/i
  const directionalProceduralPosePattern =
    /\bMoveRightAction\b[\s\S]*\bMoveLeftAction\b[\s\S]*\bMoveBackwardAction\b[\s\S]*\b(?:setPose|setMovementPose|lowerMode|movementPose|resolvePose)\b[\s\S]*\b(?:right|left|back(?:ward)?|diagonal|strafe-left|strafe-right)\b[\s\S]*\b(?:model\.scene\.rotation|setBone\(|bone\.rotation|rightLeg|leftLeg|blend\(|rotation\.[xyz]|quaternion|CharacterModelBone)\b/i
  const lowerBodyCharacterAnimationPattern =
    /\bCharacterAnimationAction\b[\s\S]{0,1400}\blowerBody\b|\blowerBody\b[\s\S]{0,1400}\bCharacterAnimationAction\b/i
  const upperBodyCharacterAnimationPattern =
    /\b(?:AdditiveCharacterAnimationAction|CharacterAnimationAction)\b[\s\S]{0,1800}\b(?:upperBodyWithoutSpine|upperBody)\b|\b(?:upperBodyWithoutSpine|upperBody)\b[\s\S]{0,1800}\b(?:AdditiveCharacterAnimationAction|CharacterAnimationAction)\b/i
  const combatTimelinePattern = /\b(?:RunTimeline|Graph|GrapthState|Parallel|CharacterAnimationLayer)\b/i
  if (
    wantsDirectionalCombat &&
    !directionalAnimationPattern.test(srcText) &&
    !directionalProceduralPosePattern.test(srcText)
  ) {
    issues.push('- Combat movement has no obvious directional strafe/backpedal animation driven by movement actions.')
  }
  if (wantsDirectionalCombat && !lowerBodyCharacterAnimationPattern.test(srcText)) {
    issues.push(
      '- Combat movement does not use actual lower-body CharacterAnimationAction clips; debug pose labels or tiny procedural bone tweaks are not enough.',
    )
  }
  const directionalValidationPattern =
    /\b(?:KeyA|KeyD|KeyS|strafe|backward|backpedal|sideways|lateral)\b[\s\S]{0,900}\b(?:throw\s+new\s+Error|assert|pose|lowerMode|animation)\b/i
  if (wantsDirectionalCombat && !directionalValidationPattern.test(playText)) {
    issues.push('- ./vitexec/play.ts does not appear to assert visible lateral/backward combat movement.')
  }

  const upperBodyAimPattern =
    /\b(UpperBodyAimAnimation|AdditiveCharacterAnimationAction|CharacterAnimationLayer|upperBodyWithoutSpine|CharacterModelBone|pistol-shoot|pistol-reload|aim-forward|aimForward|spine|rightHand|handRef|GunModel|reloadTimer|recoilTimer|muzzleTimer)\b/i
  if (wantsShooter && !upperBodyAimPattern.test(srcText)) {
    issues.push(
      '- Combat source has no obvious upper-body aim/shoot/reload animation layer or held-item bone attachment.',
    )
  }

  const upperBodyLayerPattern = /<CharacterAnimationLayer\b[^>]*\bname\s*=\s*["']?{?["']?upper/i
  const upperBodyLayerText =
    srcText.match(
      /<CharacterAnimationLayer\b[^>]*\bname\s*=\s*["']?{?["']?upper[\s\S]{0,3000}<\/CharacterAnimationLayer>/i,
    )?.[0] ?? ''
  const activeUpperBodyPattern =
    /\b(ShootAction|ReloadAction|AimAction|shoot(?:ing)?|reload(?:ing)?|aim(?:ing)?|recoil|kick|muzzle|pistol|rifle|upperBodyWithoutSpine)\b/i
  const idleOnlyUpperBodyPattern =
    /AdditiveCharacterAnimationAction\b[^>]*\burl\s*=\s*{\s*IdleAnimationUrl\s*}/i.test(upperBodyLayerText) &&
    !activeUpperBodyPattern.test(upperBodyLayerText)
  if (
    wantsShooter &&
    (!upperBodyLayerPattern.test(srcText) ||
      idleOnlyUpperBodyPattern ||
      !activeUpperBodyPattern.test(upperBodyLayerText))
  ) {
    issues.push('- Combat source does not appear to drive a non-idle upper-body aim/shoot/reload animation layer.')
  }
  if (wantsShooter && (!upperBodyCharacterAnimationPattern.test(srcText) || !combatTimelinePattern.test(srcText))) {
    issues.push(
      '- Shooter combat does not use actual upper-body CharacterAnimationAction/AdditiveCharacterAnimationAction timeline layers for aim, shoot, or reload.',
    )
  }

  const aimLayerText =
    srcText.match(
      /<CharacterAnimationLayer\b[^>]*\bname\s*=\s*["']?{?["']?aim[\s\S]{0,3500}<\/CharacterAnimationLayer>/i,
    )?.[0] ?? ''
  const normalAimPoseLayer =
    /\bCharacterAnimationAction\b[\s\S]{0,700}\b(?:aim-up\.glb|FortniteAsset\.aimUp)\b/i.test(aimLayerText) &&
    /\bCharacterAnimationAction\b[\s\S]{0,700}\b(?:aim-forward\.glb|FortniteAsset\.aimForward)\b/i.test(aimLayerText) &&
    /\bCharacterAnimationAction\b[\s\S]{0,700}\b(?:aim-down\.glb|FortniteAsset\.aimDown)\b/i.test(aimLayerText)
  const additiveAimPoseLayer =
    /\bAdditiveCharacterAnimationAction\b[\s\S]{0,900}\b(?:aim-(?:up|forward|down)\.glb|FortniteAsset\.aim(?:Up|Forward|Down))\b/i.test(
      aimLayerText,
    )
  if (wantsShooter && (!normalAimPoseLayer || additiveAimPoseLayer)) {
    issues.push(
      '- Shooter aim poses should be normal CharacterAnimationAction clips in an aim layer; only weapon/tool overlays should be additive against the forward aim pose.',
    )
  }

  const additiveWeaponOverlay =
    /\bAdditiveCharacterAnimationAction\b[\s\S]{0,900}\b(?:pistol-idle\.glb|FortniteAsset\.pistolIdle)\b/i.test(
      srcText,
    ) &&
    /\bAdditiveCharacterAnimationAction\b[\s\S]{0,900}\b(?:pistol-shoot\.glb|FortniteAsset\.pistolShoot)\b/i.test(
      srcText,
    ) &&
    /\bAdditiveCharacterAnimationAction\b[\s\S]{0,900}\b(?:pistol-reload\.glb|FortniteAsset\.pistolReload)\b/i.test(
      srcText,
    ) &&
    /\breferenceClip\b[\s\S]{0,500}\b(?:aim-forward\.glb|FortniteAsset\.aimForward)\b/i.test(srcText)
  if (wantsShooter && !additiveWeaponOverlay) {
    issues.push(
      '- Shooter weapon/tool overlays should use AdditiveCharacterAnimationAction clips with referenceClip set to the forward aim pose.',
    )
  }

  const shootingAnimationPattern =
    /\b(AdditiveCharacterAnimationAction|CharacterAnimationAction|pistol-shoot|pistol-reload|shootAnimation|reloadAnimation|upper[-\s]?body|recoil|aimForward|aimPose|weaponPose)\b/i
  if (wantsShooter && !shootingAnimationPattern.test(srcText)) {
    issues.push('- Shooter source has no obvious character/weapon shoot, reload, aim, or recoil animation.')
  }

  const combatAnimationValidationPattern =
    /\b(weaponPose|weapon.*(?:pose|rotation|position|transform|kick)|reload.*(?:pose|visual|animation|active|feedback|Until)|muzzle(?:Visible|Flash|FlashUntil|Until)|recoil|recoilUntil|combatPose|combat[-\s]?animation|reload[-\s]?animation|active\s+shoot\s+feedback)\b/i
  const combatAnimationAssertionPattern =
    /\b(assert|throw\s+new\s+Error)\b[\s\S]{0,400}\b(weapon|reload|pose|animation|muzzle|flash|recoil|kick)\b/i
  if (
    wantsShooter &&
    (!combatAnimationValidationPattern.test(playText) || !combatAnimationAssertionPattern.test(playText))
  ) {
    issues.push(
      '- ./vitexec/play.ts does not appear to assert explicit firing/reload character or weapon animation evidence.',
    )
  }

  const minVideoSeconds = Number(process.env.EVAL_MIN_VIDEO_SECONDS ?? 12)
  if (wantsShooter && estimateScriptedGameplayMs(playText) < minVideoSeconds * 450) {
    issues.push(
      `- ./vitexec/play.ts appears too compressed for a representative recording; pace visible gameplay for at least about ${minVideoSeconds}s.`,
    )
  }

  return issues
}

async function generatedContextForReview(appDir: string) {
  const playText = await readEffectivePlayText(appDir)
  const sourceText = await readGeneratedTreeText(path.join(appDir, 'src'))
  return truncate(
    [
      'vitexec/play.ts:',
      playText,
      '',
      'src files:',
      sourceText,
      '',
      `estimated scripted gameplay ms: ${estimateScriptedGameplayMs(playText)}`,
    ].join('\n'),
    80_000,
  )
}

function parsePackageJson(text: string) {
  try {
    return JSON.parse(text) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
  } catch {
    return undefined
  }
}

function getSemverMajor(version: string | undefined) {
  if (version == null) return undefined
  const match = version.match(/\d+/)
  return match == null ? undefined : Number(match[0])
}

function getZeroMajorMinor(version: string | undefined) {
  if (version == null) return undefined
  const match = version.match(/0\.(\d+)/)
  return match == null ? undefined : Number(match[1])
}

function estimateScriptedGameplayMs(playText: string) {
  let total = 0
  for (const match of playText.matchAll(/\bawait\s+sleep\(\s*(\d+(?:_\d+)*)\s*\)/g)) {
    total += Number(match[1].replace(/_/g, ''))
  }
  for (const match of playText.matchAll(/\bawait\s+sleep\(\s*Math\.(?:min|max)\(\s*(\d+(?:_\d+)*)/g)) {
    total += Number(match[1].replace(/_/g, ''))
  }
  for (const match of playText.matchAll(/\bawait\s+wait\(\s*(\d+(?:_\d+)*)\s*\)/g)) {
    total += Number(match[1].replace(/_/g, ''))
  }
  for (const match of playText.matchAll(/\bawait\s+hold(?:Sample)?\([\s\S]{0,160}?,\s*(\d+(?:_\d+)*)/g)) {
    total += Number(match[1].replace(/_/g, ''))
  }
  for (const match of playText.matchAll(
    /\bawait\s+hold(?:Sample)?\([\s\S]{0,220}?,\s*Math\.(?:min|max)\(\s*(\d+(?:_\d+)*)/g,
  )) {
    total += Number(match[1].replace(/_/g, ''))
  }
  for (const _match of playText.matchAll(/\bawait\s+(?:moveTo|goTo|navigateTo|walkTo|runTo)\s*\(/g)) {
    total += 500
  }
  return total
}

function getPreflightVitexecLimit(prompt: string) {
  const configured = process.env.EVAL_PREFLIGHT_VITEXEC_LIMIT
  if (configured) return Number(configured)
  if (
    /\b(parkour|obstacle|platformer|racing|race|time[-\s]?trial|physics puzzle|puzzle room|scavenger|exploration|pickup|collect|social hub|station|interaction|dark|torch|lantern|flashlight|fortnite|shooter|combat|battle[-\s]?royale)\b/i.test(
      prompt,
    )
  ) {
    return 30
  }
  return 18
}

async function readGeneratedTreeText(root: string) {
  const chunks: string[] = []
  for (const filePath of await listGeneratedFiles(root)) {
    if (!/\.(?:ts|tsx|js|jsx|css|html)$/.test(filePath)) continue
    chunks.push(await readOptionalText(filePath))
  }
  return chunks.join('\n')
}

async function listGeneratedFiles(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true })
    const files = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(root, entry.name)
        if (entry.isDirectory()) return await listGeneratedFiles(entryPath)
        if (entry.isFile()) return [entryPath]
        return []
      }),
    )
    return files.flat()
  } catch {
    return []
  }
}

async function ensureDockerImage(repoCwd: string) {
  const dockerfilePath = path.join(repoCwd, DOCKERFILE)
  const dockerfileSha = createHash('sha256')
    .update(await readFile(dockerfilePath))
    .digest('hex')
  if (process.env.EVAL_DOCKER_REBUILD !== '1') {
    try {
      const { stdout } = await execFileAsync(
        'docker',
        ['image', 'inspect', IMAGE, '--format', '{{ index .Config.Labels "org.pmndrs-viverse-eval.dockerfile-sha" }}'],
        { timeout: 30_000 },
      )
      if (stdout.trim() === dockerfileSha) {
        log(`docker image: ${IMAGE}`)
        return
      }
      log(`docker image stale: ${IMAGE}`)
    } catch {
      // Build it below.
    }
  }

  log(`docker build: ${IMAGE}`)
  await execFileAsync(
    'docker',
    [
      'build',
      '-t',
      IMAGE,
      '--label',
      `org.pmndrs-viverse-eval.dockerfile-sha=${dockerfileSha}`,
      '-f',
      dockerfilePath,
      path.dirname(DOCKERFILE),
    ],
    {
      cwd: repoCwd,
      timeout: 60 * 60_000,
      maxBuffer: 100 * 1024 * 1024,
    },
  )
}

async function prepareCodexHome(runDir: string) {
  const codexHomeDir = path.join(runDir, 'codex-home')
  await mkdir(codexHomeDir, { recursive: true })
  const authPath = process.env.EVAL_CODEX_AUTH_PATH ?? path.join(homedir(), '.codex', 'auth.json')
  if (await isFile(authPath)) {
    await cp(authPath, path.join(codexHomeDir, 'auth.json'))
  } else if (!process.env.OPENAI_API_KEY) {
    throw new Error(`Codex auth is missing. Expected ${authPath} or OPENAI_API_KEY.`)
  }
  return codexHomeDir
}

async function startPlaywrightServer(repoCwd: string) {
  const child = spawn(
    path.join(repoCwd, 'node_modules', '.bin', 'playwright'),
    ['run-server', '--host', '127.0.0.1', '--port', '0'],
    {
      cwd: repoCwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  let stdout = ''
  let stderr = ''

  const wsEndpoint = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for Playwright run-server.')), 30_000)
    const finish = (callback: () => void) => {
      clearTimeout(timer)
      child.stdout.off('data', onStdout)
      child.stderr.off('data', onStderr)
      child.off('error', onError)
      child.off('exit', onExit)
      callback()
    }
    const onStdout = (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
      const match = stdout.match(/Listening on (ws:\/\/\S+)/)
      if (match) finish(() => resolve(match[1]))
    }
    const onStderr = (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    }
    const onError = (error: Error) => finish(() => reject(error))
    const onExit = (code: number | null) => {
      finish(() => reject(new Error(`Playwright run-server exited with ${code ?? 'signal'}.\n${stderr || stdout}`)))
    }
    child.stdout.on('data', onStdout)
    child.stderr.on('data', onStderr)
    child.on('error', onError)
    child.on('exit', onExit)
  })

  const url = new URL(wsEndpoint)
  url.hostname = 'host.docker.internal'
  log(`browser ws: ${url}`)
  return {
    dockerWsEndpoint: url.toString(),
    server: {
      close: async () => {
        if (child.exitCode != null || child.signalCode != null) return
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            child.kill('SIGKILL')
            resolve()
          }, 5000)
          child.once('close', () => {
            clearTimeout(timer)
            resolve()
          })
          child.kill('SIGTERM')
        })
      },
    },
  }
}

async function dockerExec(
  runtime: Runtime,
  command: string[],
  { workdir, timeoutMs }: { workdir: string; timeoutMs: number },
): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync('docker', dockerRunArgs(runtime, command, { workdir }), {
      cwd: runtime.repoCwd,
      timeout: timeoutMs,
      maxBuffer: 100 * 1024 * 1024,
    })
    return { stdout: String(stdout ?? ''), stderr: String(stderr ?? ''), exitCode: 0 }
  } catch (error) {
    return commandErrorResult(error)
  }
}

function dockerRunArgs(runtime: Runtime, command: string[], { workdir, name }: { workdir: string; name?: string }) {
  const args = [
    'run',
    '--rm',
    '--init',
    '--add-host',
    'host.docker.internal:host-gateway',
    '-v',
    `${runtime.runDir}:${CONTAINER_WORKSPACE}`,
    '-v',
    `${runtime.codexHomeDir}:/codex-home`,
    '-v',
    `${runtime.nodeModulesVolume}:${CONTAINER_APP}/node_modules`,
    '-w',
    workdir,
    '-e',
    'CODEX_HOME=/codex-home',
    '-e',
    'SHELL=/bin/bash',
    '-e',
    'PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1',
    '-e',
    'CI=1',
    '-e',
    `VITEXEC_BROWSER_WS_ENDPOINT=${runtime.browserWsEndpoint}`,
    '-e',
    `VITEXEC_BROWSER_EXPOSE_NETWORK=${runtime.browserExposeNetwork}`,
  ]
  if (name) args.push('--name', name)
  if (process.env.OPENAI_API_KEY) args.push('-e', 'OPENAI_API_KEY')
  args.push(IMAGE, ...command)
  return args
}

function toContainerPath(runtime: Runtime, hostPath: string) {
  const runDir = normalizeAbsolutePath(runtime.runDir)
  const filePath = normalizeAbsolutePath(hostPath)
  if (filePath === runDir) return CONTAINER_WORKSPACE
  if (!filePath.startsWith(`${runDir}/`)) {
    throw new Error(`Path is outside the mounted run directory: ${hostPath}`)
  }
  return `${CONTAINER_WORKSPACE}/${filePath.slice(runDir.length + 1)}`
}

async function getVideoDurationSeconds(videoPath: string) {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', videoPath],
      { timeout: 30_000 },
    )
    const duration = Number(String(stdout).trim())
    if (!Number.isFinite(duration)) throw new Error(`ffprobe returned an invalid duration: ${String(stdout).trim()}`)
    return duration
  } catch (error) {
    throw new Error(`Could not read video duration: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function getHumanReview(videoPath: string) {
  const envReview = process.env.EVAL_HUMAN_REVIEW?.trim()
  if (envReview) {
    log('Using EVAL_HUMAN_REVIEW')
    return envReview
  }

  return await new Promise<string>((resolve, reject) => {
    const server = createServer((request, response) => {
      if (request.method === 'GET' && request.url === '/') {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        response.end(reviewPage())
        return
      }
      if (request.method === 'GET' && request.url === '/video') {
        response.writeHead(200, { 'Content-Type': 'video/webm' })
        createReadStream(videoPath).pipe(response)
        return
      }
      if (request.method === 'POST' && request.url === '/review') {
        let body = ''
        request.setEncoding('utf8')
        request.on('data', (chunk) => {
          body += chunk
        })
        request.on('end', () => {
          try {
            const parsed = JSON.parse(body)
            const review = typeof parsed.review === 'string' ? parsed.review.trim() : ''
            if (review.length === 0) {
              response.writeHead(400, { 'Content-Type': 'application/json' })
              response.end(JSON.stringify({ error: 'review is required' }))
              return
            }
            response.writeHead(200, { 'Content-Type': 'application/json' })
            response.end(JSON.stringify({ ok: true }))
            server.close(() => resolve(review))
          } catch (error) {
            response.writeHead(400, { 'Content-Type': 'application/json' })
            response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
          }
        })
        return
      }
      response.writeHead(404)
      response.end('Not found')
    })

    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address == null || typeof address === 'string') {
        server.close()
        reject(new Error('Could not start human review server.'))
        return
      }
      const url = `http://127.0.0.1:${address.port}`
      log(`review: ${url}`)
      openUrl(url)
    })
  })
}

function reviewPage() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>pmndrs-viverse eval review</title>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; background: #f6f7f9; color: #111827; }
      main { max-width: 960px; margin: 32px auto; padding: 0 20px; }
      video { width: 100%; max-height: 65vh; background: #111827; border-radius: 8px; }
      form { display: grid; gap: 12px; margin-top: 16px; }
      textarea { min-height: 96px; padding: 12px; font: inherit; border: 1px solid #ccd3dd; border-radius: 6px; resize: vertical; }
      button { justify-self: start; padding: 10px 14px; border: 0; border-radius: 6px; background: #111827; color: white; font: inherit; cursor: pointer; }
    </style>
  </head>
  <body>
    <main>
      <video src="/video" controls autoplay muted></video>
      <form id="form">
        <textarea id="review" required placeholder="Human review"></textarea>
        <button>Submit review</button>
      </form>
    </main>
    <script>
      document.getElementById('form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const review = document.getElementById('review').value;
        const response = await fetch('/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ review })
        });
        if (response.ok) window.close();
      });
    </script>
  </body>
</html>`
}

function openUrl(url: string) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  const child = spawn(command, args, { stdio: 'ignore', detached: true })
  child.on('error', () => undefined)
  child.unref()
}

async function isFile(filePath: string) {
  try {
    return (await stat(filePath)).isFile()
  } catch {
    return false
  }
}

async function isNonEmptyFile(filePath: string) {
  try {
    const file = await stat(filePath)
    return file.isFile() && file.size > 0
  } catch {
    return false
  }
}

async function writeRunFile(runDir: string, filename: string, content: string) {
  await mkdir(runDir, { recursive: true })
  await writeFile(path.join(runDir, filename), content)
}

async function saveArtifacts(runDir: string, appDir: string, videoPath: string) {
  const scenario = getScenarioName()
  const artifactDir = path.resolve(
    process.env.EVAL_ARTIFACT_DIR ??
      path.join(process.cwd(), '.tmp', 'eval-artifacts', `pmndrs-viverse-${scenario}-latest`),
  )
  await rm(artifactDir, { recursive: true, force: true })
  await mkdir(artifactDir, { recursive: true })
  await cp(videoPath, path.join(artifactDir, 'play.webm'))
  await copyIfFile(path.join(appDir, 'vitexec', 'play.ts'), path.join(artifactDir, 'play.ts'))
  await copyIfFile(path.join(appDir, 'vitexec', 'final.png'), path.join(artifactDir, 'final.png'))
  await copyIfFile(path.join(runDir, 'builder-history.txt'), path.join(artifactDir, 'builder-history.txt'))
  await copyIfFile(
    path.join(runDir, 'builder-history-combined.txt'),
    path.join(artifactDir, 'builder-history-combined.txt'),
  )
  await copyIfFile(path.join(runDir, 'agent-review.txt'), path.join(artifactDir, 'agent-review.txt'))
  await copyIfFile(path.join(runDir, 'vitexec-stdout.txt'), path.join(artifactDir, 'vitexec-stdout.txt'))
  await copyIfFile(path.join(runDir, 'vitexec-stderr.txt'), path.join(artifactDir, 'vitexec-stderr.txt'))
  log(`artifacts: ${artifactDir}`)
  return artifactDir
}

async function copyIfFile(source: string, target: string) {
  if (await isFile(source)) await cp(source, target)
}

async function appendHistory(filePath: string, entry: string) {
  await writeFile(filePath, `${entry}\n\n`, { flag: 'a' })
}

async function readOptionalText(filePath: string) {
  try {
    return await readFile(filePath, 'utf8')
  } catch {
    return ''
  }
}

async function readEffectivePlayText(appDir: string) {
  const playText = await readOptionalText(path.join(appDir, 'vitexec', 'play.ts'))
  if (!/^\s*import\s+['"]\.\/rehearsal\.(?:ts|tsx|js|jsx)['"]\s*;?\s*$/m.test(playText)) {
    return playText
  }

  const rehearsalText = await readOptionalText(path.join(appDir, 'vitexec', 'rehearsal.ts'))
  if (rehearsalText.trim().length === 0) return playText
  return `${playText}\n\n// Imported route from vitexec/rehearsal.ts\n${rehearsalText}`
}

function commandErrorResult(error: unknown): CommandResult {
  return {
    stdout: readErrorOutput(error, 'stdout'),
    stderr: readErrorOutput(error, 'stderr') || (error instanceof Error ? error.message : String(error)),
    exitCode: typeof (error as { code?: unknown }).code === 'number' ? Number((error as { code: number }).code) : 1,
  }
}

function getVitexecLogIssue(result: CommandResult) {
  const combined = `${result.stdout}\n${result.stderr}`
  const issueLines = combined
    .split(/\r?\n/)
    .filter((line) => /^\[(?:page error|error|request failed|navigation)\]/.test(line.trim()))
  return issueLines.length > 0 ? truncate(issueLines.join('\n'), 3000) : null
}

function getAgentReviewIssue(review: string) {
  const verdict = review.match(/^\s*VERDICT:\s*(pass|fail)\b/im)?.[1]?.toLowerCase()
  if (verdict === 'pass') return null
  if (verdict === 'fail') return truncate(review, 3000)
  if (!/^\s*VERDICT:\s*/im.test(review)) return `Agent review did not return a VERDICT line.\n${truncate(review, 3000)}`

  const issuePattern =
    /\b(validation contamination|contaminat(?:ed|es|ing|ion)|violat(?:e|ed|es|ing|ion)|not acceptable|less trustworthy|retun(?:ed|ing)|moving targets?|weaken(?:ed|ing)|state shortcut|test-only shortcut|one volley|not robust|final .*weak|quality issue)\b/i
  return issuePattern.test(review) ? truncate(review, 3000) : null
}

function historyForReview(history: string) {
  if (history.length <= 40_000) return history
  return `${history.slice(0, 12_000)}

...<middle of long history omitted>...

${history.slice(-28_000)}`
}

function readErrorOutput(error: unknown, key: 'stdout' | 'stderr') {
  const value = (error as { [name: string]: unknown })[key]
  return typeof value === 'string' ? value : Buffer.isBuffer(value) ? value.toString('utf8') : ''
}

function stopWithIssue(message: string) {
  console.log(`[pmndrs-viverse-eval] Issue: ${message}`)
  process.exitCode = 1
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max)}\n...<truncated>`
}

function formatDuration(ms: number) {
  return `${Math.round(ms / 1000)}s`
}

function formatCodexEvent(line: string) {
  try {
    const event = JSON.parse(line) as { type?: string; item?: unknown; usage?: unknown }
    const item = event.item as
      | {
          type?: string
          text?: string
          command?: string
          status?: string
          exit_code?: number
          aggregated_output?: string
        }
      | undefined

    if (event.type === 'item.started' && item?.type === 'command_execution') return `tool: Run ${item.command}`
    if (event.type === 'item.completed' && item?.type === 'command_execution') {
      const output = item.aggregated_output?.trim()
      const result = `tool result: ${item.status ?? 'completed'} exit ${item.exit_code ?? 'unknown'}`
      return output ? `${result}\noutput:\n${truncate(output, 1200)}` : result
    }
    if (event.type === 'item.completed' && item?.type === 'agent_message' && item.text) {
      return `agent: ${truncate(item.text, 1000)}`
    }
    if (event.type === 'item.started' && item?.type === 'file_change') return 'file change: started'
    if (event.type === 'item.completed' && item?.type === 'file_change') return 'file change: completed'
    if (event.type === 'turn.completed') return `turn: completed ${truncate(JSON.stringify(event.usage ?? {}), 500)}`
  } catch {
    return `jsonl: ${truncate(line, 1000)}`
  }
  return null
}

function streamCodexEvent(label: string, entry: string) {
  if (process.env.EVAL_STREAM_HISTORY === '0') return
  log(`${label}: ${truncate(entry.replace(/\s+/g, ' ').trim(), 700)}`)
}

function didReadCustomCharacterControllerTutorial(history: string) {
  const commands = [...history.matchAll(/^tool: Run (.+)$/gm)].map((match) => match[1])
  return commands.some(
    (command) =>
      /references\/tutorials\/custom-character-controller\.md\b/.test(command) &&
      /\b(?:cat|sed|awk|perl|node|head|tail|nl|less|more)\b/.test(command) &&
      !/\brg\b/.test(command),
  )
}

function needsCustomCharacterControllerTutorial(prompt: string) {
  return /\b(fortnite|battle royale|shooter|shoot|gun|weapon|aim|reload|strafe|backpedal|upper[-\s]?body|held item|held weapon)\b/i.test(
    prompt,
  )
}

function isShooterLike(text: string) {
  return /\b(fortnite|battle royale|shooter|shoot(?:ing)?|gun|weapon|pistol|rifle|projectile|tracer|muzzle|ammo|reload|target hit|enemy hit)\b/i.test(
    text,
  )
}

function getCodexEventCommand(line: string) {
  try {
    const event = JSON.parse(line) as { type?: string; item?: { type?: string; command?: string } }
    return event.type === 'item.started' && event.item?.type === 'command_execution' ? event.item.command : null
  } catch {
    return null
  }
}

function isCodexFinalAgentMessageEvent(line: string) {
  try {
    const event = JSON.parse(line) as { type?: string; item?: { type?: string; text?: string } }
    if (event.type !== 'item.completed' || event.item?.type !== 'agent_message') return false
    const text = event.item.text?.trim() ?? ''
    if (/^(?:VERDICT:|Implemented\b|Done\b|Completed\b|Finished\b|Validation passed\b)/i.test(text)) return true
    return /\b(?:Artifacts written|Validation passed|No .*server.*running|No .*issues? found)\b/i.test(text)
  } catch {
    return false
  }
}

function getCodexErrorMessage(line: string) {
  try {
    const event = JSON.parse(line) as { type?: string; message?: string }
    return event.type === 'error' && event.message ? event.message : null
  } catch {
    return null
  }
}

function isCodexWorkStartedEvent(line: string) {
  try {
    const event = JSON.parse(line) as { type?: string; item?: { type?: string } }
    return event.type === 'item.started' && event.item?.type !== 'agent_message'
  } catch {
    return false
  }
}

function isCodexTurnCompletedEvent(line: string) {
  try {
    const event = JSON.parse(line) as { type?: string }
    return event.type === 'turn.completed'
  } catch {
    return false
  }
}

function getCodexCommandEvent(line: string) {
  try {
    const event = JSON.parse(line) as {
      type?: string
      item?: { id?: string; type?: string; command?: string }
    }
    if (event.item?.type !== 'command_execution' || !event.item.id || !event.item.command) return null
    if (event.type === 'item.started') {
      return { phase: 'started' as const, id: event.item.id, command: event.item.command }
    }
    if (event.type === 'item.completed') {
      return { phase: 'completed' as const, id: event.item.id, command: event.item.command }
    }
  } catch {
    return null
  }
  return null
}

function getCommandTimeoutMs(command: string) {
  const installTimeout = Number(process.env.EVAL_INSTALL_COMMAND_TIMEOUT_MS ?? 8 * 60_000)
  const commandTimeout = Number(process.env.EVAL_COMMAND_TIMEOUT_MS ?? 15 * 60_000)
  return /\b(?:npm|pnpm|yarn|bun)\s+(?:install|i|add)\b/.test(command) ? installTimeout : commandTimeout
}

function getPostFrozenRouteFileChangeIssue(
  line: string,
  phase: 'rehearsal' | 'play',
  fullRouteRehearsalPassed: boolean,
) {
  try {
    const event = JSON.parse(line) as {
      type?: string
      item?: { type?: string; changes?: Array<{ path?: string; kind?: string }> }
    }
    if (event.type !== 'item.started' || event.item?.type !== 'file_change') return null
    const changedPaths =
      event.item.changes?.map((change) => change.path).filter((value): value is string => !!value) ?? []
    if (changedPaths.length > 0 && changedPaths.every((filePath) => path.basename(filePath) === '.gitignore')) {
      return null
    }
    if (phase === 'rehearsal' && changedPaths.length > 0 && changedPaths.every(isDisposableRehearsalPath)) {
      return null
    }
    if (
      phase === 'rehearsal' &&
      fullRouteRehearsalPassed &&
      changedPaths.length > 0 &&
      changedPaths.every(isPlayScriptPath)
    ) {
      return null
    }
    const suffix = changedPaths.length > 0 ? ` Changed: ${changedPaths.join(', ')}` : ''
    return phase === 'play'
      ? `Agent edited files after the first full ./vitexec/play.ts run. Use disposable probes before the full run, or report the validation shortcoming.${suffix}`
      : `Agent edited files after the first full-route rehearsal started. Use focused probes before the full rehearsal, keep game rules and route criteria stable, or report the validation shortcoming.${suffix}`
  } catch {
    return null
  }
}

function isSuccessfulFullRouteRehearsalResult(line: string) {
  try {
    const event = JSON.parse(line) as {
      type?: string
      item?: { type?: string; command?: string; exit_code?: number; aggregated_output?: string }
    }
    if (event.type !== 'item.completed' || event.item?.type !== 'command_execution') return false
    if (!isFullRouteRehearsalRunCommand(event.item.command ?? '')) return false
    if ((event.item.exit_code ?? 1) !== 0) return false
    return getVitexecLogIssue({ stdout: event.item.aggregated_output ?? '', stderr: '', exitCode: 0 }) == null
  } catch {
    return false
  }
}

function getFullPlayCommandResultIssue(line: string) {
  try {
    const event = JSON.parse(line) as {
      type?: string
      item?: { type?: string; command?: string; status?: string; exit_code?: number; aggregated_output?: string }
    }
    if (event.type !== 'item.completed' || event.item?.type !== 'command_execution') return null
    if (!isFullPlayRunCommand(event.item.command ?? '')) return null
    const output = event.item.aggregated_output ?? ''
    const logIssue = getVitexecLogIssue({ stdout: output, stderr: '', exitCode: event.item.exit_code ?? 0 })
    if ((event.item.exit_code ?? 0) !== 0 || logIssue != null) {
      const suffix = logIssue == null ? '' : `\n${logIssue}`
      return `The first full ./vitexec/play.ts run failed or reported browser errors/navigation. Fix readiness, route, recording stability, and evidence in disposable probes before the full route, or report the validation shortcoming.${suffix}`
    }
  } catch {
    return null
  }
  return null
}

function isFullPlayRunCommand(command: string) {
  return (
    /(?:^|[;&|]\s*|\s-lc\s+["']?)(?:npx\s+|npm\s+exec\s+|pnpm\s+exec\s+|yarn\s+)?(?:\.\/)?(?:node_modules\/\.bin\/)?vitexec\b[\s\S]*(?:^|[\s"'=./])vitexec\/play\.ts\b/.test(
      command,
    ) || /\b(?:npm|pnpm|yarn)\s+(?:run\s+)?(?:validate|vitexec:play|play)\b/.test(command)
  )
}

function isFullRouteRehearsalRunCommand(command: string) {
  return /(?:^|[;&|]\s*|\s-lc\s+["']?)(?:npx\s+|npm\s+exec\s+|pnpm\s+exec\s+|yarn\s+)?(?:\.\/)?(?:node_modules\/\.bin\/)?vitexec\b[\s\S]*(?:^|[\s"'=./])vitexec\/rehearsal\.ts\b/.test(
    command,
  )
}

function isPlayScriptFreezeCommand(command: string) {
  return /\bcp\s+(?:\.\/)?vitexec\/rehearsal\.(?:ts|tsx|js|jsx)\s+(?:\.\/)?vitexec\/play\.(?:ts|tsx|js|jsx)\b/.test(
    command,
  )
}

function isVitexecCommand(command: string) {
  return /(?:^|[;&|]\s*|\s-lc\s+["']?)(?:npx\s+|npm\s+exec\s+|pnpm\s+exec\s+|yarn\s+)?(?:\.\/)?(?:node_modules\/\.bin\/)?vitexec\b/.test(
    command,
  )
}

function isLongInlineVitexecRouteCommand(command: string) {
  if (!isVitexecCommand(command) || isFullPlayRunCommand(command) || isFullRouteRehearsalRunCommand(command)) {
    return false
  }
  const timeout = command.match(/\b--timeout\s+(\d+)/)
  const timeoutMs = timeout == null ? 0 : Number(timeout[1])
  return timeoutMs >= 120_000 || command.length > 8000
}

function isLikelyFileEditCommand(command: string) {
  return /\b(apply_patch|sed\s+-i|perl\s+-[^\s]*i|tee\s+|cat\s+>|truncate\s+|mv\s+|rm\s+|npm\s+install|pnpm\s+add|yarn\s+add)\b|>\s*(?:\.\/)?(?:src|vitexec|package|tsconfig|vite\.config|index\.html)/.test(
    command,
  )
}

function isAllowedPostPlayCleanupCommand(command: string) {
  return /^\s*rm\s+(?:-f\s+)?(?:\.\/)?vitexec\/rehearsal\.(?:ts|tsx|js|jsx)\s*(?:&&\s*git\s+status\s+--short\s*)?$/.test(
    command,
  )
}

function isDisposableRehearsalPath(filePath: string) {
  const normalized = filePath.replaceAll('\\', '/')
  return /(?:^|\/)vitexec\/rehearsal\.(?:ts|tsx|js|jsx)$/.test(normalized)
}

function isPlayScriptPath(filePath: string) {
  const normalized = filePath.replaceAll('\\', '/')
  return /(?:^|\/)vitexec\/play\.(?:ts|tsx|js|jsx)$/.test(normalized)
}

function isDevServerCommand(command: string) {
  return (
    /\b(pnpm|npm|yarn)\s+(run\s+)?dev\b/.test(command) ||
    /(?:^|\s-lc\s+["']?|[;&|]\s*)(?:npx\s+|npm\s+exec\s+|pnpm\s+exec\s+|yarn\s+)?(?:\.\/)?(?:node_modules\/\.bin\/)?vite(?:\s+(?:dev\b|--host\b|--port\b|--open\b)|\s*(?:$|[;&|]))/.test(
      command,
    )
  )
}

function getForbiddenCommandIssue(command: string) {
  if (/\bvitexec\b[\s\S]*\$\(\s*cat\s+\.?\/?vitexec\/play\.ts\s*\)/.test(command)) {
    return 'Agent tried to run ./vitexec/play.ts by command substitution. Pass the saved file path to vitexec instead, for example `vitexec --gpu ./vitexec/play.ts`.'
  }

  if (isExternalExampleSourceFetchCommand(command)) {
    return 'Agent tried to fetch external example source. This eval should use only the installed skills, package metadata/types, and generated project files.'
  }

  for (const absolutePath of getAbsolutePaths(command)) {
    const normalized = normalizeAbsolutePath(absolutePath)
    if (isAllowedAbsolutePath(normalized)) continue
    return `Agent tried to inspect outside the generated workspace: ${absolutePath}`
  }

  return null
}

function isExternalExampleSourceFetchCommand(command: string) {
  if (/\bhttps:\/\/api\.github\.com\//i.test(command)) return true
  const rawUrls = [...command.matchAll(/https:\/\/raw\.githubusercontent\.com\/[^\s"'`<>)]*/gi)].map(
    (match) => match[0],
  )
  if (rawUrls.length === 0) return false
  const assetPattern = /\.(?:glb|gltf|vrm|bin|png|jpe?g|webp|ktx2|hdr|mp3|ogg|wav|bvh)(?:\?|#|$)/i
  return rawUrls.some((url) => !assetPattern.test(url))
}

function getAbsolutePaths(command: string) {
  return [...command.matchAll(/(?:^|[\s"'`=])((?:\/private)?\/[^\s"'`;&|)]+)/g)]
    .map((match) => match[1])
    .filter((filePath) => !filePath.startsWith('//'))
}

function normalizeAbsolutePath(filePath: string) {
  return filePath.startsWith('/var/') ? `/private${filePath}` : filePath
}

function isAllowedAbsolutePath(filePath: string) {
  const publicAssetPath = /\.(?:glb|gltf|vrm|bin|png|jpe?g|webp|ktx2|hdr|mp3|ogg|wav|bvh)(?:\?|#|$)/i
  return (
    filePath === CONTAINER_WORKSPACE ||
    filePath.startsWith(`${CONTAINER_WORKSPACE}/`) ||
    filePath.startsWith(`/@fs${CONTAINER_APP}/`) ||
    publicAssetPath.test(filePath) ||
    filePath.startsWith('/tmp/') ||
    filePath.startsWith('/src/') ||
    filePath.startsWith('/node_modules/') ||
    filePath === '/package.json' ||
    filePath.startsWith('/bin/') ||
    filePath.startsWith('/dev/') ||
    filePath.startsWith('/usr/bin/') ||
    filePath.startsWith('/usr/local/bin/')
  )
}

async function closeStream(stream: NodeJS.WritableStream) {
  await new Promise<void>((resolve, reject) => {
    stream.once('error', reject)
    stream.once('finish', resolve)
    stream.end()
  })
}

function log(message: string) {
  console.log(`[pmndrs-viverse-eval] ${message}`)
}

await main()
