import { RotatePitchAction, RotateYawAction, ZoomAction } from './index.js'

/**
 * @requires to manually execute `domElement.requestPointerLock()`
 */
export class PointerLockInput {
  private readonly abortController = new AbortController()

  public options: {
    rotationSpeed?: number // default 0.4
    zoomSpeed?: number // default 0.0001
  } = {}

  constructor(domElement: HTMLElement) {
    domElement.addEventListener(
      'pointermove',
      (event: PointerEvent) => {
        if (document.pointerLockElement != domElement) {
          return
        }
        const rect = domElement.getBoundingClientRect()
        const rotationSpeed = this.options.rotationSpeed ?? 0.4
        RotateYawAction.write(-(event.movementX / rect.height) * rotationSpeed)
        RotatePitchAction.write(-(event.movementY / rect.height) * rotationSpeed)
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
        const zoomSpeed = this.options.zoomSpeed ?? 0.0001
        ZoomAction.write(event.deltaY * zoomSpeed)
        event.preventDefault()
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
