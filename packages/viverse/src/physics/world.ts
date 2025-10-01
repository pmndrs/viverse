import { Box3, DoubleSide, InstancedMesh, Matrix4, Object3D, Ray, Vector3 } from 'three'
import { computeBoundsTree, MeshBVH, StaticGeometryGenerator, ExtendedTriangle } from 'three-mesh-bvh'

const rayHelper = new Ray()
const farPointHelper = new Vector3()
const boxHelper = new Box3()
const triangleHelper = new ExtendedTriangle()
const matrixHelper = new Matrix4()

type BvhEntry = { object: Object3D; isStatic: boolean; bvh: MeshBVH; instanceIndex?: number }

export class BvhPhysicsWorld {
  private bodies: Array<BvhEntry> = []
  private sensors: Array<
    BvhEntry & {
      onIntersectedChanged: (intersected: boolean) => void
      intersected: boolean
    }
  > = []

  /**
   * @deprecated use addBody(object, false) instead
   */
  addFixedBody(object: Object3D) {
    this.addBody(object, false)
  }

  addSensor(object: Object3D, isStatic: boolean, onIntersectedChanged: (intersected: boolean) => void) {
    this.sensors.push(
      ...this.computeBvhEntries(object, isStatic).map((entry) => ({
        ...entry,
        onIntersectedChanged,
        intersected: false,
      })),
    )
  }

  removeSensor(object: Object3D) {
    this.sensors = this.sensors.filter((entry) => entry.object != object)
  }

  addBody(object: Object3D, kinematic: boolean) {
    this.bodies.push(...this.computeBvhEntries(object, !kinematic))
  }

  private computeBvhEntries(object: Object3D, isStatic: boolean): Array<BvhEntry> {
    object.updateWorldMatrix(true, true)
    if (!(object instanceof InstancedMesh)) {
      const parent = object.parent
      if (!isStatic) {
        object.parent = null
        object.updateMatrixWorld(true)
      }
      const geometry = new StaticGeometryGenerator(object).generate()
      const bvh = computeBoundsTree.apply(geometry)
      if (!isStatic) {
        object.parent = parent
        object.updateMatrixWorld(true)
      }
      return [{ object, bvh, isStatic }]
    }

    if (object.children.length > 0) {
      throw new Error(`cannot add InstancedMesh with children`)
    }

    const bvh = computeBoundsTree.apply(object.geometry)
    return new Array(object.instanceMatrix).fill(undefined as any).map((_, i) => ({
      object,
      bvh,
      instanceIndex: i,
      isStatic,
    }))
  }

  removeBody(object: Object3D) {
    this.bodies = this.bodies.filter((entry) => entry.object != object)
  }

  private computeMatrix({ isStatic, object, instanceIndex }: (typeof this.bodies)[number], target: Matrix4): boolean {
    if (isStatic && instanceIndex == null) {
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

  updateSensors(
    playerCenter: Vector3,
    intersectsBounds: (box: Box3) => boolean,
    intersectsTriangle: (triangle: ExtendedTriangle) => boolean,
  ) {
    for (const entry of this.sensors) {
      //check surface intersection
      let intersected = this.shapecastEntry(entry, intersectsBounds, intersectsTriangle)
      if (!intersected) {
        //check if we are entirely inside
        rayHelper.origin.copy(playerCenter)
        rayHelper.direction.set(0, -1, 0)
        if (this.computeMatrix(entry, matrixHelper)) {
          matrixHelper.invert()
          rayHelper.applyMatrix4(matrixHelper)
        }
        intersected = entry.bvh.raycast(rayHelper, DoubleSide).length % 2 == 1
      }
      if (entry.intersected === intersected) {
        continue
      }
      entry.onIntersectedChanged(intersected)
      entry.intersected = intersected
    }
  }

  shapecast(intersectsBounds: (box: Box3) => boolean, intersectsTriangle: (triangle: ExtendedTriangle) => void) {
    for (const entry of this.bodies) {
      this.shapecastEntry(entry, intersectsBounds, intersectsTriangle)
    }
  }

  private shapecastEntry(
    entry: BvhEntry,
    intersectsBounds: (box: Box3) => boolean,
    intersectsTriangle: (triangle: ExtendedTriangle) => void | boolean,
  ) {
    return entry.bvh.shapecast({
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
        if (intersectsTriangle(triangleHelper) === true) {
          return true
        }
      },
    })
  }

  raycast(ray: Ray, far: number) {
    let result: number | undefined
    for (const entry of this.bodies.values()) {
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
