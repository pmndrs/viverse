export type WriteonlyEventAction<T = void> = { emit(value: T): void }

export class EventAction<T = unknown> implements WriteonlyEventAction<T> {
  private latestTime: number = -Infinity
  private readonly subscriptionListeners = new Set<(value: T) => void>()
  private readonly readers = new Set<{ next: Array<T>; current: Array<T> }>()

  constructor(
    private readonly combine?: (...values: Array<T>) => T,
    private readonly neutral?: T,
  ) {}

  emit(value: T): void {
    this.latestTime = performance.now() / 1000
    for (const listener of this.subscriptionListeners) {
      listener(value)
    }
    for (const reader of this.readers) {
      reader.next.push(value)
    }
  }

  subscribe(callback: (value: T) => void, options?: { once?: true; signal?: AbortSignal }): void {
    const listener = (value: T) => {
      if (options?.once === true) {
        this.subscriptionListeners.delete(listener)
      }
      callback(value)
    }
    this.subscriptionListeners.add(listener)
    if (options?.signal != null) {
      options.signal.addEventListener('abort', () => this.subscriptionListeners.delete(listener), { once: true })
    }
  }

  waitFor(signal?: AbortSignal): Promise<T> {
    return new Promise((resolve) => this.subscribe(resolve, { once: true, signal }))
  }

  getLatestTime(): number {
    return this.latestTime
  }

  createReader(abortSignal: AbortSignal): { update(): void; get(): T } {
    const reader = { next: new Array<T>(), current: new Array<T>() }
    this.readers.add(reader)
    abortSignal.addEventListener(
      'abort',
      () => {
        this.readers.delete(reader)
      },
      { once: true },
    )
    return {
      update: () => {
        reader.current.length = 0
        if (reader.next.length) {
          reader.current.push(...reader.next)
          reader.next.length = 0
        }
      },
      get: () => {
        if (this.combine == null) {
          throw new Error(`unable to use a reader without providing a combine function`)
        }
        if (reader.current.length === 0) {
          return this.neutral!
        }
        return this.combine(...reader.current)
      },
    }
  }

  mapFrom<S>(fn: (value: S) => T, abortSignal?: AbortSignal): EventAction<S> {
    const action = new EventAction<S>()
    action.subscribe((value) => this.emit(fn(value)), { signal: abortSignal })
    return action
  }

  filterFrom(fn: (value: T) => boolean, abortSignal?: AbortSignal): EventAction<T> {
    const action = new EventAction<T>()
    action.subscribe((value) => void (fn(value) && this.emit(value)), { signal: abortSignal })
    return action
  }
}

export type StateActionWriter<T> = { write(value: T): void }

/**
 * StateAction keeps the latest state per writer and merges them on read.
 * Values persist until the writer is disposed (abortSignal aborts).
 */
export class StateAction<T = unknown> {
  private readonly absoluteActions = new Map<string, T>()
  constructor(
    private readonly mergeWriters?: (...values: Array<T>) => T,
    private readonly neutral?: T,
  ) {}

  createWriter(abortSignal: AbortSignal): StateActionWriter<T> {
    const emitterUuid = (globalThis as any).crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
    abortSignal.addEventListener('abort', () => this.absoluteActions.delete(emitterUuid), { once: true })
    return {
      write: (value) => {
        if (!abortSignal.aborted) {
          this.absoluteActions.set(emitterUuid, value)
        }
      },
    }
  }

  get(): T {
    if (this.mergeWriters == null) {
      throw new Error(`unable to read from a state action without providing a merge function`)
    }
    const values = [...this.absoluteActions.values()]
    return values.length ? this.mergeWriters(...values) : this.neutral!
  }

  mapFrom<S>(fn: (value: S) => T): StateAction<S> {
    const action = new StateAction<S>()
    action.createWriter = (abortSignal) => {
      const writer = this.createWriter(abortSignal)
      return {
        write: (value) => writer.write(fn(value)),
      }
    }
    return action
  }
}
