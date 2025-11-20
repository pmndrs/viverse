import { Object3D } from 'three'
import { CharacterAnimationOptions } from '../animation/index.js'
import { CharacterCameraBehaviorOptions } from '../camera.js'
import { CharacterModel, CharacterModelOptions } from '../model/index.js'
import { BvhCharacterPhysics, BvhCharacterPhysicsOptions } from '../physics/index.js'

export type SimpleCharacterState = {
  camera: Object3D
  model?: CharacterModel
  physics: BvhCharacterPhysics
  lastJump: number
}

export type SimpleCharacterMovementOptions = {
  /**
   * @default true
   */
  jump?:
    | {
        /**
         * @default 0.2
         */
        delay?: number
        /**
         * @default 0.1
         */
        bufferTime?: number
        /**
         * @default 8
         */
        speed?: number
      }
    | boolean
  /**
   * @default true
   */
  walk?: { speed?: number } | boolean
  /**
   * @default true
   */
  run?: { speed?: number } | boolean
}

export type SimpleCharacterAnimationOptions = {
  readonly walk?: CharacterAnimationOptions
  readonly run?: CharacterAnimationOptions
  readonly idle?: CharacterAnimationOptions
  readonly jumpUp?: CharacterAnimationOptions
  readonly jumpLoop?: CharacterAnimationOptions
  readonly jumpDown?: CharacterAnimationOptions
  readonly jumpForward?: CharacterAnimationOptions
  /**
   * @default "movement"
   */
  yawRotationBasedOn?: 'camera' | 'movement'
  /**
   * @default 10
   */
  maxYawRotationSpeed?: number
  /**
   * @default 0.1
   */
  crossFadeDuration?: number
}

export type SimpleCharacterActionBindingOptions = {
  screenJoystickRunDistancePx?: number
  screenJoystickDeadZonePx?: number
  pointerCaptureRotationSpeed?: number // default 0.4
  pointerCaptureZoomSpeed?: number // default 0.0001
  pointerLockRotationSpeed?: number // default 0.4
  pointerLockZoomSpeed?: number // default 0.0001
  keyboardRequiresPointerLock?: boolean //default false
  keyboardMoveForwardKeys?: Array<string>
  keyboardMoveBackwardKeys?: Array<string>
  keyboardMoveLeftKeys?: Array<string>
  keyboardMoveRightKeys?: Array<string>
  keyboardRunKeys?: Array<string>
  keyboardJumpKeys?: Array<string>
}

export type SimpleCharacterOptions = {
  /**
   * @deprecated use actionBindings instead
   */
  readonly input?: ReadonlyArray<{ new (domElement: HTMLElement, abortSignal: AbortSignal): any }>
  readonly actionBindings?: ReadonlyArray<{ new (domElement: HTMLElement, abortSignal: AbortSignal): any }>
  /**
   * @deprecated use actionBindingOptions instead
   */
  inputOptions?: SimpleCharacterActionBindingOptions
  actionBindingOptions?: SimpleCharacterActionBindingOptions
  movement?: SimpleCharacterMovementOptions
  readonly model?: CharacterModelOptions | boolean
  physics?: BvhCharacterPhysicsOptions
  cameraBehavior?: CharacterCameraBehaviorOptions
  readonly animation?: SimpleCharacterAnimationOptions
}
