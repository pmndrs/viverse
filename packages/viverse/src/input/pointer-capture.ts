import { DeltaPitchField, DeltaYawField, DeltaZoomField, Input, InputField } from './index.js'

/**
 * @requires to manually execute `domElement.setPointerCapture(pointerId)` on pointerdown
 */
export class PointerCaptureInput implements Input {
  private readonly abortController = new AbortController()
  private deltaZoom = 0
  private deltaYaw = 0
  private deltaPitch = 0

  constructor(private readonly domElement: HTMLElement) {
    domElement.addEventListener(
      'pointerdown',
      (event: PointerEvent) => this.domElement.setPointerCapture(event.pointerId),
      {
        signal: this.abortController.signal,
      },
    )

    domElement.addEventListener(
      'pointermove',
      (event: PointerEvent) => {
        if (!this.domElement.hasPointerCapture(event.pointerId)) {
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
      'pointerup',
      (event: PointerEvent) => this.domElement.releasePointerCapture(event.pointerId),
      {
        signal: this.abortController.signal,
      },
    )

    domElement.addEventListener(
      'pointercancel',
      (event: PointerEvent) => this.domElement.releasePointerCapture(event.pointerId),
      {
        signal: this.abortController.signal,
      },
    )

    domElement.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        event.preventDefault()
        this.deltaZoom += event.deltaY * 0.0001
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
