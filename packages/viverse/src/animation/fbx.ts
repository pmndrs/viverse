import { AnimationClip } from 'three'
import { FBXLoader } from 'three/examples/jsm/Addons.js'
import { fixModelAnimationClip } from './index.js'
import { loadCharacterModel } from '../model/index.js'
import type { VRMHumanBoneName } from '@pixiv/three-vrm'

const loader = new FBXLoader()

export async function loadVrmModelFbxAnimations(
  model: Exclude<Awaited<ReturnType<typeof loadCharacterModel>>, undefined>,
  url: string,
  removeXZMovement: boolean,
  boneMap?: Record<string, VRMHumanBoneName>,
): Promise<Array<AnimationClip>> {
  const clipScene = await loader.loadAsync(url)
  clipScene.animations.forEach((clip) => fixModelAnimationClip(model, clip, clipScene, removeXZMovement, boneMap))
  return clipScene.animations
}
