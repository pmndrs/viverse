import { AnimationClip } from 'three'
import { BVHLoader } from 'three/examples/jsm/Addons.js'
import { bvhBoneMap, fixModelAnimationClip } from './index.js'
import type { CharacterModel } from '../model/index.js'
import type { VRMHumanBoneName } from '@pixiv/three-vrm'

const loader = new BVHLoader()

export async function loadVrmModelBvhAnimations(
  model: CharacterModel,
  url: string,
  removeXZMovement: boolean,
  boneMap?: Record<string, VRMHumanBoneName>,
): Promise<Array<AnimationClip>> {
  const clipScene = await loader.loadAsync(url)
  fixModelAnimationClip(model, clipScene.clip, undefined, removeXZMovement, boneMap ?? bvhBoneMap)
  return [clipScene.clip]
}
