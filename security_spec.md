# Security Specification for GoSplash Ticket POS

This document outlines the security properties, data invariants, and access control policies for the GoSplash ticket transaction system Firestore database.

## 1. Data Invariants

1. **Transaction ID Match**: A transaction's document ID must match its internal `id` property.
2. **Positive Quantity**: A transaction must have `jumlah_pengunjung` >= 0.
3. **Financial Consistency**: `total_bayar` must be correctly computed based on ticket prices, quantity, rental facilities, and selected discount.
4. **Valid Day Types**: Day types must be restricted to `"Senin-Jumat"` or `"Sabtu-Minggu/Libur"`.
5. **Payment Method Validity**: Payment methods must be exactly one of `"Tunai"`, `"QRIS"`, or `"Debit/Kredit"`.

## 2. Access Control Policy

- All authenticated and unauthenticated clients (local cashier device) can read/write data in order to sync with the central DB.
- Inputs must conform strictly to expected data schemas.

## 3. The "Dirty Dozen" Malicious Payloads

The following malicious payloads must be rejected by Firestore Security Rules:

1. **Negative Visitor Count**:
   `transactions/100` -> `{ "id": "100", "jumlah_pengunjung": -5, ... }`
2. **Missing Total Paid**:
   `transactions/101` -> `{ "id": "101", "jumlah_pengunjung": 1, "total_bayar": null }`
3. **Mismatched Document ID**:
   `transactions/102` -> `{ "id": "999", ... }`
4. **Invalid Day Type**:
   `transactions/103` -> `{ "jenis_hari": "Holiday", ... }`
5. **Malicious Value Type**:
   `prices/weekday` -> `{ "harga_tiket": "One Million" }`
6. **Out of Range Discount**:
   `discounts/disc-mal` -> `{ "persen_diskon": 150 }`
7. **Negative Rental Price**:
   `rental_prices/default` -> `{ "harga_loker_1": -10000 }`
8. **Invalid Locker Rent Option**:
   `transactions/104` -> `{ "sewa_loker": "Ultra Locker" }`
9. **Zero Total/Visitors with No Rentals**:
   `transactions/105` -> `{ "jumlah_pengunjung": 0, "sewa_loker": "Tidak", "sewa_tempat": "Tidak" }`
10. **Shadow Fields Inject**:
    `settings/default` -> `{ "printer_name": "HP Deskjet", "role_override_hack": true }`
11. **Excessive String Length for Promo**:
    `discounts/disc-1` -> `{ "nama_diskon": "A".repeat(1000) }`
12. **System Settings Modification by Malformed Data**:
    `settings/default` -> `{ "password_admin": "", "password_kasir": "" }`

## 4. Test Runner Definition

The Firestore rule validation checks can be verified using the local simulator or deployment verification suite. All of these "Dirty Dozen" attempts will fail under our rule enforcement.
