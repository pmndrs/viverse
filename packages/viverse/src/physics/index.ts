import { Box3, Line3, Matrix4, Object3D, Vector3 } from 'three'
import { BvhPhysicsWorld } from './world.js'

export type BvhCharacterPhysicsOptions =
  | {
      /**
       * @default 60
       */
      updatesPerSecond?: number
      /**
       * @default 0.4
       */
      capsuleRadius?: number
      /**
       * @default 1.7
       */
      capsuleHeight?: number
      /**
       * Gravity acceleration in m/s²
       * @default -20
       */
      gravity?: number
      /**
       * Linear damping coefficient (air resistance)
       * @default 0.1
       */
      linearDamping?: number
      /**
       * @default 0.25;
       */
      slopeGroundingThreshold?: number
    }
  | boolean

//for this is a kinematic character controller

//helper variables
const aabbox = new Box3()
const segment = new Line3()
const triPoint = new Vector3()
const capsulePoint = new Vector3()

const collisionFreePosition = new Vector3()
const position = new Vector3()
const collisionDelta = new Vector3()
const invertedParentMatrix = new Matrix4()

/**
 * assumes the target object origin is at its bottom
 */
export class BvhCharacterPhysics {
  private destroyed = false
  private readonly stateVelocity = new Vector3()
  public readonly inputVelocity = new Vector3()
  public isGrounded = false

  constructor(
    private readonly character: Object3D,
    private readonly world: BvhPhysicsWorld,
  ) {}

  applyVelocity(velocity: Vector3) {
    this.stateVelocity.add(velocity)
  }

  /**
   * @param delta in seconds
   */
  update(fullDelta: number, options: BvhCharacterPhysicsOptions = true): void {
    if (options === false) {
      return
    }
    if (options === true) {
      options = {}
    }
    if (this.destroyed) {
      return
    }
    //at max catch up to 1 second of physics in one update call (running at less then 1fps is unplayable anyways)
    fullDelta = Math.min(1, fullDelta)

    const updatesPerSecond = options.updatesPerSecond ?? 60
    const physicsDelta = 1 / updatesPerSecond

    //strong simplified fixed physics update: we compute a frame for the fractional

    while (fullDelta > 0) {
      const partialDelta = Math.min(fullDelta, physicsDelta)
      fullDelta -= physicsDelta
      //compute global position and inverted parent matrix so that we can compute the position in global space and re-assign it to the local chracter space
      if (this.character.parent != null) {
        this.character.parent.updateWorldMatrix(true, false)
        position.copy(this.character.position).applyMatrix4(this.character.parent.matrixWorld)
        invertedParentMatrix.copy(this.character.parent.matrixWorld).invert()
      } else {
        invertedParentMatrix.identity()
      }

      //compute new position based on the state velocity, the input velocity, and the delta
      const yMovement = this.stateVelocity.y * partialDelta
      position.addScaledVector(this.stateVelocity, partialDelta)
      position.addScaledVector(this.inputVelocity, partialDelta)
      //compute collision and write the corrected position to the target
      //TODO: rework - when are we on the ground and how to correct the shapecast
      this.shapecastCapsule(collisionFreePosition.copy(position), options)
      this.character.position.copy(collisionFreePosition).applyMatrix4(invertedParentMatrix)
      //compute new velocity
      //  apply gravity
      this.stateVelocity.y += (options.gravity ?? -20) * partialDelta
      //  apply linear damping (air resistance)
      const dampingFactor = 1.0 / (1.0 + partialDelta * (options.linearDamping ?? 0.1))
      this.stateVelocity.multiplyScalar(dampingFactor)
      //  apply collision to velocity
      collisionDelta.copy(collisionFreePosition).sub(position)
      this.isGrounded = collisionDelta.y >= Math.abs(yMovement * (options.slopeGroundingThreshold ?? 0.6))
      if (this.isGrounded) {
        this.stateVelocity.set(0, (options.gravity ?? -20) * partialDelta, 0)
      } else if (collisionDelta.length() > 1e-5) {
        collisionDelta.normalize()
        this.stateVelocity.addScaledVector(collisionDelta, -collisionDelta.dot(this.stateVelocity))
      }
    }
  }

  destroy(): void {
    this.destroyed = true
  }

  shapecastCapsule(position: Vector3, options: Exclude<BvhCharacterPhysicsOptions, boolean>): void {
    const radius = options.capsuleRadius ?? 0.4
    const height = options.capsuleHeight ?? 1.7
    segment.start.copy(position)
    segment.start.y += radius
    segment.end.copy(position)
    segment.end.y += height - radius
    aabbox.makeEmpty()
    aabbox.expandByPoint(segment.start)
    aabbox.expandByPoint(segment.end)
    aabbox.min.addScalar(-radius)
    aabbox.max.addScalar(radius)

    for (const bvh of this.world.getBodies()) {
      bvh.shapecast({
        intersectsBounds: (bounds) => bounds.intersectsBox(aabbox),
        intersectsTriangle: (tri) => {
          // Use your existing triangle vs segment closestPointToSegment
          const distance = tri.closestPointToSegment(segment, triPoint, capsulePoint)
          if (distance === 0) {
            const scaledDirection = capsulePoint.sub(
              capsulePoint.distanceTo(segment.start) < capsulePoint.distanceTo(segment.end)
                ? segment.start
                : segment.end,
            )
            scaledDirection.y += radius
            segment.start.add(scaledDirection)
            segment.end.add(scaledDirection)
          } else if (distance < radius) {
            const depthInsideCapsule = radius - distance
            const direction = capsulePoint.sub(triPoint).divideScalar(distance)
            segment.start.addScaledVector(direction, depthInsideCapsule)
            segment.end.addScaledVector(direction, depthInsideCapsule)
          }
        },
      })
    }
    position.copy(segment.start)
    position.y -= radius
  }
}

export * from './world.js'
