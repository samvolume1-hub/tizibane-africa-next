// Bound Supabase network waits so an unavailable connection cannot leave a route
// waiting indefinitely. Callers still receive normal fetch responses/errors.
const SUPABASE_REQUEST_TIMEOUT_MS = 20_000;

export const supabaseFetch: typeof fetch = async (input, init = {}) => {
  const controller = new AbortController();
  const parentSignal = init.signal;
  const abortFromParent = () => controller.abort(parentSignal?.reason);

  if (parentSignal?.aborted) {
    abortFromParent();
  } else {
    parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  }

  const timeout = setTimeout(() => {
    controller.abort(new Error(`Supabase request timed out after ${SUPABASE_REQUEST_TIMEOUT_MS}ms`));
  }, SUPABASE_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", abortFromParent);
  }
};
