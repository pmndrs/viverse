import { AnimationClip, Object3D } from 'three'
import type { BoneMap } from '../utils.js'

export function applyAnimationBoneMap(clip: AnimationClip, clipScene: Object3D | undefined, boneMap: BoneMap) {
  for (const track of clip.tracks) {
    const [clipBoneName, propertyName] = track.name.split('.')
    const clipBone = clipScene?.getObjectByName(clipBoneName)
    const normalizedBoneName = boneMap?.[clipBoneName] ?? clipBoneName
    if (clipBone != null) {
      clipBone.name = normalizedBoneName
    }
    track.name = `${normalizedBoneName}.${propertyName}`
  }
}
