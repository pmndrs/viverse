import { action, timePassed, GraphTimelineState } from '@pmndrs/timeline'
import { AnimationAction } from 'three'
import { RunField } from '../../input/index.js'
import { startAnimation } from '../../utils.js'
import { DefaultCrossFadeDuration, DefaultJumDelay } from '../defaults.js'
import type { SimpleCharacterOptions, SimpleCharacterState } from '../index.js'

export async function loadSimpleCharacterJumpStartState<T>(
  jumpUp: AnimationAction,
  jumpForward: AnimationAction,
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
        init() {
          startAnimation(jumpUp, model.currentAnimations, {
            fadeDuration: options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration,
            paused: true,
          })
          startAnimation(jumpForward, model.currentAnimations, {
            fadeDuration: options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration,
            paused: true,
          })
        },
        update: () => void state.physics.inputVelocity.multiplyScalar(0.3),
        until: timePassed(
          (typeof options.movement?.jump === 'object' ? options.movement?.jump.delay : undefined) ?? DefaultJumDelay,
          'seconds',
        ),
      }),
    transitionTo: {
      jumpDown: { whenUpdate: () => !state.physics.isGrounded },
      finally: () => (state.inputSystem.get(RunField) ? 'jumpForward' : 'jumpUp'),
    },
  }
}
