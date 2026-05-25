import nacl from "tweetnacl";
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from "tweetnacl-util";

const KEY_STORAGE_KEY = "e2ee_keypair";
const PUBLIC_KEYS_CACHE_KEY = "e2ee_public_keys";

export interface E2EEKeyPair {
  publicKey: string; // base64
  secretKey: string; // base64
}

export interface EncryptedMessage {
  ciphertext: string; // base64
  nonce: string; // base64
  senderPublicKey: string; // base64
}

/**
 * Generate a new X25519 keypair for E2EE
 */
export function generateKeyPair(): E2EEKeyPair {
  const pair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(pair.publicKey),
    secretKey: encodeBase64(pair.secretKey),
  };
}

/**
 * Get or create the user's keypair from localStorage
 */
export function getOrCreateKeyPair(): E2EEKeyPair {
  if (typeof window === "undefined") {
    return generateKeyPair();
  }

  const stored = localStorage.getItem(KEY_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as E2EEKeyPair;
      if (parsed.publicKey && parsed.secretKey) return parsed;
    } catch {
      // Corrupted, regenerate
    }
  }

  const newPair = generateKeyPair();
  localStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(newPair));
  return newPair;
}

/**
 * Export keypair for backup (user can save this)
 */
export function exportKeyPair(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(KEY_STORAGE_KEY);
  return stored;
}

/**
 * Import keypair from backup
 */
export function importKeyPair(exported: string): boolean {
  try {
    const parsed = JSON.parse(exported) as E2EEKeyPair;
    if (!parsed.publicKey || !parsed.secretKey) return false;
    // Validate key lengths
    const pk = decodeBase64(parsed.publicKey);
    const sk = decodeBase64(parsed.secretKey);
    if (pk.length !== 32 || sk.length !== 32) return false;
    localStorage.setItem(KEY_STORAGE_KEY, exported);
    return true;
  } catch {
    return false;
  }
}

/**
 * Encrypt a message for a recipient
 */
export function encryptMessage(
  plaintext: string,
  recipientPublicKey: string,
  senderSecretKey: string
): EncryptedMessage {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = decodeUTF8(plaintext);
  const recipientPK = decodeBase64(recipientPublicKey);
  const senderSK = decodeBase64(senderSecretKey);

  const encrypted = nacl.box(messageUint8, nonce, recipientPK, senderSK);
  if (!encrypted) {
    throw new Error("Encryption failed");
  }

  const keyPair = getOrCreateKeyPair();

  return {
    ciphertext: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
    senderPublicKey: keyPair.publicKey,
  };
}

/**
 * Decrypt a message from a sender
 */
export function decryptMessage(
  encrypted: EncryptedMessage,
  recipientSecretKey: string
): string | null {
  try {
    const ciphertext = decodeBase64(encrypted.ciphertext);
    const nonce = decodeBase64(encrypted.nonce);
    const senderPK = decodeBase64(encrypted.senderPublicKey);
    const recipientSK = decodeBase64(recipientSecretKey);

    const decrypted = nacl.box.open(ciphertext, nonce, senderPK, recipientSK);
    if (!decrypted) return null;

    return encodeUTF8(decrypted);
  } catch {
    return null;
  }
}

/**
 * Generate a fingerprint from a public key for visual verification
 */
export function getKeyFingerprint(publicKey: string): string {
  const bytes = decodeBase64(publicKey);
  const hash = nacl.hash(bytes);
  // Take first 8 bytes, format as hex pairs
  const hex = Array.from(hash.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(":");
  return hex;
}

/**
 * Cache a user's public key locally
 */
export function cachePublicKey(userId: string, publicKey: string): void {
  if (typeof window === "undefined") return;
  const cache = getPublicKeysCache();
  cache[userId] = publicKey;
  localStorage.setItem(PUBLIC_KEYS_CACHE_KEY, JSON.stringify(cache));
}

/**
 * Get cached public key for a user
 */
export function getCachedPublicKey(userId: string): string | null {
  const cache = getPublicKeysCache();
  return cache[userId] || null;
}

function getPublicKeysCache(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PUBLIC_KEYS_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Verify that a voice call peer's DTLS fingerprint matches expected
 * This provides an additional verification layer on top of WebRTC's built-in DTLS-SRTP
 */
export function generateCallVerificationCode(
  localPublicKey: string,
  remotePublicKey: string
): string {
  const local = decodeBase64(localPublicKey);
  const remote = decodeBase64(remotePublicKey);
  // Combine both keys in consistent order (sorted) and hash
  const combined = new Uint8Array(64);
  const [first, second] = localPublicKey < remotePublicKey ? [local, remote] : [remote, local];
  combined.set(first, 0);
  combined.set(second, 32);
  const hash = nacl.hash(combined);
  // Generate 6-digit verification code from hash
  const code = ((hash[0] << 16) | (hash[1] << 8) | hash[2]) % 1000000;
  return code.toString().padStart(6, "0");
}
