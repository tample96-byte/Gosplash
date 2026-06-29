/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { TicketPrice, Discount, Transaction, RentalPrices } from "../types";
import { Ticket, Users, Percent, Wallet, Banknote, RefreshCw, Printer, AlertTriangle, QrCode, CreditCard, Key, Tent } from "lucide-react";
import { Language, translations } from "../utils/lang";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "../lib/dexieDb";

interface CashierPanelProps {
  transactions: Transaction[];
  prices: TicketPrice[];
  discounts: Discount[];
  rentalPrices: RentalPrices;
  onAddTransaction: (tx: Omit<Transaction, "id">) => Promise<Transaction>;
  onShowReceipt: (tx: Transaction) => void;
  language: Language;
}

export const CashierPanel: React.FC<CashierPanelProps> = ({
  transactions,
  prices,
  discounts,
  rentalPrices,
  onAddTransaction,
  onShowReceipt,
  language,
}) => {
  const t = translations[language];

  // --- Real-time Inventory & Capacity Calculations for Today ---
  const {
    sisaLoker1,
    sisaLoker2,
    sisaTempat1,
    sisaTempat2,
    maxLoker1,
    maxLoker2,
    maxTempat1,
    maxTempat2
  } = React.useMemo(() => {
    const todayDate = new Date();
    const todayYear = todayDate.getFullYear();
    const todayMonth = todayDate.getMonth();
    const todayDay = todayDate.getDate();

    let rLoker1 = 0;
    let rLoker2 = 0;
    let rTempat1 = 0;
    let rTempat2 = 0;

    (transactions || []).forEach((tx) => {
      const txDate = new Date(tx.tanggal);
      if (
        txDate.getFullYear() === todayYear &&
        txDate.getMonth() === todayMonth &&
        txDate.getDate() === todayDay
      ) {
        if (tx.sewa_loker === "Tarif 1") rLoker1++;
        if (tx.sewa_loker === "Tarif 2") rLoker2++;
        if (tx.sewa_tempat === "Tarif 1") rTempat1++;
        if (tx.sewa_tempat === "Tarif 2") rTempat2++;
      }
    });

    const mLoker1 = rentalPrices.total_loker_1 ?? 40;
    const mLoker2 = rentalPrices.total_loker_2 ?? 20;
    const mTempat1 = rentalPrices.total_tempat_1 ?? 10;
    const mTempat2 = rentalPrices.total_tempat_2 ?? 5;

    return {
      sisaLoker1: Math.max(0, mLoker1 - rLoker1),
      sisaLoker2: Math.max(0, mLoker2 - rLoker2),
      sisaTempat1: Math.max(0, mTempat1 - rTempat1),
      sisaTempat2: Math.max(0, mTempat2 - rTempat2),
      maxLoker1: mLoker1,
      maxLoker2: mLoker2,
      maxTempat1: mTempat1,
      maxTempat2: mTempat2
    };
  }, [transactions, rentalPrices]);

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

  // Suggested Upgrade States: Payment Method Options
  const [paymentMethod, setPaymentMethod] = useState<"Tunai" | "QRIS" | "Debit/Kredit">("Tunai");
  const [cardIssuer, setCardIssuer] = useState<string>("BCA");
  const [cardRefNo, setCardRefNo] = useState<string>("");

  // Locker & Place extra rentals (supports Tarif 1 and Tarif 2 only)
  const [sewaLoker, setSewaLoker] = useState<"Tidak" | "Tarif 1" | "Tarif 2">("Tidak");
  const [sewaTempat, setSewaTempat] = useState<"Tidak" | "Tarif 1" | "Tarif 2">("Tidak");

  const LOKER_PRICES = {
    "Tidak": 0,
    "Tarif 1": rentalPrices.harga_loker_1,
    "Tarif 2": rentalPrices.harga_loker_2,
  };

  const TEMPAT_PRICES = {
    "Tidak": 0,
    "Tarif 1": rentalPrices.harga_tempat_1,
    "Tarif 2": rentalPrices.harga_tempat_2,
  };

  // Clear validation error when inputs are changed
  useEffect(() => {
    setErrorMsg(null);
  }, [jumlahPengunjung, bayar, selectedDiscountId, paymentMethod, sewaLoker, sewaTempat]);

  // Auto-fill payment amount for QRIS & Card payments (no change)
  useEffect(() => {
    if (paymentMethod !== "Tunai") {
      setBayar(totalAkhir.toString());
    } else {
      setBayar("");
    }
  }, [paymentMethod, totalAkhir]);

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
    const ticketTotal = subtotal - subtotal * (persenDiskon / 100);
    const lockerCost = LOKER_PRICES[sewaLoker];
    const placeCost = TEMPAT_PRICES[sewaTempat];
    setTotalAkhir(ticketTotal + lockerCost + placeCost);
  }, [hargaSatuan, jumlahPengunjung, persenDiskon, sewaLoker, sewaTempat]);

  // Recalculate change (kembalian)
  useEffect(() => {
    if (bayar.trim() === "") {
      setKembalianText("0");
      setIsKurang(false);
      return;
    }

    const paidAmount = parseFloat(bayar) || 0;
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
    setSewaLoker("Tidak");
    setSewaTempat("Tidak");
    setBayar("");
    setPaymentMethod("Tunai");
    setCardIssuer("BCA");
    setCardRefNo("");
    setErrorMsg(null);
  };

  // Form submit (Simpan & Cetak)
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(jumlahPengunjung) || 0;
    const paidAmount = parseFloat(bayar) || 0;
    const hasRental = sewaLoker !== "Tidak" || sewaTempat !== "Tidak";

    if (qty < 0 || (qty === 0 && !hasRental)) {
      setErrorMsg(language === "ID" ? "Masukkan jumlah pengunjung atau pilih sewa fasilitas terlebih dahulu!" : "Please enter visitor count or select a rental facility!");
      return;
    }
    if (totalAkhir <= 0) {
      setErrorMsg(language === "ID" ? "Total transaksi Rp 0 diblokir!" : "Total transaction amount of Rp 0 is blocked!");
      return;
    }
    if (paymentMethod === "Tunai" && (isKurang || paidAmount < totalAkhir)) {
      setErrorMsg("Uang pembayaran tidak mencukupi!");
      return;
    }

    // --- Validate Inventory Availability before Saving ---
    if (sewaLoker === "Tarif 1" && sisaLoker1 <= 0) {
      setErrorMsg("Gagal menyimpan transaksi: Loker Tarif 1 sudah habis untuk hari ini!");
      return;
    }
    if (sewaLoker === "Tarif 2" && sisaLoker2 <= 0) {
      setErrorMsg("Gagal menyimpan transaksi: Loker Tarif 2 sudah habis untuk hari ini!");
      return;
    }
    if (sewaTempat === "Tarif 1" && sisaTempat1 <= 0) {
      setErrorMsg("Gagal menyimpan transaksi: Saung Tarif 1 sudah habis untuk hari ini!");
      return;
    }
    if (sewaTempat === "Tarif 2" && sisaTempat2 <= 0) {
      setErrorMsg("Gagal menyimpan transaksi: Saung Tarif 2 sudah habis untuk hari ini!");
      return;
    }

    const matchedDiscount = discounts.find((d) => d.id === selectedDiscountId);
    const namaDiskon = matchedDiscount ? matchedDiscount.nama_diskon : "- Tanpa Diskon -";

    try {
      // Call storage add function
      const newTx = await onAddTransaction({
        tanggal: new Date().toISOString(),
        harga_satuan: hargaSatuan,
        jumlah_pengunjung: qty,
        diskon_persen: persenDiskon,
        nama_diskon: namaDiskon,
        total_bayar: totalAkhir,
        bayar: paidAmount,
        kembalian: paymentMethod === "Tunai" ? paidAmount - totalAkhir : 0,
        jenis_hari: activeDayType,
        metode_pembayaran: paymentMethod,
        sewa_loker: sewaLoker,
        sewa_tempat: sewaTempat,
        harga_loker: LOKER_PRICES[sewaLoker],
        harga_tempat: TEMPAT_PRICES[sewaTempat],
      });

      // Reset fields
      handleReset();

      // Trigger printing/receipt preview
      onShowReceipt(newTx);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menyimpan transaksi ke database!");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Panel Header */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Ticket className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800">
            {t.cashier_title}
          </h2>
          {(() => {
            const pendingCount = useLiveQuery(() => localDb.syncQueue.count()) ?? 0;
            return pendingCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse shadow-sm">
                <span>⚠️</span>
                <span>{pendingCount} {language === "ID" ? "Transaksi Belum Terunggah" : "Transactions Pending"}</span>
              </span>
            ) : null;
          })()}
        </div>
        
        {/* Dynamic Day Badge & Tester Override */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <span className="text-xs font-semibold text-slate-500 mr-1">{t.day_tarif}</span>
          <select
            id="day-type-override-select"
            value={dayTypeOverride}
            onChange={(e) => setDayTypeOverride(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-md px-2 py-1 font-sans focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="Auto">{t.auto_detect}</option>
            <option value="Senin-Jumat">{t.weekday}</option>
            <option value="Sabtu-Minggu/Libur">{t.weekend}</option>
          </select>
          <span
            id="active-day-type-badge"
            className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              activeDayType === "Sabtu-Minggu/Libur"
                ? "bg-amber-100 text-amber-800 border border-amber-200"
                : "bg-blue-100 text-blue-800 border border-blue-200"
            }`}
          >
            {activeDayType === "Sabtu-Minggu/Libur" ? (language === "ID" ? "Sabtu-Minggu" : "Sat-Sun") : (language === "ID" ? "Senin-Jumat" : "Mon-Fri")}
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
              {t.unit_price}
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
                {t.system_locked}
              </span>
            </div>
          </div>

          {/* Number of Visitors */}
          <div className="grid grid-cols-1 gap-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400" />
              {t.num_visitors}
            </label>
            <div className="relative">
              <input
                id="jumlah-pengunjung-input"
                type="number"
                min="0"
                placeholder={t.visitors_placeholder}
                value={jumlahPengunjung}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes("-")) return;
                  const parsed = parseInt(val);
                  if (parsed < 0) return;
                  setJumlahPengunjung(val);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <span className="absolute right-4 top-3 text-sm text-slate-500">{t.visitor_unit}</span>
            </div>
          </div>

          {/* Promotional Discounts */}
          <div className="grid grid-cols-1 gap-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-slate-400" />
              {t.select_discount}
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
                    {d.nama_diskon === "- Tanpa Diskon -" && language === "EN" ? "- No Discount -" : d.nama_diskon} {d.persen_diskon > 0 ? `(${d.persen_diskon}%)` : ""}
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

          {/* Real-time Inventory Status Indicator */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5 space-y-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status Inventaris Real-time (Hari Ini)</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-col items-center shadow-sm">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Loker T1</span>
                <span className={`text-sm font-black mt-0.5 ${sisaLoker1 <= 3 ? 'text-red-500 font-bold' : 'text-slate-700'}`}>
                  {sisaLoker1} <span className="text-[10px] font-medium text-slate-400">/ {maxLoker1}</span>
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-col items-center shadow-sm">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Loker T2</span>
                <span className={`text-sm font-black mt-0.5 ${sisaLoker2 <= 3 ? 'text-red-500 font-bold' : 'text-slate-700'}`}>
                  {sisaLoker2} <span className="text-[10px] font-medium text-slate-400">/ {maxLoker2}</span>
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-col items-center shadow-sm">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Saung T1</span>
                <span className={`text-sm font-black mt-0.5 ${sisaTempat1 <= 2 ? 'text-red-500 font-bold' : 'text-slate-700'}`}>
                  {sisaTempat1} <span className="text-[10px] font-medium text-slate-400">/ {maxTempat1}</span>
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-col items-center shadow-sm">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Saung T2</span>
                <span className={`text-sm font-black mt-0.5 ${sisaTempat2 <= 2 ? 'text-red-500 font-bold' : 'text-slate-700'}`}>
                  {sisaTempat2} <span className="text-[10px] font-medium text-slate-400">/ {maxTempat2}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Loker & Tempat Rentals (Requested upgrade) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sewa Loker */}
            <div className="grid grid-cols-1 gap-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-slate-400" />
                {t.sewa_loker}
              </label>
              <select
                id="sewa-loker-select"
                value={sewaLoker}
                onChange={(e) => {
                  const val = e.target.value as any;
                  if (val === "Tarif 1" && sisaLoker1 <= 0) {
                    setErrorMsg("Gagal: Kapasitas Loker Tarif 1 telah penuh!");
                    return;
                  }
                  if (val === "Tarif 2" && sisaLoker2 <= 0) {
                    setErrorMsg("Gagal: Kapasitas Loker Tarif 2 telah penuh!");
                    return;
                  }
                  setSewaLoker(val);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
              >
                <option value="Tidak">{t.no_rent}</option>
                <option value="Tarif 1" disabled={sisaLoker1 <= 0}>
                  Tarif 1 (Rp {rentalPrices.harga_loker_1.toLocaleString("id-ID")}) {sisaLoker1 <= 0 ? " [PENUH]" : ` - Sisa: ${sisaLoker1}/${maxLoker1}`}
                </option>
                <option value="Tarif 2" disabled={sisaLoker2 <= 0}>
                  Tarif 2 (Rp {rentalPrices.harga_loker_2.toLocaleString("id-ID")}) {sisaLoker2 <= 0 ? " [PENUH]" : ` - Sisa: ${sisaLoker2}/${maxLoker2}`}
                </option>
              </select>
            </div>

            {/* Sewa Tempat */}
            <div className="grid grid-cols-1 gap-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Tent className="w-4 h-4 text-slate-400" />
                {t.sewa_tempat}
              </label>
              <select
                id="sewa-tempat-select"
                value={sewaTempat}
                onChange={(e) => {
                  const val = e.target.value as any;
                  if (val === "Tarif 1" && sisaTempat1 <= 0) {
                    setErrorMsg("Gagal: Kapasitas Saung Tarif 1 telah penuh!");
                    return;
                  }
                  if (val === "Tarif 2" && sisaTempat2 <= 0) {
                    setErrorMsg("Gagal: Kapasitas Saung Tarif 2 telah penuh!");
                    return;
                  }
                  setSewaTempat(val);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
              >
                <option value="Tidak">{t.no_rent}</option>
                <option value="Tarif 1" disabled={sisaTempat1 <= 0}>
                  Tarif 1 (Rp {rentalPrices.harga_tempat_1.toLocaleString("id-ID")}) {sisaTempat1 <= 0 ? " [PENUH]" : ` - Sisa: ${sisaTempat1}/${maxTempat1}`}
                </option>
                <option value="Tarif 2" disabled={sisaTempat2 <= 0}>
                  Tarif 2 (Rp {rentalPrices.harga_tempat_2.toLocaleString("id-ID")}) {sisaTempat2 <= 0 ? " [PENUH]" : ` - Sisa: ${sisaTempat2}/${maxTempat2}`}
                </option>
              </select>
            </div>
          </div>

          {/* Total Display (High Highlighted) */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-inner border border-slate-800 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-blue-400 tracking-widest uppercase mb-1">
              {t.total_to_pay}
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-blue-400 font-sans text-xl font-bold">Rp</span>
              <span id="total-akhir-display" className="text-3xl font-black text-white font-mono tracking-tight">
                {totalAkhir.toLocaleString("id-ID")}
              </span>
            </div>
            
            {/* Ticket breakdown snippet */}
            {((parseInt(jumlahPengunjung) > 0) || sewaLoker !== "Tidak" || sewaTempat !== "Tidak") && (
              <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>{t.breakdown}: {jumlahPengunjung || 0} {language === "ID" ? "Tiket" : "Tickets"} x Rp {hargaSatuan.toLocaleString("id-ID")}</span>
                  {persenDiskon > 0 && <span>{t.saved}: {persenDiskon}%</span>}
                </div>
                {sewaLoker !== "Tidak" && (
                  <div className="flex justify-between text-[11px] text-blue-400/90">
                    <span>{t.sewa_loker} (Rp {LOKER_PRICES[sewaLoker].toLocaleString("id-ID")})</span>
                    <span>+Rp {LOKER_PRICES[sewaLoker].toLocaleString("id-ID")}</span>
                  </div>
                )}
                {sewaTempat !== "Tidak" && (
                  <div className="flex justify-between text-[11px] text-blue-400/90">
                    <span>{t.sewa_tempat} (Rp {TEMPAT_PRICES[sewaTempat].toLocaleString("id-ID")})</span>
                    <span>+Rp {TEMPAT_PRICES[sewaTempat].toLocaleString("id-ID")}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-1 gap-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-slate-400" />
              {t.payment_method}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "Tunai", label: t.cash, icon: Banknote },
                { id: "QRIS", label: t.qris, icon: QrCode },
                { id: "Debit/Kredit", label: t.card, icon: CreditCard },
              ].map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-center transition-all ${
                      active
                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 mb-1" />
                    <span className="text-[10px] font-bold">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional Payment Method Input Forms */}
          {paymentMethod === "Tunai" && (
            <>
              {/* Paid input */}
              <div className="grid grid-cols-1 gap-1.5 animate-in fade-in duration-150">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-slate-400" />
                  {t.enter_cash}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 font-medium">Rp</span>
                  <input
                    id="bayar-input"
                    type="number"
                    min="0"
                    placeholder="Contoh: 100000"
                    value={bayar}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes("-")) return;
                      const parsed = parseFloat(val);
                      if (parsed < 0) return;
                      setBayar(val);
                    }}
                    required={paymentMethod === "Tunai"}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  {/* Quick denominational buttons for cashier ease of use! */}
                  {totalAkhir > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {[totalAkhir, 20000, 50000, 100000].map((denom, idx) => {
                        if (denom < totalAkhir && denom !== totalAkhir) return null;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setBayar(denom.toString())}
                            className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded border border-slate-200 transition"
                          >
                            Rp {denom.toLocaleString("id-ID")}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Change Display */}
              <div className="grid grid-cols-1 gap-1.5 animate-in fade-in duration-150">
                <span className="text-sm font-semibold text-slate-700">{t.change_due}</span>
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
                  {isKurang ? t.insufficient_funds : (parseFloat(bayar) > 0 ? `Rp ${(parseFloat(bayar) - totalAkhir).toLocaleString("id-ID")}` : "Rp 0")}
                </div>
              </div>
            </>
          )}

          {paymentMethod === "QRIS" && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center space-y-3 animate-in fade-in duration-150">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{language === "ID" ? "Pindai QRIS GoSplash" : "Scan GoSplash QRIS"}</span>
              {/* Beautiful Mock QR Code block */}
              <div className="relative bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                <div className="w-28 h-28 bg-slate-100 flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-lg overflow-hidden relative">
                  <QrCode className="w-20 h-20 text-slate-800" />
                  <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/10 backdrop-blur-[0.5px]">
                    <span className="bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow">
                      QRIS LIVE
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-2">NMID: ID1029384756</span>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-600 font-sans">
                  {language === "ID" ? "Tunjukkan Kode QRIS di atas kepada pengunjung." : "Show the QRIS code above to the visitor."}
                </p>
                <p className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center justify-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  {language === "ID" ? "Menunggu Pembayaran (Otomatis)..." : "Waiting for Payment (Automatic)..."}
                </p>
              </div>
            </div>
          )}

          {paymentMethod === "Debit/Kredit" && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-in fade-in duration-150">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block text-center">{language === "ID" ? "Data Pembayaran Kartu EDC" : "EDC Card Payment Details"}</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid grid-cols-1 gap-1">
                  <span className="text-xs font-bold text-slate-500">{language === "ID" ? "Mesin EDC" : "EDC Machine"}</span>
                  <select
                    value={cardIssuer}
                    onChange={(e) => setCardIssuer(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="BCA">EDC BCA</option>
                    <option value="Mandiri">EDC Mandiri</option>
                    <option value="BRI">EDC BRI</option>
                    <option value="BNI">EDC BNI</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  <span className="text-xs font-bold text-slate-500">No. Reff / Approval</span>
                  <input
                    type="text"
                    placeholder="Contoh: 859402"
                    value={cardRefNo}
                    onChange={(e) => setCardRefNo(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-sans text-center leading-tight">
                {language === "ID" ? "Pastikan transaksi kartu sukses di mesin EDC fisik sebelum menyimpan transaksi." : "Ensure the card transaction succeeds on the physical EDC terminal before saving."}
              </p>
            </div>
          )}
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
            disabled={bayar === "" || isKurang || (parseInt(jumlahPengunjung) || 0) < 0 || ((parseInt(jumlahPengunjung) || 0) === 0 && sewaLoker === "Tidak" && sewaTempat === "Tidak")}
            className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl shadow-md transition-all duration-200 ${
              bayar === "" || isKurang || (parseInt(jumlahPengunjung) || 0) < 0 || ((parseInt(jumlahPengunjung) || 0) === 0 && sewaLoker === "Tidak" && sewaTempat === "Tidak")
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border border-slate-200"
                : "bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-emerald-100"
            }`}
          >
            <Printer className="w-5 h-5" />
            {t.save_and_print}
          </button>
        </div>
      </form>
    </div>
  );
};
