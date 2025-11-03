import { AnimationAction, AnimationMixer, Euler, Object3D, Quaternion } from 'three'
import { loadGltfCharacterModel } from './gltf.js'
import { loadVrmCharacterModel } from './vrm.js'
import { CharacterAnimationMask } from '../animation/index.js'

export { VRMHumanBoneName } from '@pixiv/three-vrm'
export * from './vrm.js'

export type CharacterModelOptions = {
  readonly type?: 'vrm' | 'gltf'
  readonly url?: string
  /**
   * allows to apply an rotation offset when placing objects as children of the character's bones
   * @default undefined
   */
  readonly boneRotationOffset?: Quaternion
  /**
   * @default true
   */
  readonly castShadow?: boolean
  /**
   * @default true
   */
  readonly receiveShadow?: boolean
}

export function flattenCharacterModelOptions(
  options: Exclude<CharacterModelOptions, false> | undefined,
): Parameters<typeof loadCharacterModel> {
  if (options == null) {
    return []
  }
  return [options.url, options.type, options.boneRotationOffset, options.castShadow, options.receiveShadow]
}

export type CharacterModel = {
  mixer: AnimationMixer
  scene: Object3D
  currentAnimations: Map<CharacterAnimationMask | undefined, AnimationAction>
  boneRotationOffset?: Quaternion
}

export async function loadCharacterModel(
  url?: string,
  type?: Exclude<CharacterModelOptions, boolean>['type'],
  boneRotationOffset?: Quaternion,
  castShadow: boolean = true,
  receiveShadow: boolean = true,
): Promise<CharacterModel> {
  let result: Omit<CharacterModel, 'mixer' | 'currentAnimations'>

  if (url == null) {
    //prepare loading the default model
    type = 'gltf'
    url = (await import('../assets/mannequin.js')).url
    boneRotationOffset = new Quaternion().setFromEuler(new Euler(Math.PI, 0, Math.PI / 2, 'ZYX'))
  }

  if (type == null) {
    if (url.endsWith('.gltf') || url.endsWith('.glb')) {
      type = 'gltf'
    }
    if (url.endsWith('.vrm')) {
      type = 'vrm'
    }
    if (type == null) {
      throw new Error(`Unable to infer model type from url "${url}. Please specify the type of the model manually."`)
    }
  }

  switch (type) {
    case 'vrm':
      result = await loadVrmCharacterModel(url)
      break
    case 'gltf':
      result = await loadGltfCharacterModel(url)
      break
  }
  result.boneRotationOffset = boneRotationOffset
  result.scene.traverse((obj) => {
    obj.frustumCulled = false
    if (castShadow) {
      obj.castShadow = true
    }
    if (receiveShadow) {
      obj.receiveShadow = true
    }
  })
  //TODO: "root" does not exist on all models (some VRMs)
  const rootBone = result.scene.getObjectByName('root')
  if (rootBone == null) {
    throw new Error(`unable to load model - missing root bone`)
  }
  const restPose = rootBone.clone()
  restPose.visible = false
  restPose.traverse((bone) => (bone.name = `rest_${bone.name}`))
  result.scene.add(restPose)
  return Object.assign(result, { mixer: new AnimationMixer(result.scene), currentAnimations: new Map() })
}
