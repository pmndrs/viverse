import { StateAction, StateActionWriter, WriteonlyEventAction } from './action.js'

export class PointerButtonActionBinding {
  private writer?: StateActionWriter<boolean>
  private eventAction?: WriteonlyEventAction<PointerEvent> | WriteonlyEventAction<void>
  private buttonsMask = 0
  private wasPressed = false

  // options
  private _buttons: Array<number> | undefined
  /**
   * When undefined, any pressed button will set the state to true.
   */
  get buttons(): Array<number> | undefined {
    return this._buttons
  }
  set buttons(buttons: Array<number> | undefined) {
    this._buttons = buttons
    this.processPointer()
  }
  requiresPointerLock?: boolean

  constructor(
    action: WriteonlyEventAction<PointerEvent> | WriteonlyEventAction<void> | StateAction<boolean>,
    private readonly domElement: HTMLElement,
    abortSignal: AbortSignal,
  ) {
    if (action instanceof StateAction) {
      this.writer = action.createWriter(abortSignal)
    } else {
      this.eventAction = action
    }

    domElement.addEventListener(
      'pointerdown',
      (e: PointerEvent) => {
        this.processPointer(e)
      },
      { signal: abortSignal },
    )
    domElement.addEventListener(
      'pointermove',
      (e: PointerEvent) => {
        // Moving while multiple buttons are pressed is the only signal we get
        // when a second button is pressed simultaneously.
        this.processPointer(e)
      },
      { signal: abortSignal },
    )
    domElement.addEventListener(
      'pointerup',
      (e: PointerEvent) => {
        this.processPointer(e)
      },
      { signal: abortSignal },
    )
    domElement.addEventListener(
      'pointercancel',
      (e: PointerEvent) => {
        this.processPointer(e)
      },
      { signal: abortSignal },
    )
    domElement.addEventListener(
      'pointerleave',
      (e: PointerEvent) => {
        this.processPointer(e)
      },
      { signal: abortSignal },
    )
    domElement.addEventListener(
      'blur',
      () => {
        // On blur, assume no buttons pressed.
        this.buttonsMask = 0
        this.processPointer()
      },
      { signal: abortSignal },
    )
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== domElement) {
        this.processPointer()
      }
    })
  }

  private getPressedButtonsFromMask(mask: number): Array<number> {
    const pressed: Array<number> = []
    if (mask & 1) pressed.push(0)
    if (mask & 2) pressed.push(2)
    if (mask & 4) pressed.push(1)
    if (mask & 8) pressed.push(3)
    if (mask & 16) pressed.push(4)
    return pressed
  }

  private processPointer(e?: PointerEvent) {
    if (e != null) {
      this.buttonsMask = e.buttons
    }
    if ((this.requiresPointerLock ?? false) && document.pointerLockElement != this.domElement) {
      this.buttonsMask = 0
    }
    const pressedButtons = this.getPressedButtonsFromMask(this.buttonsMask)
    const isActive =
      this.buttons == null ? pressedButtons.length > 0 : this.buttons.some((btn) => pressedButtons.includes(btn))
    if (this.writer != null) {
      this.writer.write(isActive)
    }
    if (this.eventAction != null && e != null) {
      if (isActive && !this.wasPressed) {
        //required to support EventAction<void>
        this.eventAction.emit(e as any)
      }
    }
    this.wasPressed = isActive
  }
}
