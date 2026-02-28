"use client";

// ============================================================
// ArxMint — NUT-13 Seed Phrase Backup UI
// Shows the 12-word BIP39 mnemonic for offline backup.
// Includes a word-confirmation step to verify the user wrote
// it down correctly before marking as backed up.
// ============================================================

import { useState, useMemo } from "react";
import { Shield, Eye, EyeOff, Check, RefreshCw } from "lucide-react";

interface SeedBackupProps {
  /** 12-word BIP39 mnemonic from VaultManager.create() */
  mnemonic: string[];
  /** Called after the user successfully verifies 3 words */
  onConfirmed: () => void;
  /** Optional: called if user wants to dismiss without confirming */
  onDismiss?: () => void;
}

type Step = "show" | "verify" | "done";

/** Pick N unique indices from [0, length) */
function pickRandom(length: number, count: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count).sort((a, b) => a - b);
}

export function SeedBackup({ mnemonic, onConfirmed, onDismiss }: SeedBackupProps) {
  const [step, setStep] = useState<Step>("show");
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Pick 3 word positions to verify (stable per session)
  const verifyPositions = useMemo(() => pickRandom(mnemonic.length, 3), [mnemonic.length]);

  const handleVerify = () => {
    setError(null);
    for (const pos of verifyPositions) {
      const entered = (answers[pos] ?? "").trim().toLowerCase();
      const expected = mnemonic[pos].toLowerCase();
      if (entered !== expected) {
        setError(
          `Word #${pos + 1} is incorrect. Check your backup and try again.`
        );
        return;
      }
    }
    setStep("done");
    onConfirmed();
  };

  if (step === "done") {
    return (
      <div className="sovereign-card p-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check className="h-6 w-6 text-green-400" />
          </div>
        </div>
        <h2 className="text-base font-semibold text-sovereign-text mb-2">
          Wallet Backed Up
        </h2>
        <p className="text-sm text-sovereign-muted">
          Your seed phrase is verified. Keep it safe and offline.
        </p>
      </div>
    );
  }

  return (
    <div className="sovereign-card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-btc-orange flex-shrink-0" />
        <h2 className="text-base font-semibold text-sovereign-text">
          {step === "show" ? "Back Up Your Wallet" : "Verify Your Backup"}
        </h2>
      </div>

      {step === "show" && (
        <>
          <p className="text-sm text-sovereign-muted">
            Write down these {mnemonic.length} words in order. They are the{" "}
            <span className="text-btc-orange font-medium">only way to recover</span>{" "}
            your wallet if you lose your passphrase or device.
          </p>

          {/* Reveal toggle */}
          <button
            onClick={() => setRevealed((r) => !r)}
            className="sovereign-btn-outline !py-1.5 !text-xs flex items-center gap-1.5"
          >
            {revealed ? (
              <><EyeOff className="h-3.5 w-3.5" /> Hide Words</>
            ) : (
              <><Eye className="h-3.5 w-3.5" /> Reveal Seed Phrase</>
            )}
          </button>

          {/* 12-word grid */}
          <div className="grid grid-cols-3 gap-2">
            {mnemonic.map((word, i) => (
              <div
                key={i}
                className="sovereign-panel rounded px-3 py-2 flex items-center gap-1.5"
              >
                <span className="text-xs text-sovereign-muted select-none">{i + 1}.</span>
                <span className={`text-sm font-mono text-sovereign-text transition-all ${revealed ? "" : "blur-sm select-none"}`}>
                  {word}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="sovereign-btn-outline !py-2 text-sm flex-1"
              >
                Skip for Now
              </button>
            )}
            <button
              onClick={() => { setRevealed(true); setStep("verify"); }}
              className="sovereign-btn !py-2 text-sm flex-1"
            >
              I&apos;ve Written These Down →
            </button>
          </div>
        </>
      )}

      {step === "verify" && (
        <>
          <p className="text-sm text-sovereign-muted">
            Enter the requested words to confirm your backup is correct.
          </p>

          <div className="space-y-3">
            {verifyPositions.map((pos) => (
              <div key={pos} className="flex items-center gap-3">
                <span className="text-sm text-sovereign-muted w-16 flex-shrink-0">
                  Word #{pos + 1}
                </span>
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={answers[pos] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [pos]: e.target.value }))
                  }
                  placeholder="enter word..."
                  className="sovereign-input text-sm font-mono flex-1"
                />
              </div>
            ))}
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => { setAnswers({}); setError(null); setStep("show"); }}
              className="sovereign-btn-outline !py-2 text-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleVerify}
              className="sovereign-btn !py-2 text-sm flex-1"
            >
              Confirm Backup
            </button>
          </div>
        </>
      )}
    </div>
  );
}
