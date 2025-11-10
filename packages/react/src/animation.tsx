import { CharacterAnimationOptions, startAnimation, StartAnimationOptions } from '@pmndrs/viverse'
import { RootState } from '@react-three/fiber'
import { Action, ActionParams, animationFinished } from '@react-three/timeline'
import { useMemo } from 'react'
import { AnimationActionLoopStyles, LoopRepeat } from 'three'
import { useCharacterModel } from './model.js'
import { useCharacterAnimationLoader } from './utils.js'

export function CharacterAnimationAction({
  until,
  init,
  dependencies,
  update,
  fadeDuration,
  paused,
  loop,
  sync,
  ...animationOptions
}: {
  dependencies?: Array<unknown>
  until?: () => Promise<unknown>
  loop?: AnimationActionLoopStyles
} & Omit<ActionParams<RootState>, 'until'> &
  CharacterAnimationOptions &
  StartAnimationOptions) {
  const model = useCharacterModel()
  const clip = useCharacterAnimationLoader(model, animationOptions)
  const animation = useMemo(() => model.mixer.clipAction(clip), [clip, model])
  animation.clampWhenFinished = true
  animation.loop = loop ?? LoopRepeat
  return (
    <Action
      init={() => {
        startAnimation(animation, model.currentAnimations, { mask: animationOptions.mask, fadeDuration, paused, sync })
        return init?.()
      }}
      until={until ?? (() => animationFinished(animation))}
      update={update}
      dependencies={dependencies}
    />
  )
}
