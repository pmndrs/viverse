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
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { applyAnimationBoneMap } from './bone-map.js'
import _bvhBoneMap from './bvh-bone-map.json' with { type: 'json' }
import { DefaultUrl, resolveDefaultCharacterAnimationUrl } from './default.js'
import { applyMask, type CharacterAnimationMask } from './mask.js'
import _mixamoBoneMap from './mixamo-bone-map.json'
import { scaleAnimationClipTime, trimAnimationClip } from './utils.js'
import { vrmaLoader, type CharacterModel } from '../model/index.js'

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
  model: CharacterModel,
  clip: AnimationClip,
  clipScene: Object3D | undefined,
  removeXZMovement: boolean,
): void {
  clip.tracks = clip.tracks.filter((track) => {
    if (track instanceof QuaternionKeyframeTrack) {
      return true
    }
    const [clipBoneName, propertyName] = track.name.split('.')
    if (propertyName != 'position') {
      return false
    }
    if (clipBoneName == 'hips' || clipBoneName == 'root') {
      return true
    }
    return false
  })

  let restRoot: Object3D | undefined | null
  let restRootParent: Object3D | null | undefined

  if (!(model instanceof VRM)) {
    restRoot = model.scene.getObjectByName('rest_hips')?.parent
    if (restRoot == null) {
      throw new Error(`Model hips.parent not found.`)
    }
    restRootParent = restRoot?.parent
    restRoot.parent = null
  }

  let positionScale = 1
  let clipSceneHips: Object3D | undefined

  if (clipScene != null) {
    clipSceneHips = clipScene.getObjectByName('hips')
    clipSceneHips?.parent?.updateMatrixWorld()
    const vrmHipsPosition =
      model instanceof VRM
        ? model.humanoid.normalizedRestPose.hips?.position
        : model.scene.getObjectByName('rest_hips')?.getWorldPosition(new Vector3()).toArray()
    if (clipSceneHips != null && vrmHipsPosition != null) {
      // Adjust with reference to hips height.
      const motionHipsHeight = clipSceneHips.getWorldPosition(position).y
      const [_, vrmHipsHeight] = vrmHipsPosition
      positionScale = vrmHipsHeight / motionHipsHeight
    }
  }

  for (const track of clip.tracks) {
    // Convert each tracks for VRM use, and push to `tracks`
    const [clipBoneName, propertyName] = track.name.split('.')
    const targetNormalizedBoneName =
      model instanceof VRM ? model.humanoid.getNormalizedBoneNode(clipBoneName as VRMHumanBoneName)?.name : clipBoneName
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
      const targetBone = model.scene.getObjectByName(`rest_${clipBoneName}`)
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

        if (!(model instanceof VRM) && clipBoneName === 'hips') {
          targetThisLocalCurrentRotation.premultiply(nonVrmRotationOffset)
        }

        targetThisLocalCurrentRotation.toArray(track.values, i)
      }

      track.name = trackName
    } else if (track instanceof VectorKeyframeTrack) {
      for (let i = 0; i < track.values.length; i += 3) {
        position.fromArray(track.values, i)
        if (clipSceneHips?.parent != null) {
          if (clipBoneName === 'hips') {
            position.applyMatrix4(clipSceneHips.parent.matrixWorld)
          } else {
            position.multiplyScalar(clipSceneHips.parent.matrixWorld.getMaxScaleOnAxis())
          }
        }
        const modelBone = model.scene.getObjectByName(`rest_${clipBoneName}`)
        if (modelBone != null) {
          modelBone.updateMatrixWorld()
          position.divideScalar(modelBone.matrixWorld.getMaxScaleOnAxis())
        }
        position.multiplyScalar(positionScale)
        if (!(model instanceof VRM) && clipBoneName === 'hips') {
          position.applyQuaternion(nonVrmRotationOffset)
        }
        if (model instanceof VRM) {
          if (model.meta.metaVersion === '0') {
            position.negate()
            position.y *= -1
          }
        }
        if (clipBoneName === 'hips' && removeXZMovement) {
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

export * from './utils.js'
export * from './default.js'
export * from './mask.js'
export * from './bone-map.js'

export type CharacterAnimationOptions = {
  url: string | DefaultUrl
  type?: 'mixamo' | 'gltf' | 'vrma' | 'fbx' | 'bvh'
  removeXZMovement?: boolean
  trimTime?: { start?: number; end?: number }
  boneMap?: Record<string, VRMHumanBoneName>
  scaleTime?: number
  mask?: CharacterAnimationMask
}

export type Tail<T extends any[]> = T extends [any, ...infer Rest] ? Rest : never

export function flattenCharacterAnimationOptions(
  options: Exclude<CharacterAnimationOptions, false>,
): Tail<Parameters<typeof loadCharacterAnimation>> {
  return [
    options.url,
    options.type,
    options.removeXZMovement,
    options.trimTime?.start,
    options.trimTime?.end,
    options.boneMap,
    options.scaleTime,
    options.mask,
  ]
}

const gltfLoader = new GLTFLoader()
const fbxLoader = new FBXLoader()
const bvhLoader = new BVHLoader()

export async function loadCharacterAnimation(
  model: CharacterModel,
  url: string | DefaultUrl,
  type?: CharacterAnimationOptions['type'],
  removeXZMovement: boolean = false,
  trimStartTime?: number | undefined,
  trimEndTime?: number | undefined,
  boneMap?: Record<string, VRMHumanBoneName> | undefined,
  scaleTime?: number | undefined,
  mask?: CharacterAnimationMask,
) {
  if (typeof url === 'symbol') {
    url = await resolveDefaultCharacterAnimationUrl(url)
    type = 'gltf'
  }
  let clips: Array<AnimationClip>
  let clipScene: Object3D | undefined
  let defaultBoneMap: Record<string, VRMHumanBoneName> | undefined
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
    case 'gltf': {
      const { animations, scene } = await gltfLoader.loadAsync(url)
      clips = animations
      clipScene = scene
      break
    }
    case 'fbx': {
      const scene = await fbxLoader.loadAsync(url)
      clips = scene.animations
      clipScene = scene
      break
    }
    case 'bvh': {
      const { clip, skeleton } = await bvhLoader.loadAsync(url)
      clips = [clip]
      boneMap ??= bvhBoneMap
      break
    }
    case 'mixamo': {
      const scene = await fbxLoader.loadAsync(url)
      clips = scene.animations
      clipScene = scene
      boneMap ??= mixamoBoneMap
      break
    }
    case 'vrma':
      if (!(model instanceof VRM)) {
        throw new Error(`Model must be an instance of VRM to load VRMA animations`)
      }
      clips = (await vrmaLoader.loadAsync(url)).userData.vrmAnimations
      break
  }
  if (clips.length != 1) {
    throw new Error(`Expected exactly one animation clip, but got ${clips.length} for url ${url}`)
  }
  const [clip] = clips
  if (boneMap != null) {
    applyAnimationBoneMap(clip, clipScene, boneMap)
  }
  if (mask != null) {
    applyMask(clip, mask)
  }
  if (type != 'vrma') {
    fixModelAnimationClip(model, clip, clipScene, removeXZMovement)
  }
  if (trimStartTime != null || trimEndTime != null) {
    trimAnimationClip(clip, trimStartTime, trimEndTime)
  }
  if (scaleTime != null) {
    scaleAnimationClipTime(clip, scaleTime)
  }
  return clip
}

export const mixamoBoneMap = _mixamoBoneMap as Record<string, VRMHumanBoneName>
export const bvhBoneMap = _bvhBoneMap as Record<string, VRMHumanBoneName>
