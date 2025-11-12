import {
  JumpAction,
  MoveBackwardAction,
  MoveForwardAction,
  MoveLeftAction,
  MoveRightAction,
  EventAction,
  StateAction,
  RunAction,
} from './index.js'

export class KeyboardInput {
  private readonly abortController = new AbortController()
  options: Partial<{ keys: Array<string> }> = {}
  abortSignal = this.abortController.signal
  private readonly pressedKeys = new Set<string>()

  constructor(private readonly domElement: HTMLElement) {}

  bindEvent(action: EventAction): void {
    const isWatched = (e: KeyboardEvent) =>
      this.options.keys == null || this.options.keys.length === 0 || this.options.keys.includes(e.code)
    this.domElement.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (!isWatched(e) || e.repeat) {
          return
        }
        action.emit({} as any)
      },
      { signal: this.abortController.signal },
    )
  }

  bindValue(action: StateAction<boolean>): void
  bindValue<T>(action: StateAction<T>, map: (value: boolean) => T): void
  bindValue(action: StateAction<any>, map?: (value: any) => any) {
    const writer = action.createWriter(this.abortSignal)
    const isWatched = (e: KeyboardEvent) =>
      this.options.keys == null || this.options.keys.length === 0 || this.options.keys.includes(e.code)
    let isPressed = false
    const write = (value: boolean) => {
      if (isPressed === value) {
        return
      }
      isPressed = value
      writer.write(map?.(value) ?? value)
    }
    this.domElement.tabIndex = 0
    this.domElement.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (!isWatched(e)) {
          return
        }
        const wasEmpty = this.pressedKeys.size === 0
        this.pressedKeys.add(e.code)
        if (wasEmpty && this.pressedKeys.size > 0) {
          write(true)
        }
      },
      { signal: this.abortController.signal },
    )
    this.domElement.addEventListener(
      'keyup',
      (e: KeyboardEvent) => {
        if (!isWatched(e)) {
          return
        }
        if (this.pressedKeys.delete(e.code) && this.pressedKeys.size === 0) {
          write(false)
        }
      },
      { signal: this.abortController.signal },
    )
    // Handle focus loss to clear pressed keys
    this.domElement.addEventListener(
      'blur',
      () => {
        if (this.pressedKeys.size > 0) {
          this.pressedKeys.clear()
          write(false)
        }
      },
      { signal: this.abortController.signal },
    )
  }

  dispose(): void {
    this.abortController.abort()
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

export const DefaultMoveForwardKeys = ['KeyW']
export const DefaultMoveBackwardKeys = ['KeyS']
export const DefaultMoveLeftKeys = ['KeyA']
export const DefaultMoveRightKeys = ['KeyD']
export const DefaultRunKeys = ['ShiftRight', 'ShiftLeft']
export const DefaultJumpKeys = ['Space']

export class LocomotionKeyboardInput {
  forward: KeyboardInput
  left: KeyboardInput
  right: KeyboardInput
  backward: KeyboardInput
  jump: KeyboardInput
  run: KeyboardInput

  constructor(domElement: HTMLElement) {
    this.forward = new KeyboardInput(domElement)
    this.forward.options.keys = DefaultMoveForwardKeys
    this.forward.bindValue(MoveForwardAction, (isPressed) => (isPressed ? 1 : 0))
    this.left = new KeyboardInput(domElement)
    this.left.options.keys = DefaultMoveLeftKeys
    this.left.bindValue(MoveLeftAction, (isPressed) => (isPressed ? 1 : 0))
    this.right = new KeyboardInput(domElement)
    this.right.options.keys = DefaultMoveRightKeys
    this.right.bindValue(MoveRightAction, (isPressed) => (isPressed ? 1 : 0))
    this.backward = new KeyboardInput(domElement)
    this.backward.options.keys = DefaultMoveBackwardKeys
    this.backward.bindValue(MoveBackwardAction, (isPressed) => (isPressed ? 1 : 0))
    this.jump = new KeyboardInput(domElement)
    this.jump.options.keys = DefaultJumpKeys
    this.jump.bindEvent(JumpAction)
    this.run = new KeyboardInput(domElement)
    this.run.options.keys = DefaultRunKeys
    this.run.bindValue(RunAction)
  }

  dispose(): void {}
}
