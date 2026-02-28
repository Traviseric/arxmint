// ============================================================
// ArxMint — Input Validation + Structured Error Responses
// Used by all API route handlers to validate user input.
// Never returns stack traces in production.
// ============================================================

export class ValidationError extends Error {
  constructor(public readonly field: string, message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateCommunityName(name: unknown): string {
  if (typeof name !== "string")
    throw new ValidationError("name", "Name must be a string");
  const trimmed = name.trim();
  if (trimmed.length === 0)
    throw new ValidationError("name", "Name is required");
  if (trimmed.length > 100)
    throw new ValidationError("name", "Name must be 100 characters or less");
  if (/<script/i.test(trimmed))
    throw new ValidationError("name", "Invalid characters in name");
  return trimmed;
}

export function validatePrompt(prompt: unknown): string {
  if (typeof prompt !== "string")
    throw new ValidationError("prompt", "Prompt must be a string");
  const trimmed = prompt.trim();
  if (trimmed.length === 0)
    throw new ValidationError("prompt", "Prompt is required");
  if (trimmed.length > 2000)
    throw new ValidationError("prompt", "Prompt must be 2000 characters or less");
  return trimmed;
}

export function validateAmount(amount: unknown): number {
  const n = Number(amount);
  if (!Number.isInteger(n))
    throw new ValidationError("amount", "Amount must be an integer");
  if (n <= 0)
    throw new ValidationError("amount", "Amount must be positive");
  if (n > 1_000_000)
    throw new ValidationError("amount", "Amount exceeds maximum (1,000,000 sats)");
  return n;
}

export function validateCashuToken(token: unknown): string {
  if (typeof token !== "string")
    throw new ValidationError("token", "Token must be a string");
  if (!token.startsWith("cashu"))
    throw new ValidationError("token", "Invalid Cashu token format");
  if (token.length > 100_000)
    throw new ValidationError("token", "Token too large");
  return token;
}

export function validateMerchantData(data: unknown): {
  name: string;
  description?: string;
  category?: string;
} {
  if (typeof data !== "object" || data === null)
    throw new ValidationError("body", "Request body must be an object");
  const d = data as Record<string, unknown>;
  const name = validateCommunityName(d.name);
  const description =
    d.description !== undefined ? String(d.description).slice(0, 500) : undefined;
  const category =
    d.category !== undefined ? String(d.category).slice(0, 50) : undefined;
  return { name, description, category };
}

/**
 * Standard error response format — never leaks stack traces in production.
 * Returns { error: string, code: string } suitable for NextResponse.json().
 */
export function errorResponse(
  error: unknown
): { error: string; code: string } {
  if (error instanceof ValidationError) {
    return {
      error: error.message,
      code: `VALIDATION_${error.field.toUpperCase()}`,
    };
  }
  if (error instanceof Error) {
    const isProduction = process.env.NODE_ENV === "production";
    return {
      error: isProduction ? "Request failed" : error.message,
      code: "INTERNAL_ERROR",
    };
  }
  return { error: "Unknown error", code: "UNKNOWN" };
}

/** HTTP status code for a given error */
export function errorStatus(error: unknown): number {
  if (error instanceof ValidationError) return 400;
  return 500;
}
