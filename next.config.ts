import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["nostr-tools"],
  webpack(config) {
    // Enable WASM for Fedimint SDK
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    // Fedimint's WASM worker emits async code; declare support explicitly.
    config.output = {
      ...config.output,
      environment: {
        ...(config.output?.environment ?? {}),
        asyncFunction: true,
      },
    };
    return config;
  },
  // Headers for security hardening
  // NOTE: COOP/COEP headers removed — they block Vercel serverless function execution
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const swHeader = {
      source: "/sw.js",
      headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
    };
    const cspReportOnlyEnabled =
      isProd && process.env.CSP_REPORT_ONLY !== "false";
    const strictReportOnlyCsp = [
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval'",
      "style-src 'self'",
      "img-src 'self' data: blob:",
      "connect-src 'self' ws: wss: https:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "report-uri /api/csp-report",
    ].join("; ");
    return [
      swHeader,
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // HSTS: only in production (breaks localhost dev)
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
          // Content-Security-Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js inline runtime currently requires 'unsafe-inline';
              // use wasm-unsafe-eval (narrower than unsafe-eval) for WASM execution.
              "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              // WebSocket for Next.js HMR in dev, and LNC WebSocket in prod
              "connect-src 'self' ws: wss: https:",
              // WASM requires blob: for worker scripts
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          ...(cspReportOnlyEnabled
            ? [
                {
                  key: "Content-Security-Policy-Report-Only",
                  value: strictReportOnlyCsp,
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
