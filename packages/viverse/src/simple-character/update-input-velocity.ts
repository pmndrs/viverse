import { Euler, Object3D, Quaternion } from 'three'
import { RunAction, MoveLeftAction, MoveRightAction, MoveForwardAction, MoveBackwardAction } from '../action/index.js'
import type { SimpleCharacterMovementOptions } from './types.js'
import type { BvhCharacterPhysics } from '../physics/index.js'

const cameraEuler = new Euler()
const cameraRotation = new Quaternion()

export function updateSimpleCharacterVelocity(
  camera: Object3D,
  physics: BvhCharacterPhysics,
  options?: SimpleCharacterMovementOptions,
) {
  cameraEuler.setFromQuaternion(camera.getWorldQuaternion(cameraRotation), 'YXZ')
  cameraEuler.x = 0
  cameraEuler.z = 0

  let inputSpeed = 0
  let runOptions = options?.run ?? true
  if (RunAction.get() && runOptions !== false) {
    runOptions = runOptions === true ? {} : runOptions
    inputSpeed = runOptions.speed ?? 6
  }

  let walkOptions = options?.walk ?? true
  if (inputSpeed === 0 && walkOptions !== false) {
    walkOptions = walkOptions === true ? {} : walkOptions
    inputSpeed = walkOptions.speed ?? 3
  }

  physics.inputVelocity
    .set(-MoveLeftAction.get() + MoveRightAction.get(), 0, -MoveForwardAction.get() + MoveBackwardAction.get())
    .normalize()
    .applyEuler(cameraEuler)
    .multiplyScalar(inputSpeed)
}
