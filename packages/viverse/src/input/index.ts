import { EventAction, StateAction, DeltaAction } from './action.js'

export function BooleanOr(...values: Array<boolean>) {
  let value = false
  for (let i = 0; i < values.length; i++) {
    value ||= values[i]
  }
  return value
}

const sum = (...values: Array<number>) => values.reduce((a, b) => a + b, 0)

export const MoveForwardAction = new StateAction<number>(Math.max, 0)
export const MoveBackwardAction = new StateAction<number>(Math.max, 0)
export const MoveLeftAction = new StateAction<number>(Math.max, 0)
export const MoveRightAction = new StateAction<number>(Math.max, 0)
export const RunAction = new StateAction<boolean>(BooleanOr, false)
export const JumpAction = new EventAction<void>()
export const ZoomAction = new DeltaAction<number>(sum, 0)
export const RotateYawAction = new DeltaAction<number>(sum, 0)
export const RotatePitchAction = new DeltaAction<number>(sum, 0)

export * from './pointer-lock.js'
export * from './pointer-capture.js'
export * from './keyboard.js'
export * from './screen-joystick.js'
export * from './screen-jump-button.js'
export * from './action.js'
