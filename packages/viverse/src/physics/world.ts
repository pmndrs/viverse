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
import { computeBoundsTree, MeshBVH, StaticGeometryGenerator, ExtendedTriangle } from 'three-mesh-bvh'

const rayHelper = new Ray()
const farPointHelper = new Vector3()
const boxHelper = new Box3()
const triangleHelper = new ExtendedTriangle()
const matrixHelper = new Matrix4()

type BvhEntry = { object: Object3D; isStatic: boolean; bvh: MeshBVH; instanceIndex?: number }

/**
 * Identifies which geometries StaticGeometryGenerator can merge together. Geometries are mergeable when they share
 * the same set of attributes and agree on whether they are indexed, so two geometries with an equal signature are
 * guaranteed not to trigger the "Make sure all geometries have the same number of attributes." error.
 */
function geometryAttributeSignature(geometry: BufferGeometry): string {
  const attributeNames = Object.keys(geometry.attributes).sort().join(',')
  return `${geometry.index == null ? 'non-indexed' : 'indexed'}:${attributeNames}`
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
    const result: Array<BvhEntry> = []
    //StaticGeometryGenerator merges all meshes into a single geometry and throws if they don't all expose
    //the same attributes ("Make sure all geometries have the same number of attributes."). Group the meshes by
    //their attribute signature so every merge only ever sees compatible geometries and generate one bvh per group.
    const meshGroups = new Map<string, Array<Mesh>>()
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
      if (entry instanceof Mesh) {
        const signature = geometryAttributeSignature(entry.geometry)
        let group = meshGroups.get(signature)
        if (group == null) {
          meshGroups.set(signature, (group = []))
        }
        group.push(entry)
      }
    })
    if (meshGroups.size > 0) {
      const parent = object.parent
      if (!isStatic) {
        object.parent = null
        object.updateMatrixWorld(true)
      }
      for (const meshes of meshGroups.values()) {
        const geometry = new StaticGeometryGenerator(meshes).generate()
        const bvh = computeBoundsTree.apply(geometry)
        result.push({ object, bvh, isStatic })
      }
      if (!isStatic) {
        object.parent = parent
        object.updateMatrixWorld(true)
      }
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
