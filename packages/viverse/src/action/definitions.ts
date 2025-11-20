import { EventAction, StateAction } from './action.js'

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
export const JumpAction = new EventAction()
export const ZoomAction = new EventAction<number>(sum, 0)
export const RotateYawAction = new EventAction<number>(sum, 0)
export const RotatePitchAction = new EventAction<number>(sum, 0)
