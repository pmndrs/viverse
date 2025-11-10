import type { VRMHumanBoneName } from '@pixiv/three-vrm'
import type { AnimationClip } from 'three'

export type CharacterAnimationMask = (boneName: VRMHumanBoneName) => boolean

export function applyMask(clip: AnimationClip, mask: CharacterAnimationMask): void {
  clip.tracks = clip.tracks.filter((track) => mask(track.name.split('.')[0] as VRMHumanBoneName))
}

const upperBodyParts = [
  'spine',
  'chest',
  'upperChest',
  'neck',
  'head',
  'leftEye',
  'rightEye',
  'jaw',
  'leftShoulder',
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
  'rightShoulder',
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
  'leftThumbMetacarpal',
  'leftThumbProximal',
  'leftThumbDistal',
  'leftIndexProximal',
  'leftIndexIntermediate',
  'leftIndexDistal',
  'leftMiddleProximal',
  'leftMiddleIntermediate',
  'leftMiddleDistal',
  'leftRingProximal',
  'leftRingIntermediate',
  'leftRingDistal',
  'leftLittleProximal',
  'leftLittleIntermediate',
  'leftLittleDistal',
  'rightThumbMetacarpal',
  'rightThumbProximal',
  'rightThumbDistal',
  'rightIndexProximal',
  'rightIndexIntermediate',
  'rightIndexDistal',
  'rightMiddleProximal',
  'rightMiddleIntermediate',
  'rightMiddleDistal',
  'rightRingProximal',
  'rightRingIntermediate',
  'rightRingDistal',
  'rightLittleProximal',
  'rightLittleIntermediate',
  'rightLittleDistal',
]

export const upperBody: CharacterAnimationMask = (name) => upperBodyParts.includes(name)
export const lowerBody: CharacterAnimationMask = (name) => !upperBodyParts.includes(name)
