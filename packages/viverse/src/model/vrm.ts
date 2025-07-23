import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'
import { VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation'
import { Object3D, Object3DEventMap } from 'three'
import { GLTFLoader } from 'three/examples/jsm/Addons.js'

export const vrmaLoader = new GLTFLoader()
vrmaLoader.register((parser) => new VRMLoaderPlugin(parser, { autoUpdateHumanBones: true }))
vrmaLoader.register((parser) => new VRMAnimationLoaderPlugin(parser))

export async function loadVrmCharacterModel(url: string) {
  const vrm = (await vrmaLoader.loadAsync(url)).userData.vrm as VRM & {
    scene: Object3D<Object3DEventMap & { dispose: {} }>
  }
  // fixes a bug where 2 VRMHumanoidRigs are loaded
  vrm.scene.children
    .filter((child) => child.name === 'VRMHumanoidRig')
    .slice(0, -1)
    .forEach((child) => child.parent?.remove(child))
  VRMUtils.removeUnnecessaryVertices(vrm.scene)
  VRMUtils.combineSkeletons(vrm.scene)
  // Disable frustum culling
  vrm.scene.traverse((obj) => void (obj.frustumCulled = false))

  return vrm
}
