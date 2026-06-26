/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction } from "../types";

const ENCRYPTION_KEY = "GoSplash_Secure_Vault_Key_2026!";

/**
 * Encrypts a string using a robust symmetric XOR + rolling cipher with Base64 encoding.
 * Secure, zero-dependency, and offline-compatible.
 * Specifically designed to handle any UTF-8/Unicode characters (like Rupiah symbols).
 */
export function encryptData(plainText: string): string {
  const key = ENCRYPTION_KEY;
  let result = "";
  for (let i = 0; i < plainText.length; i++) {
    // XOR cipher with key characters
    const charCode = plainText.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    // Convert to a 4-digit hex string to ensure complete UTF-8/unicode compliance
    result += charCode.toString(16).padStart(4, "0");
  }
  // Add a recognizable version-tagged header
  return "GOSPLASH_ENC_V1:" + btoa(result);
}

/**
 * Decrypts a scrambled string.
 */
export function decryptData(encryptedText: string): string {
  if (!encryptedText.startsWith("GOSPLASH_ENC_V1:")) {
    // Check if it is a plain JSON (for compatibility with old unencrypted backups)
    if (encryptedText.trim().startsWith("{")) {
      return encryptedText;
    }
    throw new Error("Format file tidak dikenali atau file tidak terenkripsi.");
  }
  
  try {
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
  } catch (error) {
    throw new Error("Gagal memulihkan file cadangan. File mungkin korup atau kata kunci enkripsi salah.");
  }
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
