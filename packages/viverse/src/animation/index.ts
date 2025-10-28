import { VRM, VRMHumanBoneName, VRMPoseTransform } from '@pixiv/three-vrm'
import {
  AnimationClip,
  Euler,
  Object3D,
  Quaternion,
  QuaternionKeyframeTrack,
  Vector3,
  VectorKeyframeTrack,
} from 'three'
import _bvhBoneMap from './bvh-bone-map.json'
import { loadVrmModelBvhAnimations } from './bvh.js'
import { loadVrmModelFbxAnimations } from './fbx.js'
import { loadVrmModelGltfAnimations } from './gltf.js'
import _mixamoBoneMap from './mixamo-bone-map.json'
import { scaleAnimationClipTime, trimAnimationClip } from './utils.js'
import { loadVrmModelVrmaAnimations } from './vrma.js'
import { loadCharacterModel } from '../model/index.js'
import { cached } from '../utils.js'

//helper variables for the quaternion retargeting
const baseThisLocalRestRotation_inverse = new Quaternion()
const baseThisLocalCurrentRotation = new Quaternion()
const baseParentWorldRestRotation = new Quaternion()
const baseParentWorldRestRotation_inverse = new Quaternion()

const targetParentWorldRestRotation = new Quaternion()
const targetParentWorldRestRotation_inverse = new Quaternion()
const targetThisLocalRestRotation = new Quaternion()
const targetThisLocalCurrentRotation = new Quaternion()

//helper variables for the position retargeting
const position = new Vector3()

const nonVrmRotationOffset = new Quaternion().setFromEuler(new Euler(0, Math.PI, 0))

//TODO: currently assumes the model is not yet transformed - loaded for the first time

export function fixModelAnimationClip(
  model: Exclude<Awaited<ReturnType<typeof loadCharacterModel>>, undefined>,
  clip: AnimationClip,
  clipScene: Object3D | undefined,
  removeXZMovement: boolean,
  boneMap?: Record<string, VRMHumanBoneName>,
): void {
  const hipsClipBoneName =
    boneMap == null ? 'hips' : Object.entries(boneMap).find(([, vrmBoneName]) => vrmBoneName === 'hips')?.[0]
  if (hipsClipBoneName == null) {
    throw new Error(
      'Failed to determine hips bone name for VRM animation. Please check the bone map or animation file.',
    )
  }

  let restRoot: Object3D | undefined
  let restRootParent: Object3D | null | undefined

  if (!(model instanceof VRM)) {
    restRoot = model.scene.getObjectByName('rest_root')
    if (restRoot == null) {
      throw new Error(`Model rest root not found.`)
    }
    restRootParent = restRoot?.parent
    restRoot.parent = null
  }

  let positionScale = 1
  let clipSceneHips: Object3D | undefined

  if (clipScene != null) {
    clipSceneHips = clipScene.getObjectByName(hipsClipBoneName)
    clipSceneHips?.parent?.updateMatrixWorld()
    const vrmHipsPosition =
      model instanceof VRM
        ? model.humanoid.normalizedRestPose.hips?.position
        : model.scene.getObjectByName('rest_hips')?.getWorldPosition(new Vector3()).toArray()
    if (clipSceneHips == null || vrmHipsPosition == null) {
      throw new Error('Failed to load animation: missing animation hips object or VRM hips position.')
    }

    // Adjust with reference to hips height.
    const motionHipsHeight = clipSceneHips.getWorldPosition(position).y
    const [_, vrmHipsHeight] = vrmHipsPosition
    positionScale = vrmHipsHeight / motionHipsHeight
  }

  for (const track of clip.tracks) {
    // Convert each tracks for VRM use, and push to `tracks`
    const [clipBoneName, propertyName] = track.name.split('.')
    const vrmBoneName = (boneMap?.[clipBoneName] ?? clipBoneName) as VRMHumanBoneName | 'root'
    const targetNormalizedBoneName =
      model instanceof VRM ? model.humanoid.getNormalizedBoneNode(vrmBoneName as VRMHumanBoneName)?.name : vrmBoneName
    if (targetNormalizedBoneName == null) {
      continue
    }
    const trackName = `${targetNormalizedBoneName}.${propertyName}`

    let targetLocalBoneTransform: Omit<VRMPoseTransform, 'position'> | undefined
    let targetParentWorldBoneTransform: Omit<VRMPoseTransform, 'position'> | undefined
    //for vrm targetLocalBoneTransform and targetParentWorldBoneTransform are the identity quaternion
    if (model instanceof VRM) {
      targetLocalBoneTransform = { rotation: [0, 0, 0, 1] }
      targetParentWorldBoneTransform = { rotation: [0, 0, 0, 1] }
    } else {
      const targetBone = model.scene.getObjectByName(`rest_${vrmBoneName}`)
      if (targetBone != null) {
        targetLocalBoneTransform = { rotation: targetBone.quaternion.toArray() }
      }
      if (targetBone?.parent != null) {
        targetParentWorldBoneTransform = { rotation: targetBone.parent.getWorldQuaternion(new Quaternion()).toArray() }
      }
    }

    if (targetLocalBoneTransform == null) {
      continue
    }

    let baseBone = clipScene?.getObjectByName(clipBoneName)
    if (clipScene != null && baseBone == null) {
      continue
    }

    if (track instanceof QuaternionKeyframeTrack) {
      // Store rotations of rest-pose.
      if (baseBone != null) {
        baseThisLocalRestRotation_inverse.copy(baseBone.quaternion).invert()
      } else {
        baseThisLocalRestRotation_inverse.identity()
      }
      if (baseBone?.parent != null) {
        baseBone.parent.getWorldQuaternion(baseParentWorldRestRotation)
        baseParentWorldRestRotation_inverse.copy(baseParentWorldRestRotation).invert()
      } else {
        baseParentWorldRestRotation.identity()
        baseParentWorldRestRotation_inverse.identity()
      }

      targetThisLocalRestRotation.fromArray(targetLocalBoneTransform.rotation ?? [0, 0, 0, 1])
      if (targetParentWorldBoneTransform != null) {
        targetParentWorldRestRotation.fromArray(targetParentWorldBoneTransform.rotation ?? [0, 0, 0, 1])
        targetParentWorldRestRotation_inverse.copy(targetParentWorldRestRotation).invert()
      } else {
        targetParentWorldRestRotation.identity()
        targetParentWorldRestRotation_inverse.identity()
      }

      for (let i = 0; i < track.values.length; i += 4) {
        baseThisLocalCurrentRotation.fromArray(track.values, i)

        targetThisLocalCurrentRotation
          .copy(targetParentWorldRestRotation_inverse)

          .multiply(baseParentWorldRestRotation)

          .multiply(baseThisLocalCurrentRotation)
          .multiply(baseThisLocalRestRotation_inverse)

          .multiply(baseParentWorldRestRotation_inverse)

          .multiply(targetParentWorldRestRotation)
          .multiply(targetThisLocalRestRotation)

        if (model instanceof VRM && model.meta.metaVersion === '0') {
          targetThisLocalCurrentRotation.x *= -1
          targetThisLocalCurrentRotation.z *= -1
        }

        if (!(model instanceof VRM) && vrmBoneName === 'hips') {
          targetThisLocalCurrentRotation.premultiply(nonVrmRotationOffset)
        }

        targetThisLocalCurrentRotation.toArray(track.values, i)
      }

      track.name = trackName
    } else if (track instanceof VectorKeyframeTrack) {
      if (vrmBoneName != 'hips' && vrmBoneName != 'root') {
        continue
      }
      if (propertyName != 'position') {
        continue
      }
      for (let i = 0; i < track.values.length; i += 3) {
        position.fromArray(track.values, i)
        if (clipSceneHips?.parent != null) {
          if (vrmBoneName === 'hips') {
            position.applyMatrix4(clipSceneHips.parent.matrixWorld)
          } else {
            position.multiplyScalar(clipSceneHips.parent.matrixWorld.getMaxScaleOnAxis())
          }
        }
        position.multiplyScalar(positionScale)
        if (!(model instanceof VRM) && vrmBoneName === 'hips') {
          position.applyQuaternion(nonVrmRotationOffset)
        }
        if (model instanceof VRM) {
          if (model.meta.metaVersion === '0') {
            position.negate()
            position.y *= -1
          }
        }
        if (vrmBoneName === 'hips' && removeXZMovement) {
          position.x = 0
          position.z = 0
        }
        position.toArray(track.values, i)
      }
      track.name = trackName
    }
  }
  if (restRoot != null && restRootParent != null) {
    restRoot.parent = restRootParent
  }
}

