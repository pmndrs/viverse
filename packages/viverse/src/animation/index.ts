import { AnimationClip, Object3D, Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack } from 'three'
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm'
import { loadVrmModelGltfAnimations } from './gltf.js'
import { loadVrmModelVrmaAnimations } from './vrma.js'
import { scaleAnimationClipTime, trimAnimationClip } from './utils.js'
import { loadVrmModelMixamoAnimations } from './mixamo.js'
import { cached } from '../utils.js'

const parentWorldVector = new Vector3()
const restRotationInverse = new Quaternion()
const parentRestWorldRotation = new Quaternion()
const quaternion = new Quaternion()
const vector = new Vector3()

export function fixVrmModelAnimationClip(
  vrm: VRM,
  clip: AnimationClip,
  clipScene: Object3D,
  removeXZMovement: boolean,
  boneMap?: Record<string, VRMHumanBoneName>,
): void {
  const hipsBoneName =
    boneMap == null ? 'hips' : Object.entries(boneMap).find(([, vrmBoneName]) => vrmBoneName === 'hips')?.[0]
  if (hipsBoneName == null) {
    throw new Error(
      'Failed to determine hips bone name for VRM animation. Please check the bone map or animation file.',
    )
  }
  const clipSceneHips = clipScene.getObjectByName(hipsBoneName)
  const vrmHipsPosition = vrm.humanoid.normalizedRestPose.hips?.position
  if (clipSceneHips == null || vrmHipsPosition == null) {
    throw new Error('Failed to load VRM animation: missing animation hips object or VRM hips position.')
  }

  // Adjust with reference to hips height.
  const motionHipsHeight = clipSceneHips.position.y
  const [_, vrmHipsHeight] = vrmHipsPosition
  const hipsPositionScale = vrmHipsHeight / motionHipsHeight

  for (const track of clip.tracks) {
    // Convert each tracks for VRM use, and push to `tracks`
    const [boneName, propertyName] = track.name.split('.')
    const vrmBoneName = boneMap?.[boneName] ?? (boneName as VRMHumanBoneName)
    const vrmNodeName = vrm.humanoid.getNormalizedBoneNode(vrmBoneName)?.name
    const bone = clipScene.getObjectByName(boneName)

    if (vrmNodeName == null || bone == null || bone.parent == null) {
      continue
    }

    bone.getWorldQuaternion(restRotationInverse).invert()
    bone.parent.getWorldQuaternion(parentRestWorldRotation)
    bone.parent.getWorldPosition(parentWorldVector)

    if (track instanceof QuaternionKeyframeTrack) {
      // Store rotations of rest-pose.
      for (let i = 0; i < track.values.length; i += 4) {
        quaternion.fromArray(track.values, i)
        quaternion.premultiply(parentRestWorldRotation).multiply(restRotationInverse)
        if (vrm.meta.metaVersion === '0') {
          quaternion.x *= -1
          quaternion.z *= -1
        }
        if (removeXZMovement) {
          //TODO
        }
        quaternion.toArray(track.values, i)
      }
      track.name = `${vrmNodeName}.${propertyName}`
    } else if (track instanceof VectorKeyframeTrack) {
      track.name = `${vrmNodeName}.${propertyName}`
      if (propertyName === 'scale') {
        continue
      }
      for (let i = 0; i < track.values.length; i += 3) {
        vector.fromArray(track.values, i)
        vector.multiplyScalar(hipsPositionScale)
        if (vrm.meta.metaVersion === '0') {
          vector.negate()
          vector.y *= -1
        }
        if (vrmBoneName === 'hips' && removeXZMovement) {
          vector.x = 0
          vector.z = 0
        }
        vector.toArray(track.values, i)
      }
    }
  }
}

export * from './gltf.js'
export * from './mixamo.js'
export * from './vrma.js'
export * from './utils.js'

export type VrmModelAnimationOptions = {
  type: 'mixamo' | 'gltf' | 'vrma'
  url: string
  removeXZMovement?: boolean
  trimTime?: { start?: number; end?: number }
  scaleTime?: number
}

async function uncachedLoadVrmModelAnimation(
  vrm: VRM,
  type: VrmModelAnimationOptions['type'],
  url: string,
  removeXZMovement: boolean,
  trimStartTime: number | undefined,
  trimEndTime: number | undefined,
  scaleTime: number | undefined,
) {
  let clips: Array<AnimationClip>
  switch (type) {
    case 'gltf':
      clips = await loadVrmModelGltfAnimations(vrm, url, removeXZMovement)
      break
    case 'mixamo':
      clips = await loadVrmModelMixamoAnimations(vrm, url, removeXZMovement)
      break
    case 'vrma':
      clips = await loadVrmModelVrmaAnimations(vrm, url, removeXZMovement)
      break
  }
  if (clips.length != 1) {
    throw new Error(`Expected exactly one animation clip, but got ${clips.length} for url ${url}`)
  }
  const [clip] = clips
  if (trimStartTime != null || trimEndTime != null) {
    trimAnimationClip(clip, trimStartTime, trimEndTime)
  }
  if (scaleTime != null) {
    scaleAnimationClipTime(clip, scaleTime)
  }
  return clip
}

export function loadVrmCharacterModelAnimation(vrm: VRM, options: VrmModelAnimationOptions) {
  return cached(uncachedLoadVrmModelAnimation, [
    vrm,
    options.type,
    options.url,
    options.removeXZMovement ?? false,
    options.trimTime?.start,
    options.trimTime?.end,
    options.scaleTime,
  ])
}

const extraOptions: Record<string, Partial<VrmModelAnimationOptions>> = {
  walk: { scaleTime: 0.5 },
  run: { scaleTime: 0.8 },
  jumpForward: { scaleTime: 1.2 },
}

const simpleCharacterAnimationUrls = {
  walk: () => import('../assets/walk.js'),
  run: () => import('../assets/run.js'),
  idle: () => import('../assets/idle.js'),
  jumpUp: () => import('../assets/jump-up.js'),
  jumpLoop: () => import('../assets/jump-loop.js'),
  jumpDown: () => import('../assets/jump-down.js'),
  jumpForward: () => import('../assets/jump-forward.js'),
}

export const simpleCharacterAnimationNames = Object.keys(simpleCharacterAnimationUrls) as Array<
  keyof typeof simpleCharacterAnimationUrls
>

export async function getSimpleCharacterVrmModelAnimationOptions(
  animationName: keyof typeof simpleCharacterAnimationUrls,
): Promise<VrmModelAnimationOptions> {
  return {
    type: 'gltf',
    ...extraOptions[animationName],
    url: (await simpleCharacterAnimationUrls[animationName]()).url,
  }
}
