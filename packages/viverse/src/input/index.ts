export class InputSystem {
  private readonly inputs: Array<Input>

  constructor(
    domElement: HTMLElement,
    inputs: ReadonlyArray<Input | { new (element: HTMLElement, options?: {}): Input }>,
    options?: {},
  ) {
    this.inputs = inputs.map((input) => (typeof input === 'function' ? new input(domElement, options) : input))
  }

  add(input: Input): void {
    this.inputs.push(input)
  }

  remove(input: Input): void {
    const index = this.inputs.indexOf(input)
    if (index === -1) {
      return
    }
    this.inputs.splice(index, 1)
  }

  dispose(): void {
    this.inputs.forEach((input) => input.dispose?.())
    this.inputs.length = 0
  }

  get<T>(field: InputField<T>): T {
    let current: T | undefined
    for (const input of this.inputs) {
      const result = input.get(field)
      if (result == null) {
        continue
      }
      if (current == undefined) {
        current = result
        continue
      }
      current = field.combine(current, result)
    }
    return current ?? field.default
  }
}

export type InputField<T> = {
  default: T
  combine: (v1: any, v2: any) => T
}

export const MoveForwardField: InputField<number> = {
  default: 0,
  combine: Math.max,
}

export const MoveBackwardField: InputField<number> = {
  default: 0,
  combine: Math.max,
}

export const MoveLeftField: InputField<number> = {
  default: 0,
  combine: Math.max,
}

export const MoveRightField: InputField<number> = {
  default: 0,
  combine: Math.max,
}

export const LastTimeJumpPressedField: InputField<number | null> = {
  default: null,
  combine: (v1, v2) => (v1 == null && v2 == null ? null : Math.min(v1 ?? Infinity, v2 ?? Infinity)),
}

export const RunField: InputField<boolean> = {
  default: false,
  combine: (v1, v2) => v1 || v2,
}

export const DeltaZoomField: InputField<number> = {
  default: 0,
  combine: Math.max,
}

export const DeltaYawField: InputField<number> = {
  default: 0,
  combine: Math.max,
}

export const DeltaPitchField: InputField<number> = {
  default: 0,
  combine: Math.max,
}

export interface Input {
  get<T>(field: InputField<T>): T | undefined
  dispose?(): void
}

export * from './pointer-lock.js'
export * from './pointer-capture.js'
export * from './keyboard.js'
export * from './screen-joystick.js'
export * from './screen-jump-button.js'
