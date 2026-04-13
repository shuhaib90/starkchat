/**
 * Encryption Utility for StarkChat Pay-to-Unlock
 * Uses Web Crypto API (AES-GCM) for client-side privacy.
 * 
 * In a production app, the key would be derived from a wallet signature.
 * For this demo, we use a fixed app-level derivation.
 */

const APP_SECRET = "starkchat-monetization-secret-2024";

async function getEncryptionKey() {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(APP_SECRET),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("unique-salt-starkchat"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(text: string): Promise<string> {
  try {
    const enc = new TextEncoder();
    const key = await getEncryptionKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(text)
    );

    // Combine IV and Ciphertext for storage
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Return as Base64 for database storage
    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error("Encryption failed:", err);
    throw new Error("Could not encrypt message.");
  }
}

export async function decryptText(encryptedBase64: string): Promise<string> {
  try {
    const combined = new Uint8Array(
      atob(encryptedBase64).split("").map((c) => c.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const key = await getEncryptionKey();
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error("Decryption failed:", err);
    return "🔓 [Decryption Error: Check Key or Payment Status]";
  }
}
