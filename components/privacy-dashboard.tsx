"use client";

// ============================================================
// ArxMint — Privacy Dashboard Component
// Shows privacy score, layer status, and recommendations
// ============================================================

import { Shield, Check, AlertTriangle } from "lucide-react";
import {
  computePrivacyScore,
  PRIVACY_DESCRIPTIONS,
} from "@/lib/privacy-defaults";
import type { PrivacyConfig } from "@/lib/types";

interface Props {
  config: PrivacyConfig;
}

export function PrivacyDashboard({ config }: Props) {
  const score = computePrivacyScore(config);

  const scoreColor =
    score >= 80
      ? "text-green-400"
      : score >= 50
        ? "text-yellow-400"
        : "text-red-400";

  const scoreRingColor =
    score >= 80
      ? "stroke-green-400"
      : score >= 50
        ? "stroke-yellow-400"
        : "stroke-red-400";

  return (
    <div className="space-y-6">
      {/* Score Ring */}
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              className="text-sovereign-border"
              strokeWidth="2.5"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              className={scoreRingColor}
              strokeWidth="2.5"
              strokeDasharray={`${score}, 100`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${scoreColor}`}>{score}</span>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold text-sovereign-white">
            Privacy Score
          </h3>
          <p className="text-sm text-sovereign-muted mt-1">
            {score >= 80
              ? "Strong privacy posture. Surveillance is expensive."
              : score >= 50
                ? "Good baseline. Consider enabling more layers."
                : "Basic privacy. Enable additional layers for protection."}
          </p>
        </div>
      </div>

      {/* Privacy Layers */}
      <div className="space-y-3">
        {(
          Object.entries(PRIVACY_DESCRIPTIONS) as [
            keyof PrivacyConfig,
            (typeof PRIVACY_DESCRIPTIONS)[keyof PrivacyConfig],
          ][]
        ).map(([key, info]) => {
          const enabled = config[key];

          return (
            <div
              key={key}
              className={`rounded-lg border px-4 py-3 transition-all ${
                enabled
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-sovereign-border bg-sovereign-dark"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {enabled ? (
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-sovereign-muted flex-shrink-0" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-sovereign-white">
                      {info.name}
                    </div>
                    <div className="text-xs text-sovereign-muted">
                      {info.short}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      info.status === "live"
                        ? "bg-green-500/10 text-green-400"
                        : info.status === "maturing"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-blue-500/10 text-blue-400"
                    }`}
                  >
                    {info.status}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      enabled ? "text-green-400" : "text-sovereign-muted"
                    }`}
                  >
                    {enabled ? "ON" : "OFF"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Base layer note */}
      <div className="rounded-lg bg-btc-orange/5 border border-btc-orange/20 px-4 py-3">
        <div className="flex items-start gap-3">
          <Shield className="w-4 h-4 text-btc-orange mt-0.5 flex-shrink-0" />
          <div className="text-xs text-sovereign-muted">
            <span className="text-btc-orange font-medium">Base layer: </span>
            Using Fedimint/Cashu ecash provides strong privacy by default —
            transactions inside the mint are not visible on-chain. The layers
            above add protection for on-chain movements and cross-mint transfers.
          </div>
        </div>
      </div>
    </div>
  );
}
