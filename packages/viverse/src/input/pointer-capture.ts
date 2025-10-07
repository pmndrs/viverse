import { DeltaPitchField, DeltaYawField, DeltaZoomField, Input, InputField } from './index.js'

export type PointerCaptureInputOptions = {
  pointerCaptureRotationSpeed?: number // default 0.4
  pointerCaptureZoomSpeed?: number // default 0.0001
}

/**
 * @requires to manually execute `domElement.setPointerCapture(pointerId)` on pointerdown
 */
export class PointerCaptureInput implements Input {
  private readonly abortController = new AbortController()
  private deltaZoom = 0
  private deltaYaw = 0
  private deltaPitch = 0
  private activePointers: Map<number, { x: number; y: number }> = new Map()
  private lastPinchDist: number | null = null

  constructor(
    private readonly domElement: HTMLElement,
    options: PointerCaptureInputOptions = {},
  ) {
    domElement.addEventListener(
      'pointerdown',
      (event: PointerEvent) => {
        this.domElement.setPointerCapture(event.pointerId)
        this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
        if (this.activePointers.size === 2) {
          const pts = Array.from(this.activePointers.values())
          this.lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        }
      },
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
        this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
        if (this.activePointers.size === 2) {
          const pts = Array.from(this.activePointers.values())
          if (this.lastPinchDist != null) {
            const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
            const zoomSpeed = options.pointerCaptureZoomSpeed ?? 0.0001
            this.deltaZoom += (this.lastPinchDist - d) * zoomSpeed
            this.lastPinchDist = d
          }
          event.preventDefault()
          return
        }
        const rotationSpeed = options.pointerCaptureRotationSpeed ?? 0.4
        this.deltaYaw -= (rotationSpeed * event.movementX) / window.innerHeight
        this.deltaPitch -= (rotationSpeed * event.movementY) / window.innerHeight
      },
      {
        signal: this.abortController.signal,
      },
    )

    domElement.addEventListener(
      'pointerup',
      (event: PointerEvent) => {
        this.domElement.releasePointerCapture(event.pointerId)
        this.activePointers.delete(event.pointerId)
        if (this.activePointers.size < 2) {
          this.lastPinchDist = null
        }
      },
      {
        signal: this.abortController.signal,
      },
    )

    domElement.addEventListener(
      'pointercancel',
      (event: PointerEvent) => {
        this.domElement.releasePointerCapture(event.pointerId)
        this.activePointers.delete(event.pointerId)
        if (this.activePointers.size < 2) {
          this.lastPinchDist = null
        }
      },
      {
        signal: this.abortController.signal,
      },
    )

    domElement.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        event.preventDefault()
        const zoomSpeed = options.pointerCaptureZoomSpeed ?? 0.0001
        this.deltaZoom += event.deltaY * zoomSpeed
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

  dispose(): void {
    this.abortController.abort()
  }
}
