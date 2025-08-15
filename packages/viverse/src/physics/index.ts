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
       * @default 0.5;
       */
      maxGroundSlope?: number
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
const invertedParentMatrix = new Matrix4()

const YAxis = new Vector3(0, 1, 0)

/**
 * assumes the target object origin is at its bottom
 */
export class BvhCharacterPhysics {
  private destroyed = false
  private readonly stateVelocity = new Vector3()
  public readonly inputVelocity = new Vector3()
  private notGroundedSeconds = 0

  public get isGrounded() {
    return this.notGroundedSeconds < 0.2
  }

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
      position.addScaledVector(this.inputVelocity, partialDelta)
      position.addScaledVector(this.stateVelocity, partialDelta)
      const isGrounded =
        this.shapecastCapsule(collisionFreePosition.copy(position), options.maxGroundSlope ?? 1, options) &&
        this.stateVelocity.y < 0
      this.notGroundedSeconds += partialDelta
      if (isGrounded) {
        this.notGroundedSeconds = 0
      }
      if (!isGrounded || this.inputVelocity.lengthSq() > 0) {
        this.character.position.copy(collisionFreePosition).applyMatrix4(invertedParentMatrix)
      }
      //compute new velocity
      //  apply gravity
      this.stateVelocity.y += (options.gravity ?? -20) * partialDelta
      //  apply linear damping (air resistance)
      const dampingFactor = 1.0 / (1.0 + partialDelta * (options.linearDamping ?? 0.1))
      this.stateVelocity.multiplyScalar(dampingFactor)
      //  apply collision to velocity
      if (isGrounded) {
        this.stateVelocity.set(0, (options.gravity ?? -20) * 0.01, 0)
      }
    }
  }

  destroy(): void {
    this.destroyed = true
  }

  shapecastCapsule(position: Vector3, maxGroundSlope: number, options: Exclude<BvhCharacterPhysicsOptions, boolean>) {
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
    let grounded = false

    this.world.shapecast(
      (bounds) => bounds.intersectsBox(aabbox),
      (tri) => {
        // Use your existing triangle vs segment closestPointToSegment
        const distance = tri.closestPointToSegment(segment, triPoint, capsulePoint)
        if (distance === 0) {
          const isCloserToSegmentStart = capsulePoint.distanceTo(segment.start) < capsulePoint.distanceTo(segment.end)
          if (isCloserToSegmentStart) {
            grounded = true
          }
          const scaledDirection = capsulePoint.sub(isCloserToSegmentStart ? segment.start : segment.end)
          scaledDirection.y += radius
          segment.start.add(scaledDirection)
          segment.end.add(scaledDirection)
        } else if (distance < radius) {
          const depthInsideCapsule = radius - distance
          const direction = capsulePoint.sub(triPoint).divideScalar(distance)
          const slope = Math.tan(Math.acos(direction.dot(YAxis)))
          if (direction.y > 0 && slope <= maxGroundSlope) {
            grounded = true
          }
          segment.start.addScaledVector(direction, depthInsideCapsule)
          segment.end.addScaledVector(direction, depthInsideCapsule)
        }
      },
    )
    position.copy(segment.start)
    position.y -= radius
    return grounded
  }
}

export * from './world.js'
