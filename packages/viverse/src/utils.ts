function shallowEqual<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

const cacheMap = new Map<Function, Array<{ deps: ReadonlyArray<unknown>; result: Promise<unknown> }>>()

export function cached<D extends ReadonlyArray<unknown>, T>(fn: (...deps: D) => Promise<T>, dependencies: D): Promise<T> {
  let cache = cacheMap.get(fn)
  if (cache == null) {
    cacheMap.set(fn, (cache = []))
  }
  const entry = cache.find(({ deps }) => shallowEqual(deps, dependencies))
  if (entry != null) {
    return entry.result as Promise<T>
  }
  const result = fn(...dependencies)
  cache.push({ deps: dependencies, result })
  return result
}

export function clearCache(fn: Function, dependencies: Array<unknown>) {
  const cache = cacheMap.get(fn)
  if (cache == null) {
    return
  }
  const index = cache.findIndex(({ deps }) => shallowEqual(deps, dependencies))
  if (index === -1) {
    return
  }
  cache.splice(index, 1)
}
