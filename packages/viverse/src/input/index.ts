import { createEventAction, createValueAction } from './action.js'

export const MoveForwardAction = createValueAction(0)
export const MoveBackwardAction = createValueAction(0)
export const MoveLeftAction = createValueAction(0)
export const MoveRightAction = createValueAction(0)
export const RunAction = createValueAction(false)
export const JumpAction = createEventAction<boolean>()
export const ZoomAction = createEventAction<number>()
export const RotateYawAction = createEventAction<number>()
export const RotatePitchAction = createEventAction<number>()

export * from './pointer-lock.js'
export * from './pointer-capture.js'
export * from './keyboard.js'
export * from './screen-joystick.js'
export * from './screen-jump-button.js'
export * from './action.js'
export * from './input.js'
export * from './input-system.js'
