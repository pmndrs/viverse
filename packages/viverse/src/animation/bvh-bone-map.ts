import type { VRMHumanBoneName } from '@pixiv/three-vrm'

/**
 * Maps standard BVH bone names to VRM humanoid bone names.
 *
 * Kept as a `.ts` module rather than a `.json` import on purpose: importing JSON requires
 * import attributes (`with { type: 'json' }`), which survive into the published ESM build and
 * break in-browser bundlers like the docs' Sandpack (Babel: "experimental syntax
 * 'moduleAttributes' isn't currently enabled").
 */
const bvhBoneMap: Record<string, VRMHumanBoneName> = {
  Hips: 'hips',
  Spine: 'spine',
  Spine1: 'chest',
  Spine2: 'upperChest',
  Neck: 'neck',
  Head: 'head',

  LeftShoulder: 'leftShoulder',
  LeftArm: 'leftUpperArm',
  LeftForeArm: 'leftLowerArm',
  LeftHand: 'leftHand',

  RightShoulder: 'rightShoulder',
  RightArm: 'rightUpperArm',
  RightForeArm: 'rightLowerArm',
  RightHand: 'rightHand',

  LeftUpLeg: 'leftUpperLeg',
  LeftLeg: 'leftLowerLeg',
  LeftFoot: 'leftFoot',
  LeftToe: 'leftToes',

  RightUpLeg: 'rightUpperLeg',
  RightLeg: 'rightLowerLeg',
  RightFoot: 'rightFoot',
  RightToe: 'rightToes',
}

export default bvhBoneMap
