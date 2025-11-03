import type { CharacterAnimationMask } from './index.js'
import type { VRMHumanBoneName } from '@pixiv/three-vrm'
import type { AnimationClip } from 'three'

export function applyMask(clip: AnimationClip, mask: CharacterAnimationMask): void {
  clip.tracks = clip.tracks.filter((track) => mask(track.name.split('.')[0] as VRMHumanBoneName))
}
