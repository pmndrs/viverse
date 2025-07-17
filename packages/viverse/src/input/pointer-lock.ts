import { DeltaPitchField, DeltaYawField, DeltaZoomField, Input, InputField } from './index.js'

/**
 * @requires to manually execute `domElement.requestPointerLock()`
 */
export class PointerLockInput implements Input {
  private readonly abortController = new AbortController()
  private deltaZoom = 0
  private deltaYaw = 0
  private deltaPitch = 0

  constructor(domElement: HTMLElement) {
    domElement.addEventListener(
      'pointermove',
      (event: PointerEvent) => {
        if (document.pointerLockElement != domElement) {
          return
        }
        this.deltaYaw -= (0.4 * event.movementX) / window.innerHeight
        this.deltaPitch -= (0.4 * event.movementY) / window.innerHeight
      },
      {
        signal: this.abortController.signal,
      },
    )
    domElement.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        if (document.pointerLockElement != domElement) {
          return
        }
        this.deltaZoom += event.deltaY * 0.0001
        event.preventDefault()
      },
      {
        signal: this.abortController.signal,
      },
    )
  }

  get<T>(field: InputField<T>): T | undefined {
    let result: T | undefined
    switch (field) {
      case DeltaPitchField:
        result = this.deltaPitch as T
        this.deltaPitch = 0
        break
      case DeltaYawField:
        result = this.deltaYaw as T
        this.deltaYaw = 0
        break
      case DeltaZoomField:
        result = this.deltaZoom as T
        this.deltaZoom = 0
        break
    }
    return result
  }

  destroy(): void {
    this.abortController.abort()
  }
}
