import { EventAction, ValueAction } from './action.js'
import { EventInput, ValueInput } from './input.js'

export class InputSystem {
  public options: unknown

  public readonly inputs: Array<EventInput | ValueInput> = []

  constructor() {}

  add(input: EventInput | ValueInput): void {
    this.inputs.push(input as any)
  }

  remove(input: EventInput | ValueInput): void {
    const index = this.inputs.indexOf(input)
    if (index != -1) {
      this.inputs.splice(index, 1)
    }
  }

  dispose(): void {
    this.inputs.forEach((input) => input.dispose?.())
    this.inputs.length = 0
  }

  waitFor<T>(eventAction: EventAction<T>, abortSignal?: AbortSignal) {
    return new Promise<T>((resolve) => this.subscribe(eventAction, resolve, { once: true, abortSignal }))
  }

  subscribe<T>(
    eventAction: EventAction<T>,
    callback: (value: T) => void,
    options?: { abortSignal?: AbortSignal; once?: boolean },
  ): void {
    for (const input of this.inputs) {
      if (!('subscribe' in input)) {
        continue
      }
      input.subscribe(eventAction, callback, options)
    }
  }

  get<T>(field: ValueAction<T>): T {
    let current: T | undefined
    for (const input of this.inputs) {
      if (!('get' in input)) {
        continue
      }
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
