export class InputSystem {
  public enabled = true

  private readonly inputs: Array<Input>

  constructor(domElement: HTMLElement, inputs: ReadonlyArray<Input | { new (element: HTMLElement): Input }>) {
    this.inputs = inputs.map((input) => (typeof input === 'function' ? new input(domElement) : input))
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

  destroy(): void {
    this.inputs.forEach((input) => input.destroy?.())
    this.inputs.length = 0
  }

  get<T>(field: InputField<T>): T {
    if (!this.enabled) {
      return field.default
    }
    for (const input of this.inputs) {
      const result = input.get(field)
      if (result === undefined) {
        continue
      }
      return result
    }
    return field.default
  }
}

export type InputField<T> = {
  default: T
}

export const MoveForwardField: InputField<number> = {
  default: 0,
}

export const MoveBackwardField: InputField<number> = {
  default: 0,
}

export const MoveLeftField: InputField<number> = {
  default: 0,
}

export const MoveRightField: InputField<number> = {
  default: 0,
}

export const LastTimeJumpPressedField: InputField<number | null> = {
  default: null,
}

export const RunField: InputField<boolean> = {
  default: false,
}

export const DeltaZoomField: InputField<number> = {
  default: 0,
}

export const DeltaYawField: InputField<number> = {
  default: 0,
}

export const DeltaPitchField: InputField<number> = {
  default: 0,
}

export interface Input {
  get<T>(field: InputField<T>): T | undefined
  destroy?(): void
}

export * from './pointer-lock.js'
export * from './pointer-capture.js'
export * from './keyboard.js'
