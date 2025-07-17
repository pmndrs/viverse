import { AnimationAction, AnimationMixer } from 'three'

export class SimpleAnimationMixer extends AnimationMixer {
  private currentAnimationAction?: AnimationAction

  /**
   * @returns when the animation was changed
   */
  play(animationAction: AnimationAction, crossFadeDuration: number = 0.3): boolean {
    if (animationAction === this.currentAnimationAction) {
      return false
    }
    animationAction.reset()
    animationAction.play()
    animationAction.enabled = true
    if (this.currentAnimationAction != null) {
      animationAction.crossFadeFrom(this.currentAnimationAction, crossFadeDuration, false)
    }
    this.currentAnimationAction = animationAction
    return true
  }
}
