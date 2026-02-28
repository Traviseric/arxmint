// lib/proof-repo.ts
// IndexedDB repository for encrypted Cashu proof storage.
// Proofs are stored encrypted — the encryption key never leaves memory.
// Browser-only: throws if called server-side.

const DB_NAME = "arxmint-vault";
const DB_VERSION = 1;

export interface StoredProof {
  /** SHA-256 of plaintext proof.secret, base64-encoded. Primary key. */
  id: string;
  mintUrl: string;
  keysetId: string;
  /** AES-256-GCM encrypted ciphertext of proof.secret, base64-encoded. */
  secret: string;
  /** AES-256-GCM encrypted ciphertext of proof.C, base64-encoded. */
  C: string;
  amount: number;
  status: "live" | "pending" | "spent";
  /** Concatenated IVs in format: `{secretIv_b64}:{cIv_b64}` */
  iv: string;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB not available (server-side)"));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("proofs")) {
        const store = db.createObjectStore("proofs", { keyPath: "id" });
        store.createIndex("mintUrl", "mintUrl", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }

      if (!db.objectStoreNames.contains("counters")) {
        db.createObjectStore("counters", { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains("vault_meta")) {
        db.createObjectStore("vault_meta", { keyPath: "key" });
      }
    };

    req.onsuccess = (event) =>
      resolve((event.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

export class ProofRepo {
  static async put(proof: StoredProof): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("proofs", "readwrite");
      tx.objectStore("proofs").put(proof);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static async getAll(mintUrl: string): Promise<StoredProof[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("proofs", "readonly");
      const req = tx.objectStore("proofs").index("mintUrl").getAll(mintUrl);
      req.onsuccess = () =>
        resolve((req.result as StoredProof[] | undefined) ?? []);
      req.onerror = () => reject(req.error);
    });
  }

  /** Mark a list of proofs as spent by their IDs (atomic single transaction). */
  static async markSpent(proofIds: string[]): Promise<void> {
    if (proofIds.length === 0) return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("proofs", "readwrite");
      const store = tx.objectStore("proofs");
      for (const id of proofIds) {
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result) {
            store.put({ ...req.result, status: "spent" });
          }
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static async getCounter(mintUrl: string, keysetId: string): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("counters", "readonly");
      const req = tx
        .objectStore("counters")
        .get(`${mintUrl}:${keysetId}`);
      req.onsuccess = () =>
        resolve(
          (req.result as { key: string; value: number } | undefined)
            ?.value ?? 0
        );
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Atomically write proofs and update the NUT-10 counter in one IDB transaction.
   * This prevents counter desync if the app crashes mid-write.
   */
  static async atomicWriteProofsAndCounter(
    proofs: StoredProof[],
    mintUrl: string,
    keysetId: string,
    counter: number
  ): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["proofs", "counters"], "readwrite");
      const proofStore = tx.objectStore("proofs");
      const counterStore = tx.objectStore("counters");
      for (const proof of proofs) {
        proofStore.put(proof);
      }
      counterStore.put({ key: `${mintUrl}:${keysetId}`, value: counter });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static async getMeta(key: string): Promise<unknown> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("vault_meta", "readonly");
      const req = tx.objectStore("vault_meta").get(key);
      req.onsuccess = () =>
        resolve(
          (req.result as { key: string; value: unknown } | undefined)?.value ??
            null
        );
      req.onerror = () => reject(req.error);
    });
  }

  static async setMeta(key: string, value: unknown): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("vault_meta", "readwrite");
      tx.objectStore("vault_meta").put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
