import { Object3D, Vector3, Euler, Vector3Tuple, Ray } from 'three'
import { clamp } from 'three/src/math/MathUtils.js'
import { DeltaYawField, DeltaPitchField, DeltaZoomField } from './input/index.js'
import { SimpleCharacter } from './simple-character.js'

export const FirstPersonCharacterCameraBehavior: SimpleCharacterCameraBehaviorOptions = {
  characterBaseOffset: [0, 1.6, 0],
  zoom: { maxDistance: 0, minDistance: 0 },
}

export type SimpleCharacterCameraBehaviorOptions =
  | {
      /**
       * @default true
       */
      collision?:
        | {
            /**
             * @default 0.2
             */
            offset?: number
          }
        | boolean
      /**
       * @default [0,1.3,0]
       */
      characterBaseOffset?: Vector3 | Vector3Tuple

      /**
       * @default true
       */
      rotation?:
        | {
            /**
             * @default -Math.PI/2
             */
            minPitch?: number
            /**
             * @default Math.PI/2
             */
            maxPitch?: number
            /**
             * @default -Infinity
             */
            minYaw?: number
            /**
             * @default +Infinity
             */
            maxYaw?: number
            /**
             * @default 1000
             */
            speed?: number
          }
        | boolean

      /**
       * @default true
       */
      zoom?:
        | {
            speed?: number
            /**
             * @default 1
             */
            minDistance?: number
            /**
             * @default 7
             */
            maxDistance?: number
          }
        | boolean
    }
  | boolean

const chracterBaseOffsetHelper = new Vector3()
const deltaHelper = new Vector3()
const sphericalOffset = new Vector3()
const characterWorldPosition = new Vector3()
const euler = new Euler()
const rayHelper = new Ray()

export class SimpleCharacterCameraBehavior {
  public rotationPitch = (-20 * Math.PI) / 180
  public rotationYaw = 0
  public zoomDistance = 4 // Changed from zoom to distance for clearer semantics

  //internal state
  private collisionFreeZoomDistance = this.zoomDistance
  private firstUpdate = true

  constructor(
    public getCamera: () => Object3D,
    public character: SimpleCharacter,
    private readonly raycast?: (ray: Ray, far: number) => number | undefined,
  ) {}

  private setRotationFromDelta(
    delta: Vector3,
    rotationOptions: Exclude<Exclude<SimpleCharacterCameraBehaviorOptions, boolean>['rotation'], undefined | boolean>,
  ): void {
    if (delta.lengthSq() < 0.0001) {
      // use current camera rotation if very close to target
      euler.setFromQuaternion(this.getCamera().quaternion, 'YXZ')
      this.rotationPitch = euler.x
      this.rotationYaw = euler.y
      return
    }
    this.rotationPitch = this.clampPitch(Math.asin(delta.y / delta.length()), rotationOptions)
    this.rotationYaw = this.clampYaw(Math.atan2(delta.x, delta.z), rotationOptions)
  }

  private setDistanceFromDelta(
    delta: Vector3,
    zoomOptions: Exclude<Exclude<SimpleCharacterCameraBehaviorOptions, boolean>['zoom'], undefined | boolean>,
  ): void {
    this.zoomDistance = this.clampDistance(delta.length(), zoomOptions)
  }

  private computeCharacterBaseOffset(
    target: Vector3,
    options: Exclude<SimpleCharacterCameraBehaviorOptions, boolean>['characterBaseOffset'],
  ): void {
    if (options instanceof Vector3) {
      target.copy(options)
      return
    }
    if (Array.isArray(options)) {
      target.fromArray(options)
      return
    }
    target.set(0, 1.3, 0)
  }

  private clampDistance(
    distance: number,
    {
      minDistance = 1,
      maxDistance = 7,
    }: Exclude<Exclude<SimpleCharacterCameraBehaviorOptions, boolean>['zoom'], undefined | boolean>,
  ): number {
    return clamp(distance, minDistance, maxDistance)
  }

  private clampYaw(
    yaw: number,
    {
      maxYaw = Infinity,
      minYaw = -Infinity,
    }: Exclude<Exclude<SimpleCharacterCameraBehaviorOptions, boolean>['rotation'], undefined | boolean>,
  ) {
    return clamp(yaw, minYaw, maxYaw)
  }

