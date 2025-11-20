import { JumpAction } from './definitions.js'
import { PointerButtonActionBinding } from './pointer.js'

export const defaultScreenButtonStyles: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  bottom: '32px',
  right: '126px',
  minWidth: '64px',
  height: '64px',
  borderRadius: '9999px',
  pointerEvents: 'auto',
  touchAction: 'none',
  userSelect: 'none',
  background: 'rgba(255,255,255,0.3)',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: '50%',
}
Object.assign(defaultScreenButtonStyles, { '-webkit-user-select': 'none' })

export const jumpButtonImage =
  'url("data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%23444%22%20stroke-width=%222%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3Cpolyline%20points=%2218%2015%2012%209%206%2015%22/%3E%3C/svg%3E")'

export class ScreenButtonJumpActionBindings {
  public readonly root: HTMLDivElement

  constructor(domElement: HTMLElement, abortSignal: AbortSignal) {
    const parent = domElement.parentElement ?? domElement
    this.root = document.createElement('div')
    this.root.className = 'viverse-button viverse-jump mobile-only'
    parent.appendChild(this.root)
    abortSignal.addEventListener('abort', () => this.root.remove(), { once: true })

    Object.assign(this.root.style, defaultScreenButtonStyles)

    new PointerButtonActionBinding(JumpAction, this.root, abortSignal)

    this.root.addEventListener('pointerdown', (e) => e.stopPropagation(), { signal: abortSignal })
  }
}
