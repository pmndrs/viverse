import { SimpleCharacterActionBindingOptions } from './types.js'
import {
  DefaultJumpKeys,
  DefaultMoveBackwardKeys,
  DefaultMoveForwardKeys,
  DefaultMoveLeftKeys,
  DefaultMoveRightKeys,
  DefaultRunKeys,
  KeyboardLocomotionActionBindings,
} from '../action/keyboard.js'
import { PointerCaptureRotateZoomActionBindings } from '../action/pointer-capture.js'
import { PointerLockRotateZoomActionBindings } from '../action/pointer-lock.js'
import { ScreenJoystickLocomotionActionBindings } from '../action/screen-joystick.js'

export function applySimpleCharacterActionBindingOptions(
  actionBindingsList: Array<unknown>,
  options?: SimpleCharacterActionBindingOptions,
) {
  for (const actionBindings of actionBindingsList) {
    if (actionBindings instanceof ScreenJoystickLocomotionActionBindings) {
      actionBindings.deadZonePx = options?.screenJoystickDeadZonePx
      actionBindings.runDistancePx = options?.screenJoystickRunDistancePx
    }
    if (actionBindings instanceof PointerCaptureRotateZoomActionBindings) {
      actionBindings.rotationSpeed = options?.pointerCaptureRotationSpeed
      actionBindings.zoomSpeed = options?.pointerCaptureZoomSpeed
    }
    if (actionBindings instanceof PointerLockRotateZoomActionBindings) {
      actionBindings.rotationSpeed = options?.pointerLockRotationSpeed
      actionBindings.zoomSpeed = options?.pointerLockZoomSpeed
    }
    if (actionBindings instanceof KeyboardLocomotionActionBindings) {
      actionBindings.moveForwardBinding.keys = options?.keyboardMoveForwardKeys ?? DefaultMoveForwardKeys
      actionBindings.moveBackwardBinding.requiresPointerLock = options?.keyboardRequiresPointerLock
      actionBindings.moveBackwardBinding.keys = options?.keyboardMoveBackwardKeys ?? DefaultMoveBackwardKeys
      actionBindings.moveBackwardBinding.requiresPointerLock = options?.keyboardRequiresPointerLock
      actionBindings.moveLeftBinding.keys = options?.keyboardMoveLeftKeys ?? DefaultMoveLeftKeys
      actionBindings.moveLeftBinding.requiresPointerLock = options?.keyboardRequiresPointerLock
      actionBindings.moveRightBinding.keys = options?.keyboardMoveRightKeys ?? DefaultMoveRightKeys
      actionBindings.moveRightBinding.requiresPointerLock = options?.keyboardRequiresPointerLock
      actionBindings.runBinding.keys = options?.keyboardRunKeys ?? DefaultRunKeys
      actionBindings.runBinding.requiresPointerLock = options?.keyboardRequiresPointerLock
      actionBindings.jumpBinding.keys = options?.keyboardJumpKeys ?? DefaultJumpKeys
      actionBindings.jumpBinding.requiresPointerLock = options?.keyboardRequiresPointerLock
    }
  }
}