  private clampPitch(
    pitch: number,
    {
      maxPitch = Math.PI / 2,
      minPitch = -Math.PI / 2,
    }: Exclude<Exclude<SimpleCharacterCameraBehaviorOptions, boolean>['rotation'], undefined | boolean>,
  ) {
    return clamp(pitch, minPitch, maxPitch)
  }

  /**
   * @param delta in seconds
   */
  update(deltaTime: number, options: SimpleCharacterCameraBehaviorOptions = true): void {
    if (options === false) {
      this.firstUpdate = true
      return
    }
    this.firstUpdate = false
    if (options === true) {
      options = {}
    }

    //compute character->camera delta through offset
    this.computeCharacterBaseOffset(chracterBaseOffsetHelper, options.characterBaseOffset)
    this.character.getWorldPosition(characterWorldPosition)
    characterWorldPosition.add(chracterBaseOffsetHelper)
    this.getCamera().getWorldPosition(deltaHelper)
    deltaHelper.sub(characterWorldPosition)

    // apply rotation input to rotationYaw and rotationPitch if not disabled or first update
    let rotationOptions = options.rotation ?? true
    if (!this.firstUpdate && rotationOptions !== false) {
      rotationOptions = rotationOptions === true ? {} : rotationOptions
      const rotationSpeed = rotationOptions.speed ?? 1000.0
      const deltaYaw = this.character.inputSystem.get(DeltaYawField)
      const deltaPitch = this.character.inputSystem.get(DeltaPitchField)
      this.rotationYaw = this.clampYaw(this.rotationYaw + deltaYaw * rotationSpeed * deltaTime, rotationOptions)
      this.rotationPitch = this.clampPitch(this.rotationPitch + deltaPitch * rotationSpeed * deltaTime, rotationOptions)
    } else {
      this.setRotationFromDelta(deltaHelper, typeof rotationOptions === 'boolean' ? {} : rotationOptions)
    }

    // apply yaw and pitch to camera rotation
    this.getCamera().rotation.set(this.rotationPitch, this.rotationYaw, 0, 'YXZ')

    rayHelper.direction.set(0, 0, 1).applyEuler(this.getCamera().rotation)
    rayHelper.origin.copy(characterWorldPosition)

    // apply zoom input to zoomDistance if not disabled or first update
    let zoomOptions = options.zoom ?? true
    if (!this.firstUpdate && zoomOptions !== false) {
      zoomOptions = zoomOptions === true ? {} : zoomOptions
      const zoomSpeed = zoomOptions.speed ?? 1000.0
      const deltaZoom = this.character.inputSystem.get(DeltaZoomField)
      const zoomFactor = 1 + deltaZoom * zoomSpeed * deltaTime
      if (deltaZoom >= 0) {
        this.zoomDistance *= zoomFactor
      } else {
        this.zoomDistance = this.collisionFreeZoomDistance * zoomFactor
      }
      this.zoomDistance = this.clampDistance(this.zoomDistance, zoomOptions)
    } else {
      this.setDistanceFromDelta(deltaHelper, typeof zoomOptions === 'boolean' ? {} : zoomOptions)
    }

    this.collisionFreeZoomDistance = this.zoomDistance
    let collisionOptions = options.collision ?? true
    if (collisionOptions != false && this.zoomDistance > 0) {
      if (collisionOptions === true) {
        collisionOptions = {}
      }
      let distance = this.raycast?.(rayHelper, this.zoomDistance)
      if (distance != null) {
        this.collisionFreeZoomDistance = distance - (collisionOptions?.offset ?? 0.2)
      }
    }

    // Calculate camera position using spherical coordinates from euler
    sphericalOffset.set(0, 0, this.collisionFreeZoomDistance)
    sphericalOffset.applyEuler(this.getCamera().rotation)

    // Get target position with offset (reuse helper vector)
    this.character.getWorldPosition(characterWorldPosition)

    this.computeCharacterBaseOffset(chracterBaseOffsetHelper, options.characterBaseOffset)
    characterWorldPosition.add(chracterBaseOffsetHelper)

    // Set camera position relative to target
    this.getCamera().position.copy(characterWorldPosition).add(sphericalOffset)
  }
}
