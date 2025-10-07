import { DeltaPitchField, DeltaYawField, DeltaZoomField, Input, InputField } from './index.js'

export type PointerLockInputOptions = {
  pointerLockRotationSpeed?: number // default 0.4
  pointerLockZoomSpeed?: number // default 0.0001
}

/**
 * @requires to manually execute `domElement.requestPointerLock()`
 */
export class PointerLockInput implements Input {
  private readonly abortController = new AbortController()
  private deltaZoom = 0
  private deltaYaw = 0
  private deltaPitch = 0

  constructor(domElement: HTMLElement, options: PointerLockInputOptions = {}) {
    domElement.addEventListener(
      'pointermove',
      (event: PointerEvent) => {
        if (document.pointerLockElement != domElement) {
          return
        }
        const rotationSpeed = options.pointerLockRotationSpeed ?? 0.4
        // Compute based on domElement bounds instead of window.innerHeight
        const rect = domElement.getBoundingClientRect()
        this.deltaYaw -= (rotationSpeed * event.movementX) / rect.height
        this.deltaPitch -= (rotationSpeed * event.movementY) / rect.height
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
        const zoomSpeed = options.pointerLockZoomSpeed ?? 0.0001
        this.deltaZoom += event.deltaY * zoomSpeed
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

  dispose(): void {
    this.abortController.abort()
  }
}
