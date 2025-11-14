import { JumpAction } from './action/index.js'
import type { CharacterModel } from './model/index.js'
import type { BvhCharacterPhysics } from './physics/index.js'
import type { AnimationAction } from 'three'

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
  layer?: string
}

export function startAnimation(
  animation: AnimationAction,
  currentAnimations: CharacterModel['currentAnimations'],
  { crossFade = true, layer, fadeDuration = 0.1, paused = false, sync = false }: StartAnimationOptions,
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
  const currentAnimation = currentAnimations.get(layer)
  if (currentAnimation != null && sync) {
    animation.syncWith(currentAnimation)
  }
  if (currentAnimation != null) {
    animation.crossFadeFrom(currentAnimation, fadeDuration)
  } else {
    animation.fadeIn(fadeDuration)
  }
  currentAnimations.set(layer, animation)
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
