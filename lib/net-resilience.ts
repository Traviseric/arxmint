// ============================================================
// ArxMint - Network resilience helpers
// Timeout + bounded retry with jitter + lightweight circuit breaker.
// ============================================================

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircuitOpenError";
  }
}

interface CircuitState {
  failureCount: number;
  openUntilMs: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
}

export interface CircuitConfig {
  failureThreshold: number;
  openMs: number;
}

export interface ResilientFetchOptions {
  timeoutMs: number;
  retry?: Partial<RetryConfig>;
  circuitKey?: string;
  circuit?: Partial<CircuitConfig>;
}

const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 150,
  maxDelayMs: 2_000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

const DEFAULT_CIRCUIT: CircuitConfig = {
  failureThreshold: 5,
  openMs: 30_000,
};

const circuits = new Map<string, CircuitState>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number, retry: RetryConfig): number {
  const exp = Math.min(retry.maxDelayMs, retry.baseDelayMs * 2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(exp * 0.2)));
  return exp + jitter;
}

function markCircuitSuccess(key?: string): void {
  if (!key) return;
  circuits.delete(key);
}

function markCircuitFailure(
  key: string | undefined,
  circuit: CircuitConfig
): void {
  if (!key) return;
  const now = Date.now();
  const current = circuits.get(key) ?? { failureCount: 0, openUntilMs: 0 };
  const nextFailureCount = current.failureCount + 1;
  const openUntilMs =
    nextFailureCount >= circuit.failureThreshold ? now + circuit.openMs : 0;
  circuits.set(key, {
    failureCount: nextFailureCount,
    openUntilMs,
  });
}

function assertCircuitAllowsRequest(
  key: string | undefined
): void {
  if (!key) return;
  const current = circuits.get(key);
  if (!current) return;
  const now = Date.now();
  if (current.openUntilMs > now) {
    throw new CircuitOpenError(
      `Circuit "${key}" is open for another ${current.openUntilMs - now}ms`
    );
  }
  if (current.openUntilMs > 0 && current.openUntilMs <= now) {
    circuits.set(key, { failureCount: 0, openUntilMs: 0 });
  }
}

function withTimeoutSignal(timeoutMs: number, parent?: AbortSignal | null): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const onParentAbort = () => controller.abort();
  if (parent) {
    if (parent.aborted) controller.abort();
    else parent.addEventListener("abort", onParentAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      if (parent) parent.removeEventListener("abort", onParentAbort);
    },
  };
}

function isRetryableResponse(status: number, retry: RetryConfig): boolean {
  return retry.retryableStatuses.includes(status);
}

export async function resilientFetch(
  url: string,
  init: RequestInit = {},
  options: ResilientFetchOptions
): Promise<Response> {
  const retry: RetryConfig = { ...DEFAULT_RETRY, ...(options.retry ?? {}) };
  const circuit: CircuitConfig = { ...DEFAULT_CIRCUIT, ...(options.circuit ?? {}) };
  const circuitKey = options.circuitKey;

  assertCircuitAllowsRequest(circuitKey);

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= retry.maxAttempts; attempt++) {
    const { signal, cleanup } = withTimeoutSignal(options.timeoutMs, init.signal);

    try {
      const response = await fetch(url, { ...init, signal });
      cleanup();

      if (response.ok) {
        markCircuitSuccess(circuitKey);
        return response;
      }

      if (!isRetryableResponse(response.status, retry) || attempt === retry.maxAttempts) {
        if (response.status >= 500) {
          markCircuitFailure(circuitKey, circuit);
        } else {
          markCircuitSuccess(circuitKey);
        }
        return response;
      }

      await sleep(backoffDelay(attempt, retry));
      continue;
    } catch (error) {
      cleanup();
      lastError = error;
      if (attempt === retry.maxAttempts) {
        markCircuitFailure(circuitKey, circuit);
        throw error;
      }
      await sleep(backoffDelay(attempt, retry));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("resilientFetch failed without explicit error");
}
