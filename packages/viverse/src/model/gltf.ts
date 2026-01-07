import { Object3D, Object3DEventMap } from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export const gltfLoader = new GLTFLoader()
gltfLoader.setMeshoptDecoder(MeshoptDecoder)
let dracoLoader: DRACOLoader

export async function loadGltfCharacterModel(url: string, useDraco: boolean = false) {
  if (useDraco && dracoLoader == null) {
    dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
    gltfLoader.setDRACOLoader(dracoLoader)
  }
  return (await gltfLoader.loadAsync(url)) as GLTF & {
    scene: Object3D<Object3DEventMap & { dispose: {} }>
  }
}
