import { RotatePitchAction, RotateYawAction, ZoomAction } from './definitions.js'

export class PointerLockRotateZoomActionBindings {
  public rotationSpeed?: number // default 0.4
  public zoomSpeed?: number // default 0.0001
  public lockOnClick?: boolean

  constructor(domElement: HTMLElement, abortSignal: AbortSignal) {
    // lock on click (only left click)
    domElement.addEventListener(
      'mousedown',
      (event: MouseEvent) => {
        const lockOnClick = this.lockOnClick ?? true
        if (!lockOnClick) {
          return
        }
        // 0 = primary/left button
        if (event.button !== 0) {
          return
        }
        if (document.pointerLockElement === domElement) {
          return
        }
        // request pointer lock as a user-gesture
        if (domElement.requestPointerLock) {
          domElement.requestPointerLock()
        }
      },
      {
        signal: abortSignal,
      },
    )
    domElement.addEventListener(
      'pointermove',
      (event: PointerEvent) => {
        if (document.pointerLockElement != domElement) {
          return
        }
        const rect = domElement.getBoundingClientRect()
        const rotationSpeed = this.rotationSpeed ?? 0.4
        RotateYawAction.emit(-(event.movementX / rect.height) * rotationSpeed)
        RotatePitchAction.emit(-(event.movementY / rect.height) * rotationSpeed)
      },
      {
        signal: abortSignal,
      },
    )
    domElement.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        if (document.pointerLockElement != domElement) {
          return
        }
        const zoomSpeed = this.zoomSpeed ?? 0.0001
        ZoomAction.emit(event.deltaY * zoomSpeed)
        event.preventDefault()
      },
      {
        signal: abortSignal,
      },
    )
  }
}
