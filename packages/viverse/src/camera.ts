import { Object3D, Vector3, Euler, Vector3Tuple, Ray, Quaternion } from 'three'
import { clamp } from 'three/src/math/MathUtils.js'
import { RotatePitchAction, RotateYawAction, ZoomAction } from './action/index.js'

export const FirstPersonCharacterCameraBehavior: CharacterCameraBehaviorOptions = {
  characterBaseOffset: [0, 1.6, 0],
  zoom: { maxDistance: 0, minDistance: 0 },
}

export type CharacterCameraBehaviorOptions =
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
             * @default 1.0
             */
            speed?: number
          }
        | boolean

      /**
       * @default true
       */
      zoom?:
        | {
            /**
             * @default 1.0
             */
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
const quaternionHelper = new Quaternion()

export class CharacterCameraBehavior {
  public rotationPitch = (-20 * Math.PI) / 180
  public rotationYaw = 0
  public zoomDistance = 4 // Changed from zoom to distance for clearer semantics

  //internal state
  private collisionFreeZoomDistance = this.zoomDistance
  private firstUpdate = true
  private readonly abortController = new AbortController()
  private readonly yawReader = RotateYawAction.createReader(this.abortController.signal)
  private readonly pitchReader = RotatePitchAction.createReader(this.abortController.signal)
  private readonly zoomReader = ZoomAction.createReader(this.abortController.signal)

  private setRotationFromDelta(
    camera: Object3D,
    delta: Vector3,
    rotationOptions: Exclude<Exclude<CharacterCameraBehaviorOptions, boolean>['rotation'], undefined | boolean>,
  ): void {
    if (delta.lengthSq() < 0.0001) {
      // use current camera rotation if very close to target
      euler.setFromQuaternion(camera.quaternion, 'YXZ')
      this.rotationPitch = euler.x
      this.rotationYaw = euler.y
      return
    }
    this.rotationPitch = this.clampPitch(Math.asin(delta.y / delta.length()), rotationOptions)
    this.rotationYaw = this.clampYaw(Math.atan2(delta.x, delta.z), rotationOptions)
  }

  private setDistanceFromDelta(
    delta: Vector3,
    zoomOptions: Exclude<Exclude<CharacterCameraBehaviorOptions, boolean>['zoom'], undefined | boolean>,
  ): void {
    this.zoomDistance = this.clampDistance(delta.length(), zoomOptions)
  }

  private computeCharacterBaseOffset(
    target: Vector3,
    options: Exclude<CharacterCameraBehaviorOptions, boolean>['characterBaseOffset'],
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
    }: Exclude<Exclude<CharacterCameraBehaviorOptions, boolean>['zoom'], undefined | boolean>,
  ): number {
    return clamp(distance, minDistance, maxDistance)
  }

  private clampYaw(
    yaw: number,
    {
      maxYaw = Infinity,
      minYaw = -Infinity,
    }: Exclude<Exclude<CharacterCameraBehaviorOptions, boolean>['rotation'], undefined | boolean>,
  ) {
    return clamp(yaw, minYaw, maxYaw)
  }

  private clampPitch(
    pitch: number,
    {
      maxPitch = Math.PI / 2,
      minPitch = -Math.PI / 2,
    }: Exclude<Exclude<CharacterCameraBehaviorOptions, boolean>['rotation'], undefined | boolean>,
  ) {
    return clamp(pitch, minPitch, maxPitch)
  }

  /**
   * @param delta in seconds
   */
  update(
    camera: Object3D,
    target: Object3D,
    deltaTime: number,
    raycast?: (ray: Ray, far: number) => number | undefined,
    options: CharacterCameraBehaviorOptions = true,
  ): void {
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
    target.getWorldQuaternion(quaternionHelper)
    chracterBaseOffsetHelper.applyQuaternion(quaternionHelper)
    target.getWorldPosition(characterWorldPosition)
    characterWorldPosition.add(chracterBaseOffsetHelper)
    camera.getWorldPosition(deltaHelper)
    deltaHelper.sub(characterWorldPosition)

    // apply rotation actions to rotationYaw and rotationPitch if not disabled or first update
    let rotationOptions = options.rotation ?? true
    if (!this.firstUpdate && rotationOptions !== false) {
      rotationOptions = rotationOptions === true ? {} : rotationOptions
      const rotationSpeed = rotationOptions.speed ?? 1.0
      this.yawReader.update()
      this.pitchReader.update()
      const deltaYaw = this.yawReader.get()
      const deltaPitch = this.pitchReader.get()
      this.rotationYaw = this.clampYaw(this.rotationYaw + deltaYaw * rotationSpeed, rotationOptions)
      this.rotationPitch = this.clampPitch(this.rotationPitch + deltaPitch * rotationSpeed, rotationOptions)
    } else {
      this.setRotationFromDelta(camera, deltaHelper, typeof rotationOptions === 'boolean' ? {} : rotationOptions)
    }

    // apply yaw and pitch to camera rotation
    camera.rotation.set(this.rotationPitch, this.rotationYaw, 0, 'YXZ')

    rayHelper.direction.set(0, 0, 1).applyEuler(camera.rotation)
    rayHelper.origin.copy(characterWorldPosition)

    // apply zoom action to zoomDistance if not disabled or first update
    let zoomOptions = options.zoom ?? true
    if (!this.firstUpdate && zoomOptions !== false) {
      zoomOptions = zoomOptions === true ? {} : zoomOptions
      const zoomSpeed = zoomOptions.speed ?? 1.0
      this.zoomReader.update()
      const deltaZoom = this.zoomReader.get()
      const zoomFactor = 1 + deltaZoom * zoomSpeed
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
      let distance = raycast?.(rayHelper, this.zoomDistance)
      if (distance != null) {
        this.collisionFreeZoomDistance = distance - (collisionOptions?.offset ?? 0.2)
      }
    }

    // Calculate camera position using spherical coordinates from euler
    sphericalOffset.set(0, 0, this.collisionFreeZoomDistance)
    sphericalOffset.applyEuler(camera.rotation)

    // Get target position with offset (reuse helper vector)
    this.computeCharacterBaseOffset(chracterBaseOffsetHelper, options.characterBaseOffset)
    target.getWorldQuaternion(quaternionHelper)
    chracterBaseOffsetHelper.applyQuaternion(quaternionHelper)
    target.getWorldPosition(characterWorldPosition)
    characterWorldPosition.add(chracterBaseOffsetHelper)

    // Set camera position relative to target
    camera.position.copy(characterWorldPosition).add(sphericalOffset)
  }

  dispose(): void {
    this.abortController.abort()
  }
}
