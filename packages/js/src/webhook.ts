/**
 * Verify an incoming ArxMint webhook signature.
 *
 * ArxMint signs webhook payloads with HMAC-SHA256 using your webhook secret.
 * The signature is sent in the `x-arxmint-signature` header as hex.
 *
 * Works in both browser (Web Crypto) and Node.js (crypto module or Web Crypto).
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);

    const cryptoKey = await globalThis.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = hexToBytes(signature);
    return await globalThis.crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      sigBytes.buffer as ArrayBuffer,
      messageData
    );
  } catch {
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
