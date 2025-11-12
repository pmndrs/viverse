import { SimpleCharacterInputOptions } from './index.js'
import {
  DefaultJumpKeys,
  DefaultMoveBackwardKeys,
  DefaultMoveForwardKeys,
  DefaultMoveLeftKeys,
  DefaultMoveRightKeys,
  DefaultRunKeys,
  LocomotionKeyboardInput,
} from '../input/keyboard.js'
import { PointerCaptureInput } from '../input/pointer-capture.js'
import { PointerLockInput } from '../input/pointer-lock.js'
import { ScreenJoystickInput } from '../input/screen-joystick.js'

export function applySimpleCharacterInputOptions(inputs: Array<unknown>, options?: SimpleCharacterInputOptions) {
  for (const input of inputs) {
    if (input instanceof ScreenJoystickInput) {
      input.options.deadZonePx = options?.screenJoystickDeadZonePx
      input.options.runDistancePx = options?.screenJoystickRunDistancePx
    }
    if (input instanceof PointerCaptureInput) {
      input.options.rotationSpeed = options?.pointerCaptureRotationSpeed
      input.options.zoomSpeed = options?.pointerCaptureZoomSpeed
    }
    if (input instanceof PointerLockInput) {
      input.options.rotationSpeed = options?.pointerLockRotationSpeed
      input.options.zoomSpeed = options?.pointerLockZoomSpeed
    }
    if (input instanceof LocomotionKeyboardInput) {
      input.forward.options.keys = options?.keyboardMoveForwardKeys ?? DefaultMoveForwardKeys
      input.backward.options.keys = options?.keyboardMoveBackwardKeys ?? DefaultMoveBackwardKeys
      input.left.options.keys = options?.keyboardMoveLeftKeys ?? DefaultMoveLeftKeys
      input.right.options.keys = options?.keyboardMoveRightKeys ?? DefaultMoveRightKeys
      input.run.options.keys = options?.keyboardRunKeys ?? DefaultRunKeys
      input.jump.options.keys = options?.keyboardJumpKeys ?? DefaultJumpKeys
    }
  }
}
