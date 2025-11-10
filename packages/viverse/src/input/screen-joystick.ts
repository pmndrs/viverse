import {
  Input,
  InputField,
  MoveForwardAction,
  MoveBackwardAction,
  MoveLeftAction,
  MoveRightAction,
  RunAction,
} from './index.js'

export type ScreenJoystickInputOptions = {
  screenJoystickRunDistancePx?: number
  screenJoystickDeadZonePx?: number
}

const DefaultDeadZonePx = 24
const DefaultRunDistancePx = 46
const JoystickRadius = 56

export class ScreenJoystickInput implements Input<ScreenJoystickInputOptions> {
  public readonly root: HTMLDivElement
  private readonly handle: HTMLDivElement

  private pointerId: number | undefined
  private distanceToCenter: number = 0
  private clampedX: number = 0
  private clampedY: number = 0

  constructor(domElement: HTMLElement) {
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
      const joyCenterX = rect.left + rect.width / 2
      const joyCenterY = rect.top + rect.height / 2
      this.updateHandle(e.clientX - joyCenterX, e.clientY - joyCenterY)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (this.pointerId == null) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      const rect = joy.getBoundingClientRect()
      const joyCenterX = rect.left + rect.width / 2
      const joyCenterY = rect.top + rect.height / 2
      this.updateHandle(e.clientX - joyCenterX, e.clientY - joyCenterY)
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

  get<T>(field: InputField<T>, options: ScreenJoystickInputOptions): T | undefined {
    switch (field) {
      case MoveForwardAction:
      case MoveBackwardAction:
        const moveY =
          this.distanceToCenter <= (options.screenJoystickDeadZonePx ?? DefaultDeadZonePx)
            ? 0
            : -this.clampedY / JoystickRadius
        return field === MoveForwardAction ? (Math.max(0, moveY) as T) : (Math.max(0, -moveY) as T)
      case MoveLeftAction:
      case MoveRightAction:
        const moveX =
          this.distanceToCenter <= (options.screenJoystickDeadZonePx ?? DefaultDeadZonePx)
            ? 0
            : this.clampedX / JoystickRadius
        return field === MoveLeftAction ? (Math.max(0, moveX) as T) : (Math.max(0, moveX) as T)
      case RunAction:
        return (this.distanceToCenter > (options.screenJoystickRunDistancePx ?? DefaultRunDistancePx)) as T
    }
    return undefined
  }

  dispose(): void {
    this.root.remove()
  }

  private updateHandle(dx: number, dy: number): void {
    this.distanceToCenter = Math.hypot(dx, dy) || 1
    this.clampedX = (dx / this.distanceToCenter) * Math.min(this.distanceToCenter, JoystickRadius)
    this.clampedY = (dy / this.distanceToCenter) * Math.min(this.distanceToCenter, JoystickRadius)
    this.handle.style.transform = `translate(-50%,-50%) translate(${this.clampedX}px, ${this.clampedY}px)`
  }

  private resetHandle(): void {
    this.handle.style.transform = 'translate(-50%,-50%)'
    this.distanceToCenter = 0
    this.clampedX = 0
    this.clampedY = 0
  }
}
