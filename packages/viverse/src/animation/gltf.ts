import { VRM } from '@pixiv/three-vrm'
import { AnimationClip } from 'three'
import { GLTFLoader } from 'three/examples/jsm/Addons.js'
import { fixVrmModelAnimationClip } from './index.js'

const loader = new GLTFLoader()

export async function loadVrmModelGltfAnimations(
  vrm: VRM,
  url: string,
  removeXZMovement: boolean,
): Promise<Array<AnimationClip>> {
  const { animations, scene: clipScene } = await loader.loadAsync(url)
  animations.forEach((clip) => fixVrmModelAnimationClip(vrm, clip, clipScene, removeXZMovement))
  return animations
}