export * from './gltf.js'
export * from './fbx.js'
export * from './vrma.js'
export * from './utils.js'

export type ModelAnimationOptions = {
  type?: 'mixamo' | 'gltf' | 'vrma' | 'fbx' | 'bvh'
  url: string
  removeXZMovement?: boolean
  trimTime?: { start?: number; end?: number }
  boneMap?: Record<string, VRMHumanBoneName>
  scaleTime?: number
}

async function uncachedLoadModelAnimation(
  model: Exclude<Awaited<ReturnType<typeof loadCharacterModel>>, undefined>,
  type: ModelAnimationOptions['type'],
  url: string,
  removeXZMovement: boolean,
  trimStartTime: number | undefined,
  trimEndTime: number | undefined,
  boneMap: Record<string, VRMHumanBoneName> | undefined,
  scaleTime: number | undefined,
) {
  let clips: Array<AnimationClip>
  if (type == null) {
    const lowerCaseUrl = url.toLocaleLowerCase()
    if (lowerCaseUrl.endsWith('.glb') || lowerCaseUrl.endsWith('.gltf')) {
      type = 'gltf'
    }
    if (lowerCaseUrl.endsWith('.fbx')) {
      type = 'fbx'
    }
    if (lowerCaseUrl.endsWith('.bvh')) {
      type = 'bvh'
    }
    if (lowerCaseUrl.endsWith('.vrma')) {
      type = 'vrma'
    }
    if (type == null) {
      throw new Error(
        `Unable to infer animation type from url "${url}. Please specify the type of the animation manually."`,
      )
    }
  }
  switch (type) {
    case 'gltf':
      clips = await loadVrmModelGltfAnimations(model, url, removeXZMovement, boneMap)
      break
    case 'fbx':
      clips = await loadVrmModelFbxAnimations(model, url, removeXZMovement, boneMap)
      break
    case 'bvh':
      clips = await loadVrmModelBvhAnimations(model, url, removeXZMovement, boneMap ?? bvhBoneMap)
      break
    case 'mixamo':
      clips = await loadVrmModelFbxAnimations(model, url, removeXZMovement, boneMap ?? mixamoBoneMap)
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
    options.boneMap,
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

export const mixamoBoneMap = _mixamoBoneMap as Record<string, VRMHumanBoneName>
export const bvhBoneMap = _bvhBoneMap as Record<string, VRMHumanBoneName>
