import {
  Input,
  InputField,
  MoveForwardField,
  MoveBackwardField,
  MoveLeftField,
  MoveRightField,
  RunField,
} from './index.js'

export type ScreenJoystickInputOptions = {
  screenJoystickRunDistancePx?: number
  screenJoystickDeadZonePx?: number
}

const DefaultDeadZonePx = 24
const DefaultRunDistancePx = 46

export class ScreenJoystickInput implements Input {
  public readonly root: HTMLDivElement
  private readonly handle: HTMLDivElement

  private moveX = 0
  private moveY = 0
  private running = false

  private readonly joystickRadius = 56

  private joyCenterX = 0
  private joyCenterY = 0
  private pointerId: number | undefined

  constructor(
    domElement: HTMLElement,
    private readonly options: ScreenJoystickInputOptions = {},
  ) {
    const parent = domElement.parentElement ?? domElement

    const joy = document.createElement('div')
    joy.className = 'viverse-joystick mobile-only'
    parent.appendChild(joy)
    this.root = joy
    this.root.style.position = 'absolute'
    this.root.style.bottom = '24px'
    this.root.style.left = '24px'
    this.root.style.width = '112px'
    this.root.style.height = '112px'
    this.root.style.borderRadius = '9999px'
    this.root.style.background = 'rgba(255,255,255,0.2)'
    this.root.style.pointerEvents = 'auto'
    this.root.style.touchAction = 'none'
    this.root.style.userSelect = 'none'
    this.root.style.setProperty('-webkit-user-select', 'none')
    this.root.style.setProperty('-webkit-touch-callout', 'none')

    const handle = document.createElement('div')
    handle.className = 'viverse-joystick-handle'
    joy.appendChild(handle)
    this.handle = handle
    this.handle.style.position = 'absolute'
    this.handle.style.left = '50%'
    this.handle.style.top = '50%'
    this.handle.style.width = '56px'
    this.handle.style.height = '56px'
    this.handle.style.borderRadius = '9999px'
    this.handle.style.background = 'rgba(0,0,0,0.3)'
    this.handle.style.transform = 'translate(-50%,-50%)'
    this.handle.style.willChange = 'transform'
    this.handle.style.pointerEvents = 'none'
    this.handle.style.touchAction = 'none'
    this.handle.style.userSelect = 'none'
    this.handle.style.setProperty('-webkit-user-select', 'none')
    this.handle.style.setProperty('-webkit-touch-callout', 'none')

    const onPointerDown = (e: PointerEvent) => {
      if (this.pointerId != null) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      joy.setPointerCapture(e.pointerId)
      this.pointerId = e.pointerId
      const rect = joy.getBoundingClientRect()
      this.joyCenterX = rect.left + rect.width / 2
      this.joyCenterY = rect.top + rect.height / 2
      this.updateHandle(e.clientX - this.joyCenterX, e.clientY - this.joyCenterY)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (this.pointerId == null) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      this.updateHandle(e.clientX - this.joyCenterX, e.clientY - this.joyCenterY)
    }
    const onPointerEnd = (e: PointerEvent) => {
      if (this.pointerId != e.pointerId) {
        return
      }
      this.pointerId = undefined
      joy.releasePointerCapture(e.pointerId)
      e.preventDefault()
      this.resetHandle()
    }
    joy.addEventListener('pointerdown', onPointerDown)
    joy.addEventListener('pointermove', onPointerMove)
    joy.addEventListener('pointerup', onPointerEnd)
    joy.addEventListener('pointercancel', onPointerEnd)
  }

  get<T>(field: InputField<T>): T | undefined {
    switch (field) {
      case MoveForwardField:
        return Math.max(0, this.moveY) as T
      case MoveBackwardField:
        return Math.max(0, -this.moveY) as T
      case MoveLeftField:
        return Math.max(0, -this.moveX) as T
      case MoveRightField:
        return Math.max(0, this.moveX) as T
      case RunField:
        return this.running as T
    }
    return undefined
  }

  dispose(): void {
    this.root.remove()
  }

  private updateHandle(dx: number, dy: number): void {
    const len = Math.hypot(dx, dy) || 1
    const max = this.joystickRadius
    const clampedX = (dx / len) * Math.min(len, max)
    const clampedY = (dy / len) * Math.min(len, max)
    this.handle.style.transform = `translate(-50%,-50%) translate(${clampedX}px, ${clampedY}px)`
    if (len <= (this.options.screenJoystickDeadZonePx ?? DefaultDeadZonePx)) {
      this.moveX = 0
      this.moveY = 0
    } else {
      this.moveX = clampedX / max
      this.moveY = -clampedY / max
    }
    this.running = len > (this.options.screenJoystickRunDistancePx ?? DefaultRunDistancePx)
  }

  private resetHandle(): void {
    this.handle.style.transform = 'translate(-50%,-50%)'
    this.moveX = 0
    this.moveY = 0
    this.running = false
  }
}
