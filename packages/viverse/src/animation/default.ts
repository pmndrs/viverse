export const IdleAnimationUrl = Symbol('idle-animation-url')
export const JumpUpAnimationUrl = Symbol('jump-up-animation-url')
export const JumpDownAnimationUrl = Symbol('jump-down-animation-url')
export const JumpForwardAnimationUrl = Symbol('jump-forward-animation-url')
export const JumpLoopAnimationUrl = Symbol('jump-loop-animation-url')
export const RunAnimationUrl = Symbol('run-animation-url')
export const WalkAnimationUrl = Symbol('walk-animation-url')

export type DefaultUrl =
  | typeof IdleAnimationUrl
  | typeof JumpUpAnimationUrl
  | typeof JumpDownAnimationUrl
  | typeof JumpForwardAnimationUrl
  | typeof JumpLoopAnimationUrl
  | typeof RunAnimationUrl
  | typeof WalkAnimationUrl

export async function resolveDefaultCharacterAnimationUrl(url: DefaultUrl) {
  switch (url) {
    case IdleAnimationUrl:
      return (await import('../assets/idle.js')).url
    case JumpDownAnimationUrl:
      return (await import('../assets/jump-down.js')).url
    case JumpForwardAnimationUrl:
      return (await import('../assets/jump-forward.js')).url
    case JumpLoopAnimationUrl:
      return (await import('../assets/jump-loop.js')).url
    case JumpUpAnimationUrl:
      return (await import('../assets/jump-up.js')).url
    case RunAnimationUrl:
      return (await import('../assets/run.js')).url
    case WalkAnimationUrl:
      return (await import('../assets/walk.js')).url
  }
}
