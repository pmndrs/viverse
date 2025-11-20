import { Euler, Object3D, Quaternion, Vector3 } from 'three'
import { BvhCharacterPhysics } from '../physics/index.js'
import type { SimpleCharacterAnimationOptions } from './types.js'

const NegZAxis = new Vector3(0, 0, -1)
const _2MathPI = 2 * Math.PI
const characterTargetEuler = new Euler()
const goalTargetEuler = new Euler()
const inputDirection = new Vector3()
const quaternion = new Quaternion()

export function updateSimpleCharacterRotation(
  delta: number,
  physics: BvhCharacterPhysics,
  camera: Object3D,
  model: { scene: Object3D },
  options?: SimpleCharacterAnimationOptions,
) {
  // Character yaw rotation logic
  const basedOn = options?.yawRotationBasedOn ?? 'movement'

  // compute goalTargetEuler
  if (basedOn === 'camera') {
    goalTargetEuler.setFromQuaternion(camera.getWorldQuaternion(quaternion), 'YXZ')
  } else {
    //don't rotate if not moving
    if (physics.inputVelocity.lengthSq() === 0) {
      // run forever
      return true
    }
    inputDirection.copy(physics.inputVelocity).normalize()
    quaternion.setFromUnitVectors(NegZAxis, inputDirection)
    goalTargetEuler.setFromQuaternion(quaternion, 'YXZ')
  }

  // compute currentTargetEuler
  model.scene.getWorldQuaternion(quaternion)
  characterTargetEuler.setFromQuaternion(quaternion, 'YXZ')
  // apply delta yaw rotation
  let deltaYaw = (goalTargetEuler.y - characterTargetEuler.y + _2MathPI) % _2MathPI
  if (deltaYaw > Math.PI) {
    deltaYaw = deltaYaw - _2MathPI
  }
  const absDeltaYaw = Math.abs(deltaYaw)
  if (absDeltaYaw < 0.001) {
    // run forever
    return true
  }
  const yawRotationDirection = deltaYaw / absDeltaYaw
  model.scene.rotation.y += Math.min((options?.maxYawRotationSpeed ?? 10) * delta, absDeltaYaw) * yawRotationDirection
}
