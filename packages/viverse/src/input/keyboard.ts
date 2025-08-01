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

const defaultKeymapping = {
  moveForward: ['KeyW'],
  moveBackward: ['KeyS'],
  moveLeft: ['KeyA'],
  moveRight: ['KeyD'],
  run: ['ShiftRight', 'ShiftLeft']
}

export class LocomotionKeyboardInput implements Input {
  private readonly abortController = new AbortController()
  private readonly keyState = new Map<string, { pressTime?: number; releaseTime?: number }>()
  protected keyMapping = defaultKeymapping

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

  get<T>(field: InputField<T>): T | undefined {
    if (field === LastTimeJumpPressedField) {
      return (this.keyState.get('Space')?.pressTime ?? null) as T
    }
    let keys: Array<string> | undefined
    switch (field) {
      case MoveForwardField:
        keys = this.keyMapping.moveForward
        break
      case MoveBackwardField:
        keys = this.keyMapping.moveBackward
        break
      case MoveLeftField:
        keys = this.keyMapping.moveLeft
        break
      case MoveRightField:
        keys = this.keyMapping.moveRight
        break
      case RunField:
        keys = this.keyMapping.run
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

  destroy(): void {
    this.abortController.abort()
  }
}
