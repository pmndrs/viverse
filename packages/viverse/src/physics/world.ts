import { Box3, InstancedMesh, Matrix4, Object3D, Ray, Vector3 } from 'three'
import { computeBoundsTree, MeshBVH, StaticGeometryGenerator, ExtendedTriangle } from 'three-mesh-bvh'

const rayHelper = new Ray()
const farPointHelper = new Vector3()
const boxHelper = new Box3()
const triangleHelper = new ExtendedTriangle()
const matrixHelper = new Matrix4()

export class BvhPhysicsWorld {
  private map: Array<{ object: Object3D; kinematic: boolean; bvh: MeshBVH; instanceIndex?: number }> = []

  /**
   * @deprecated use addBody(object, false) instead
   */
  addFixedBody(object: Object3D) {
    this.addBody(object, false)
  }

  addBody(object: Object3D, kinematic: boolean) {
    object.updateWorldMatrix(true, true)
    if (!(object instanceof InstancedMesh)) {
      const parent = object.parent
      if (kinematic) {
        object.parent = null
        object.updateMatrixWorld(true)
      }
      const geometry = new StaticGeometryGenerator(object).generate()
      this.map.push({ object, bvh: computeBoundsTree.apply(geometry), kinematic })
      if (kinematic) {
        object.parent = parent
        object.updateMatrixWorld(true)
      }
      return
    }

    if (object.children.length > 0) {
      throw new Error(`cannot add InstancedMesh with children`)
    }

    const bvh = computeBoundsTree.apply(object.geometry)
    for (let i = 0; i < object.instanceMatrix.count; i++) {
      this.map.push({
        object,
        bvh,
        instanceIndex: i,
        kinematic,
      })
    }
  }
  removeBody(object: Object3D) {
    this.map = this.map.filter((entry) => entry.object != object)
  }

  private computeMatrix({ kinematic, object, instanceIndex }: (typeof this.map)[number], target: Matrix4): boolean {
    if (!kinematic && instanceIndex == null) {
      return false
    }
    if (instanceIndex == null) {
      target.copy(object.matrixWorld)
      return true
    }
    ;(object as InstancedMesh).getMatrixAt(instanceIndex, target)
    target.premultiply(object.matrixWorld)
    return true
  }

  shapecast(intersectsBounds: (box: Box3) => boolean, intersectsTriangle: (triangle: ExtendedTriangle) => void): void {
    for (const entry of this.map) {
      entry.bvh.shapecast({
        intersectsBounds: (box) => {
          boxHelper.copy(box)
          if (this.computeMatrix(entry, matrixHelper)) {
            boxHelper.applyMatrix4(matrixHelper)
          }
          return intersectsBounds(boxHelper)
        },
        intersectsTriangle: (triangle) => {
          triangleHelper.copy(triangle)
          if (this.computeMatrix(entry, matrixHelper)) {
            triangleHelper.a.applyMatrix4(matrixHelper)
            triangleHelper.b.applyMatrix4(matrixHelper)
            triangleHelper.c.applyMatrix4(matrixHelper)
          }
          intersectsTriangle(triangleHelper)
        },
      })
    }
  }

  raycast(ray: Ray, far: number) {
    let result: number | undefined
    for (const entry of this.map.values()) {
      rayHelper.copy(ray)
      let farHelper = far
      if (this.computeMatrix(entry, matrixHelper)) {
        matrixHelper.invert()
        farPointHelper.copy(ray.origin).addScaledVector(ray.direction, far).applyMatrix4(matrixHelper)
        rayHelper.applyMatrix4(matrixHelper)
        farHelper = farPointHelper.distanceTo(rayHelper.origin)
      }
      for (const intersection of entry.bvh.raycast(rayHelper, undefined, 0, farHelper)) {
        if (result != null && intersection.distance >= result) {
          continue
        }
        result = intersection.distance
      }
    }
    return result
  }
}
