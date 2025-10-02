import {
  DeltaPitchField,
  DeltaYawField,
  DeltaZoomField,
  Input,
  InputField,
  LastTimeJumpPressedField,
  MoveBackwardField,
  MoveForwardField,
  MoveLeftField,
  MoveRightField,
  RunField,
} from '../input/index.js'

export class MobileControls implements Input {
  public readonly jumpButton: HTMLDivElement
  public readonly runButton: HTMLDivElement
  public readonly joyStick: HTMLDivElement
  public readonly joyStickHandle: HTMLDivElement

  // movement state
  private moveX = 0
  private moveY = 0
  private runPressed = false
  private lastJumpTime: number | null = null

  // look/zoom deltas
  private deltaYaw = 0
  private deltaPitch = 0
  private deltaZoom = 0

  // rotation gesture state
  private rotPointerId: number | null = null
  private lastX = 0
  private lastY = 0

  // pinch state
  private pinchIds: number[] = []
  private lastPinchDist: number | null = null

  // bound handlers
  private onDomPointerDown: (e: PointerEvent) => void
  private onDomPointerMove: (e: PointerEvent) => void
  private onDomPointerEnd: (e: PointerEvent) => void
  private onTouchStart: (e: TouchEvent) => void
  private onTouchMove: (e: TouchEvent) => void
  private onTouchEnd: (e: TouchEvent) => void

