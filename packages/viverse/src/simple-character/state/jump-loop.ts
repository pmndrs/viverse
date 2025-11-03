import { action, type GraphTimelineState } from '@pmndrs/timeline'
import { flattenCharacterAnimationOptions, loadCharacterAnimation } from '../../animation/index.js'
import { startAnimation } from '../../utils.js'
import { DefaultCrossFadeDuration } from '../defaults.js'
import type { SimpleCharacterOptions, SimpleCharacterState } from '../index.js'

export async function loadSimpleCharacterJumpLoopState<T>(
  state: SimpleCharacterState,
  options: SimpleCharacterOptions,
): Promise<GraphTimelineState<T>> {
  const model = state.model
  if (model == null) {
    throw new Error(`Unable to load animation without existing model`)
  }
  const jumpLoop = model.mixer.clipAction(
    await loadCharacterAnimation(
      model,
      ...flattenCharacterAnimationOptions(options.animation?.jumpLoop ?? { url: { default: 'jumpLoop' } }),
    ),
  )
  return {
    timeline: () =>
      action({
        init: () => {
          startAnimation(jumpLoop, model.currentAnimations, {
            fadeDuration: options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration,
          })
        },
      }),
    transitionTo: {
      jumpDown: { whenUpdate: () => state.physics.isGrounded },
    },
  }
}
