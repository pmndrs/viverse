import { GraphTimelineState, action, animationFinished, TimelineClock } from '@pmndrs/timeline'
import { AnimationAction, LoopOnce, Vector3 } from 'three'
import { JumpUpAnimationUrl } from '../../animation/default.js'
import { flattenCharacterAnimationOptions, loadCharacterAnimation } from '../../animation/index.js'
import { startAnimation } from '../../utils.js'
import { SimpleCharacterState, SimpleCharacterOptions } from '../index.js'

export async function loadSimpleCharacterJumpUpAction(state: SimpleCharacterState, options: SimpleCharacterOptions) {
  const model = state.model
  if (model == null) {
    throw new Error(`Unable to load animation without existing model`)
  }
  const jumpUp = model.mixer.clipAction(
    await loadCharacterAnimation(
      model,
      ...flattenCharacterAnimationOptions({
        url: JumpUpAnimationUrl,
        ...options.animation?.jumpUp,
      }),
    ),
  )
  jumpUp.loop = LoopOnce
  jumpUp.clampWhenFinished = true
  return jumpUp
}

export async function loadSimpleCharacterJumpUpState<T>(
  jumpUp: AnimationAction,
  state: SimpleCharacterState,
  options: SimpleCharacterOptions,
): Promise<GraphTimelineState<T>> {
  const model = state.model
  if (model == null) {
    throw new Error(`Unable to load animation state without existing model`)
  }
  return {
    timeline: () =>
      action({
        init: () => {
          startAnimation(jumpUp, model.currentAnimations, { fadeDuration: 0.1 })
          state.lastJump = performance.now() / 1000
          state.physics.applyVelocity(
            new Vector3(
              0,
              (typeof options.movement?.jump === 'object' ? options.movement?.jump.speed : undefined) ?? 8,
              0,
            ),
          )
        },
        until: animationFinished(jumpUp),
      }),
    transitionTo: {
      jumpDown: {
        whenUpdate: (_: unknown, _clock: TimelineClock, actionTime: number) =>
          actionTime > 0.3 && state.physics.isGrounded,
      },
      finally: 'jumpLoop',
    },
  }
}
