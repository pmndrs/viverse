import { VRM } from '@pixiv/three-vrm'
import { createVRMAnimationClip, VRMAnimation } from '@pixiv/three-vrm-animation'
import { AnimationClip } from 'three'
import { vrmaLoader } from '../index.js'

export async function loadVrmModelVrmaAnimations(
  vrm: VRM,
  url: string,
  removeXZMovement: boolean,
): Promise<Array<AnimationClip>> {
  const animations = await vrmaLoader.loadAsync(url)
  const vrmAnimations: Array<VRMAnimation> = animations.userData.vrmAnimations
  const clips = vrmAnimations.map((vrmAnimation) => createVRMAnimationClip(vrmAnimation, vrm))
  return clips
}
