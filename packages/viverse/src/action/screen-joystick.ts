import { StateActionWriter } from './action.js'
import { MoveForwardAction, MoveBackwardAction, MoveLeftAction, MoveRightAction, RunAction } from './definitions.js'

const DefaultDeadZonePx = 24
const DefaultRunDistancePx = 46
const JoystickRadius = 56

export class ScreenJoystickLocomotionActionBindings {
  public readonly root: HTMLDivElement
  private readonly handle: HTMLDivElement

  private pointerId: number | undefined

  private readonly forwardWriter: StateActionWriter<number>
  private readonly backwardWriter: StateActionWriter<number>
  private readonly leftWriter: StateActionWriter<number>
  private readonly rightWriter: StateActionWriter<number>
  private readonly runWriter: StateActionWriter<boolean>

  //options
  public runDistancePx?: number
  public deadZonePx?: number

  constructor(
    domElement: HTMLElement,
    private abortSignal: AbortSignal,
  ) {
    this.forwardWriter = MoveForwardAction.createWriter(this.abortSignal)
    this.backwardWriter = MoveBackwardAction.createWriter(this.abortSignal)
    this.leftWriter = MoveLeftAction.createWriter(this.abortSignal)
    this.rightWriter = MoveRightAction.createWriter(this.abortSignal)
    this.runWriter = RunAction.createWriter(this.abortSignal)

    this.root = document.createElement('div')
    this.root.className = 'viverse-joystick mobile-only'
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

    const parent = domElement.parentElement ?? domElement
    parent.appendChild(this.root)
    this.abortSignal.addEventListener('abort', () => this.root.remove(), { once: true })

    this.handle = document.createElement('div')
    this.handle.className = 'viverse-joystick-handle'
    this.root.appendChild(this.handle)
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
      this.root.setPointerCapture(e.pointerId)
      this.pointerId = e.pointerId
      const rect = this.root.getBoundingClientRect()
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
      const rect = this.root.getBoundingClientRect()
      const joyCenterX = rect.left + rect.width / 2
      const joyCenterY = rect.top + rect.height / 2
      this.updateHandle(e.clientX - joyCenterX, e.clientY - joyCenterY)
    }
    const onPointerEnd = (e: PointerEvent) => {
      if (this.pointerId != e.pointerId) {
        return
      }
      this.pointerId = undefined
      this.root.releasePointerCapture(e.pointerId)
      e.preventDefault()
      this.resetHandle()
    }
    this.root.addEventListener('pointerdown', onPointerDown, { signal: this.abortSignal })
    this.root.addEventListener('pointermove', onPointerMove, { signal: this.abortSignal })
    this.root.addEventListener('pointerup', onPointerEnd, { signal: this.abortSignal })
    this.root.addEventListener('pointercancel', onPointerEnd, { signal: this.abortSignal })
  }

  private updateHandle(dx: number, dy: number): void {
    const distanceToCenter = Math.hypot(dx, dy) || 1
    const clampedX = (dx / distanceToCenter) * Math.min(distanceToCenter, JoystickRadius)
    const clampedY = (dy / distanceToCenter) * Math.min(distanceToCenter, JoystickRadius)
    this.handle.style.transform = `translate(-50%,-50%) translate(${clampedX}px, ${clampedY}px)`
    const deadZone = this.deadZonePx ?? DefaultDeadZonePx
    const runDistance = this.runDistancePx ?? DefaultRunDistancePx
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
