"use client";

// ============================================================
// ArxMint — NUT-13 Seed Phrase Restore UI
// Allows users to recover their Cashu vault from a 12-word
// BIP39 seed phrase via NUT-09 proof sweep.
// ============================================================

import { useState } from "react";
import { RefreshCw, Loader2, Plus, X, AlertCircle, Check } from "lucide-react";

interface SeedRestoreProps {
  /** Called after successful restore */
  onRestored: () => void;
  /** Optional: called to dismiss/cancel */
  onDismiss?: () => void;
}

const DEFAULT_MINT = "http://localhost:3338";

export function SeedRestore({ onRestored, onDismiss }: SeedRestoreProps) {
  const [words, setWords] = useState<string[]>(Array(12).fill(""));
  const [mintUrls, setMintUrls] = useState<string[]>([DEFAULT_MINT]);
  const [newMint, setNewMint] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const updateWord = (index: number, value: string) => {
    // Support pasting full mnemonic into the first field
    const trimmed = value.trim();
    const parts = trimmed.split(/\s+/);
    if (index === 0 && parts.length >= 12) {
      setWords(parts.slice(0, 12).map((w) => w.toLowerCase()));
      return;
    }
    setWords((prev) => {
      const next = [...prev];
      next[index] = value.toLowerCase().replace(/[^a-z]/g, "");
      return next;
    });
  };

  const addMint = () => {
    const url = newMint.trim();
    if (!url || mintUrls.includes(url)) return;
    setMintUrls((prev) => [...prev, url]);
    setNewMint("");
  };

  const removeMint = (url: string) => {
    setMintUrls((prev) => prev.filter((u) => u !== url));
  };

  const handleRestore = async () => {
    const mnemonic = words.join(" ").trim();
    if (words.some((w) => !w)) {
      setStatus("error");
      setMessage("Please enter all 12 words.");
      return;
    }
    if (mintUrls.length === 0) {
      setStatus("error");
      setMessage("Add at least one mint URL to restore from.");
      return;
    }

    setStatus("loading");
    setMessage("Restoring vault from seed phrase…");

    try {
      // Dynamic import to avoid SSR issues (vault is 'use client')
      const { vault } = await import("@/lib/cashu-vault");
      await vault.restoreFromSeed(mnemonic, mintUrls);
      setStatus("success");
      setMessage("Vault restored! Your proofs are being recovered via NUT-09.");
      onRestored();
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Restore failed — check your seed phrase and try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="sovereign-card p-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check className="h-6 w-6 text-green-400" />
          </div>
        </div>
        <h2 className="text-base font-semibold text-sovereign-text mb-2">
          Vault Restored
        </h2>
        <p className="text-sm text-sovereign-muted">{message}</p>
      </div>
    );
  }

  return (
    <div className="sovereign-card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-btc-orange flex-shrink-0" />
          <h2 className="text-base font-semibold text-sovereign-text">
            Restore Wallet from Seed Phrase
          </h2>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-sovereign-muted hover:text-sovereign-text">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="text-sm text-sovereign-muted">
        Enter your 12-word seed phrase to restore your Cashu vault. You can also paste
        all words into the first field.
      </p>

      {/* 12-word input grid */}
      <div className="grid grid-cols-3 gap-2">
        {words.map((word, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span
              id={`restore-word-label-${i}`}
              className="text-xs text-sovereign-muted w-5 text-right select-none"
            >
              {i + 1}.
            </span>
            <input
              type="text"
              autoComplete="off"
              spellCheck={false}
              aria-labelledby={`restore-word-label-${i}`}
              aria-label={`Word ${i + 1} of 12 (required)`}
              aria-required="true"
              value={word}
              onChange={(e) => updateWord(i, e.target.value)}
              onKeyDown={(e) => {
                // Tab to next word
                if (e.key === " " || e.key === "Tab") {
                  e.preventDefault();
                  const next = document.querySelectorAll<HTMLInputElement>(
                    "[data-seed-word]"
                  )[i + 1];
                  next?.focus();
                }
              }}
              data-seed-word={i}
              placeholder={`word ${i + 1}`}
              className="sovereign-input text-xs font-mono !py-1.5 flex-1 min-w-0"
            />
          </div>
        ))}
      </div>

      {/* Mint URLs */}
      <div className="space-y-2">
        <p className="text-xs text-sovereign-muted">
          Cashu Mint URLs (NUT-09 restore)
          <span aria-hidden="true" className="text-btc-orange ml-1">*</span>
          <span className="sr-only">(at least one required)</span>
        </p>
        {mintUrls.map((url) => (
          <div key={url} className="flex items-center gap-2">
            <span className="text-xs font-mono text-sovereign-text flex-1 truncate sovereign-panel rounded px-2 py-1">
              {url}
            </span>
            <button
              onClick={() => removeMint(url)}
              className="text-sovereign-muted hover:text-red-400 flex-shrink-0"
              title="Remove mint"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            type="text"
            value={newMint}
            onChange={(e) => setNewMint(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMint()}
            placeholder="https://mint.example.com"
            className="sovereign-input text-xs font-mono flex-1"
          />
          <button
            onClick={addMint}
            disabled={!newMint.trim()}
            className="sovereign-btn-outline !py-1.5 !px-2 flex-shrink-0"
            title="Add mint"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Error message */}
      {status === "error" && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {onDismiss && (
          <button onClick={onDismiss} className="sovereign-btn-outline !py-2 text-sm flex-1">
            Cancel
          </button>
        )}
        <button
          onClick={handleRestore}
          disabled={status === "loading"}
          className="sovereign-btn !py-2 text-sm flex-1 flex items-center justify-center gap-2"
        >
          {status === "loading" ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Restoring…</>
          ) : (
            <><RefreshCw className="h-3.5 w-3.5" /> Restore Wallet</>
          )}
        </button>
      </div>
    </div>
  );
}
