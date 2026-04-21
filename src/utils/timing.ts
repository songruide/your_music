type AnyFunction = (...args: any[]) => any

export interface ControlledFunction<T extends AnyFunction> {
  (...args: Parameters<T>): void
  cancel(): void
  flush(): ReturnType<T> | undefined
}

function clampDelay(delay: number) {
  return Math.max(0, delay)
}

export function debounce<T extends AnyFunction>(callback: T, wait: number): ControlledFunction<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastArgs: Parameters<T> | undefined
  let lastThis: ThisParameterType<T> | undefined
  let lastResult: ReturnType<T> | undefined

  function invoke() {
    if (!lastArgs) {
      return lastResult
    }

    const args = lastArgs
    const thisArg = lastThis

    lastArgs = undefined
    lastThis = undefined
    lastResult = callback.apply(thisArg, args)

    return lastResult
  }

  const debounced = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    lastArgs = args
    lastThis = this

    if (timer !== undefined) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      timer = undefined
      invoke()
    }, clampDelay(wait))
  } as ControlledFunction<T>

  debounced.cancel = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }

    lastArgs = undefined
    lastThis = undefined
  }

  debounced.flush = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }

    return invoke()
  }

  return debounced
}

export function throttle<T extends AnyFunction>(callback: T, wait: number): ControlledFunction<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastArgs: Parameters<T> | undefined
  let lastThis: ThisParameterType<T> | undefined
  let lastInvokeTime = 0
  let lastResult: ReturnType<T> | undefined

  function invoke(now: number) {
    if (!lastArgs) {
      return lastResult
    }

    const args = lastArgs
    const thisArg = lastThis

    lastArgs = undefined
    lastThis = undefined
    lastInvokeTime = now
    lastResult = callback.apply(thisArg, args)

    return lastResult
  }

  const throttled = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const now = Date.now()

    lastArgs = args
    lastThis = this

    const remaining = clampDelay(wait) - (now - lastInvokeTime)

    if (lastInvokeTime === 0 || remaining <= 0) {
      if (timer !== undefined) {
        clearTimeout(timer)
        timer = undefined
      }

      invoke(now)
      return
    }

    if (timer !== undefined) {
      return
    }

    timer = setTimeout(() => {
      timer = undefined
      invoke(Date.now())
    }, remaining)
  } as ControlledFunction<T>

  throttled.cancel = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }

    lastArgs = undefined
    lastThis = undefined
    lastInvokeTime = 0
  }

  throttled.flush = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
      return invoke(Date.now())
    }

    return lastResult
  }

  return throttled
}
