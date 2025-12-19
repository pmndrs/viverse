import { RotatePitchAction, RotateYawAction, ZoomAction } from './definitions.js'

export class PointerCaptureRotateZoomActionBindings {
  private activePointers: Map<number, { x: number; y: number }> = new Map()
  private lastPinchDist: number | null = null

  public rotationSpeed?: number // default 4.0
  public zoomSpeed?: number // default 0.001

  constructor(
    private readonly domElement: HTMLElement,
    abortSignal: AbortSignal,
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
        signal: abortSignal,
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
            const zoomSpeed = this.zoomSpeed ?? 0.001
            ZoomAction.emit((this.lastPinchDist - d) * zoomSpeed * 3)
            this.lastPinchDist = d
          }
          event.preventDefault()
          return
        }
        const rotationSpeed = this.rotationSpeed ?? 4.0
        RotateYawAction.emit(-(event.movementX / window.innerHeight) * rotationSpeed)
        RotatePitchAction.emit(-(event.movementY / window.innerHeight) * rotationSpeed)
      },
      {
        signal: abortSignal,
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
        signal: abortSignal,
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
        signal: abortSignal,
      },
    )

    domElement.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        event.preventDefault()
        const zoomSpeed = this.zoomSpeed ?? 0.001
        ZoomAction.emit(event.deltaY * zoomSpeed)
      },
      {
        signal: abortSignal,
      },
    )
  }
}
