import { JumpAction } from './action/index.js'
import type { CharacterModel, VRMHumanBoneName } from './model/index.js'
import type { BvhCharacterPhysics } from './physics/index.js'
import type { AnimationAction } from 'three'

export type BoneMap = Record<string, VRMHumanBoneName>

export function getIsMobileMediaQuery() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return undefined
  }
  return window.matchMedia('(hover: none) and (pointer: coarse)')
}

export function isMobile(): boolean {
  return getIsMobileMediaQuery()?.matches ?? false
}

export type StartAnimationOptions = {
  fadeDuration?: number
  sync?: boolean
  paused?: boolean
  crossFade?: boolean
  layer?: string | Array<string | undefined>
}

export function startAnimation(
  animation: AnimationAction,
  currentAnimations: CharacterModel['currentAnimations'],
  { crossFade = true, layer: layers, fadeDuration = 0.1, paused = false, sync = false }: StartAnimationOptions = {},
): (() => void) | undefined {
  animation.reset()
  animation.play()
  animation.paused = paused
  if (!crossFade) {
    animation.fadeIn(fadeDuration)
    return () => {
      animation.fadeOut(fadeDuration)
    }
  }
  if (!Array.isArray(layers)) {
    layers = [layers]
  }

  //deduplicated set of current animations
  const resolvedCurrentAnimations = new Set(
    layers.map((layer) => currentAnimations.get(layer)).filter((animation) => animation != null),
  )

  //sync with current animation if there is exactly one current animation that is not equal to the new animation
  if (resolvedCurrentAnimations.size === 1 && !resolvedCurrentAnimations.has(animation) && sync) {
    const [currentAnimation] = resolvedCurrentAnimations
    animation.syncWith(currentAnimation)
  }

  //fade in only if not already playing the new animation
  if (!resolvedCurrentAnimations.has(animation)) {
    animation.fadeIn(fadeDuration)
  }

  //fading out all animations except for the new animation
  resolvedCurrentAnimations.delete(animation)
  for (const currentAnimation of resolvedCurrentAnimations) {
    currentAnimation.fadeOut(fadeDuration)
  }

  //write the new animation to all the layers, if current and new animations are all the same, its just writing the same content again
  for (const layer of layers) {
    currentAnimations.set(layer, animation)
  }
}

export function shouldJump(physics: BvhCharacterPhysics, lastJump: number, bufferTime = 0.1): boolean {
  if (!physics.isGrounded) {
    return false
  }
  const lastTimePressed = JumpAction.getLatestTime()
  if (lastTimePressed == null || lastJump > lastTimePressed) {
    return false
  }
  //last jump must be more then 0.3 second ago, if not, we dont jump, this is to give the character time to get off the ground
  if (lastJump > performance.now() / 1000 - 0.3) {
    return false
  }
  return performance.now() / 1000 - lastTimePressed < bufferTime
}
