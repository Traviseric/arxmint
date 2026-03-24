// ============================================================
// ArxMint — Agent Wallet (delegated to @te-btc/agent-wallet)
// Server-side only — do NOT import in "use client" components.
//
// Provides budget-enforced, audit-logged Cashu wallets for
// AI agent commerce. Replaces inline AgentCashuWallet.
// ============================================================

export {
  AgentWallet,
  MemoryStorage,
  FileStorage,
  SqliteStorage,
  BudgetPolicy,
  VelocityLimiter,
  CapabilityAllowlist,
  ProofPoolManager,
  AuditLogger,
  AgentWalletError,
  BudgetExceededError,
  InsufficientFundsError,
  VelocityExceededError,
  AllowlistViolationError,
  L402PaymentError,
} from "@te-btc/agent-wallet";

export type {
  AgentWalletConfig,
  BudgetConfig,
  FundResult,
  MeltResult,
  SendResult,
  AuditEntry,
  IProofStore,
  VelocityConfig,
  AllowlistConfig,
} from "@te-btc/agent-wallet";
