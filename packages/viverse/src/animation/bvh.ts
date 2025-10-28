import { AnimationClip } from 'three'
import { BVHLoader } from 'three/examples/jsm/Addons.js'
import { bvhBoneMap, fixModelAnimationClip } from './index.js'
import { loadCharacterModel } from '../model/index.js'
import type { VRMHumanBoneName } from '@pixiv/three-vrm'

const loader = new BVHLoader()

export async function loadVrmModelBvhAnimations(
  model: Exclude<Awaited<ReturnType<typeof loadCharacterModel>>, undefined>,
  url: string,
  removeXZMovement: boolean,
  boneMap?: Record<string, VRMHumanBoneName>,
): Promise<Array<AnimationClip>> {
  const clipScene = await loader.loadAsync(url)
  fixModelAnimationClip(model, clipScene.clip, undefined, removeXZMovement, boneMap ?? bvhBoneMap)
  return [clipScene.clip]
}
