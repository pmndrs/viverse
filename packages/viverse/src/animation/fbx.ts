import { AnimationClip } from 'three'
import { FBXLoader } from 'three/examples/jsm/Addons.js'
import { fixModelAnimationClip } from './index.js'
import type { CharacterModel } from '../model/index.js'
import type { VRMHumanBoneName } from '@pixiv/three-vrm'

const loader = new FBXLoader()

export async function loadVrmModelFbxAnimations(
  model: CharacterModel,
  url: string,
  removeXZMovement: boolean,
  boneMap?: Record<string, VRMHumanBoneName>,
): Promise<Array<AnimationClip>> {
  const clipScene = await loader.loadAsync(url)
  clipScene.animations.forEach((clip) => fixModelAnimationClip(model, clip, clipScene, removeXZMovement, boneMap))
  return clipScene.animations
}
