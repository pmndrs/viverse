import { AnimationClip } from 'three'
import { GLTFLoader } from 'three/examples/jsm/Addons.js'
import { fixModelAnimationClip } from './index.js'
import { loadCharacterModel } from '../model/index.js'

const loader = new GLTFLoader()

export async function loadVrmModelGltfAnimations(
  model: Exclude<Awaited<ReturnType<typeof loadCharacterModel>>, undefined>,
  url: string,
  removeXZMovement: boolean,
): Promise<Array<AnimationClip>> {
  const { animations, scene: clipScene } = await loader.loadAsync(url)
  animations.forEach((clip) => fixModelAnimationClip(model, clip, clipScene, removeXZMovement))
  return animations
}
