import {
  Box3,
  BufferGeometry,
  DoubleSide,
  InstancedMesh,
  Intersection,
  Matrix4,
  Mesh,
  Object3D,
  Ray,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { computeBoundsTree, MeshBVH, ExtendedTriangle } from 'three-mesh-bvh'

const rayHelper = new Ray()
const farPointHelper = new Vector3()
const boxHelper = new Box3()
const triangleHelper = new ExtendedTriangle()
const matrixHelper = new Matrix4()

type BvhEntry = { object: Object3D; isStatic: boolean; bvh: MeshBVH; instanceIndex?: number }

/**
 * Bakes a mesh's collision geometry into `matrix` space. A bvh only needs positions and (optionally) an index, so
 * everything else is dropped - this keeps the merge below trivial and sidesteps three's "geometries must have the
 * same attributes" restriction that a body mixing meshes with different attribute sets (e.g. gltf primitives) hits.
 */
function bakeCollisionGeometry(mesh: Mesh, matrix: Matrix4): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', mesh.geometry.getAttribute('position').clone())
  if (mesh.geometry.index != null) {
    geometry.setIndex(mesh.geometry.index.clone())
  }
  return geometry.applyMatrix4(matrix)
}

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
    //Static bodies are baked in world space; kinematic bodies are baked in the body's local space so that its
    //(changing) world matrix can be applied at query time instead (see computeMatrix), hence the inverse here.
    const worldToBakeSpace = isStatic ? undefined : new Matrix4().copy(object.matrixWorld).invert()
    const bakeMatrix = new Matrix4()
    const result: Array<BvhEntry> = []
    //A merge of collision geometries only works when they agree on being indexed, so keep indexed and
    //non-indexed meshes apart and turn each group into its own bvh.
    const indexedGeometries: Array<BufferGeometry> = []
    const nonIndexedGeometries: Array<BufferGeometry> = []
    object.traverse((entry) => {
      if (entry instanceof InstancedMesh) {
        const bvh = computeBoundsTree.apply(entry.geometry)
        result.push(
          ...Array.from({ length: entry.instanceMatrix.count }, (_, instanceIndex) => ({
            object: entry,
            bvh,
            instanceIndex,
            isStatic,
          })),
        )
        return
      }
      if (!(entry instanceof Mesh)) {
        return
      }
      bakeMatrix.copy(entry.matrixWorld)
      if (worldToBakeSpace != null) {
        bakeMatrix.premultiply(worldToBakeSpace)
      }
      const geometry = bakeCollisionGeometry(entry, bakeMatrix)
      ;(geometry.index == null ? nonIndexedGeometries : indexedGeometries).push(geometry)
    })
    for (const geometries of [indexedGeometries, nonIndexedGeometries]) {
      if (geometries.length === 0) {
        continue
      }
      const geometry = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries)
      const bvh = computeBoundsTree.apply(geometry)
      result.push({ object, bvh, isStatic })
    }

    return result
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
    let result: Intersection | undefined
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
        if (result != null && intersection.distance >= result.distance) {
          continue
        }
        result = intersection
      }
    }
    return result
  }
}
