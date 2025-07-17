import { Object3D, Ray, Vector3 } from 'three'
import { computeBoundsTree, MeshBVH, StaticGeometryGenerator } from 'three-mesh-bvh'

export class BvhPhysicsWorld {
  private readonly map = new Map<Object3D, MeshBVH>()

  getBodies(): Iterable<MeshBVH> {
    return this.map.values()
  }

  addFixedBody(object: Object3D) {
    object.updateWorldMatrix(true, true)
    const generator = new StaticGeometryGenerator(object)
    this.map.set(object, computeBoundsTree.apply(generator.generate()))
  }
  removeFixedBody(object: Object3D) {
    this.map.delete(object)
  }
  
  raycast(ray: Ray, far: number) {
    let result: number | undefined
    for (const body of this.getBodies()) {
      for (const intersection of body.raycast(ray, undefined, 0, far)) {
        if (result != null && intersection.distance >= result) {
          continue
        }
        result = intersection.distance
      }
    }
    return result
  }
}
