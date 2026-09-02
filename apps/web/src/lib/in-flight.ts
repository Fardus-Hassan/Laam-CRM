/**
 * Share one in-flight Promise per key so parallel callers don't duplicate work.
 */
export function createInFlight<TArgs extends unknown[], TResult>(
  run: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  let pending: Promise<TResult> | null = null;

  return (...args: TArgs) => {
    if (pending) return pending;
    pending = run(...args).finally(() => {
      pending = null;
    });
    return pending;
  };
}
