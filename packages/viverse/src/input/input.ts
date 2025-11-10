import { EventAction, ValueAction } from './action.js'

export type EventInput<O extends {}> = {
  options?: Partial<O>
  subscribe<T>(
    eventAction: EventAction<T>,
    callback: (value: T) => void,
    options?: { abortSignal?: AbortSignal; once?: boolean } & Partial<O>,
  ): void
  dispose(): void
}

export type ValueInput<O extends {}> = {
  options?: Partial<O>
  get<T>(field: ValueAction<T>, options: Partial<O>): T | undefined
  dispose?(): void
}
