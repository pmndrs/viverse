import { StateAction, WriteonlyEventAction, StateActionWriter } from './action.js'
import {
  JumpAction,
  MoveBackwardAction,
  MoveForwardAction,
  MoveLeftAction,
  MoveRightAction,
  RunAction,
} from './definitions.js'

export class KeyboardActionBinding {
  private pressedKeys = new Set<string>()
  private writer?: StateActionWriter<boolean>

  //options
  private _keys: Array<string> = []
  get keys(): Array<string> {
    return this._keys
  }
  set keys(keys: Array<string>) {
    this._keys = keys
    this.updateState()
  }
  requiresPointerLock?: boolean

  private updateState() {
    this.writer?.write(this.keys.some((key) => this.pressedKeys.has(key)))
  }

  constructor(
    action: WriteonlyEventAction<KeyboardEvent> | WriteonlyEventAction<void> | StateAction<boolean>,
    domElement: HTMLElement,
    abortSignal: AbortSignal,
  ) {
    if (action instanceof StateAction) {
      this.writer = action.createWriter(abortSignal)
      domElement.tabIndex = 0
      domElement.addEventListener(
        'keydown',
        (e: KeyboardEvent) => {
          if ((this.requiresPointerLock ?? false) && document.pointerLockElement != domElement) {
            return
          }
          this.pressedKeys.add(e.code)
          this.updateState()
        },
        { signal: abortSignal },
      )
      domElement.addEventListener(
        'keyup',
        (e: KeyboardEvent) => {
          this.pressedKeys.delete(e.code)
          this.updateState()
        },
        { signal: abortSignal },
      )
      // Handle focus loss to clear pressed keys
      const onBlur = () => {
        this.pressedKeys.clear()
        this.updateState()
      }
      domElement.addEventListener('blur', onBlur, { signal: abortSignal })
      domElement.addEventListener(
        'visibilitychange',
        () => {
          if (document.visibilityState !== 'visible') {
            onBlur()
          }
        },
        { signal: abortSignal },
      )
      window.addEventListener('blur', onBlur, { signal: abortSignal })
      document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement !== domElement) {
          onBlur()
        }
      })
      return
    }
    domElement.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (!this.keys.includes(e.code) || e.repeat) {
          return
        }
        //needed to support EventAction<void>
        action.emit(e as any)
      },
      { signal: abortSignal },
    )
  }
}

export const DefaultMoveForwardKeys = ['KeyW']
export const DefaultMoveBackwardKeys = ['KeyS']
export const DefaultMoveLeftKeys = ['KeyA']
export const DefaultMoveRightKeys = ['KeyD']
export const DefaultRunKeys = ['ShiftRight', 'ShiftLeft']
export const DefaultJumpKeys = ['Space']

export class KeyboardLocomotionActionBindings {
  moveForwardBinding: KeyboardActionBinding
  moveLeftBinding: KeyboardActionBinding
  moveRightBinding: KeyboardActionBinding
  moveBackwardBinding: KeyboardActionBinding
  jumpBinding: KeyboardActionBinding
  runBinding: KeyboardActionBinding

  constructor(domElement: HTMLElement, abortSignal: AbortSignal) {
    this.moveForwardBinding = new KeyboardActionBinding(
      MoveForwardAction.mapFrom((isPressed) => (isPressed ? 1 : 0)),
      domElement,
      abortSignal,
    )
    this.moveForwardBinding.keys = DefaultMoveForwardKeys

    this.moveLeftBinding = new KeyboardActionBinding(
      MoveLeftAction.mapFrom((isPressed) => (isPressed ? 1 : 0)),
      domElement,
      abortSignal,
    )
    this.moveLeftBinding.keys = DefaultMoveLeftKeys

    this.moveRightBinding = new KeyboardActionBinding(
      MoveRightAction.mapFrom((isPressed) => (isPressed ? 1 : 0)),
      domElement,
      abortSignal,
    )
    this.moveRightBinding.keys = DefaultMoveRightKeys

    this.moveBackwardBinding = new KeyboardActionBinding(
      MoveBackwardAction.mapFrom((isPressed) => (isPressed ? 1 : 0)),
      domElement,
      abortSignal,
    )
    this.moveBackwardBinding.keys = DefaultMoveBackwardKeys

    this.jumpBinding = new KeyboardActionBinding(JumpAction, domElement, abortSignal)
    this.jumpBinding.keys = DefaultJumpKeys

    this.runBinding = new KeyboardActionBinding(RunAction, domElement, abortSignal)
    this.runBinding.keys = DefaultRunKeys
  }
}
