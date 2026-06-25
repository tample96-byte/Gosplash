/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TicketPrice, Discount, Transaction, UserRole, RentalPrices } from "../types";
import { DEFAULT_PRICES, DEFAULT_DISCOUNTS, generateMockTransactions } from "../data/mockData";

const KEYS = {
  PRICES: "gosplash_prices",
  DISCOUNTS: "gosplash_discounts",
  TRANSACTIONS: "gosplash_transactions",
  ACTIVE_ROLE: "gosplash_active_role",
  PRINTER_NAME: "gosplash_printer_name",
  RENTAL_PRICES: "gosplash_rental_prices",
  PASSWORD_ADMIN: "gosplash_password_admin",
  PASSWORD_KASIR: "gosplash_password_kasir",
};

export const DEFAULT_RENTAL_PRICES: RentalPrices = {
  harga_loker_1: 10000,
  harga_loker_2: 20000,
  harga_tempat_1: 50000,
  harga_tempat_2: 100000,
};

export function loadPrices(): TicketPrice[] {
  const data = localStorage.getItem(KEYS.PRICES);
  if (!data) {
    localStorage.setItem(KEYS.PRICES, JSON.stringify(DEFAULT_PRICES));
    return DEFAULT_PRICES;
  }
  return JSON.parse(data);
}

export function savePrices(prices: TicketPrice[]): void {
  localStorage.setItem(KEYS.PRICES, JSON.stringify(prices));
}

export function loadDiscounts(): Discount[] {
  const data = localStorage.getItem(KEYS.DISCOUNTS);
  if (!data) {
    localStorage.setItem(KEYS.DISCOUNTS, JSON.stringify(DEFAULT_DISCOUNTS));
    return DEFAULT_DISCOUNTS;
  }
  return JSON.parse(data);
}

export function saveDiscounts(discounts: Discount[]): void {
  localStorage.setItem(KEYS.DISCOUNTS, JSON.stringify(discounts));
}

export function loadTransactions(): Transaction[] {
  const data = localStorage.getItem(KEYS.TRANSACTIONS);
  if (!data) {
    const mockTx = generateMockTransactions();
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(mockTx));
    return mockTx;
  }
  return JSON.parse(data);
}

export function saveTransactions(transactions: Transaction[]): void {
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

export function addTransaction(tx: Omit<Transaction, "id">): Transaction {
  const transactions = loadTransactions();
  // Get next id
  const maxId = transactions.reduce((max, t) => Math.max(max, parseInt(t.id) || 0), 0);
  const newTx: Transaction = {
    ...tx,
    id: (maxId + 1).toString(),
  };
  transactions.unshift(newTx); // Add to beginning
  saveTransactions(transactions);
  return newTx;
}

export function loadActiveRole(): UserRole {
  const role = localStorage.getItem(KEYS.ACTIVE_ROLE) as UserRole | null;
  return role || "Admin"; // Default to Admin for testing initially, but user can change it
}

export function saveActiveRole(role: UserRole): void {
  localStorage.setItem(KEYS.ACTIVE_ROLE, role);
}

export function loadPrinterName(): string {
  return localStorage.getItem(KEYS.PRINTER_NAME) || "Canon";
}

export function savePrinterName(name: string): void {
  localStorage.setItem(KEYS.PRINTER_NAME, name);
}

export function loadRentalPrices(): RentalPrices {
  const data = localStorage.getItem(KEYS.RENTAL_PRICES);
  if (!data) {
    localStorage.setItem(KEYS.RENTAL_PRICES, JSON.stringify(DEFAULT_RENTAL_PRICES));
    return DEFAULT_RENTAL_PRICES;
  }
  return JSON.parse(data);
}

export function saveRentalPrices(prices: RentalPrices): void {
  localStorage.setItem(KEYS.RENTAL_PRICES, JSON.stringify(prices));
}

export function loadAdminPassword(): string {
  return localStorage.getItem(KEYS.PASSWORD_ADMIN) || "admin123";
}

export function saveAdminPassword(password: string): void {
  localStorage.setItem(KEYS.PASSWORD_ADMIN, password);
}

export function loadKasirPassword(): string {
  return localStorage.getItem(KEYS.PASSWORD_KASIR) || "kasir123";
}

export function saveKasirPassword(password: string): void {
  localStorage.setItem(KEYS.PASSWORD_KASIR, password);
}

export function clearAllData(): void {
  localStorage.removeItem(KEYS.PRICES);
  localStorage.removeItem(KEYS.DISCOUNTS);
  localStorage.removeItem(KEYS.TRANSACTIONS);
  localStorage.removeItem(KEYS.ACTIVE_ROLE);
  localStorage.removeItem(KEYS.PRINTER_NAME);
  localStorage.removeItem(KEYS.RENTAL_PRICES);
  localStorage.removeItem(KEYS.PASSWORD_ADMIN);
  localStorage.removeItem(KEYS.PASSWORD_KASIR);
}
