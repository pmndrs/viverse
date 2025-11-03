import { Euler, Object3D, Quaternion } from 'three'
import {
  RunField,
  MoveLeftField,
  MoveRightField,
  MoveForwardField,
  MoveBackwardField,
  InputSystem,
} from '../input/index.js'
import type { SimpleCharacterMovementOptions } from './index.js'
import type { BvhCharacterPhysics } from '../physics/index.js'

const cameraEuler = new Euler()
const cameraRotation = new Quaternion()

export function updateSimpleCharacterInputVelocity(
  camera: Object3D,
  inputSystem: InputSystem,
  physics: BvhCharacterPhysics,
  options?: SimpleCharacterMovementOptions,
) {
  cameraEuler.setFromQuaternion(camera.getWorldQuaternion(cameraRotation), 'YXZ')
  cameraEuler.x = 0
  cameraEuler.z = 0

  let inputSpeed = 0
  let runOptions = options?.run ?? true
  if (inputSystem.get(RunField) && runOptions !== false) {
    runOptions = runOptions === true ? {} : runOptions
    inputSpeed = runOptions.speed ?? 6
  }

  let walkOptions = options?.walk ?? true
  if (inputSpeed === 0 && walkOptions !== false) {
    walkOptions = walkOptions === true ? {} : walkOptions
    inputSpeed = walkOptions.speed ?? 3
  }

  physics.inputVelocity
    .set(
      -inputSystem.get(MoveLeftField) + inputSystem.get(MoveRightField),
      0,
      -inputSystem.get(MoveForwardField) + inputSystem.get(MoveBackwardField),
    )
    .normalize()
    .applyEuler(cameraEuler)
    .multiplyScalar(inputSpeed)
}
