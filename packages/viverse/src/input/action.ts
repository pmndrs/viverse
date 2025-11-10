export type ValueAction<T> = {
  default: T
  combine: (v1: any, v2: any) => T
}

export type EventAction<T> = {
  _typeExample?: T
}

export function defaultValueActionCombine(v1: unknown, v2: unknown): any {
  if (typeof v1 === 'number' && typeof v2 === 'number') {
    return Math.max(v1, v2)
  }
  if (typeof v1 === 'boolean' && typeof v2 === 'boolean') {
    return v1 || v2
  }
  throw new Error(`unable to infer a reasonable default combine method for the value ${v1} and ${v2}`)
}

export function createValueAction<T>(
  defaultValue: T,
  combine: (v1: any, v2: any) => T = defaultValueActionCombine,
): ValueAction<T> {
  return {
    default: defaultValue,
    combine,
  }
}
export function createEventAction<T = unknown>(): EventAction<T> {
  return {}
}
