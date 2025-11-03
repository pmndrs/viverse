import { Input, InputField, LastTimeJumpPressedField } from './index.js'

export class ScreenJumpButtonInput implements Input<{}> {
  public readonly root: HTMLDivElement
  private lastJumpTime: number | null = null

  constructor(domElement: HTMLElement) {
    const parent = domElement.parentElement ?? domElement
    const btn = document.createElement('div')
    btn.className = 'viverse-button viverse-jump mobile-only'
    parent.appendChild(btn)
    this.root = btn

    this.root.style.position = 'absolute'
    this.root.style.bottom = '32px'
    this.root.style.right = '126px'
    this.root.style.minWidth = '64px'
    this.root.style.height = '64px'
    this.root.style.borderRadius = '9999px'
    this.root.style.pointerEvents = 'auto'
    this.root.style.touchAction = 'none'
    this.root.style.userSelect = 'none'
    this.root.style.setProperty('-webkit-user-select', 'none')
    this.root.style.background = 'rgba(255,255,255,0.3)'
    this.root.style.backgroundImage =
      'url("data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%23444%22%20stroke-width=%222%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3Cpolyline%20points=%2218%2015%2012%209%206%2015%22/%3E%3C/svg%3E")'
    this.root.style.backgroundRepeat = 'no-repeat'
    this.root.style.backgroundPosition = 'center'
    this.root.style.backgroundSize = '50%'

    const onPress = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      this.lastJumpTime = performance.now() / 1000
    }
    const stopPropagation = (e: Event) => {
      e.stopPropagation()
      e.preventDefault()
    }
    this.root.addEventListener('pointerdown', onPress)
    this.root.addEventListener('pointermove', stopPropagation)
    this.root.addEventListener('pointerup', stopPropagation)
  }

  get<T>(field: InputField<T>): T | undefined {
    if (field === LastTimeJumpPressedField) {
      return this.lastJumpTime as T
    }
    return undefined
  }

  dispose(): void {
    this.root.remove()
  }
}