  constructor(private readonly domElementParent: HTMLElement) {
    // Create style once
    this.ensureStyles()

    // Joystick base
    const joy = document.createElement('div')
    joy.className = 'viverse-joystick'
    this.domElementParent.appendChild(joy)
    this.joyStick = joy
    // Inline styles for joystick
    this.joyStick.style.position = 'absolute'
    this.joyStick.style.bottom = '16px'
    this.joyStick.style.left = '16px'
    this.joyStick.style.width = '112px'
    this.joyStick.style.height = '112px'
    this.joyStick.style.borderRadius = '9999px'
    this.joyStick.style.background = 'rgba(255,255,255,0.08)'
    this.joyStick.style.border = '1px solid rgba(255,255,255,0.15)'
    this.joyStick.style.pointerEvents = 'auto'
    this.joyStick.style.display = 'grid'
    this.joyStick.style.setProperty('place-items', 'center')
    this.joyStick.style.setProperty('backdrop-filter', 'blur(6px)')

    // Joystick handle (visual only)
    this.joyStickHandle = document.createElement('div')
    this.joyStickHandle.className = 'viverse-joystick-handle'
    joy.appendChild(this.joyStickHandle)
    // Inline styles for joystick handle
    this.joyStickHandle.style.width = '56px'
    this.joyStickHandle.style.height = '56px'
    this.joyStickHandle.style.borderRadius = '9999px'
    this.joyStickHandle.style.background = 'rgba(255,255,255,0.18)'
    this.joyStickHandle.style.border = '1px solid rgba(255,255,255,0.25)'
    this.joyStickHandle.style.transform = 'translate(0,0)'
    this.joyStickHandle.style.willChange = 'transform'
    this.joyStickHandle.style.pointerEvents = 'none'

    // Run button
    const run = document.createElement('div')
    run.className = 'viverse-button viverse-run'
    run.textContent = 'Run'
    this.domElementParent.appendChild(run)
    this.runButton = run
    // Inline base button styles
    this.runButton.style.position = 'absolute'
    this.runButton.style.bottom = '24px'
    this.runButton.style.minWidth = '64px'
    this.runButton.style.height = '64px'
    this.runButton.style.borderRadius = '9999px'
    this.runButton.style.background = 'rgba(255,255,255,0.12)'
    this.runButton.style.border = '1px solid rgba(255,255,255,0.2)'
    this.runButton.style.color = 'white'
    this.runButton.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
    this.runButton.style.fontSize = '14px'
    this.runButton.style.display = 'grid'
    this.runButton.style.setProperty('place-items', 'center')
    this.runButton.style.pointerEvents = 'auto'
    this.runButton.style.right = '216px'

    // Jump button
    this.jumpButton = document.createElement('div')
    this.jumpButton.className = 'viverse-button viverse-jump'
    this.jumpButton.textContent = 'Jump'
    this.domElementParent.appendChild(this.jumpButton)
    // Inline base button styles for jump
    this.jumpButton.style.position = 'absolute'
    this.jumpButton.style.bottom = '24px'
    this.jumpButton.style.minWidth = '64px'
    this.jumpButton.style.height = '64px'
    this.jumpButton.style.borderRadius = '9999px'
    this.jumpButton.style.background = 'rgba(255,255,255,0.12)'
    this.jumpButton.style.border = '1px solid rgba(255,255,255,0.2)'
    this.jumpButton.style.color = 'white'
    this.jumpButton.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
    this.jumpButton.style.fontSize = '14px'
    this.jumpButton.style.display = 'grid'
    this.jumpButton.style.setProperty('place-items', 'center')
    this.jumpButton.style.pointerEvents = 'auto'
    this.jumpButton.style.right = '126px'

    // Track joystick drag
    const joystickRadius = 56 // px visual radius (half of 112px size)
    let joyActivePointer: number | null = null
    let joyCenterX = 0
    let joyCenterY = 0

    const updateHandle = (dx: number, dy: number) => {
      // Clamp vector to radius
      const len = Math.hypot(dx, dy) || 1
      const max = joystickRadius
      const clampedX = (dx / len) * Math.min(len, max)
      const clampedY = (dy / len) * Math.min(len, max)
      this.joyStickHandle.style.transform = `translate(${clampedX}px, ${clampedY}px)`

      // Map to -1..1 range
      this.moveX = clampedX / max
      this.moveY = -clampedY / max // up on screen -> forward
    }

    const resetHandle = () => {
      this.joyStickHandle.style.transform = 'translate(0px, 0px)'
      this.moveX = 0
      this.moveY = 0
    }

    joy.addEventListener('pointerdown', (e) => {
      e.stopPropagation()
      joy.setPointerCapture(e.pointerId)
      joyActivePointer = e.pointerId
      const rect = joy.getBoundingClientRect()
      joyCenterX = rect.left + rect.width / 2
      joyCenterY = rect.top + rect.height / 2
      updateHandle(e.clientX - joyCenterX, e.clientY - joyCenterY)
    })

    joy.addEventListener('pointermove', (e) => {
      e.stopPropagation()
      if (!joy.hasPointerCapture(e.pointerId)) return
      updateHandle(e.clientX - joyCenterX, e.clientY - joyCenterY)
    })

    const endJoy = (e: PointerEvent) => {
      if (joy.hasPointerCapture(e.pointerId)) joy.releasePointerCapture(e.pointerId)
      joyActivePointer = null
      resetHandle()
    }
    joy.addEventListener('pointerup', endJoy)
    joy.addEventListener('pointercancel', endJoy)

    // Run button: hold to run
    const runDown = (e: Event) => {
      this.runPressed = true
    }
    const runUp = (e: Event) => {
      this.runPressed = false
    }
    run.addEventListener('pointerdown', runDown)
    run.addEventListener('pointerup', runUp)
    run.addEventListener('pointercancel', runUp)
    run.addEventListener('pointerleave', runUp)

    // Jump button: tap to set timestamp
    const jumpTap = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      this.lastJumpTime = performance.now() / 1000
    }
    this.jumpButton.addEventListener('pointerdown', jumpTap)

