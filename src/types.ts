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
