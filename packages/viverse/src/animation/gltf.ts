import { AnimationClip } from 'three'
import { GLTFLoader } from 'three/examples/jsm/Addons.js'
import { fixModelAnimationClip } from './index.js'
import type { CharacterModel, VRMHumanBoneName } from '../model/index.js'

const loader = new GLTFLoader()

export async function loadVrmModelGltfAnimations(
  model: CharacterModel,
  url: string,
  removeXZMovement: boolean,
  boneMap?: Record<string, VRMHumanBoneName>,
): Promise<Array<AnimationClip>> {
  const { animations, scene: clipScene } = await loader.loadAsync(url)
  animations.forEach((clip) => fixModelAnimationClip(model, clip, clipScene, removeXZMovement, boneMap))
  return animations
}
