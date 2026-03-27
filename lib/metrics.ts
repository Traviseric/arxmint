// ============================================================
// ArxMint — In-process Prometheus metrics
//
// Lightweight counter/gauge registry that emits Prometheus
// text-format output. Consumed by GET /api/metrics so that
// the Prometheus scraper can collect arxmint-specific signals.
//
// Limitation: counters reset on process restart (serverless
// cold start). For durable counters, swap in prom-client +
// a persistent store (Redis, Supabase).
// ============================================================

type Labels = Record<string, string>;

interface MetricMeta {
  help: string;
  type: "counter" | "gauge";
  values: Map<string, number>; // serialised label set → value
}

// ---- Registry ----

const _registry = new Map<string, MetricMeta>();

function _labelKey(labels: Labels): string {
  const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return "";
  return "{" + entries.map(([k, v]) => `${k}="${v}"`).join(",") + "}";
}

function _ensure(name: string, type: "counter" | "gauge", help: string): MetricMeta {
  if (!_registry.has(name)) {
    _registry.set(name, { help, type, values: new Map() });
  }
  return _registry.get(name)!;
}

// ---- Public API ----

/**
 * Increment a counter by 1.
 */
export function incCounter(name: string, labels: Labels = {}, help = name): void {
  const entry = _ensure(name, "counter", help);
  const key = _labelKey(labels);
  entry.values.set(key, (entry.values.get(key) ?? 0) + 1);
}

/**
 * Set a gauge to an absolute value.
 */
export function setGauge(name: string, value: number, labels: Labels = {}, help = name): void {
  const entry = _ensure(name, "gauge", help);
  entry.values.set(_labelKey(labels), value);
}

/**
 * Declare a metric with metadata only (no value yet).
 * Ensures the metric appears in /api/metrics output even before
 * any data is recorded.
 */
export function declareMetric(
  name: string,
  type: "counter" | "gauge",
  help: string
): void {
  _ensure(name, type, help);
}

/**
 * Serialise the full registry as Prometheus text format (exposition format 0.0.4).
 */
export function getMetricsText(): string {
  const lines: string[] = [];
  for (const [name, entry] of _registry.entries()) {
    lines.push(`# HELP ${name} ${entry.help}`);
    lines.push(`# TYPE ${name} ${entry.type}`);
    for (const [labelKey, value] of entry.values.entries()) {
      lines.push(`${name}${labelKey} ${value}`);
    }
    // Emit a zero line if no values yet, so the metric is always present
    if (entry.values.size === 0) {
      lines.push(`${name} 0`);
    }
  }
  return lines.join("\n") + "\n";
}

// ---- Named metric constants ----
// Import alongside incCounter/setGauge to avoid magic strings.

export const METRIC_WEBHOOK_FAILURES = "arxmint_webhook_failures_total";
export const METRIC_PENDING_SESSIONS = "arxmint_pending_sessions_count";

// Pre-declare so both metrics always appear in /api/metrics output.
declareMetric(METRIC_WEBHOOK_FAILURES, "counter", "Total webhook delivery failures after all retry attempts exhausted");
declareMetric(METRIC_PENDING_SESSIONS, "gauge",   "Current number of pending (unpaid) checkout sessions");
