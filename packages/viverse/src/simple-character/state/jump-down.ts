import { action, type GraphTimelineState, timePassed } from '@pmndrs/timeline'
import { LoopOnce } from 'three'
import { JumpDownAnimationUrl } from '../../animation/default.js'
import { flattenCharacterAnimationOptions, loadCharacterAnimation } from '../../animation/index.js'
import { startAnimation } from '../../utils.js'
import { DefaultCrossFadeDuration } from '../defaults.js'
import type { SimpleCharacterState, SimpleCharacterOptions } from '../index.js'

export async function loadSimpleCharacterJumpDownState<T>(
  state: SimpleCharacterState,
  options: SimpleCharacterOptions,
): Promise<GraphTimelineState<T>> {
  const model = state.model
  if (model == null) {
    throw new Error(`Unable to load animation without existing model`)
  }
  const jumpDown = model.mixer.clipAction(
    await loadCharacterAnimation(
      model,
      ...flattenCharacterAnimationOptions({ url: JumpDownAnimationUrl, ...options.animation?.jumpDown }),
    ),
  )
  jumpDown.loop = LoopOnce
  jumpDown.clampWhenFinished = true
  return {
    timeline: () =>
      action({
        init: () => {
          startAnimation(jumpDown, model.currentAnimations, {
            fadeDuration: options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration,
          })
        },
        until: timePassed(150, 'milliseconds'),
      }),
    transitionTo: { finally: 'moving' },
  }
}
