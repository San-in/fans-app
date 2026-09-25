export const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, Math.max(0, milliseconds))
  })

export const withTimeout = <T>(
  promise: Promise<T>,
  milliseconds: number,
  createTimeoutError: () => Error
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(createTimeoutError()), milliseconds)
    promise.then(
      (value) => {
        clearTimeout(timeoutId)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timeoutId)
        reject(error)
      }
    )
  })
