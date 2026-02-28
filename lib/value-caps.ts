// ============================================================
// ArxMint — Pilot Value Caps
// Enforces maximum wallet balance, transaction size, and daily
// volume to limit exposure during the Longmont pilot phase.
// All caps are configurable via environment variables.
// ============================================================

export interface ValueCaps {
  maxWalletBalance: number; // sats
  maxSingleTx: number;      // sats
  maxDailyVolume: number;   // sats
}

export function getValueCaps(): ValueCaps {
  return {
    maxWalletBalance: parseInt(
      process.env.MAX_WALLET_BALANCE_SATS ?? "50000",
      10
    ),
    maxSingleTx: parseInt(process.env.MAX_SINGLE_TX_SATS ?? "10000", 10),
    maxDailyVolume: parseInt(
      process.env.MAX_DAILY_VOLUME_SATS ?? "100000",
      10
    ),
  };
}

export class ValueCapError extends Error {
  constructor(
    public readonly cap: keyof ValueCaps,
    message: string
  ) {
    super(message);
    this.name = "ValueCapError";
  }
}

/** Throw if a single transaction exceeds the configured cap */
export function checkSingleTxCap(amountSats: number): void {
  const caps = getValueCaps();
  if (amountSats > caps.maxSingleTx) {
    throw new ValueCapError(
      "maxSingleTx",
      `Transaction amount ${amountSats} sats exceeds pilot limit of ${caps.maxSingleTx} sats`
    );
  }
}

/** Throw if today's volume plus the additional amount would exceed the daily cap */
export function checkDailyVolumeCap(
  todayVolumeSats: number,
  additionalSats: number
): void {
  const caps = getValueCaps();
  if (todayVolumeSats + additionalSats > caps.maxDailyVolume) {
    throw new ValueCapError(
      "maxDailyVolume",
      `Daily volume limit of ${caps.maxDailyVolume} sats would be exceeded`
    );
  }
}

/** Throw if the current wallet balance exceeds the cap */
export function checkWalletBalanceCap(currentBalanceSats: number): void {
  const caps = getValueCaps();
  if (currentBalanceSats > caps.maxWalletBalance) {
    throw new ValueCapError(
      "maxWalletBalance",
      `Wallet balance ${currentBalanceSats} sats exceeds pilot limit of ${caps.maxWalletBalance} sats`
    );
  }
}
