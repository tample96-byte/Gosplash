/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "Admin" | "Kasir";

export interface Transaction {
  id: string;
  tanggal: string; // ISO date string
  harga_satuan: number;
  jumlah_pengunjung: number;
  diskon_persen: number;
  nama_diskon: string;
  total_bayar: number;
  bayar: number;
  kembalian: number;
  jenis_hari: "Senin-Jumat" | "Sabtu-Minggu/Libur";
  metode_pembayaran?: "Tunai" | "QRIS" | "Debit/Kredit";
  sewa_loker?: "Tidak" | "Tarif 1" | "Tarif 2";
  sewa_tempat?: "Tidak" | "Tarif 1" | "Tarif 2";
  harga_loker?: number;
  harga_tempat?: number;
}

export interface RentalPrices {
  harga_loker_1: number;
  harga_loker_2: number;
  harga_tempat_1: number;
  harga_tempat_2: number;
  total_loker_1?: number;
  total_loker_2?: number;
  total_tempat_1?: number;
  total_tempat_2?: number;
}

export interface AuditTrail {
  timestamp: string;
  exported_by: string;
  record_count: {
    transactions: number;
    discounts: number;
    prices: number;
  };
  integrity_checksum: string;
  app_id: string;
}

export interface Discount {
  id: string;
  nama_diskon: string;
  persen_diskon: number;
}

export interface TicketPrice {
  jenis_hari: "Senin-Jumat" | "Sabtu-Minggu/Libur";
  harga_tiket: number;
}

export type ReportPeriod = "Harian" | "Mingguan" | "Bulanan";
