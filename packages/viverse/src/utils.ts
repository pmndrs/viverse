import { type InputSystem, LastTimeJumpPressedField } from './input/index.js'
import type { CharacterAnimationMask } from './animation/index.js'
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
  mask?: CharacterAnimationMask
}

export function startAnimation(
  animation: AnimationAction,
  currentAnimations: CharacterModel['currentAnimations'],
  { fadeDuration = 0.1, paused = false, mask, sync = false }: StartAnimationOptions,
) {
  animation.reset()
  animation.play()
  animation.paused = paused
  const currentAnimation = currentAnimations.get(mask)
  if (currentAnimation != null && sync) {
    animation.syncWith(currentAnimation)
  }
  if (currentAnimation != null) {
    animation.crossFadeFrom(currentAnimation, fadeDuration)
  } else {
    animation.fadeIn(fadeDuration)
  }
  currentAnimations.set(mask, animation)
}

export function shouldJump(
  physics: BvhCharacterPhysics,
  inputSystem: InputSystem,
  lastJump: number,
  bufferTime = 0.1,
): boolean {
  if (!physics.isGrounded) {
    return false
  }
  const lastTimePressed = inputSystem.get(LastTimeJumpPressedField)
  if (lastTimePressed == null || lastJump > lastTimePressed) {
    return false
  }
  //last jump must be more then 0.3 second ago, if not, we dont jump, this is to give the character time to get off the ground
  if (lastJump > performance.now() / 1000 - 0.3) {
    return false
  }
  return performance.now() / 1000 - lastTimePressed < bufferTime
}
