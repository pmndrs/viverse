import { Object3D, Object3DEventMap } from 'three'
import { GLTF, GLTFLoader } from 'three/examples/jsm/Addons.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

export const gltfLoader = new GLTFLoader()
gltfLoader.setMeshoptDecoder(MeshoptDecoder)

export async function loadGltfCharacterModel(url: string) {
  return (await gltfLoader.loadAsync(url)) as GLTF & {
    scene: Object3D<Object3DEventMap & { dispose: {} }>
  }
}
