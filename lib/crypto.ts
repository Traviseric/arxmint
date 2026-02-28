// lib/crypto.ts
// AES-256-GCM encryption with PBKDF2-SHA256 key derivation.
// Uses Web Crypto API only — no external dependencies.
// 600,000 PBKDF2 iterations follows OWASP 2023 minimum for PBKDF2-SHA256.

/**
 * Derive an AES-256-GCM CryptoKey from a passphrase using PBKDF2-SHA256.
 */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 600_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * A fresh random 96-bit IV is generated for each call.
 */
export async function encrypt(
  key: CryptoKey,
  data: string
): Promise<{ iv: Uint8Array<ArrayBuffer>; ciphertext: ArrayBuffer }> {
  const iv = crypto.getRandomValues(new Uint8Array(12) as Uint8Array<ArrayBuffer>);
  const encoded = new TextEncoder().encode(data);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return { iv, ciphertext };
}

/**
 * Decrypt AES-256-GCM ciphertext.
 * Throws DOMException if authentication tag verification fails.
 */
export async function decrypt(
  key: CryptoKey,
  iv: Uint8Array<ArrayBuffer>,
  ciphertext: ArrayBuffer
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

/** Generate a cryptographically random 256-bit (32-byte) salt. */
export function generateSalt(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(32) as Uint8Array<ArrayBuffer>);
}
