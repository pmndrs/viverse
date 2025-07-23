import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm'
import {
  AnimationClip,
  Euler,
  Object3D,
  Quaternion,
  QuaternionKeyframeTrack,
  Vector3,
  VectorKeyframeTrack,
} from 'three'
import { loadVrmModelGltfAnimations as loadModelGltfAnimations } from './gltf.js'
import { loadVrmModelMixamoAnimations as loadModelMixamoAnimations } from './mixamo.js'
import { scaleAnimationClipTime, trimAnimationClip } from './utils.js'
import { loadVrmModelVrmaAnimations } from './vrma.js'
import { loadCharacterModel } from '../model/index.js'
import { cached } from '../utils.js'

const parentWorldVector = new Vector3()
const restRotationInverse = new Quaternion()
const parentRestWorldRotation = new Quaternion()
const parentRestWorldRotationInverse = new Quaternion()
const quaternion = new Quaternion()
const vector = new Vector3()

const nonVrmRotationOffset = new Quaternion().setFromEuler(new Euler(0, Math.PI, 0))

export function fixModelAnimationClip(
  model: Exclude<Awaited<ReturnType<typeof loadCharacterModel>>, undefined>,
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
  const vrmHipsPosition =
    model instanceof VRM ? model.humanoid.normalizedRestPose.hips?.position : clipSceneHips?.position
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
    const vrmBoneName = boneMap?.[boneName] ?? (boneName as string)
    const vrmNodeName =
      model instanceof VRM ? model.humanoid.getNormalizedBoneNode(vrmBoneName as VRMHumanBoneName)?.name : vrmBoneName
    const bone = clipScene.getObjectByName(boneName)

    if (vrmNodeName == null || bone == null || bone.parent == null) {
      continue
    }

    bone.getWorldQuaternion(restRotationInverse).invert()
    bone.parent.getWorldQuaternion(parentRestWorldRotation)
    parentRestWorldRotationInverse.copy(parentRestWorldRotation).invert()
    bone.parent.getWorldPosition(parentWorldVector)

    if (track instanceof QuaternionKeyframeTrack) {
      // Store rotations of rest-pose.
      for (let i = 0; i < track.values.length; i += 4) {
        quaternion.fromArray(track.values, i)
        if (model instanceof VRM) {
          quaternion.premultiply(parentRestWorldRotation).multiply(restRotationInverse)
          if (model.meta.metaVersion === '0') {
            quaternion.x *= -1
            quaternion.z *= -1
          }
        }
        if (vrmBoneName === 'root') {
          quaternion.multiply(nonVrmRotationOffset)
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
        if (model instanceof VRM) {
          if (model.meta.metaVersion === '0') {
            vector.negate()
            vector.y *= -1
          }
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

export type ModelAnimationOptions = {
  type: 'mixamo' | 'gltf' | 'vrma'
  url: string
  removeXZMovement?: boolean
  trimTime?: { start?: number; end?: number }
  scaleTime?: number
}

async function uncachedLoadModelAnimation(
  model: Exclude<Awaited<ReturnType<typeof loadCharacterModel>>, undefined>,
  type: ModelAnimationOptions['type'],
  url: string,
  removeXZMovement: boolean,
  trimStartTime: number | undefined,
  trimEndTime: number | undefined,
  scaleTime: number | undefined,
) {
  let clips: Array<AnimationClip>
  switch (type) {
    case 'gltf':
      clips = await loadModelGltfAnimations(model, url, removeXZMovement)
      break
    case 'mixamo':
      clips = await loadModelMixamoAnimations(model, url, removeXZMovement)
      break
    case 'vrma':
      if (!(model instanceof VRM)) {
        throw new Error(`Model must be an instance of VRM to load VRMA animations`)
      }
      clips = await loadVrmModelVrmaAnimations(model, url, removeXZMovement)
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

export function loadCharacterModelAnimation(
  model: Exclude<Awaited<ReturnType<typeof loadCharacterModel>>, undefined>,
  options: ModelAnimationOptions,
) {
  return cached(uncachedLoadModelAnimation, [
    model,
    options.type,
    options.url,
    options.removeXZMovement ?? false,
    options.trimTime?.start,
    options.trimTime?.end,
    options.scaleTime,
  ])
}

const extraOptions: Record<string, Partial<ModelAnimationOptions>> = {
  walk: { scaleTime: 0.5 },
  run: { scaleTime: 0.8 },
  jumpForward: { scaleTime: 0.9 },
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

export async function getSimpleCharacterModelAnimationOptions(
  animationName: keyof typeof simpleCharacterAnimationUrls,
): Promise<ModelAnimationOptions> {
  return {
    type: 'gltf',
    ...extraOptions[animationName],
    url: (await simpleCharacterAnimationUrls[animationName]()).url,
  }
}
