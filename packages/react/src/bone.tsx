import { VRMHumanBoneName, VRM } from '@pixiv/three-vrm'
import { createPortal } from '@react-three/fiber'
import { ReactNode, useMemo } from 'react'
import { Fragment } from 'react/jsx-runtime'
import { useCharacterModel } from './model.js'

export function CharacterModelBone({ bone, children }: { bone: VRMHumanBoneName; children?: ReactNode }) {
  const model = useCharacterModel()
  const boneObject = useMemo(
    () => (model instanceof VRM ? model.humanoid.getRawBoneNode(bone) : model.scene.getObjectByName(bone)),
    [model, bone],
  )
  if (boneObject == null) {
    return null
  }
  return (
    <Fragment key={boneObject.id}>
      {createPortal(<group quaternion={model.boneRotationOffset}>{children}</group>, boneObject)}
    </Fragment>
  )
}

/**
 * @deprecated use CharacterModelBone instead
 */
export const VrmCharacterModelBone = CharacterModelBone
