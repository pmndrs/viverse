import { VRMHumanBoneName } from '@pixiv/three-vrm'
import { AnimationClip, Object3D } from 'three'

export type BoneMap = Record<string, VRMHumanBoneName>

export function applyBoneMap(clip: AnimationClip, clipScene: Object3D | undefined, boneMap: BoneMap) {
  for (const track of clip.tracks) {
    const [clipBoneName, propertyName] = track.name.split('.')
    const clipBone = clipScene?.getObjectByName(clipBoneName)
    const normalizedBoneName = (boneMap?.[clipBoneName] ?? clipBoneName) as VRMHumanBoneName | 'root'
    if (clipBone != null) {
      clipBone.name = normalizedBoneName
    }
    track.name = `${normalizedBoneName}.${propertyName}`
  }
}
