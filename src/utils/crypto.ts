/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction } from "../types";

const ENCRYPTION_KEY = "GoSplash_Secure_Vault_Key_2026!";

/**
 * Legacy decryption for backwards-compatibility with older V1 XOR-based backups.
 */
function decryptDataLegacy(encryptedText: string): string {
  const base64Part = encryptedText.substring("GOSPLASH_ENC_V1:".length);
  const hexStr = atob(base64Part);
  const key = ENCRYPTION_KEY;
  let plainText = "";
  
  for (let i = 0; i < hexStr.length; i += 4) {
    const hexChar = hexStr.substring(i, i + 4);
    const charCode = parseInt(hexChar, 16);
    const originalCode = charCode ^ key.charCodeAt((i / 4) % key.length);
    plainText += String.fromCharCode(originalCode);
  }
  
  return plainText;
}

/**
 * Encrypts a string using industry-standard AES-256-GCM.
 * Uses PBKDF2 for key derivation from a system-wide master key and a unique random salt.
 * Features a 12-byte random IV for every operation, producing secure, non-deterministic output.
 */
export async function encryptData(plainText: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API is not supported in this environment.");
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const passwordBytes = encoder.encode(ENCRYPTION_KEY);

  // Generate a cryptographically strong 16-byte random salt and 12-byte IV
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Import the master key base material
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  // Derive a strong 256-bit AES-GCM key
  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  // Perform AES-GCM encryption
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    data
  );

  const ciphertextBytes = new Uint8Array(ciphertextBuffer);

  // Pack the payload: [Salt (16 bytes)] [IV (12 bytes)] [Ciphertext]
  const combinedBytes = new Uint8Array(salt.length + iv.length + ciphertextBytes.length);
  combinedBytes.set(salt, 0);
  combinedBytes.set(iv, salt.length);
  combinedBytes.set(ciphertextBytes, salt.length + iv.length);

  // Convert binary pack to a safe Base64 string
  let binary = "";
  const len = combinedBytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(combinedBytes[i]);
  }
  const base64 = btoa(binary);

  return "GOSPLASH_GCM_V1:" + base64;
}

/**
 * Decrypts a payload encrypted with AES-256-GCM.
 * Supports legacy formats for full backwards compatibility.
 */
export async function decryptData(encryptedText: string): Promise<string> {
  const trimmed = encryptedText.trim();

  // Backward compatibility with older, unencrypted backup formats
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  // Backward compatibility with legacy V1 XOR format
  if (trimmed.startsWith("GOSPLASH_ENC_V1:")) {
    return decryptDataLegacy(trimmed);
  }

  if (!trimmed.startsWith("GOSPLASH_GCM_V1:")) {
    throw new Error("Format file tidak dikenali atau kunci pengaman tidak valid.");
  }

  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API is not supported in this environment.");
  }

  try {
    const base64Part = trimmed.substring("GOSPLASH_GCM_V1:".length);
    const binaryString = atob(base64Part);
    const combinedBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combinedBytes[i] = binaryString.charCodeAt(i);
    }

    // Extract packing structures
    const salt = combinedBytes.slice(0, 16);
    const iv = combinedBytes.slice(16, 28);
    const ciphertext = combinedBytes.slice(28);

    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(ENCRYPTION_KEY);

    // Re-import base key material
    const baseKey = await window.crypto.subtle.importKey(
      "raw",
      passwordBytes,
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    // Re-derive same AES-GCM key using extracted salt
    const aesKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    // Perform AES-GCM decryption
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    throw new Error("Gagal memulihkan file cadangan. Integritas file rusak atau dimodifikasi.");
  }
}

/**
 * Validates the timestamp of a backup to prevent importing future dates (tampered files)
 * or clock spoofing.
 * Returns true if valid, throws an error if invalid.
 */
export function validateBackupTimestamp(backupDateStr: string): boolean {
  if (!backupDateStr) {
    throw new Error("Timestamp cadangan tidak ditemukan.");
  }

  const backupTime = Date.parse(backupDateStr);
  if (isNaN(backupTime)) {
    throw new Error("Format tanggal cadangan tidak valid.");
  }

  const now = Date.now();
  const futureThreshold = now + 10 * 60 * 1000; // Allow 10 minutes clock skew
  if (backupTime > futureThreshold) {
    throw new Error("Gagal mengimpor: Tanggal cadangan berada di masa depan (potensi manipulasi).");
  }

  return true;
}

/**
 * Generates an integrity checksum from transactions data.
 * Used for the lightweight audit trail.
 */
export function calculateIntegrityChecksum(transactions: Transaction[]): string {
  let sum = 0;
  transactions.forEach((tx) => {
    sum += tx.total_bayar + (tx.jumlah_pengunjung * 100);
  });
  return `GOSPLASH-SUM-${sum.toString(36).toUpperCase()}-${transactions.length}`;
}
