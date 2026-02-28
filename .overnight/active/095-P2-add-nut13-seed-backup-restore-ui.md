---
id: 95
title: "Add NUT-13 seed phrase backup and restore UI"
priority: P2
severity: high
status: completed
source: overnight_tasks_id_26
file: lib/cashu-vault.ts
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: cashu_vault
group_reason: "Depends on task 074 (Cashu vault). Provides primary money-loss prevention."
---

# Add NUT-13 seed phrase backup and restore UI

**Priority:** P2 (high)
**Source:** OVERNIGHT_TASKS.md ID 26
**Location:** lib/cashu-vault.ts, new UI components

## Problem

Research #5: NUT-13 seed phrase is the PRIMARY money-loss prevention mechanism. Without it, a vault passphrase loss or device failure means ALL Cashu proofs are lost permanently. ArxMint has no seed phrase backup flow — users are not protected against device loss.

The vault (task 074) generates a 12-word BIP39 mnemonic during creation, but there's no UI to:
1. Show the user their seed phrase during setup
2. Verify they wrote it down (word confirmation flow)
3. Restore proofs from the seed phrase via NUT-09

## How to Fix

### Backup UI — `components/seed-backup.tsx`

```tsx
'use client';
import { useState } from 'react';

interface SeedBackupProps {
  mnemonic: string[];  // 12 words from VaultManager.create()
  onConfirmed: () => void;
}

export function SeedBackup({ mnemonic, onConfirmed }: SeedBackupProps) {
  const [step, setStep] = useState<'show' | 'verify'>('show');
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  // Step 1: "Write down these 12 words in order"
  // Step 2: Ask user to confirm 3 random words by position
  // Step 3: Mark as backed up, call onConfirmed()
  return (
    <div className="sovereign-card p-6">
      {step === 'show' && (
        <>
          <h2 className="text-lg font-semibold text-sovereign-text mb-4">
            Back Up Your Wallet
          </h2>
          <p className="text-sovereign-muted text-sm mb-4">
            Write down these 12 words in order. They are the only way to recover your wallet if you lose your passphrase or device.
          </p>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {mnemonic.map((word, i) => (
              <div key={i} className="sovereign-panel rounded px-3 py-2 text-sm">
                <span className="text-sovereign-muted">{i + 1}.</span>{' '}
                <span className="text-sovereign-text font-mono">{word}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setStep('verify')} className="sovereign-btn w-full">
            I've Written These Down →
          </button>
        </>
      )}
      {step === 'verify' && (
        /* Word confirmation flow */
        <div>Verify step...</div>
      )}
    </div>
  );
}
```

### Restore UI — `components/seed-restore.tsx`

```tsx
'use client';
export function SeedRestore({ onRestored }: { onRestored: () => void }) {
  const [words, setWords] = useState(Array(12).fill(''));
  const [mintUrls, setMintUrls] = useState(['http://localhost:3338']);
  const [restoring, setRestoring] = useState(false);

  async function handleRestore() {
    setRestoring(true);
    const vault = (await import('@/lib/cashu-vault')).vault;
    await vault.restoreFromSeed(words.join(' '), mintUrls);
    onRestored();
  }

  return (
    <div className="sovereign-card p-6">
      <h2>Restore Wallet from Seed Phrase</h2>
      {/* 12 word input grid */}
      {/* Mint URL input */}
      {/* Restore button */}
    </div>
  );
}
```

### Check NUT-09 support before showing restore

```typescript
// In lib/cashu-vault.ts restoreFromSeed()
const info = await mint.getInfo();
if (!info.nuts[9]) {
  throw new Error(`Mint ${mintUrl} does not support NUT-09 restore`);
}
// Restore in batches of 100
```

### Wire into wallet setup flow

- Show `SeedBackup` after vault creation in wallet panel
- Add "Restore Wallet" link to login page that opens `SeedRestore`

## Acceptance Criteria

- [ ] `components/seed-backup.tsx` created with 12-word display + verification flow
- [ ] `components/seed-restore.tsx` created with 12-word input + mint URL + restore button
- [ ] NUT-09 support checked before restore attempt
- [ ] Restore fetches proofs in batches of 100 per NUT-09 spec
- [ ] Backup flow integrated into wallet setup
- [ ] Restore link available from login/wallet page
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 26. Depends on task 074 (Cashu vault) which implements `vault.restoreFromSeed()`. Primary money-loss prevention feature._