    // Rotation on domElement via pointer capture
    this.onDomPointerDown = (e: PointerEvent) => {
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      this.rotPointerId = e.pointerId
      this.lastX = e.clientX
      this.lastY = e.clientY
    }
    this.onDomPointerMove = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).hasPointerCapture(e.pointerId)) return
      const rect = this.domElementParent.getBoundingClientRect()
      const dx = e.clientX - this.lastX
      const dy = e.clientY - this.lastY
      this.lastX = e.clientX
      this.lastY = e.clientY
      this.deltaYaw -= (0.4 * dx) / rect.height
      this.deltaPitch -= (0.4 * dy) / rect.height
    }
    this.onDomPointerEnd = (e: PointerEvent) => {
      if (this.rotPointerId == null || e.pointerId !== this.rotPointerId) return
      if (this.domElementParent.hasPointerCapture(e.pointerId)) this.domElementParent.releasePointerCapture(e.pointerId)
      this.rotPointerId = null
    }
    this.domElementParent.addEventListener('pointerdown', this.onDomPointerDown)
    this.domElementParent.addEventListener('pointermove', this.onDomPointerMove)
    this.domElementParent.addEventListener('pointerup', this.onDomPointerEnd)
    this.domElementParent.addEventListener('pointercancel', this.onDomPointerEnd)

    // Pinch zoom on domElement using touch events
    const getTouchById = (touches: TouchList, id: number) => Array.from(touches).find((t) => t.identifier === id)
    const distance = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)

    this.onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        this.pinchIds = [e.touches[0].identifier, e.touches[1].identifier]
        this.lastPinchDist = distance(e.touches[0], e.touches[1])
      }
    }
    this.onTouchMove = (e: TouchEvent) => {
      if (this.pinchIds.length !== 2) return
      const t0 = getTouchById(e.touches, this.pinchIds[0])
      const t1 = getTouchById(e.touches, this.pinchIds[1])
      if (!t0 || !t1 || this.lastPinchDist == null) return
      const d = distance(t0, t1)
      this.deltaZoom += (this.lastPinchDist - d) * 0.001
      this.lastPinchDist = d
      e.preventDefault()
    }
    this.onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        this.pinchIds = []
        this.lastPinchDist = null
      }
    }
    this.domElementParent.addEventListener('touchstart', this.onTouchStart, { passive: true })
    this.domElementParent.addEventListener('touchmove', this.onTouchMove, { passive: false })
    this.domElementParent.addEventListener('touchend', this.onTouchEnd)
    this.domElementParent.addEventListener('touchcancel', this.onTouchEnd)
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
        return this.runPressed as T
      case LastTimeJumpPressedField:
        return this.lastJumpTime as T
      case DeltaYawField: {
        const v = this.deltaYaw as T
        this.deltaYaw = 0
        return v
      }
      case DeltaPitchField: {
        const v = this.deltaPitch as T
        this.deltaPitch = 0
        return v
      }
      case DeltaZoomField: {
        const v = this.deltaZoom as T
        this.deltaZoom = 0
        return v
      }
    }
    return undefined
  }

  dispose(): void {
    // Remove created elements
    this.joyStick.remove()
    this.runButton.remove()
    this.jumpButton.remove()
    // Remove listeners on domElement
    this.domElementParent.removeEventListener('pointerdown', this.onDomPointerDown)
    this.domElementParent.removeEventListener('pointermove', this.onDomPointerMove)
    this.domElementParent.removeEventListener('pointerup', this.onDomPointerEnd)
    this.domElementParent.removeEventListener('pointercancel', this.onDomPointerEnd)
  }

  private ensureStyles() {
    // Ensure domElement can overlay children
    const s = getComputedStyle(this.domElementParent)
    if (s.position != 'relative') {
      this.domElementParent.style.position = 'relative'
    }
    if (s.touchAction != 'none') {
      this.domElementParent.style.touchAction = 'none'
    }
    if (s.userSelect != 'none') {
      this.domElementParent.style.userSelect = 'none'
    }
    if (s['-webkit-user-select' as any] != 'none') {
      this.domElementParent.style['-webkit-user-select' as any] = 'none'
    }
  }
}
