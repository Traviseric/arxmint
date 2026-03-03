// ============================================================
// ArxMint - In-memory RED metrics (Rate, Errors, Duration)
// ============================================================

export interface RouteRedMetric {
  route: string;
  method: string;
  requests: number;
  errors: number;
  totalDurationMs: number;
  avgDurationMs: number;
  p95DurationMs: number;
  status2xx: number;
  status4xx: number;
  status5xx: number;
  lastUpdated: string;
}

interface InternalRouteMetric {
  requests: number;
  errors: number;
  totalDurationMs: number;
  durations: number[];
  status2xx: number;
  status4xx: number;
  status5xx: number;
  lastUpdatedMs: number;
}

const MAX_DURATION_SAMPLES = 300;
const routeMetrics = new Map<string, InternalRouteMetric>();

function routeKey(route: string, method: string): string {
  return `${method.toUpperCase()} ${route}`;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

export function recordRedMetric(params: {
  route: string;
  method: string;
  status: number;
  durationMs: number;
}): void {
  const key = routeKey(params.route, params.method);
  const now = Date.now();
  const current =
    routeMetrics.get(key) ??
    {
      requests: 0,
      errors: 0,
      totalDurationMs: 0,
      durations: [],
      status2xx: 0,
      status4xx: 0,
      status5xx: 0,
      lastUpdatedMs: now,
    };

  current.requests += 1;
  if (params.status >= 500) current.errors += 1;
  current.totalDurationMs += params.durationMs;
  current.durations.push(params.durationMs);
  if (current.durations.length > MAX_DURATION_SAMPLES) {
    current.durations.shift();
  }

  if (params.status >= 500) current.status5xx += 1;
  else if (params.status >= 400) current.status4xx += 1;
  else if (params.status >= 200) current.status2xx += 1;

  current.lastUpdatedMs = now;
  routeMetrics.set(key, current);
}

export function getRedMetricsSnapshot(): {
  generatedAt: string;
  routes: RouteRedMetric[];
} {
  const routes: RouteRedMetric[] = [];
  for (const [key, value] of routeMetrics.entries()) {
    const [method, ...routeParts] = key.split(" ");
    const route = routeParts.join(" ");
    routes.push({
      route,
      method,
      requests: value.requests,
      errors: value.errors,
      totalDurationMs: value.totalDurationMs,
      avgDurationMs:
        value.requests > 0
          ? Math.round((value.totalDurationMs / value.requests) * 100) / 100
          : 0,
      p95DurationMs: percentile(value.durations, 95),
      status2xx: value.status2xx,
      status4xx: value.status4xx,
      status5xx: value.status5xx,
      lastUpdated: new Date(value.lastUpdatedMs).toISOString(),
    });
  }
  routes.sort((a, b) => a.route.localeCompare(b.route) || a.method.localeCompare(b.method));
  return {
    generatedAt: new Date().toISOString(),
    routes,
  };
}

