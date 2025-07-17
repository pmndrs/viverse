import { VRM } from '@pixiv/three-vrm'
import { AnimationClip } from 'three'
import { FBXLoader } from 'three/examples/jsm/Addons.js'
import { fixVrmModelAnimationClip } from './index.js'
import mixamoBoneMap from './mixamo-bone-map.json'

const loader = new FBXLoader()

export async function loadVrmModelMixamoAnimations(
  vrm: VRM,
  url: string,
  removeXZMovement: boolean,
): Promise<Array<AnimationClip>> {
  const clipScene = await loader.loadAsync(url)
  clipScene.animations.forEach((clip) =>
    fixVrmModelAnimationClip(vrm, clip, clipScene, removeXZMovement, mixamoBoneMap as any),
  )
  return clipScene.animations
}
