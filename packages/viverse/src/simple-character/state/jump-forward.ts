import { type GraphTimelineState, action, animationFinished } from '@pmndrs/timeline'
import { AnimationAction, LoopOnce, Vector3 } from 'three'
import { JumpForwardAnimationUrl } from '../../animation/default.js'
import { flattenCharacterAnimationOptions, loadCharacterAnimation } from '../../animation/index.js'
import { startAnimation } from '../../utils.js'
import { DefaultCrossFadeDuration } from '../defaults.js'
import { SimpleCharacterState, SimpleCharacterOptions } from '../types.js'

export async function loadSimpleCharacterJumpForwardAction(
  state: SimpleCharacterState,
  options: SimpleCharacterOptions,
) {
  const model = state.model
  if (model == null) {
    throw new Error(`Unable to load animation without existing model`)
  }
  const jumpForward = model.mixer.clipAction(
    await loadCharacterAnimation(
      model,
      ...flattenCharacterAnimationOptions({
        url: JumpForwardAnimationUrl,
        scaleTime: 0.9,
        ...options.animation?.jumpForward,
      }),
    ),
  )
  jumpForward.loop = LoopOnce
  jumpForward.clampWhenFinished = true
  return jumpForward
}

export async function loadSimpleCharacterJumpForwardState<T>(
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
        init: () => {
          startAnimation(jumpForward, model.currentAnimations, {
            fadeDuration: options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration,
          })
          state.lastJump = performance.now() / 1000
          state.physics.applyVelocity(
            new Vector3(
              0,
              (typeof options.movement?.jump === 'object' ? options.movement?.jump.speed : undefined) ?? 8,
              0,
            ),
          )
        },
        until: animationFinished(jumpForward),
      }),
    transitionTo: {
      finally: () => (state.physics.isGrounded ? 'moving' : 'jumpLoop'),
    },
  }
}
