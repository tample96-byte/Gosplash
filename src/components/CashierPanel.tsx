/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { TicketPrice, Discount, Transaction } from "../types";
import { Ticket, Users, Percent, Wallet, Banknote, RefreshCw, Printer, AlertTriangle } from "lucide-react";

interface CashierPanelProps {
  prices: TicketPrice[];
  discounts: Discount[];
  onAddTransaction: (tx: Omit<Transaction, "id">) => Transaction;
  onShowReceipt: (tx: Transaction) => void;
}

export const CashierPanel: React.FC<CashierPanelProps> = ({
  prices,
  discounts,
  onAddTransaction,
  onShowReceipt,
}) => {
  // State variables matching VB.NET form controls
  const [hargaSatuan, setHargaSatuan] = useState<number>(15000);
  const [jumlahPengunjung, setJumlahPengunjung] = useState<string>("");
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>("");
  const [persenDiskon, setPersenDiskon] = useState<number>(0);
  const [totalAkhir, setTotalAkhir] = useState<number>(0);
  const [bayar, setBayar] = useState<string>("");
  const [kembalianText, setKembalianText] = useState<string>("0");
  const [isKurang, setIsKurang] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clear validation error when inputs are changed
  useEffect(() => {
    setErrorMsg(null);
  }, [jumlahPengunjung, bayar, selectedDiscountId]);

  // Advanced feature: Let user override day type for easy testing of weekend prices!
  const [dayTypeOverride, setDayTypeOverride] = useState<"Auto" | "Senin-Jumat" | "Sabtu-Minggu/Libur">("Auto");
  const [activeDayType, setActiveDayType] = useState<"Senin-Jumat" | "Sabtu-Minggu/Libur">("Senin-Jumat");

  // Determine active day type based on auto/override
  useEffect(() => {
    if (dayTypeOverride === "Auto") {
      const day = new Date().getDay();
      const isWeekend = day === 0 || day === 6; // Sunday or Saturday
      setActiveDayType(isWeekend ? "Sabtu-Minggu/Libur" : "Senin-Jumat");
    } else {
      setActiveDayType(dayTypeOverride);
    }
  }, [dayTypeOverride]);

  // Set the unit price according to the active day type
  useEffect(() => {
    const matchedPrice = prices.find((p) => p.jenis_hari === activeDayType);
    setHargaSatuan(matchedPrice ? matchedPrice.harga_tiket : 15000);
  }, [activeDayType, prices]);

  // Sync selected discount when discounts list changes or is loaded/edited/deleted
  useEffect(() => {
    if (discounts.length > 0) {
      const exists = discounts.some((d) => d.id === selectedDiscountId);
      if (!exists) {
        // Fallback to the first discount option (usually "- Tanpa Diskon -")
        const defaultDisc = discounts[0];
        setSelectedDiscountId(defaultDisc.id);
        setPersenDiskon(defaultDisc.persen_diskon);
      } else {
        // Update the percentage if the active discount was edited in Admin panel
        const currentDisc = discounts.find((d) => d.id === selectedDiscountId);
        if (currentDisc && currentDisc.persen_diskon !== persenDiskon) {
          setPersenDiskon(currentDisc.persen_diskon);
        }
      }
    }
  }, [discounts, selectedDiscountId]);

  // Handle discount change
  const handleDiscountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const discId = e.target.value;
    setSelectedDiscountId(discId);
    
    const disc = discounts.find((d) => d.id === discId);
    if (disc) {
      setPersenDiskon(disc.persen_diskon);
    } else {
      setPersenDiskon(0);
    }
  };

  // Recalculate total
  useEffect(() => {
    const qty = parseInt(jumlahPengunjung) || 0;
    const subtotal = hargaSatuan * qty;
    const total = subtotal - subtotal * (persenDiskon / 100);
    setTotalAkhir(total);
  }, [hargaSatuan, jumlahPengunjung, persenDiskon]);

  // Recalculate change (kembalian)
  useEffect(() => {
    const paidAmount = parseFloat(bayar) || 0;
    if (paidAmount === 0 && totalAkhir === 0) {
      setKembalianText("0");
      setIsKurang(false);
      return;
    }

    const diff = paidAmount - totalAkhir;
    if (diff < 0) {
      setKembalianText("Uang Kurang!");
      setIsKurang(true);
    } else {
      setKembalianText(`Rp ${diff.toLocaleString("id-ID")}`);
      setIsKurang(false);
    }
  }, [bayar, totalAkhir]);

  // Reset Cashier input fields
  const handleReset = () => {
    setJumlahPengunjung("");
    setSelectedDiscountId(discounts[0]?.id || "");
    setPersenDiskon(0);
    setBayar("");
    setErrorMsg(null);
  };

  // Form submit (Simpan & Cetak)
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(jumlahPengunjung) || 0;
    const paidAmount = parseFloat(bayar) || 0;

    if (qty <= 0) {
      setErrorMsg("Masukkan jumlah pengunjung yang valid!");
      return;
    }
    if (isKurang || paidAmount < totalAkhir) {
      setErrorMsg("Uang pembayaran tidak mencukupi!");
      return;
    }

    const matchedDiscount = discounts.find((d) => d.id === selectedDiscountId);
    const namaDiskon = matchedDiscount ? matchedDiscount.nama_diskon : "- Tanpa Diskon -";

    // Call storage add function
    const newTx = onAddTransaction({
      tanggal: new Date().toISOString(),
      harga_satuan: hargaSatuan,
      jumlah_pengunjung: qty,
      diskon_persen: persenDiskon,
      nama_diskon: namaDiskon,
      total_bayar: totalAkhir,
      bayar: paidAmount,
      kembalian: paidAmount - totalAkhir,
      jenis_hari: activeDayType,
    });

    // Reset fields
    handleReset();

    // Trigger printing/receipt preview
    onShowReceipt(newTx);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Panel Header */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Ticket className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800">
            Input Transaksi Tiket GoSplash
          </h2>
        </div>
        
        {/* Dynamic Day Badge & Tester Override */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <span className="text-xs font-semibold text-slate-500 mr-1">Hari Tarif:</span>
          <select
            id="day-type-override-select"
            value={dayTypeOverride}
            onChange={(e) => setDayTypeOverride(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-md px-2 py-1 font-sans focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="Auto">Otomatis (Deteksi)</option>
            <option value="Senin-Jumat">weekday (Senin-Jumat)</option>
            <option value="Sabtu-Minggu/Libur">Weekend (Sabtu-Minggu)</option>
          </select>
          <span
            id="active-day-type-badge"
            className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              activeDayType === "Sabtu-Minggu/Libur"
                ? "bg-amber-100 text-amber-800 border border-amber-200"
                : "bg-blue-100 text-blue-800 border border-blue-200"
            }`}
          >
            {activeDayType}
          </span>
        </div>
      </div>

      {/* Form Area */}
      <form onSubmit={handleSaveTransaction} className="p-6 flex-1 flex flex-col justify-between space-y-6">
        <div className="space-y-5">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Unit Ticket Price (Read-only) */}
          <div className="grid grid-cols-1 gap-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-slate-400" />
              Harga Tiket Satuan (Otomatis)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-500 font-medium">Rp</span>
              <input
                id="harga-satuan-input"
                type="text"
                value={hargaSatuan.toLocaleString("id-ID")}
                readOnly
                className="w-full bg-slate-50 border border-slate-200 text-slate-600 rounded-xl pl-10 pr-4 py-2.5 font-mono font-bold focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 bg-slate-200/50 px-2 py-1 rounded">
                Sistem Terkunci
              </span>
            </div>
          </div>

          {/* Number of Visitors */}
          <div className="grid grid-cols-1 gap-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400" />
              Jumlah Pengunjung (Orang)
            </label>
            <div className="relative">
              <input
                id="jumlah-pengunjung-input"
                type="number"
                min="1"
                placeholder="Contoh: 3"
                value={jumlahPengunjung}
                onChange={(e) => setJumlahPengunjung(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <span className="absolute right-4 top-3 text-sm text-slate-500">Orang</span>
            </div>
          </div>

          {/* Promotional Discounts */}
          <div className="grid grid-cols-1 gap-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-slate-400" />
              Pilih Promo / Diskon Pendukung
            </label>
            <div className="flex gap-3">
              <select
                id="diskon-select"
                value={selectedDiscountId}
                onChange={handleDiscountChange}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {discounts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nama_diskon} {d.persen_diskon > 0 ? `(${d.persen_diskon}%)` : ""}
                  </option>
                ))}
              </select>
              <div className="w-24 relative">
                <input
                  id="persen-diskon-input"
                  type="text"
                  value={`${persenDiskon}%`}
                  readOnly
                  className="w-full bg-slate-50 border border-slate-200 text-slate-600 rounded-xl px-3 py-2.5 text-center font-mono font-bold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Total Display (High Highlighted) */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-inner border border-slate-800 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-blue-400 tracking-widest uppercase mb-1">
              Total yang Harus Dibayar
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-blue-400 font-sans text-xl font-bold">Rp</span>
              <span id="total-akhir-display" className="text-3xl font-black text-white font-mono tracking-tight">
                {totalAkhir.toLocaleString("id-ID")}
              </span>
            </div>
            
            {/* Ticket breakdown snippet */}
            {parseInt(jumlahPengunjung) > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
                <span>Rincian: {jumlahPengunjung} Tiket x Rp {hargaSatuan.toLocaleString("id-ID")}</span>
                {persenDiskon > 0 && <span>Hemat: {persenDiskon}%</span>}
              </div>
            )}
          </div>

          {/* Paid input */}
          <div className="grid grid-cols-1 gap-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-slate-400" />
              Masukkan Nominal Uang Diterima (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-500 font-medium">Rp</span>
              <input
                id="bayar-input"
                type="number"
                min="0"
                placeholder="Contoh: 100000"
                value={bayar}
                onChange={(e) => setBayar(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {/* Quick denominational buttons for cashier ease of use! */}
              {totalAkhir > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {[totalAkhir, 20000, 50000, 100000].map((denom, idx) => {
                    if (denom < totalAkhir && denom !== totalAkhir) return null;
                    // Round up nicely if needed
                    const actualDenom = denom === totalAkhir ? denom : denom;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setBayar(actualDenom.toString())}
                        className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded border border-slate-200 transition"
                      >
                        Rp {actualDenom.toLocaleString("id-ID")}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Change Display */}
          <div className="grid grid-cols-1 gap-1.5">
            <span className="text-sm font-semibold text-slate-700">Uang Kembalian</span>
            <div
              id="kembalian-display"
              className={`rounded-xl p-3 border font-mono font-bold text-lg text-center flex items-center justify-center gap-2 ${
                isKurang
                  ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                  : parseFloat(bayar) > 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-500 border-slate-200"
              }`}
            >
              {isKurang && <AlertTriangle className="w-5 h-5 text-rose-600" />}
              {kembalianText}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-3 rounded-xl border border-slate-200 transition duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
          
          <button
            id="simpan-transaksi-btn"
            type="submit"
            disabled={jumlahPengunjung === "" || bayar === "" || isKurang || parseInt(jumlahPengunjung) <= 0}
            className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl shadow-md transition-all duration-200 ${
              jumlahPengunjung === "" || bayar === "" || isKurang || parseInt(jumlahPengunjung) <= 0
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border border-slate-200"
                : "bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-emerald-100"
            }`}
          >
            <Printer className="w-5 h-5" />
            SIMPAN & CETAK NOTA FISIK
          </button>
        </div>
      </form>
    </div>
  );
};
