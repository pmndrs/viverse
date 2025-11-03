import {
  MoveForwardField,
  MoveBackwardField,
  MoveLeftField,
  MoveRightField,
  LastTimeJumpPressedField,
  Input,
  InputField,
  RunField,
} from './index.js'

export type LocomotionKeyboardInputOptions = {
  keyboardMoveForwardKeys?: Array<string>
  keyboardMoveBackwardKeys?: Array<string>
  keyboardMoveLeftKeys?: Array<string>
  keyboardMoveRightKeys?: Array<string>
  keyboardRunKeys?: Array<string>
  keyboardJumpKeys?: Array<string>
}

const DefaultMoveForwardKeys = ['KeyW']
const DefaultMoveBackwardKeys = ['KeyS']
const DefaultMoveLeftKeys = ['KeyA']
const DefaultMoveRightKeys = ['KeyD']
const DefaultRunKeys = ['ShiftRight', 'ShiftLeft']
const DefaultJumpKeys = ['Space']

export class LocomotionKeyboardInput implements Input<LocomotionKeyboardInputOptions> {
  private readonly abortController = new AbortController()
  private readonly keyState = new Map<string, { pressTime?: number; releaseTime?: number }>()

  constructor(domElement: HTMLElement) {
    domElement.tabIndex = 0
    domElement.addEventListener(
      'keydown',
      (event: KeyboardEvent) => {
        let state = this.keyState.get(event.code)
        const now = performance.now() / 1000
        if (state == null) {
          this.keyState.set(event.code, (state = { pressTime: now }))
        } else {
          state.pressTime = now
        }
      },
      {
        signal: this.abortController.signal,
      },
    )

    domElement.addEventListener(
      'keyup',
      (event: KeyboardEvent) => {
        let state = this.keyState.get(event.code)
        const now = performance.now() / 1000
        if (state == null) {
          this.keyState.set(event.code, (state = { releaseTime: now }))
        } else {
          state.releaseTime = now
        }
      },
      {
        signal: this.abortController.signal,
      },
    )

    // Handle focus loss to clear pressed keys
    domElement.addEventListener('blur', () => this.keyState.clear(), {
      signal: this.abortController.signal,
    })
  }

  get<T>(field: InputField<T>, options: LocomotionKeyboardInputOptions): T | undefined {
    if (field === LastTimeJumpPressedField) {
      const jumpKeys = options.keyboardJumpKeys ?? DefaultJumpKeys
      const pressed = jumpKeys
        .map((key) => this.keyState.get(key)?.pressTime ?? null)
        .filter((t): t is number => t != null)
      return (pressed.length > 0 ? Math.max(...pressed) : null) as T
    }
    let keys: Array<string> | undefined
    switch (field) {
      case MoveForwardField:
        keys = options.keyboardMoveForwardKeys ?? DefaultMoveForwardKeys
        break
      case MoveBackwardField:
        keys = options.keyboardMoveBackwardKeys ?? DefaultMoveBackwardKeys
        break
      case MoveLeftField:
        keys = options.keyboardMoveLeftKeys ?? DefaultMoveLeftKeys
        break
      case MoveRightField:
        keys = options.keyboardMoveRightKeys ?? DefaultMoveRightKeys
        break
      case RunField:
        keys = options.keyboardRunKeys ?? DefaultRunKeys
        break
    }
    if (keys == null) {
      return undefined
    }
    return keys.some((key) => {
      const state = this.keyState.get(key)
      if (state?.pressTime == null) {
        return false
      }
      return state.releaseTime == null || state.pressTime > state.releaseTime
    }) as T
  }

  dispose(): void {
    this.abortController.abort()
  }
}
