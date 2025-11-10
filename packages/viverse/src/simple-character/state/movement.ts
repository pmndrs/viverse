import { action, type GraphTimelineState } from '@pmndrs/timeline'
import { AnimationAction } from 'three'
import { IdleAnimationUrl, RunAnimationUrl, WalkAnimationUrl } from '../../animation/default.js'
import { flattenCharacterAnimationOptions, loadCharacterAnimation } from '../../animation/index.js'
import { RunAction } from '../../input/index.js'
import { shouldJump, startAnimation } from '../../utils.js'
import { DefaultCrossFadeDuration } from '../defaults.js'
import type { SimpleCharacterOptions, SimpleCharacterState } from '../index.js'

export async function loadSimpleCharacterMovingState<T>(
  state: SimpleCharacterState,
  options: SimpleCharacterOptions,
): Promise<GraphTimelineState<T>> {
  const model = state.model
  if (model == null) {
    throw new Error(`Unable to load animation without existing model`)
  }
  const idle = model.mixer.clipAction(
    await loadCharacterAnimation(
      model,
      ...flattenCharacterAnimationOptions({
        url: IdleAnimationUrl,
        ...options.animation?.idle,
      }),
    ),
  )
  const run = model.mixer.clipAction(
    await loadCharacterAnimation(
      model,
      ...flattenCharacterAnimationOptions({
        url: RunAnimationUrl,
        scaleTime: 0.8,
        ...options.animation?.run,
      }),
    ),
  )
  const walk = model.mixer.clipAction(
    await loadCharacterAnimation(
      model,
      ...flattenCharacterAnimationOptions({
        scaleTime: 0.5,
        url: WalkAnimationUrl,
        ...options.animation?.walk,
      }),
    ),
  )
  return {
    timeline: () => {
      let currentAnimation: AnimationAction | undefined
      return action({
        update: () => {
          let nextAnimation: AnimationAction
          if (state.physics.inputVelocity.lengthSq() === 0) {
            nextAnimation = idle
          } else if (state.inputSystem.get(RunAction) && options.movement?.run != false) {
            nextAnimation = run
          } else if (options.movement?.walk != false) {
            nextAnimation = walk
          } else {
            nextAnimation = idle
          }
          if (nextAnimation === currentAnimation) {
            return
          }
          currentAnimation?.fadeOut(options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration)
          startAnimation(nextAnimation, model.currentAnimations, {
            fadeDuration: options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration,
          })
          currentAnimation = nextAnimation
        },
      })
    },
    transitionTo: {
      jumpStart: {
        whenUpdate: () =>
          options.movement?.jump !== false &&
          shouldJump(
            state.physics,
            state.inputSystem,
            state.lastJump,
            options.movement?.jump === true ? undefined : options.movement?.jump?.bufferTime,
          ),
      },
      jumpLoop: { whenUpdate: () => !state.physics.isGrounded },
    },
  }
}
