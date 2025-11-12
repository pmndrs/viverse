import { MoveForwardAction, MoveBackwardAction, MoveLeftAction, MoveRightAction, RunAction } from './index.js'

export type ScreenJoystickInputOptions = {
  screenJoystickRunDistancePx?: number
  screenJoystickDeadZonePx?: number
}

const DefaultDeadZonePx = 24
const DefaultRunDistancePx = 46
const JoystickRadius = 56

export class ScreenJoystickInput {
  private readonly abortController = new AbortController()
  public readonly root: HTMLDivElement
  private readonly handle: HTMLDivElement

  private pointerId: number | undefined

  private forwardWriter = MoveForwardAction.createWriter(this.abortController.signal)
  private backwardWriter = MoveBackwardAction.createWriter(this.abortController.signal)
  private leftWriter = MoveLeftAction.createWriter(this.abortController.signal)
  private rightWriter = MoveRightAction.createWriter(this.abortController.signal)
  private runWriter = RunAction.createWriter(this.abortController.signal)

  public options: { runDistancePx?: number; deadZonePx?: number } = {}

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
    joy.addEventListener('pointerdown', onPointerDown, { signal: this.abortController.signal })
    joy.addEventListener('pointermove', onPointerMove, { signal: this.abortController.signal })
    joy.addEventListener('pointerup', onPointerEnd, { signal: this.abortController.signal })
    joy.addEventListener('pointercancel', onPointerEnd, { signal: this.abortController.signal })
  }

  dispose(): void {
    this.abortController.abort()
    this.root.remove()
  }

  private updateHandle(dx: number, dy: number): void {
    const distanceToCenter = Math.hypot(dx, dy) || 1
    const clampedX = (dx / distanceToCenter) * Math.min(distanceToCenter, JoystickRadius)
    const clampedY = (dy / distanceToCenter) * Math.min(distanceToCenter, JoystickRadius)
    this.handle.style.transform = `translate(-50%,-50%) translate(${clampedX}px, ${clampedY}px)`
    const deadZone = this.options.deadZonePx ?? DefaultDeadZonePx
    const runDistance = this.options.runDistancePx ?? DefaultRunDistancePx
    const moveY = distanceToCenter <= deadZone ? 0 : -clampedY / JoystickRadius
    const moveX = distanceToCenter <= deadZone ? 0 : clampedX / JoystickRadius
    this.forwardWriter.write(Math.max(0, moveY))
    this.backwardWriter.write(Math.max(0, -moveY))
    this.leftWriter.write(Math.max(0, -moveX))
    this.rightWriter.write(Math.max(0, moveX))
    this.runWriter.write(distanceToCenter > runDistance)
  }

  private resetHandle(): void {
    this.handle.style.transform = 'translate(-50%,-50%)'
    this.forwardWriter.write(0)
    this.backwardWriter.write(0)
    this.leftWriter.write(0)
    this.rightWriter.write(0)
    this.runWriter.write(false)
  }
}
