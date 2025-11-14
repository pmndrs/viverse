import { VRM } from '@pixiv/three-vrm'
import { useFrame } from '@react-three/fiber'
import { useCharacterModel } from '@react-three/viverse'
import { useMemo } from 'react'
import { Euler, Quaternion } from 'three'

const eulerYXZ = new Euler(0, 0, 0, 'YXZ')
const qWorld = new Quaternion()
const qParentWorldInv = new Quaternion()
const qLocal = new Quaternion()

//turns the character towards the cross hair
const cameraRotationOffsetY = -0.5

export function SpineAnimation() {
  const model = useCharacterModel()
  const spineBone = useMemo(() => {
    if (model instanceof VRM) {
      return model.humanoid.getNormalizedBoneNode('spine')
    }
    return model.scene.getObjectByName('spine')
  }, [model])

  // Keep the lowest upper-body bone (spine) upright (X=Z=0 in world) and match world yaw to camera yaw.
  useFrame((state) => {
    if (spineBone == null) {
      return
    }
    // target world rotation: upright, with camera world yaw
    state.camera.getWorldQuaternion(qWorld)
    eulerYXZ.setFromQuaternion(qWorld, 'YXZ')
    const cameraYaw = eulerYXZ.y + (model instanceof VRM ? 0 : Math.PI) + cameraRotationOffsetY
    eulerYXZ.set(0, cameraYaw, 0, 'YXZ')
    qWorld.setFromEuler(eulerYXZ)
    const parent = spineBone.parent
    if (parent != null) {
      parent.getWorldQuaternion(qParentWorldInv).invert()
      qLocal.copy(qParentWorldInv).multiply(qWorld)
      spineBone.quaternion.copy(qLocal)
    } else {
      spineBone.quaternion.copy(qWorld)
    }
    spineBone.updateMatrixWorld()
  })
  return null
}
