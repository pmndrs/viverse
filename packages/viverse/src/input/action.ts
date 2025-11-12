// no external imports

export class EventAction<T = void> {
  private latestTime: number = -Infinity
  private readonly subscriptionListeners = new Set<(value: T) => void>()

  emit(value: T): void {
    this.latestTime = performance.now() / 1000
    for (const listener of this.subscriptionListeners) {
      listener(value)
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
}

export type StateActionWriter<T> = { write(value: T): void }

/**
 * StateAction keeps the latest state per writer and merges them on read.
 * Values persist until the writer is disposed (abortSignal aborts).
 */
export class StateAction<T> {
  private readonly absoluteActions = new Map<string, T>()
  constructor(
    private readonly mergeWriters: (...values: Array<T>) => T,
    private readonly neutral: T,
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
    const values = [...this.absoluteActions.values()]
    return values.length ? this.mergeWriters(...values) : this.neutral
  }
}

/**
 * DeltaAction accumulates transient values each frame and clears them on frame advance.
 * Multiple writes per frame from any source are combined using combine().
 */
export class DeltaAction<T> {
  constructor(
    private readonly combine: (...values: Array<T>) => T,
    private readonly neutral: T,
  ) {}

  private readonly readers = new Set<{ next: Array<T>; current: Array<T> }>()

  write(value: T): void {
    for (const reader of this.readers) {
      reader.next.push(value)
    }
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
        if (reader.current.length === 0) {
          return this.neutral
        }
        return this.combine(...reader.current)
      },
    }
  }
}
