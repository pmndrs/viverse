import { AnimationClip } from 'three'
import { FBXLoader } from 'three/examples/jsm/Addons.js'
import { fixModelAnimationClip } from './index.js'
import mixamoBoneMap from './mixamo-bone-map.json'
import { loadCharacterModel } from '../model/index.js'

const loader = new FBXLoader()

export async function loadVrmModelMixamoAnimations(
  model: Exclude<Awaited<ReturnType<typeof loadCharacterModel>>, undefined>,
  url: string,
  removeXZMovement: boolean,
): Promise<Array<AnimationClip>> {
  const clipScene = await loader.loadAsync(url)
  clipScene.animations.forEach((clip) =>
    fixModelAnimationClip(model, clip, clipScene, removeXZMovement, mixamoBoneMap as any),
  )

  return clipScene.animations
}
