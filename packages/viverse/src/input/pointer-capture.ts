import { RotatePitchAction, RotateYawAction, ZoomAction } from './index.js'

/**
 * @requires to manually execute `domElement.setPointerCapture(pointerId)` on pointerdown
 */
export class PointerCaptureInput {
  private readonly abortController = new AbortController()
  private activePointers: Map<number, { x: number; y: number }> = new Map()
  private lastPinchDist: number | null = null

  public options: {
    rotationSpeed?: number // default 0.4
    zoomSpeed?: number // default 0.0001
  } = {}

  constructor(private readonly domElement: HTMLElement) {
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
            const zoomSpeed = this.options.zoomSpeed ?? 0.0001
            ZoomAction.write((this.lastPinchDist - d) * zoomSpeed)
            this.lastPinchDist = d
          }
          event.preventDefault()
          return
        }
        const rotationSpeed = this.options.rotationSpeed ?? 0.4
        RotateYawAction.write(-(event.movementX / window.innerHeight) * rotationSpeed)
        RotatePitchAction.write(-(event.movementY / window.innerHeight) * rotationSpeed)
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
        const zoomSpeed = this.options.zoomSpeed ?? 0.0001
        ZoomAction.write(event.deltaY * zoomSpeed)
      },
      {
        signal: this.abortController.signal,
      },
    )
  }

  dispose(): void {
    this.abortController.abort()
  }
}
