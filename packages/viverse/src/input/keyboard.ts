import {
  MoveForwardAction,
  MoveBackwardAction,
  MoveLeftAction,
  MoveRightAction,
  RunAction,
  ValueInput,
  EventInput,
  ValueAction,
  EventAction,
} from './index.js'

export class KeyboardValueInput implements ValueInput<{ keys: Array<string> }> {
  private pressedKeys = new Set<string>()
  private readonly abortController = new AbortController()

  constructor(
    domElement: HTMLElement,
    private readonly valueAction: ValueAction<boolean>,
  ) {
    domElement.tabIndex = 0
    domElement.addEventListener('keydown', (event: KeyboardEvent) => this.pressedKeys.add(event.code), {
      signal: this.abortController.signal,
    })
    domElement.addEventListener('keyup', (event: KeyboardEvent) => this.pressedKeys.delete(event.code), {
      signal: this.abortController.signal,
    })
    // Handle focus loss to clear pressed keys
    domElement.addEventListener('blur', () => this.pressedKeys.clear(), {
      signal: this.abortController.signal,
    })
  }

  get<T>(field: ValueAction<T>, options: { keys: Array<string> }): T | undefined {
    if (field != this.valueAction || options.keys == null) {
      return undefined
    }
    return options.keys.some((key) => this.pressedKeys.has(key)) as T
  }

  dispose(): void {
    this.abortController.abort()
  }
}

export class KeyboardEventInput implements EventInput<{ keys: Array<string>; bufferTime: number }> {
  options?: Record<string, unknown> | undefined
  subscribe<T>(
    eventAction: EventAction<T>,
    callback: (value: T) => void,
    options?:
      | ({ abortSignal?: AbortSignal; once?: boolean } & Partial<{ keys: Array<string>; bufferTime: number }>)
      | undefined,
  ): void {
    throw new Error('Method not implemented.')
  }
  dispose(): void {
    throw new Error('Method not implemented.')
  }
}

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
      case MoveForwardAction:
        keys = options.keyboardMoveForwardKeys ?? DefaultMoveForwardKeys
        break
      case MoveBackwardAction:
        keys = options.keyboardMoveBackwardKeys ?? DefaultMoveBackwardKeys
        break
      case MoveLeftAction:
        keys = options.keyboardMoveLeftKeys ?? DefaultMoveLeftKeys
        break
      case MoveRightAction:
        keys = options.keyboardMoveRightKeys ?? DefaultMoveRightKeys
        break
      case RunAction:
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
