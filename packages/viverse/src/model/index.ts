import { VRM, type VRMHumanBoneName } from '@pixiv/three-vrm'
import { AnimationAction, AnimationMixer, Box3, Euler, Object3D, Quaternion, Vector3 } from 'three'
import { loadGltfCharacterModel } from './gltf.js'
import { loadVrmCharacterModel } from './vrm.js'
import type { BoneMap } from '../utils.js'
export { VRMHumanBoneName } from '@pixiv/three-vrm'
export * from './vrm.js'

export type CharacterModelOptions = {
  readonly type?: 'vrm' | 'gltf'
  readonly boneMap?: Record<string, VRMHumanBoneName>
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
  /**
   * @default false
   */
  readonly useDraco?: boolean
}

export function flattenCharacterModelOptions(
  options: Exclude<CharacterModelOptions, false> | undefined,
): Parameters<typeof loadCharacterModel> {
  if (options == null) {
    return []
  }
  return [
    options.url,
    options.type,
    options.boneRotationOffset,
    options.castShadow,
    options.receiveShadow,
    options.boneMap,
    options.useDraco,
  ]
}

export type CharacterModel = {
  mixer: AnimationMixer
  scene: Object3D
  currentAnimations: Map<string | undefined, AnimationAction>
  boneRotationOffset?: Quaternion
  /**
   * The character's real height in world units, measured once from the loaded mesh in its
   * bind pose. Use this to size things to the character (nameplates, hitboxes, scale
   * normalization) instead of `new Box3().setFromObject(scene)` — that includes the skeleton
   * bones and the internal rest-pose reference copy and changes as the animation plays, so it
   * returns a height several times the visible body.
   *
   * Always set by `loadCharacterModel`; optional only so hand-built `CharacterModel` objects
   * (e.g. cloned NPC instances) stay valid — copy it across when you clone.
   */
  height?: number
}

export async function loadCharacterModel(
  url?: string,
  type?: Exclude<CharacterModelOptions, boolean>['type'],
  boneRotationOffset?: Quaternion,
  castShadow: boolean = true,
  receiveShadow: boolean = true,
  boneMap?: BoneMap,
  useDraco?: boolean,
): Promise<CharacterModel> {
  let result: Omit<CharacterModel, 'mixer' | 'currentAnimations'>

  if (url == null) {
    //prepare loading the default model
    type = 'gltf'
    url = (await import('../assets/mannequin.js')).url
    boneRotationOffset = new Quaternion().setFromEuler(new Euler(Math.PI / 2, 0, Math.PI / 2, 'ZYX'))
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
      result = await loadGltfCharacterModel(url, useDraco)
      break
  }
  result.boneRotationOffset = boneRotationOffset
  result.scene.traverse((obj) => {
    obj.name = boneMap?.[obj.name] ?? obj.name
    obj.frustumCulled = false
    if (castShadow) {
      obj.castShadow = true
    }
    if (receiveShadow) {
      obj.receiveShadow = true
    }
  })
  // Measure the real height here: the scene is still in its bind pose, the mixer has not run,
  // and the rest-pose clone below has not been added yet — so the bounding box is just the
  // visible mesh and is stable. Measuring later (after the clone, once animating) inflates it.
  const height = new Box3().setFromObject(result.scene).getSize(new Vector3()).y

  const restPose = result.scene.clone()
  restPose.visible = false
  restPose.traverse((object) => (object.name = `rest_${object.name}`))
  result.scene.add(restPose)
  return Object.assign(result, { mixer: new AnimationMixer(result.scene), currentAnimations: new Map(), height })
}

export function getBone(model: CharacterModel, name: VRMHumanBoneName): Object3D | undefined {
  return model instanceof VRM ? (model.humanoid.getRawBoneNode(name) ?? undefined) : model.scene.getObjectByName(name)
}
