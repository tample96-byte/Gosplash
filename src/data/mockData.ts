/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TicketPrice, Discount, Transaction } from "../types";

export const DEFAULT_PRICES: TicketPrice[] = [
  { jenis_hari: "Senin-Jumat", harga_tiket: 15000 },
  { jenis_hari: "Sabtu-Minggu/Libur", harga_tiket: 25000 },
];

export const DEFAULT_DISCOUNTS: Discount[] = [
  { id: "disc-1", nama_diskon: "- Tanpa Diskon -", persen_diskon: 0 },
  { id: "disc-2", nama_diskon: "Promo Pelajar", persen_diskon: 10 },
  { id: "disc-3", nama_diskon: "Promo Rombongan", persen_diskon: 20 },
  { id: "disc-4", nama_diskon: "GoSplash Anniversary", persen_diskon: 25 },
];

export function generateMockTransactions(): Transaction[] {
  const transactions: Transaction[] = [];
  const now = new Date();
  let baseId = 0;

  // We want to generate mock data for the last 14 days
  for (let i = 14; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    
    const jenisHari = isWeekend ? "Sabtu-Minggu/Libur" : "Senin-Jumat";
    const price = isWeekend ? 25000 : 15000;
    
    // Number of visitors varies: more on weekends
    const numSalesToday = isWeekend ? Math.floor(Math.random() * 8) + 8 : Math.floor(Math.random() * 5) + 3;
    
    for (let j = 0; j < numSalesToday; j++) {
      baseId++;
      // Set random hour between 08:00 and 17:00
      const txDate = new Date(date);
      txDate.setHours(8 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60), 0);
      
      const qty = Math.floor(Math.random() * 5) + 1; // 1-5 tickets
      
      // Randomly select a discount
      const discRoll = Math.random();
      let discount = DEFAULT_DISCOUNTS[0]; // Tanpa diskon
      if (discRoll > 0.8) {
        discount = DEFAULT_DISCOUNTS[3]; // Anniversary 25%
      } else if (discRoll > 0.6) {
        discount = DEFAULT_DISCOUNTS[2]; // Rombongan 20%
      } else if (discRoll > 0.4) {
        discount = DEFAULT_DISCOUNTS[1]; // Pelajar 10%
      }
      
      const subtotal = price * qty;
      const discountAmount = subtotal * (discount.persen_diskon / 100);
      const totalBayar = subtotal - discountAmount;
      
      // Calculate bayar: usually rounds up to nearest 50k or 100k or exact
      const possibleBayar = [
        totalBayar,
        Math.ceil(totalBayar / 10000) * 10000,
        Math.ceil(totalBayar / 50000) * 50000,
        Math.ceil(totalBayar / 100000) * 100000,
      ];
      const bayar = possibleBayar[Math.floor(Math.random() * possibleBayar.length)];
      const kembalian = bayar - totalBayar;
      
      transactions.push({
        id: baseId.toString(),
        tanggal: txDate.toISOString(),
        harga_satuan: price,
        jumlah_pengunjung: qty,
        diskon_persen: discount.persen_diskon,
        nama_diskon: discount.nama_diskon,
        total_bayar: totalBayar,
        bayar,
        kembalian,
        jenis_hari: jenisHari,
      });
    }
  }
  
  // Sort transactions by date descending
  return transactions.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
}
