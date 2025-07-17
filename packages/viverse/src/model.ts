import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'
import { GLTFLoader } from 'three/examples/jsm/Addons.js'
import { VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation'
import { cached, clearCache } from './utils.js'
import { Object3D, Object3DEventMap } from 'three'

export const vrmaLoader = new GLTFLoader()
vrmaLoader.register((parser) => new VRMLoaderPlugin(parser, { autoUpdateHumanBones: true }))
vrmaLoader.register((parser) => new VRMAnimationLoaderPlugin(parser))

export type VrmCharacterModelOptions =
  | {
      readonly url?: string
      /**
       * @default true
       */
      readonly castShadow?: boolean
      /**
       * @default true
       */
      readonly receiveShadow?: boolean
    }
  | boolean

function getVrmCharacterModelDependencies(
  options: VrmCharacterModelOptions = true,
): Parameters<typeof uncachedLoadVrmCharacterModel> | undefined {
  if (options === false) {
    return undefined
  }
  if (options === true) {
    return [undefined, true, true]
  }
  return [options.url, options.castShadow ?? true, options.receiveShadow ?? true] as const
}

async function uncachedLoadVrmCharacterModel(url: string | undefined, castShadow: boolean, receiveShadow: boolean) {
  url ??= (await import('./assets/robot.js')).url
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
  vrm.scene.traverse((obj) => {
    obj.frustumCulled = false
    if (castShadow) {
      obj.castShadow = true
    }
    if (receiveShadow) {
      obj.receiveShadow = true
    }
  })

  return vrm
}

export function clearVrmCharacterModelCache(options?: VrmCharacterModelOptions) {
  const dependencies = getVrmCharacterModelDependencies(options)
  if (dependencies == null) {
    return
  }
  clearCache(uncachedLoadVrmCharacterModel, dependencies)
}

export function loadVrmCharacterModel(options?: VrmCharacterModelOptions) {
  const dependencies = getVrmCharacterModelDependencies(options)
  if (dependencies == null) {
    return undefined
  }
  return cached(uncachedLoadVrmCharacterModel, dependencies as any)
}

export * from './animation/index.js'
export { VRMHumanBoneName } from '@pixiv/three-vrm'
