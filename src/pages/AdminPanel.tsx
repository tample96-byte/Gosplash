/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Transaction, TicketPrice, Discount, ReportPeriod, RentalPrices } from "../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { ShieldAlert, Download, Coins, Calendar, CalendarRange, Trash2, Plus, Edit3, Settings, AlertCircle, HelpCircle, CheckCircle, X, Search, Printer, Key, Tent, Database, Upload, Shield, Eye, EyeOff } from "lucide-react";
import { saveAdminPassword, saveKasirPassword } from "../utils/storage";
import { Language, translations } from "../utils/lang";
import { encryptData, decryptData, calculateIntegrityChecksum, validateBackupTimestamp } from "../utils/crypto";

interface AdminPanelProps {
  isLocked: boolean;
  transactions: Transaction[];
  prices: TicketPrice[];
  discounts: Discount[];
  rentalPrices: RentalPrices;
  printerName: string;
  onUpdatePrices: (prices: TicketPrice[]) => void;
  onUpdateRentalPrices: (prices: RentalPrices) => void;
  onUpdateDiscounts: (discounts: Discount[]) => void;
  onUpdatePrinter: (name: string) => void;
  onClearTransactions: () => void;
  onClearTransactionsOnly: () => void;
  onRestoreAllData: (data: {
    prices: TicketPrice[];
    rentalPrices: RentalPrices;
    discounts: Discount[];
    transactions: Transaction[];
    printerName: string;
  }) => void;
  onUpdateTransactions?: (transactions: Transaction[]) => void;
  onShowReceipt?: (tx: Transaction) => void;
  language: Language;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isLocked,
  transactions,
  prices,
  discounts,
  rentalPrices,
  printerName,
  onUpdatePrices,
  onUpdateRentalPrices,
  onUpdateDiscounts,
  onUpdatePrinter,
  onClearTransactions,
  onClearTransactionsOnly,
  onRestoreAllData,
  onUpdateTransactions,
  onShowReceipt,
  language,
}) => {
  const t = translations[language];
  // Filters matching VB.NET form controls
  const [period, setPeriod] = useState<ReportPeriod>("Harian");

  const getLocalDateString = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Administrative Price & Capacity Modification States
  const [weekdayPrice, setWeekdayPrice] = useState<string>("");
  const [weekendPrice, setWeekendPrice] = useState<string>("");
  const [loker1Price, setLoker1Price] = useState<string>("");
  const [loker2Price, setLoker2Price] = useState<string>("");
  const [tempat1Price, setTempat1Price] = useState<string>("");
  const [tempat2Price, setTempat2Price] = useState<string>("");
  const [totalLoker1, setTotalLoker1] = useState<string>("");
  const [totalLoker2, setTotalLoker2] = useState<string>("");
  const [totalTempat1, setTotalTempat1] = useState<string>("");
  const [totalTempat2, setTotalTempat2] = useState<string>("");

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
  const [txEditPaymentMethod, setTxEditPaymentMethod] = useState<"Tunai" | "QRIS" | "Debit/Kredit">("Tunai");
  const [txEditLoker, setTxEditLoker] = useState<"Tidak" | "Tarif 1" | "Tarif 2">("Tidak");
  const [txEditTempat, setTxEditTempat] = useState<"Tidak" | "Tarif 1" | "Tarif 2">("Tidak");
  const [txEditBayar, setTxEditBayar] = useState<string>("");
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  // Custom UI modal & toast states (replaces blocked native confirm/alert)
  const [promoToDelete, setPromoToDelete] = useState<Discount | null>(null);
  const [showEodModal, setShowEodModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetConfirmText, setResetConfirmText] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Pagination States for Transaction Log (Sangat Ringan & Rapih)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Backup & Change Password States
  const [selectedPasswordRole, setSelectedPasswordRole] = useState<"Admin" | "Kasir">("Admin");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Backup Export Handler
  const handleExportBackup = async () => {
    try {
      // 1. Generate lightweight audit trail with integrity checksum
      const checksum = calculateIntegrityChecksum(transactions);
      const auditTrail = {
        timestamp: new Date().toISOString(),
        exported_by: "Admin",
        record_count: {
          transactions: transactions.length,
          discounts: discounts.length,
          prices: prices.length,
        },
        integrity_checksum: checksum,
        app_id: "gosplash_ticketing_backup",
      };

      const backupData = {
        prices,
        rentalPrices,
        discounts,
        transactions,
        printerName,
        backup_date: auditTrail.timestamp,
        app_id: "gosplash_ticketing_backup",
        audit_trail: auditTrail, // Embed the standard lightweight audit trail inside json
      };

      // 2. Encrypt JSON data to ensure tamper-proof offline storage using AES-GCM
      const jsonString = JSON.stringify(backupData, null, 2);
      const encryptedPayload = await encryptData(jsonString);

      const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(encryptedPayload);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      
      const formattedDate = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("download", `GoSplash_Backup_Encrypted_${formattedDate}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setToastMessage({ type: "success", text: "Backup terenkripsi & Audit Trail berhasil diekspor!" });
    } catch (err) {
      setToastMessage({ type: "error", text: "Gagal mengekspor data cadangan." });
    }
  };

  // Backup Import/Restore Handler
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== "string") {
          throw new Error("Konten file tidak valid.");
        }

        // 1. Decrypt loaded file payload using async AES-GCM decryption
        const decryptedJson = await decryptData(result.trim());
        const parsedData = JSON.parse(decryptedJson);

        // Basic structural validation
        if (
          !parsedData ||
          parsedData.app_id !== "gosplash_ticketing_backup" ||
          !Array.isArray(parsedData.prices) ||
          !Array.isArray(parsedData.discounts) ||
          !Array.isArray(parsedData.transactions) ||
          !parsedData.rentalPrices
        ) {
          throw new Error("Format file cadangan tidak valid atau enkripsi rusak.");
        }

        // 2. Secure Timestamp Validation (prevents spoofing or future dates)
        validateBackupTimestamp(parsedData.backup_date);

        // 3. Audit Trail & Integrity Verification
        let auditNotice = "";
        if (parsedData.audit_trail) {
          const audit = parsedData.audit_trail;
          const calculatedChecksum = calculateIntegrityChecksum(parsedData.transactions);
          
          if (audit.integrity_checksum !== calculatedChecksum) {
            console.warn("Peringatan: Checksum integrasi data tidak cocok!");
            auditNotice = " (Peringatan: Checksum integrasi tidak cocok, data mungkin dimodifikasi secara tidak sah)";
          } else {
            auditNotice = ` (${audit.record_count.transactions} Transaksi terverifikasi)`;
          }
        }

        onRestoreAllData({
          prices: parsedData.prices,
          rentalPrices: parsedData.rentalPrices,
          discounts: parsedData.discounts,
          transactions: parsedData.transactions,
          printerName: parsedData.printerName || "Canon"
        });

        setToastMessage({ 
          type: "success", 
          text: `Data terenkripsi berhasil dipulihkan!${auditNotice}` 
        });
        e.target.value = "";
      } catch (err: any) {
        setToastMessage({ type: "error", text: err.message || "Gagal memulihkan file cadangan." });
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  // Handle resetting transaction data only
  const handleResetTransactionsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetConfirmText.toUpperCase() !== "RESET") {
      setToastMessage({ type: "error", text: 'Harap ketik kata "RESET" dengan benar untuk mengonfirmasi.' });
      return;
    }
    try {
      onClearTransactionsOnly();
      setToastMessage({ type: "success", text: "Seluruh data transaksi berhasil dikosongkan. Aplikasi kini sangat ringan!" });
      setShowResetModal(false);
      setResetConfirmText("");
    } catch (err) {
      setToastMessage({ type: "error", text: "Gagal mengosongkan data transaksi." });
    }
  };

  // Password Modification Handler
  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      setToastMessage({ type: "error", text: "Password baru tidak boleh kosong!" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setToastMessage({ type: "error", text: "Password baru dan konfirmasi tidak cocok!" });
      return;
    }

    if (selectedPasswordRole === "Admin") {
      saveAdminPassword(newPassword);
    } else {
      saveKasirPassword(newPassword);
    }

    setToastMessage({ type: "success", text: `Kata sandi untuk ${selectedPasswordRole} berhasil diubah!` });
    setNewPassword("");
    setConfirmPassword("");
  };

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

  useEffect(() => {
    if (rentalPrices) {
      setLoker1Price(rentalPrices.harga_loker_1.toString());
      setLoker2Price(rentalPrices.harga_loker_2.toString());
      setTempat1Price(rentalPrices.harga_tempat_1.toString());
      setTempat2Price(rentalPrices.harga_tempat_2.toString());
      setTotalLoker1((rentalPrices.total_loker_1 ?? 40).toString());
      setTotalLoker2((rentalPrices.total_loker_2 ?? 20).toString());
      setTotalTempat1((rentalPrices.total_tempat_1 ?? 10).toString());
      setTotalTempat2((rentalPrices.total_tempat_2 ?? 5).toString());
    }
  }, [rentalPrices]);

  // Reset pagination to first page when any of the filters or search inputs change
  useEffect(() => {
    setCurrentPage(1);
  }, [period, selectedDate, searchQuery]);

  const parseLocalDatePickerDate = (dateStr: string): Date => {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(dateStr);
  };

  // Filter Transactions according to selected date, period, and search query
  const filteredTx = React.useMemo(() => {
    const targetDate = parseLocalDatePickerDate(selectedDate);
    
    return transactions.filter((tx) => {
      const txDate = new Date(tx.tanggal);
      
      let matchesPeriod = false;
      if (period === "Harian") {
        // Match exact day
        matchesPeriod = (
          txDate.getFullYear() === targetDate.getFullYear() &&
          txDate.getMonth() === targetDate.getMonth() &&
          txDate.getDate() === targetDate.getDate()
        );
      } else if (period === "Mingguan") {
        // Match within last 7 days of target date
        const timeDiff = targetDate.getTime() - txDate.getTime();
        const dayDiff = timeDiff / (1000 * 3600 * 24);
        matchesPeriod = dayDiff >= 0 && dayDiff <= 7;
      } else {
        // Bulanan - Match same month and year
        matchesPeriod = (
          txDate.getFullYear() === targetDate.getFullYear() &&
          txDate.getMonth() === targetDate.getMonth()
        );
      }

      if (!matchesPeriod) return false;

      // Handle search query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = tx.id.toLowerCase().includes(query) || `#${tx.id}`.toLowerCase().includes(query);
        const matchesPromo = tx.nama_diskon.toLowerCase().includes(query);
        const matchesMethod = tx.metode_pembayaran?.toLowerCase().includes(query);
        const matchesDayType = tx.jenis_hari.toLowerCase().includes(query);
        return matchesId || matchesPromo || matchesMethod || matchesDayType;
      }

      return true;
    });
  }, [transactions, selectedDate, period, searchQuery]);

  // Paginated transactions for the visual table list (keeps DOM small, fast, and extremely light)
  const totalPages = Math.ceil(filteredTx.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTx = filteredTx.slice(startIndex, startIndex + itemsPerPage);

  // Aggregate stats
  const totalRevenue = React.useMemo(() => filteredTx.reduce((sum, tx) => sum + tx.total_bayar, 0), [filteredTx]);
  const totalVisitors = React.useMemo(() => filteredTx.reduce((sum, tx) => sum + tx.jumlah_pengunjung, 0), [filteredTx]);

  // Prepare Chart Data
  const chartData = React.useMemo(() => {
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
      const targetDate = parseLocalDatePickerDate(selectedDate);
      
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
      const targetDate = parseLocalDatePickerDate(selectedDate);
      
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
  }, [filteredTx, period, selectedDate]);

  // Handle price update submit
  const handleUpdatePrices = (e: React.FormEvent) => {
    e.preventDefault();
    const weekdayNum = parseInt(weekdayPrice) || 0;
    const weekendNum = parseInt(weekendPrice) || 0;
    const l1 = parseInt(loker1Price) || 0;
    const l2 = parseInt(loker2Price) || 0;
    const t1 = parseInt(tempat1Price) || 0;
    const t2 = parseInt(tempat2Price) || 0;

    if (weekdayNum <= 0 || weekendNum <= 0) {
      setToastMessage({ type: "error", text: "Harga tiket harus lebih besar dari 0!" });
      return;
    }

    onUpdatePrices([
      { jenis_hari: "Senin-Jumat", harga_tiket: weekdayNum },
      { jenis_hari: "Sabtu-Minggu/Libur", harga_tiket: weekendNum },
    ]);

    onUpdateRentalPrices({
      harga_loker_1: l1,
      harga_loker_2: l2,
      harga_tempat_1: t1,
      harga_tempat_2: t2,
      total_loker_1: parseInt(totalLoker1) || 0,
      total_loker_2: parseInt(totalLoker2) || 0,
      total_tempat_1: parseInt(totalTempat1) || 0,
      total_tempat_2: parseInt(totalTempat2) || 0,
    });

    setToastMessage({ type: "success", text: "Tarif Tiket & Sewa Berhasil Diperbarui!" });
  };

  // Compile EOD stats for selectedDate
  const getEodStats = () => {
    const eodTx = transactions.filter((tx) => {
      const txDate = new Date(tx.tanggal);
      const targetDate = parseLocalDatePickerDate(selectedDate);
      return (
        txDate.getFullYear() === targetDate.getFullYear() &&
        txDate.getMonth() === targetDate.getMonth() &&
        txDate.getDate() === targetDate.getDate()
      );
    });

    const totalEodTxCount = eodTx.length;
    const totalEodVisitorsCount = eodTx.reduce((sum, tx) => sum + tx.jumlah_pengunjung, 0);

    const totalEodLokerRevenue = eodTx.reduce((sum, tx) => sum + (tx.harga_loker || 0), 0);
    const totalEodTempatRevenue = eodTx.reduce((sum, tx) => sum + (tx.harga_tempat || 0), 0);
    const totalEodRevenueSum = eodTx.reduce((sum, tx) => sum + tx.total_bayar, 0);
    const totalEodTicketRevenue = totalEodRevenueSum - (totalEodLokerRevenue + totalEodTempatRevenue);

    // Payment methods breakdown
    const tunaiTotal = eodTx.filter(tx => (tx.metode_pembayaran || "Tunai") === "Tunai").reduce((sum, tx) => sum + tx.total_bayar, 0);
    const qrisTotal = eodTx.filter(tx => tx.metode_pembayaran === "QRIS").reduce((sum, tx) => sum + tx.total_bayar, 0);
    const debitTotal = eodTx.filter(tx => tx.metode_pembayaran === "Debit/Kredit").reduce((sum, tx) => sum + tx.total_bayar, 0);

    return {
      eodTx,
      totalEodTxCount,
      totalEodVisitorsCount,
      totalEodLokerRevenue,
      totalEodTempatRevenue,
      totalEodTicketRevenue,
      totalEodRevenueSum,
      tunaiTotal,
      qrisTotal,
      debitTotal,
    };
  };

  const eodData = getEodStats();

  const handlePrintEod = () => {
    const printContent = document.getElementById("eod-report-print-area")?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak Laporan EOD GoSplash</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                width: 58mm;
                margin: 0 auto;
                padding: 10px;
                font-size: 11px;
                color: #000;
                line-height: 1.4;
              }
              .center { text-align: center; }
              .right { text-align: right; }
              .bold { font-weight: bold; }
              .separator { border-top: 1px dashed #000; margin: 8px 0; }
              .double-separator { border-top: 2px double #000; margin: 8px 0; }
              .flex-between { display: flex; justify-content: space-between; }
              @media print {
                body { width: 100%; margin: 0; padding: 0; }
              }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            \${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
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
    setTxEditPaymentMethod((tx.metode_pembayaran || "Tunai") as "Tunai" | "QRIS" | "Debit/Kredit");
    setTxEditLoker((tx.sewa_loker || "Tidak") as "Tidak" | "Tarif 1" | "Tarif 2");
    setTxEditTempat((tx.sewa_tempat || "Tidak") as "Tidak" | "Tarif 1" | "Tarif 2");
    setTxEditBayar(tx.bayar ? tx.bayar.toString() : "0");
    
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
    const hasRental = txEditLoker !== "Tidak" || txEditTempat !== "Tidak";
    if (qty < 0 || (qty === 0 && !hasRental)) {
      setToastMessage({ type: "error", text: "Jumlah pengunjung harus minimal 0 (atau sewa fasilitas aktif)!" });
      return;
    }

    // Get unit price based on day type
    const matchedPrice = prices.find((p) => p.jenis_hari === txEditDayType);
    const pricePerUnit = matchedPrice ? matchedPrice.harga_tiket : 15000;

    // Get discount percentage and name
    const matchedDisc = discounts.find((d) => d.id === txEditDiscountId);
    const discPercent = matchedDisc ? matchedDisc.persen_diskon : 0;
    const discName = matchedDisc ? matchedDisc.nama_diskon : "- Tanpa Diskon -";

    // Prices maps for locker & place
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

    const subtotal = pricePerUnit * qty;
    const ticketTotal = subtotal - subtotal * (discPercent / 100);
    const lockerCost = LOKER_PRICES[txEditLoker] || 0;
    const placeCost = TEMPAT_PRICES[txEditTempat] || 0;
    const total = ticketTotal + lockerCost + placeCost;

    const paidAmount = txEditPaymentMethod === "Tunai" ? (parseFloat(txEditBayar) || 0) : total;
    if (txEditPaymentMethod === "Tunai" && paidAmount < total) {
      setToastMessage({ type: "error", text: "Jumlah uang dibayar kurang dari total pembayaran baru!" });
      return;
    }

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
          sewa_loker: txEditLoker,
          sewa_tempat: txEditTempat,
          harga_loker: lockerCost,
          harga_tempat: placeCost,
          total_bayar: total,
          bayar: paidAmount,
          kembalian: txEditPaymentMethod === "Tunai" ? (paidAmount - total) : 0,
          metode_pembayaran: txEditPaymentMethod,
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

    // Prepare CSV header with detailed breakdowns to ensure perfect Excel reconciliation
    const csvContent = [
      "No. Nota,Tanggal,Hari,Harga Tiket,Jumlah Pengunjung,Diskon %,Nama Promo,Sewa Loker,Harga Loker,Sewa Tempat,Harga Tempat,Total Bayar,Metode Pembayaran,Uang Diterima (Tunai),Kembalian,Pemasukan Tunai,Pemasukan Non-Tunai"
    ];

    // Add transaction lines with detailed audit values
    filteredTx.forEach((tx) => {
      const formattedDate = new Date(tx.tanggal).toISOString().replace("T", " ").substring(0, 19);
      const isTunai = (tx.metode_pembayaran || "Tunai") === "Tunai";
      
      const uangDiterima = isTunai ? tx.bayar : 0;
      const kembalian = isTunai ? tx.kembalian : 0;
      const pemasukanTunai = isTunai ? tx.total_bayar : 0;
      const pemasukanNonTunai = !isTunai ? tx.total_bayar : 0;

      const row = [
        tx.id,
        formattedDate,
        tx.jenis_hari,
        tx.harga_satuan,
        tx.jumlah_pengunjung,
        tx.diskon_persen,
        `"${(tx.nama_diskon || "Tidak Ada").replace(/"/g, '""')}"`,
        tx.sewa_loker || "Tidak",
        tx.harga_loker || 0,
        tx.sewa_tempat || "Tidak",
        tx.harga_tempat || 0,
        tx.total_bayar,
        tx.metode_pembayaran || "Tunai",
        uangDiterima,
        kembalian,
        pemasukanTunai,
        pemasukanNonTunai
      ];

      csvContent.push(row.join(","));
    });

    // Create a programmatical download anchor with UTF-8 BOM prefix
    const csvString = "\ufeff" + csvContent.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Laporan_GoSplash_${period}_${selectedDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
                  min="0"
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

              {/* Metode Pembayaran */}
              <div className="grid grid-cols-1 gap-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Metode Pembayaran</label>
                <select
                  value={txEditPaymentMethod}
                  onChange={(e) => setTxEditPaymentMethod(e.target.value as "Tunai" | "QRIS" | "Debit/Kredit")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Tunai">Tunai (Cash)</option>
                  <option value="QRIS">QRIS Scan</option>
                  <option value="Debit/Kredit">EDC Kartu</option>
                </select>
              </div>

              {/* Sewa Loker */}
              <div className="grid grid-cols-1 gap-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Sewa Loker</label>
                <select
                  value={txEditLoker}
                  onChange={(e) => setTxEditLoker(e.target.value as "Tidak" | "Tarif 1" | "Tarif 2")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Tidak">Tidak Sewa</option>
                  <option value="Tarif 1">Tarif 1 (Rp {rentalPrices.harga_loker_1.toLocaleString("id-ID")})</option>
                  <option value="Tarif 2">Tarif 2 (Rp {rentalPrices.harga_loker_2.toLocaleString("id-ID")})</option>
                </select>
              </div>

              {/* Sewa Tempat / Saung */}
              <div className="grid grid-cols-1 gap-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Sewa Saung</label>
                <select
                  value={txEditTempat}
                  onChange={(e) => setTxEditTempat(e.target.value as "Tidak" | "Tarif 1" | "Tarif 2")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Tidak">Tidak Sewa</option>
                  <option value="Tarif 1">Tarif 1 (Rp {rentalPrices.harga_tempat_1.toLocaleString("id-ID")})</option>
                  <option value="Tarif 2">Tarif 2 (Rp {rentalPrices.harga_tempat_2.toLocaleString("id-ID")})</option>
                </select>
              </div>

              {/* Uang Dibayar (Only if payment method is Tunai) */}
              {txEditPaymentMethod === "Tunai" && (
                <div className="grid grid-cols-1 gap-1 animate-in fade-in duration-150 font-sans">
                  <label className="text-xs font-bold text-slate-500 uppercase">Uang Tunai Diterima (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={txEditBayar}
                    onChange={(e) => setTxEditBayar(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              )}
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

      {/* LAPORAN END OF DAY (EOD) MODAL */}
      {showEodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-800 rounded-2xl max-w-md w-full border border-slate-700 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 text-left">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-base">Laporan End of Day (EOD)</h3>
                <p className="text-xs text-slate-400">
                  Tanggal: {new Date(selectedDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => setShowEodModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content / Preview Area */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-200">
              
              {/* Info Widgets Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/60 border border-slate-700 p-3.5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Transaksi</span>
                  <p className="text-xl font-black font-mono text-white mt-0.5">{eodData.totalEodTxCount}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700 p-3.5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Pengunjung</span>
                  <p className="text-xl font-black font-mono text-emerald-400 mt-0.5">{eodData.totalEodVisitorsCount} org</p>
                </div>
              </div>

              {/* Income Constituents */}
              <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-800">
                  Konstituen Pemasukan
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pemasukan Tiket:</span>
                    <span className="font-semibold font-mono text-white">Rp {eodData.totalEodTicketRevenue.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pemasukan Loker:</span>
                    <span className="font-semibold font-mono text-white">Rp {eodData.totalEodLokerRevenue.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pemasukan Tempat / Saung:</span>
                    <span className="font-semibold font-mono text-white">Rp {eodData.totalEodTempatRevenue.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-base">
                    <span className="text-amber-400">Total Pemasukan:</span>
                    <span className="font-mono text-amber-400">Rp {eodData.totalEodRevenueSum.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-800">
                  Metode Pembayaran
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tunai (Cash):</span>
                    <span className="font-semibold font-mono text-white">Rp {eodData.tunaiTotal.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">QRIS Scan:</span>
                    <span className="font-semibold font-mono text-white">Rp {eodData.qrisTotal.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">EDC Kartu:</span>
                    <span className="font-semibold font-mono text-white">Rp {eodData.debitTotal.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              </div>

              {/* Printer Sim Preview Label */}
              <p className="text-[11px] text-center text-slate-500 italic">
                Nota akan dicetak menggunakan printer POS: <strong className="text-slate-400 font-sans">{printerName}</strong>
              </p>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-900 border-t border-slate-700 flex gap-3">
              <button
                type="button"
                onClick={() => setShowEodModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl transition border border-slate-700"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrintEod}
                className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                Cetak Laporan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET DATA TRANSAKSI MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 text-left shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2 text-rose-500">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-base">Konfirmasi Reset Transaksi</h3>
              </div>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmText("");
                }}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleResetTransactionsSubmit} className="p-6 space-y-4">
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-xs space-y-2 leading-relaxed text-rose-300">
                <p className="font-bold text-rose-200">⚠️ PERINGATAN: TINDAKAN TIDAK DAPAT DIBATALKAN</p>
                <p>
                  Tindakan ini akan <strong>menghapus semua riwayat transaksi</strong> di database aplikasi ini secara permanen agar aplikasi kembali ringan dan cepat.
                </p>
                <p>
                  Daftar harga tiket, harga sewa loker/saung, printer, kata sandi, serta promo aktif <strong>TIDAK</strong> akan terhapus.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Ketik kata <span className="text-rose-400 font-black">"RESET"</span> untuk menyetujui
                </label>
                <input
                  type="text"
                  required
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="Ketik RESET disini..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-center font-bold tracking-widest text-white focus:outline-none focus:border-rose-500 transition placeholder-slate-700 uppercase"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetConfirmText("");
                  }}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl transition border border-slate-700"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={resetConfirmText.toUpperCase() !== "RESET"}
                  className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-xl transition shadow-md"
                >
                  YA, RESET SEKARANG
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Hidden printable template for thermal printer popup */}
      <div id="eod-report-print-area" className="hidden">
        <div style={{ textAlign: "center" }}>
          <span style={{ fontWeight: "bold", fontSize: "14px" }}>GOSPLASH WATERPARK</span><br/>
          <span>BSD City, Tangerang</span><br/>
          <span>Telp: (021) 555-SPLASH</span><br/>
          <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }}></div>
          <span style={{ fontWeight: "bold" }}>LAPORAN END OF DAY (EOD)</span><br/>
          <span>Tanggal: {new Date(selectedDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' })}</span><br/>
          <span>Cetak: {new Date().toLocaleString("id-ID")}</span><br/>
          <span>Printer: {printerName}</span><br/>
          <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }}></div>
        </div>

        <div style={{ fontWeight: "bold", marginBottom: "4px" }}>RINGKASAN OPERASIONAL:</div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Total Pengunjung:</span>
          <span style={{ fontWeight: "bold" }}>{eodData.totalEodVisitorsCount} Orang</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Total Transaksi:</span>
          <span>{eodData.totalEodTxCount} Slip</span>
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }}></div>
        <div style={{ fontWeight: "bold", marginBottom: "4px" }}>RINCIAN PENDAPATAN:</div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Pemasukan Tiket:</span>
          <span>Rp {eodData.totalEodTicketRevenue.toLocaleString("id-ID")}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Pemasukan Loker:</span>
          <span>Rp {eodData.totalEodLokerRevenue.toLocaleString("id-ID")}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Pemasukan Tempat:</span>
          <span>Rp {eodData.totalEodTempatRevenue.toLocaleString("id-ID")}</span>
        </div>

        <div style={{ borderTop: "2px double #000", margin: "8px 0" }}></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "12px" }}>
          <span>TOTAL INCOME:</span>
          <span>Rp {eodData.totalEodRevenueSum.toLocaleString("id-ID")}</span>
        </div>
        <div style={{ borderTop: "2px double #000", margin: "8px 0" }}></div>

        <div style={{ fontWeight: "bold", marginBottom: "4px" }}>METODE PEMBAYARAN:</div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Tunai (Cash):</span>
          <span>Rp {eodData.tunaiTotal.toLocaleString("id-ID")}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>QRIS Scan:</span>
          <span>Rp {eodData.qrisTotal.toLocaleString("id-ID")}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>EDC Kartu:</span>
          <span>Rp {eodData.debitTotal.toLocaleString("id-ID")}</span>
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }}></div>
        <div style={{ textAlign: "center", marginTop: "15px", fontStyle: "italic" }}>
          <span>Laporan EOD Sukses Dibuat</span><br/>
          <span>GoSplash Waterpark Team</span>
        </div>
      </div>

      {/* LOCKED ACCESS OVERLAY */}
      {isLocked && (
        <div className="absolute inset-0 z-40 bg-slate-100/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-300">
          <div className="bg-rose-100 p-5 rounded-full mb-4 border border-rose-200">
            <ShieldAlert className="w-12 h-12 text-rose-600" />
          </div>
          <h2 className="text-2xl font-black text-rose-800 tracking-tight">
            {language === "ID" ? "LAPORAN DIKUNCI" : "REPORTS LOCKED"}
          </h2>
          <p className="text-sm font-semibold text-rose-700/80 mt-1 max-w-sm">
            {language === "ID"
              ? "Hak akses Anda saat ini adalah KASIR. Menu laporan & pengaturan harga hanya dapat diakses oleh ADMIN."
              : "Your current role is CASHIER. Reports & pricing configurations can only be accessed by ADMIN."}
          </p>
          <div className="mt-6 flex flex-col items-center gap-1 bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-sans">
              {language === "ID" ? "Ingin melakukan uji coba Admin?" : "Want to try the Admin dashboard?"}
            </span>
            <span className="text-xs font-semibold text-slate-800">
              {language === "ID"
                ? "Ganti user di pojok kanan atas menjadi "
                : "Switch the user in the top right header to "}
              <strong className="text-blue-600">Admin</strong>
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
              <p className="text-xs text-slate-500 font-medium font-sans">
                {language === "ID" ? "Total Pendapatan" : "Total Revenue"} ({period === "Harian" ? (language === "ID" ? "Harian" : "Daily") : period === "Mingguan" ? (language === "ID" ? "Mingguan" : "Weekly") : (language === "ID" ? "Bulanan" : "Monthly")})
              </p>
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
              <p className="text-xs text-slate-500 font-medium font-sans">
                {language === "ID" ? "Total Pengunjung" : "Total Visitors"} ({period === "Harian" ? (language === "ID" ? "Harian" : "Daily") : period === "Mingguan" ? (language === "ID" ? "Mingguan" : "Weekly") : (language === "ID" ? "Bulanan" : "Monthly")})
              </p>
              <h3 className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">
                {totalVisitors.toLocaleString("id-ID")} {language === "ID" ? "Orang" : "Pax"}
              </h3>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4 sm:col-span-2 lg:col-span-1">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium font-sans">
                {language === "ID" ? "Jumlah Transaksi" : "Total Transactions"}
              </p>
              <h3 className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">
                {filteredTx.length} {language === "ID" ? "Transaksi" : "Transactions"}
              </h3>
            </div>
          </div>
        </div>

        {/* REPORTS & CHART PANEL */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">
                {t.reports_title}
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                {t.reports_subtitle}
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
                <option value="Harian">{language === "ID" ? "Harian" : "Daily"}</option>
                <option value="Mingguan">{language === "ID" ? "Mingguan" : "Weekly"}</option>
                <option value="Bulanan">{language === "ID" ? "Bulanan" : "Monthly"}</option>
              </select>
              
              <input
                id="tanggal-laporan-input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <button
                id="eod-report-btn"
                onClick={() => setShowEodModal(true)}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition"
              >
                <Printer className="w-4 h-4" />
                {t.eod_report}
              </button>

              <button
                id="export-excel-btn"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition"
              >
                <Download className="w-4 h-4" />
                {t.export_excel}
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

          {/* SEARCH & FILTERS SUB-BAR */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5 self-start sm:self-auto">
              <Coins className="w-4.5 h-4.5 text-blue-500" />
              Histori Transaksi
            </span>
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Cari No. Nota, Promo, Metode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* DATA GRID VIEW (TRANSACTION LOG TABLE) */}
          <div className="border border-slate-150 rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto max-h-[350px]">
              <table id="laporan-table" className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider sticky top-0 z-10">
                    <th className="px-5 py-3">No. Nota</th>
                    <th className="px-5 py-3">Tanggal</th>
                    <th className="px-5 py-3">Tipe Hari</th>
                    <th className="px-5 py-3">Metode</th>
                    <th className="px-5 py-3 text-right">Tarif</th>
                    <th className="px-5 py-3 text-center">Jumlah</th>
                    <th className="px-5 py-3">Diskon Promo</th>
                    <th className="px-5 py-3 text-right">Total Bayar</th>
                    <th className="px-5 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedTx.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-10 text-center text-slate-400 font-sans">
                        Tidak ada transaksi terekam pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    paginatedTx.map((tx) => (
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
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            tx.metode_pembayaran === "QRIS"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : tx.metode_pembayaran === "Debit/Kredit"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}>
                            {tx.metode_pembayaran || "Tunai"}
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
                          <div className="flex items-center justify-center gap-1.5">
                            {onShowReceipt && (
                              <button
                                type="button"
                                onClick={() => onShowReceipt(tx)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Cetak Ulang Nota"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
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

            {/* Pagination Controls bar */}
            {filteredTx.length > 0 && (
              <div className="bg-slate-50 border-t border-slate-100 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div className="font-medium text-slate-600 text-center sm:text-left">
                  Menampilkan <span className="font-bold text-slate-800">{startIndex + 1}</span> - <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filteredTx.length)}</span> dari <span className="font-bold text-slate-800">{filteredTx.length}</span> transaksi
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Baris per halaman:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition font-bold"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="py-1 px-2.5 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white rounded-lg transition font-bold text-[11px]"
                    >
                      Sebelumnya
                    </button>
                    <span className="font-medium text-slate-600">
                      Halaman <span className="font-bold text-slate-800">{currentPage}</span> / {totalPages || 1}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="py-1 px-2.5 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white rounded-lg transition font-bold text-[11px]"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              </div>
            )}
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

              {/* LOKER RATES ROW WITH REAL-TIME CAPACITY */}
              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  Sewa Loker & Kapasitas Inventaris
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tarif 1 */}
                  <div className="grid grid-cols-1 gap-1.5 p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Loker Tarif 1</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-slate-400 text-[10px] font-semibold">Tarif</span>
                        <input
                          id="set-loker1-input"
                          type="number"
                          value={loker1Price}
                          onChange={(e) => setLoker1Price(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-slate-400 text-[10px] font-semibold">Limit</span>
                        <input
                          id="set-loker1-capacity"
                          type="number"
                          value={totalLoker1}
                          onChange={(e) => setTotalLoker1(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-300 rounded-lg pl-11 pr-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tarif 2 */}
                  <div className="grid grid-cols-1 gap-1.5 p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Loker Tarif 2</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-slate-400 text-[10px] font-semibold">Tarif</span>
                        <input
                          id="set-loker2-input"
                          type="number"
                          value={loker2Price}
                          onChange={(e) => setLoker2Price(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-slate-400 text-[10px] font-semibold">Limit</span>
                        <input
                          id="set-loker2-capacity"
                          type="number"
                          value={totalLoker2}
                          onChange={(e) => setTotalLoker2(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-300 rounded-lg pl-11 pr-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* TEMPAT RATES ROW WITH REAL-TIME CAPACITY */}
              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Tent className="w-3.5 h-3.5 text-amber-600" />
                  Sewa Saung & Kapasitas Inventaris
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tempat Tarif 1 */}
                  <div className="grid grid-cols-1 gap-1.5 p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Saung Tarif 1</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-slate-400 text-[10px] font-semibold">Tarif</span>
                        <input
                          id="set-tempat1-input"
                          type="number"
                          value={tempat1Price}
                          onChange={(e) => setTempat1Price(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-slate-400 text-[10px] font-semibold">Limit</span>
                        <input
                          id="set-tempat1-capacity"
                          type="number"
                          value={totalTempat1}
                          onChange={(e) => setTotalTempat1(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-300 rounded-lg pl-11 pr-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tempat Tarif 2 */}
                  <div className="grid grid-cols-1 gap-1.5 p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Saung Tarif 2</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-slate-400 text-[10px] font-semibold">Tarif</span>
                        <input
                          id="set-tempat2-input"
                          type="number"
                          value={tempat2Price}
                          onChange={(e) => setTempat2Price(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-slate-400 text-[10px] font-semibold">Limit</span>
                        <input
                          id="set-tempat2-capacity"
                          type="number"
                          value={totalTempat2}
                          onChange={(e) => setTotalTempat2(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-300 rounded-lg pl-11 pr-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                id="update-harga-btn"
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition mt-2"
              >
                UPDATE TARIF & KAPASITAS INVENTARIS
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

        {/* ADDITIONAL CONFIGURATIONS: BACKUP/RESTORE & PASSWORD MANAGER */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          
          {/* BACKUP & RESTORE DATA */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-4">
              <Database className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Ekspor & Impor Data (Backup)</h3>
                <p className="text-xs text-slate-400">Cadangkan atau pulihkan data transaksi dan konfigurasi</p>
              </div>
            </div>

            <div className="space-y-4 text-sm text-slate-600">
              <p className="text-xs leading-relaxed">
                Fitur ini membantu Anda mengekspor seluruh transaksi, konfigurasi harga tiket, harga sewa, dan daftar promo aktif ke sebuah file backup <strong>(.json)</strong> lokal. Anda dapat mengimpor file tersebut di kemudian hari untuk memulihkan seluruh data operasional GoSplash Anda.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Export Button */}
                <button
                  type="button"
                  id="backup-export-btn"
                  onClick={handleExportBackup}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  EKSPOR CADANGAN
                </button>

                {/* Import/Restore Button Container */}
                <div className="relative">
                  <input
                    type="file"
                    id="backup-import-file-input"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <button
                    type="button"
                    id="backup-import-trigger-btn"
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition shadow-sm pointer-events-none"
                  >
                    <Upload className="w-4 h-4" />
                    IMPOR & PULIHKAN
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2 space-y-3">
                <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-3 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-800">Sangat Ringan: Reset Data Transaksi</h4>
                    <p className="text-[11px] text-amber-700 leading-relaxed mt-0.5 font-sans">
                      Agar aplikasi tetap ringan & cepat, hapus seluruh daftar transaksi yang sudah lama (misal per bulan) setelah mengekspor cadangan di atas. Konfigurasi harga & promo akan tetap aman.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="reset-transactions-btn"
                  onClick={() => setShowResetModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold py-2.5 px-4 rounded-xl text-xs transition"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  RESET DATA TRANSAKSI BULANAN
                </button>
              </div>
            </div>
          </div>

          {/* PASSWORD SECURITY MANAGER */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-4">
              <Shield className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Keamanan & Password Akses</h3>
                <p className="text-xs text-slate-400">Ubah kata sandi untuk masuk sebagai Admin atau Kasir</p>
              </div>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              {/* Role Picker for Password Change */}
              <div className="grid grid-cols-1 gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Peran (Role)</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    id="change-pswd-role-admin"
                    onClick={() => setSelectedPasswordRole("Admin")}
                    className={`py-1.5 rounded-lg text-xs font-bold transition duration-200 ${
                      selectedPasswordRole === "Admin"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    ADMIN
                  </button>
                  <button
                    type="button"
                    id="change-pswd-role-kasir"
                    onClick={() => setSelectedPasswordRole("Kasir")}
                    className={`py-1.5 rounded-lg text-xs font-bold transition duration-200 ${
                      selectedPasswordRole === "Kasir"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    KASIR
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* New Password */}
                <div className="grid grid-cols-1 gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password Baru</label>
                  <div className="relative">
                    <input
                      id="change-pswd-new-input"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 4 karakter"
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl pl-3 pr-9 py-2 text-xs font-semibold text-slate-800 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="grid grid-cols-1 gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Konfirmasi Password</label>
                  <div className="relative">
                    <input
                      id="change-pswd-confirm-input"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Masukkan ulang..."
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl pl-3 pr-9 py-2 text-xs font-semibold text-slate-800 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="change-password-submit-btn"
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition mt-2 shadow-sm uppercase tracking-wider"
              >
                UBAH PASSWORD {selectedPasswordRole}
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
