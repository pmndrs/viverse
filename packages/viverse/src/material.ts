import { MeshPhongMaterial, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector2 } from 'three'

const loader = new TextureLoader()

export class PrototypeMaterial extends MeshPhongMaterial {
  public readonly repeat = new Vector2(2, 2)

  constructor() {
    super({ toneMapped: false, shininess: 0 })
    this.init().catch(console.error)
  }

  private async init() {
    const texture = await loader.loadAsync((await import('./assets/prototype-texture.js')).url)
    this.map = texture
    texture.colorSpace = SRGBColorSpace
    this.map.wrapS = RepeatWrapping
    this.map.wrapT = RepeatWrapping
    this.needsUpdate = true
    this.map.repeat = this.repeat
  }
}
