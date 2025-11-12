import { CharacterAnimationOptions, startAnimation, StartAnimationOptions } from '@pmndrs/viverse'
import { RootState } from '@react-three/fiber'
import { Action, ActionParams, animationFinished } from '@react-three/timeline'
import { createContext, forwardRef, ReactNode, useContext, useImperativeHandle, useMemo } from 'react'
import { AnimationAction, AnimationActionLoopStyles, AnimationClip, LoopRepeat } from 'three'
import { makeClipAdditive } from 'three/src/animation/AnimationUtils.js'
import { useCharacterModel } from './model.js'
import { useCharacterAnimationLoader } from './utils.js'

export type AdditiveCharacterAnimationActionProps = Omit<CharacterAnimationActionProps, 'additiveToClip'> & {
  referenceClip: CharacterAnimationOptions
}

export const AdditiveCharacterAnimationAction = forwardRef<AnimationAction, AdditiveCharacterAnimationActionProps>(
  ({ referenceClip: referenceClipOptions, ...props }, ref) => {
    const model = useCharacterModel()
    const referenceClip = useCharacterAnimationLoader(model, { ...props, ...referenceClipOptions })
    return <CharacterAnimationAction ref={ref} additiveReferenceClip={referenceClip} {...props} />
  },
)

export type CharacterAnimationActionProps = {
  dependencies?: Array<unknown>
  until?: () => Promise<unknown>
  loop?: AnimationActionLoopStyles
  additiveReferenceClip?: AnimationClip
} & Omit<ActionParams<RootState>, 'until'> &
  CharacterAnimationOptions &
  StartAnimationOptions

const CharacterAnimationLayerContext = createContext<string | undefined>(undefined)

export function CharacterAnimationLayer({ name, children }: { name: string; children?: ReactNode }) {
  return <CharacterAnimationLayerContext.Provider value={name}>{children}</CharacterAnimationLayerContext.Provider>
}

export const CharacterAnimationAction = forwardRef<AnimationAction, CharacterAnimationActionProps>(
  (
    {
      additiveReferenceClip,
      until,
      init,
      dependencies,
      update,
      fadeDuration,
      paused,
      loop,
      sync,
      crossFade,
      layer,
      ...animationOptions
    },
    ref,
  ) => {
    const layerFromContext = useContext(CharacterAnimationLayerContext)
    layer ??= layerFromContext
    const model = useCharacterModel()
    const srcClip = useCharacterAnimationLoader(model, animationOptions)
    const clip = useMemo(
      () =>
        additiveReferenceClip == null ? srcClip : makeClipAdditive(srcClip.clone(), undefined, additiveReferenceClip),
      [srcClip, additiveReferenceClip],
    )
    const animation = useMemo(() => model.mixer.clipAction(clip), [clip, model])
    animation.clampWhenFinished = true
    animation.loop = loop ?? LoopRepeat
    useImperativeHandle(ref, () => animation, [animation])
    return (
      <Action
        init={() => {
          const cleanupAnimation = startAnimation(animation, model.currentAnimations, {
            layer,
            fadeDuration,
            paused,
            sync,
            crossFade,
          })
          const cleanupInit = init?.()
          return () => {
            cleanupInit?.()
            cleanupAnimation?.()
          }
        }}
        until={until ?? (() => animationFinished(animation))}
        update={update}
        dependencies={
          dependencies != null
            ? [...dependencies, animationOptions.mask, fadeDuration, paused, sync, crossFade, animation, model, layer]
            : undefined
        }
      />
    )
  },
)
