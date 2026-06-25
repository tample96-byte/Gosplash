/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Transaction, TicketPrice, Discount, ReportPeriod } from "../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { ShieldAlert, Download, Coins, Calendar, CalendarRange, Trash2, Plus, Edit3, Settings, AlertCircle, HelpCircle, CheckCircle, X } from "lucide-react";

interface AdminPanelProps {
  isLocked: boolean;
  transactions: Transaction[];
  prices: TicketPrice[];
  discounts: Discount[];
  printerName: string;
  onUpdatePrices: (prices: TicketPrice[]) => void;
  onUpdateDiscounts: (discounts: Discount[]) => void;
  onUpdatePrinter: (name: string) => void;
  onClearTransactions: () => void;
  onUpdateTransactions?: (transactions: Transaction[]) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isLocked,
  transactions,
  prices,
  discounts,
  printerName,
  onUpdatePrices,
  onUpdateDiscounts,
  onUpdatePrinter,
  onClearTransactions,
  onUpdateTransactions,
}) => {
  // Filters matching VB.NET form controls
  const [period, setPeriod] = useState<ReportPeriod>("Harian");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );

  // Administrative Price Modification States
  const [weekdayPrice, setWeekdayPrice] = useState<string>("");
  const [weekendPrice, setWeekendPrice] = useState<string>("");

  // Printer Configuration State
  const [printerInput, setPrinterInput] = useState<string>(printerName);

  // Discount modification states
  const [newDiscName, setNewDiscName] = useState<string>("");
  const [newDiscPercent, setNewDiscPercent] = useState<string>("");

  // Editing state for discounts
  const [editingDiscId, setEditingDiscId] = useState<string | null>(null);
  const [editingDiscName, setEditingDiscName] = useState<string>("");
  const [editingDiscPercent, setEditingDiscPercent] = useState<string>("");

  // Transaction editing and deletion states
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);
  const [txEditQty, setTxEditQty] = useState<string>("");
  const [txEditDayType, setTxEditDayType] = useState<"Senin-Jumat" | "Sabtu-Minggu/Libur">("Senin-Jumat");
  const [txEditDiscountId, setTxEditDiscountId] = useState<string>("");
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  // Custom UI modal & toast states (replaces blocked native confirm/alert)
  const [promoToDelete, setPromoToDelete] = useState<Discount | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-dismiss toast message after 3 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Sync admin inputs with prop values
  useEffect(() => {
    const weekday = prices.find((p) => p.jenis_hari === "Senin-Jumat");
    const weekend = prices.find((p) => p.jenis_hari === "Sabtu-Minggu/Libur");
    if (weekday) setWeekdayPrice(weekday.harga_tiket.toString());
    if (weekend) setWeekendPrice(weekend.harga_tiket.toString());
  }, [prices]);

  useEffect(() => {
    setPrinterInput(printerName);
  }, [printerName]);

  // Filter Transactions according to selected date & period
  const getFilteredTransactions = (): Transaction[] => {
    const targetDate = new Date(selectedDate);
    
    return transactions.filter((tx) => {
      const txDate = new Date(tx.tanggal);
      
      if (period === "Harian") {
        // Match exact day
        return (
          txDate.getFullYear() === targetDate.getFullYear() &&
          txDate.getMonth() === targetDate.getMonth() &&
          txDate.getDate() === targetDate.getDate()
        );
      } else if (period === "Mingguan") {
        // Match within last 7 days of target date
        const timeDiff = targetDate.getTime() - txDate.getTime();
        const dayDiff = timeDiff / (1000 * 3600 * 24);
        return dayDiff >= 0 && dayDiff <= 7;
      } else {
        // Bulanan - Match same month and year
        return (
          txDate.getFullYear() === targetDate.getFullYear() &&
          txDate.getMonth() === targetDate.getMonth()
        );
      }
    });
  };

  const filteredTx = getFilteredTransactions();

  // Aggregate stats
  const totalRevenue = filteredTx.reduce((sum, tx) => sum + tx.total_bayar, 0);
  const totalVisitors = filteredTx.reduce((sum, tx) => sum + tx.jumlah_pengunjung, 0);

  // Prepare Chart Data
  const getChartData = () => {
    if (period === "Harian") {
      // Group by hours (08:00 to 17:00)
      const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8 to 18
      return hours.map((hour) => {
        const hourString = `${hour.toString().padStart(2, "0")}:00`;
        const hourTx = filteredTx.filter((tx) => {
          const date = new Date(tx.tanggal);
          return date.getHours() === hour;
        });
        const revenue = hourTx.reduce((sum, tx) => sum + tx.total_bayar, 0);
        const visitors = hourTx.reduce((sum, tx) => sum + tx.jumlah_pengunjung, 0);
        return {
          label: hourString,
          Pendapatan: revenue,
          Pengunjung: visitors,
        };
      });
    } else if (period === "Mingguan") {
      // Group by individual days in the last 7 days from targetDate
      const data: { label: string; Pendapatan: number; Pengunjung: number }[] = [];
      const targetDate = new Date(selectedDate);
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date(targetDate.getTime() - i * 24 * 60 * 60 * 1000);
        const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });
        const dateString = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        
        const dayTx = filteredTx.filter((tx) => {
          const txDate = new Date(tx.tanggal);
          return txDate.getDate() === d.getDate() && txDate.getMonth() === d.getMonth();
        });
        
        const revenue = dayTx.reduce((sum, tx) => sum + tx.total_bayar, 0);
        const visitors = dayTx.reduce((sum, tx) => sum + tx.jumlah_pengunjung, 0);
        
        data.push({
          label: `${dayName} (${dateString})`,
          Pendapatan: revenue,
          Pengunjung: visitors,
        });
      }
      return data;
    } else {
      // Bulanan: Group by weeks (Week 1, Week 2, etc. of selected month)
      const data: { label: string; Pendapatan: number; Pengunjung: number }[] = [];
      const targetDate = new Date(selectedDate);
      
      for (let w = 1; w <= 5; w++) {
        const weekTx = filteredTx.filter((tx) => {
          const txDate = new Date(tx.tanggal);
          const dayOfMonth = txDate.getDate();
          const weekOfTx = Math.ceil(dayOfMonth / 7);
          return weekOfTx === w;
        });
        
        const revenue = weekTx.reduce((sum, tx) => sum + tx.total_bayar, 0);
        const visitors = weekTx.reduce((sum, tx) => sum + tx.jumlah_pengunjung, 0);
        
        data.push({
          label: `Minggu ${w}`,
          Pendapatan: revenue,
          Pengunjung: visitors,
        });
      }
      return data;
    }
  };

  const chartData = getChartData();

  // Handle price update submit
  const handleUpdatePrices = (e: React.FormEvent) => {
    e.preventDefault();
    const weekdayNum = parseInt(weekdayPrice) || 0;
    const weekendNum = parseInt(weekendPrice) || 0;

    if (weekdayNum <= 0 || weekendNum <= 0) {
      setToastMessage({ type: "error", text: "Harga tiket harus lebih besar dari 0!" });
      return;
    }

    onUpdatePrices([
      { jenis_hari: "Senin-Jumat", harga_tiket: weekdayNum },
      { jenis_hari: "Sabtu-Minggu/Libur", harga_tiket: weekendNum },
    ]);
    setToastMessage({ type: "success", text: "Tarif Tiket Berhasil Diperbarui!" });
  };

  // Handle printer update submit
  const handleUpdatePrinter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!printerInput.trim()) return;
    onUpdatePrinter(printerInput.trim());
    setToastMessage({ type: "success", text: `Nama Printer diubah menjadi: ${printerInput}` });
  };

  // Handle adding new discount promo
  const handleAddDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newDiscName.trim();
    const percent = parseInt(newDiscPercent) || 0;

    if (!name) return;
    if (percent < 0 || percent > 100) {
      setToastMessage({ type: "error", text: "Persen diskon harus di antara 0% dan 100%!" });
      return;
    }

    const newDisc: Discount = {
      id: `disc-${Date.now()}`,
      nama_diskon: name,
      persen_diskon: percent,
    };

    onUpdateDiscounts([...discounts, newDisc]);
    setNewDiscName("");
    setNewDiscPercent("");
    setToastMessage({ type: "success", text: `Promo "${name}" Berhasil Ditambahkan!` });
  };

  // Delete a promo discount code
  const handleDeleteDiscount = (id: string) => {
    // Prevent deleting default standard discount "- Tanpa Diskon -"
    const target = discounts.find((d) => d.id === id);
    if (target?.nama_diskon === "- Tanpa Diskon -") {
      setToastMessage({ type: "error", text: "Diskon standar tidak boleh dihapus!" });
      return;
    }

    setPromoToDelete(target || null);
  };

  const confirmDeleteDiscount = () => {
    if (promoToDelete) {
      onUpdateDiscounts(discounts.filter((d) => d.id !== promoToDelete.id));
      if (editingDiscId === promoToDelete.id) {
        setEditingDiscId(null);
      }
      setToastMessage({ type: "success", text: `Promo "${promoToDelete.nama_diskon}" Berhasil Dihapus!` });
      setPromoToDelete(null);
    }
  };

  // Start editing a promo
  const handleStartEditDiscount = (d: Discount) => {
    setEditingDiscId(d.id);
    setEditingDiscName(d.nama_diskon);
    setEditingDiscPercent(d.persen_diskon.toString());
  };

  // Save the edited promo discount
  const handleSaveEditDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDiscId) return;

    const name = editingDiscName.trim();
    const percent = parseInt(editingDiscPercent) || 0;

    if (!name) {
      setToastMessage({ type: "error", text: "Nama promo tidak boleh kosong!" });
      return;
    }
    if (percent < 0 || percent > 100) {
      setToastMessage({ type: "error", text: "Persen diskon harus di antara 0% dan 100%!" });
      return;
    }

    const updated = discounts.map((d) => {
      if (d.id === editingDiscId) {
        return { ...d, nama_diskon: name, persen_diskon: percent };
      }
      return d;
    });

    onUpdateDiscounts(updated);
    setEditingDiscId(null);
    setToastMessage({ type: "success", text: `Promo "${name}" Berhasil Diperbarui!` });
  };

  // Cancel edit
  const handleCancelEditDiscount = () => {
    setEditingDiscId(null);
  };

  // Start edit transaction
  const handleStartEditTx = (tx: Transaction) => {
    setTxToEdit(tx);
    setTxEditQty(tx.jumlah_pengunjung.toString());
    setTxEditDayType(tx.jenis_hari as "Senin-Jumat" | "Sabtu-Minggu/Libur");
    
    // Find matching discount ID
    const matchedDisc = discounts.find(
      (d) => d.nama_diskon === tx.nama_diskon && d.persen_diskon === tx.diskon_persen
    );
    setTxEditDiscountId(matchedDisc ? matchedDisc.id : discounts[0]?.id || "");
  };

  // Save edited transaction
  const handleSaveEditTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txToEdit || !onUpdateTransactions) return;

    const qty = parseInt(txEditQty) || 0;
    if (qty <= 0) {
      setToastMessage({ type: "error", text: "Jumlah pengunjung harus lebih besar dari 0!" });
      return;
    }

    // Get unit price based on day type
    const matchedPrice = prices.find((p) => p.jenis_hari === txEditDayType);
    const pricePerUnit = matchedPrice ? matchedPrice.harga_tiket : 15000;

    // Get discount percentage and name
    const matchedDisc = discounts.find((d) => d.id === txEditDiscountId);
    const discPercent = matchedDisc ? matchedDisc.persen_diskon : 0;
    const discName = matchedDisc ? matchedDisc.nama_diskon : "- Tanpa Diskon -";

    // Recalculate total
    const subtotal = pricePerUnit * qty;
    const total = subtotal - subtotal * (discPercent / 100);

    // Update the transaction list
    const updated = transactions.map((t) => {
      if (t.id === txToEdit.id) {
        return {
          ...t,
          jumlah_pengunjung: qty,
          jenis_hari: txEditDayType,
          harga_satuan: pricePerUnit,
          diskon_persen: discPercent,
          nama_diskon: discName,
          total_bayar: total,
          kembalian: t.bayar >= total ? t.bayar - total : 0,
        };
      }
      return t;
    });

    onUpdateTransactions(updated);
    setTxToEdit(null);
    setToastMessage({ type: "success", text: `Transaksi #${txToEdit.id} Berhasil Diperbarui!` });
  };

  // Delete transaction handler
  const handleDeleteTxClick = (tx: Transaction) => {
    setTxToDelete(tx);
  };

  const confirmDeleteTx = () => {
    if (!txToDelete || !onUpdateTransactions) return;

    const updated = transactions.filter((t) => t.id !== txToDelete.id);
    onUpdateTransactions(updated);
    setToastMessage({ type: "success", text: `Transaksi #${txToDelete.id} Berhasil Dihapus!` });
    setTxToDelete(null);
  };

  // Export to Excel / CSV format
  const handleExportExcel = () => {
    if (filteredTx.length === 0) {
      setToastMessage({ type: "error", text: "Tidak ada data transaksi untuk diekspor!" });
      return;
    }

    // Prepare CSV header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "No. Nota,Tanggal,Hari,Harga Satuan,Jumlah Pengunjung,Diskon %,Total Bayar,Bayar Tunai,Kembalian\n";

    // Add transaction lines
    filteredTx.forEach((tx) => {
      const formattedDate = new Date(tx.tanggal).toISOString().replace("T", " ").substring(0, 19);
      csvContent += `${tx.id},${formattedDate},${tx.jenis_hari},${tx.harga_satuan},${tx.jumlah_pengunjung},${tx.diskon_persen},${tx.total_bayar},${tx.bayar},${tx.kembalian}\n`;
    });

    // Create a programmatical download anchor
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Laporan_GoSplash_${period}_${selectedDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative h-full">
      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-sm transition-all duration-300 transform translate-y-0 scale-100 ${
          toastMessage.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {toastMessage.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{toastMessage.text}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CUSTOM PROMO DELETE CONFIRMATION MODAL */}
      {promoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-full border border-rose-100 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">Hapus Promo</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Apakah Anda yakin ingin menghapus promo <strong className="text-slate-800">"{promoToDelete.nama_diskon}"</strong> ({promoToDelete.persen_diskon}%)? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPromoToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteDiscount}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM TRANSACTION EDIT MODAL */}
      {txToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <form onSubmit={handleSaveEditTx} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                Ubah Transaksi #{txToEdit.id}
              </h3>
              <button
                type="button"
                onClick={() => setTxToEdit(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Jumlah Pengunjung */}
              <div className="grid grid-cols-1 gap-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Jumlah Pengunjung (Pax)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={txEditQty}
                  onChange={(e) => setTxEditQty(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Tipe Hari */}
              <div className="grid grid-cols-1 gap-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Tipe Hari</label>
                <select
                  value={txEditDayType}
                  onChange={(e) => setTxEditDayType(e.target.value as "Senin-Jumat" | "Sabtu-Minggu/Libur")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Senin-Jumat">Senin-Jumat (Weekday)</option>
                  <option value="Sabtu-Minggu/Libur">Sabtu-Minggu/Libur (Weekend)</option>
                </select>
              </div>

              {/* Diskon / Promo */}
              <div className="grid grid-cols-1 gap-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Diskon Promo</label>
                <select
                  value={txEditDiscountId}
                  onChange={(e) => setTxEditDiscountId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {discounts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nama_diskon} {d.persen_diskon > 0 ? `(${d.persen_diskon}%)` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTxToEdit(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CUSTOM TRANSACTION DELETE CONFIRMATION MODAL */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-full border border-rose-100 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">Hapus Transaksi</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Apakah Anda yakin ingin menghapus transaksi <strong className="text-slate-800 font-mono">#{txToDelete.id}</strong> sejumlah <strong className="text-slate-800">Rp {txToDelete.total_bayar.toLocaleString("id-ID")}</strong>? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteTx}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOCKED ACCESS OVERLAY */}
      {isLocked && (
        <div className="absolute inset-0 z-40 bg-slate-100/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-300">
          <div className="bg-rose-100 p-5 rounded-full mb-4 border border-rose-200">
            <ShieldAlert className="w-12 h-12 text-rose-600" />
          </div>
          <h2 className="text-2xl font-black text-rose-800 tracking-tight">
            LAPORAN DIKUNCI
          </h2>
          <p className="text-sm font-semibold text-rose-700/80 mt-1 max-w-sm">
            Hak akses Anda saat ini adalah KASIR. Menu laporan & pengaturan harga hanya dapat diakses oleh ADMIN.
          </p>
          <div className="mt-6 flex flex-col items-center gap-1 bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-sans">Ingin melakukan uji coba Admin?</span>
            <span className="text-xs font-semibold text-slate-800">
              Ganti user di pojok kanan atas menjadi <strong className="text-blue-600">Admin</strong>
            </span>
          </div>
        </div>
      )}

      <div className={`space-y-6 ${isLocked ? "pointer-events-none opacity-30 select-none" : ""}`}>
        
        {/* TOP STATS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium font-sans">Total Pendapatan ({period})</p>
              <h3 className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">
                Rp {totalRevenue.toLocaleString("id-ID")}
              </h3>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CalendarRange className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium font-sans">Total Pengunjung ({period})</p>
              <h3 className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">
                {totalVisitors.toLocaleString("id-ID")} Orang
              </h3>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4 sm:col-span-2 lg:col-span-1">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium font-sans">Jumlah Transaksi</p>
              <h3 className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">
                {filteredTx.length} Transaksi
              </h3>
            </div>
          </div>
        </div>

        {/* REPORTS & CHART PANEL */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">
                Laporan & Grafik Pendapatan GoSplash
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Analisis data penjualan tiket berdasarkan periode
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                id="periode-laporan-select"
                value={period}
                onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Harian">Harian</option>
                <option value="Mingguan">Mingguan</option>
                <option value="Bulanan">Bulanan</option>
              </select>
              
              <input
                id="tanggal-laporan-input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <button
                id="export-excel-btn"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition"
              >
                <Download className="w-4 h-4" />
                EXPORT EXCEL
              </button>
            </div>
          </div>

          {/* DYNAMIC CHART */}
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `Rp ${val.toLocaleString("id-ID")}`} />
                <Tooltip
                  formatter={(value: any) => [`Rp ${value.toLocaleString("id-ID")}`, "Pendapatan"]}
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="Pendapatan" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* DATA GRID VIEW (TRANSACTION LOG TABLE) */}
          <div className="border border-slate-150 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[220px]">
              <table id="laporan-table" className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-5 py-3">No. Nota</th>
                    <th className="px-5 py-3">Tanggal</th>
                    <th className="px-5 py-3">Tipe Hari</th>
                    <th className="px-5 py-3 text-right">Tarif</th>
                    <th className="px-5 py-3 text-center">Jumlah</th>
                    <th className="px-5 py-3">Diskon Promo</th>
                    <th className="px-5 py-3 text-right">Total Bayar</th>
                    <th className="px-5 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTx.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-slate-400 font-sans">
                        Tidak ada transaksi terekam pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    filteredTx.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition duration-150">
                        <td className="px-5 py-3.5 font-bold font-mono text-slate-800">#{tx.id}</td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {new Date(tx.tanggal).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            tx.jenis_hari === "Sabtu-Minggu/Libur"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>
                            {tx.jenis_hari}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-slate-700 font-mono">
                          Rp {tx.harga_satuan.toLocaleString("id-ID")}
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-800">{tx.jumlah_pengunjung} Pax</td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {tx.diskon_persen > 0 ? (
                            <span className="text-emerald-700 font-medium">
                              {tx.nama_diskon} ({tx.diskon_persen}%)
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-900 font-mono">
                          Rp {tx.total_bayar.toLocaleString("id-ID")}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditTx(tx)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Ubah Transaksi"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTxClick(tx)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus Transaksi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SETTINGS MENU (TICKET PRICE & PROMO CODES) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* TICKET PRICE CONFIGURATION */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-4">
              <Settings className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Atur Harga Tiket (Tarif Air)</h3>
                <p className="text-xs text-slate-400">Modifikasi harga tiket langsung diperbarui ke database</p>
              </div>
            </div>

            <form onSubmit={handleUpdatePrices} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid grid-cols-1 gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Senin-Jumat (Weekday)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">Rp</span>
                    <input
                      id="set-senin-jumat-input"
                      type="number"
                      value={weekdayPrice}
                      onChange={(e) => setWeekdayPrice(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sabtu-Minggu / Libur</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">Rp</span>
                    <input
                      id="set-sabtu-minggu-input"
                      type="number"
                      value={weekendPrice}
                      onChange={(e) => setWeekendPrice(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              <button
                id="update-harga-btn"
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition"
              >
                UPDATE HARGA TIKET
              </button>
            </form>

            {/* PRINTER SETTING PORTED FROM VB */}
            <form onSubmit={handleUpdatePrinter} className="pt-3 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-1 gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Printer POS (Thermal)</label>
                <div className="flex gap-2">
                  <input
                    id="set-printer-input"
                    type="text"
                    value={printerInput}
                    onChange={(e) => setPrinterInput(e.target.value)}
                    required
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none"
                  />
                  <button
                    id="update-printer-btn"
                    type="submit"
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 rounded-xl transition"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* DISCOUNTS / PROMOS MANAGER */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-4">
              <Coins className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Kelola Promo & Diskon Pendukung</h3>
                <p className="text-xs text-slate-400">Daftar diskon potongan harga tiket aktif</p>
              </div>
            </div>

            {/* Add Promo form */}
            <form onSubmit={handleAddDiscount} className="flex gap-2 items-end">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="grid grid-cols-1 gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Promo</span>
                  <input
                    id="promo-nama-input"
                    type="text"
                    placeholder="Contoh: Promo Lansia"
                    value={newDiscName}
                    onChange={(e) => setNewDiscName(e.target.value)}
                    required
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800"
                  />
                </div>
                <div className="grid grid-cols-1 gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diskon (%)</span>
                  <input
                    id="promo-persen-input"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Contoh: 15"
                    value={newDiscPercent}
                    onChange={(e) => setNewDiscPercent(e.target.value)}
                    required
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>
              <button
                id="add-promo-btn"
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-2 rounded-lg transition shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {/* Promo Codes list */}
            <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
              {discounts.map((d) => {
                if (editingDiscId === d.id) {
                  return (
                    <form
                      key={d.id}
                      onSubmit={handleSaveEditDiscount}
                      className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl animate-fade-in"
                    >
                      <div className="flex-1 grid grid-cols-2 gap-1.5">
                        <input
                          id={`edit-promo-name-${d.id}`}
                          type="text"
                          required
                          value={editingDiscName}
                          onChange={(e) => setEditingDiscName(e.target.value)}
                          className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800"
                          placeholder="Nama promo"
                        />
                        <div className="relative">
                          <input
                            id={`edit-promo-percent-${d.id}`}
                            type="number"
                            min="0"
                            max="100"
                            required
                            value={editingDiscPercent}
                            onChange={(e) => setEditingDiscPercent(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg pl-2 pr-6 py-1 text-xs font-semibold text-slate-800 font-mono"
                            placeholder="%"
                          />
                          <span className="absolute right-2 top-1 text-slate-400 text-xs font-mono">%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="submit"
                          id={`save-promo-btn-${d.id}`}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-1.5 rounded-lg text-[10px] transition"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          id={`cancel-promo-btn-${d.id}`}
                          onClick={handleCancelEditDiscount}
                          className="bg-slate-300 hover:bg-slate-400 text-slate-700 font-bold px-2 py-1.5 rounded-lg text-[10px] transition"
                        >
                          Batal
                        </button>
                      </div>
                    </form>
                  );
                }

                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">{d.nama_diskon}</span>
                      <span className="text-[10px] font-semibold text-slate-400 font-mono">
                        Potongan: {d.persen_diskon}%
                      </span>
                    </div>
                    {d.nama_diskon !== "- Tanpa Diskon -" && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          id={`edit-promo-trigger-${d.id}`}
                          onClick={() => handleStartEditDiscount(d)}
                          className="flex items-center gap-1 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 px-2 py-1 rounded-lg text-[10px] font-bold transition shadow-sm"
                          title="Ubah Promo"
                        >
                          <Edit3 className="w-3 h-3" />
                          Ubah
                        </button>
                        <button
                          type="button"
                          id={`delete-promo-btn-${d.id}`}
                          onClick={() => handleDeleteDiscount(d.id)}
                          className="flex items-center gap-1 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 px-2 py-1 rounded-lg text-[10px] font-bold transition shadow-sm"
                          title="Hapus Promo"
                        >
                          <Trash2 className="w-3 h-3" />
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
