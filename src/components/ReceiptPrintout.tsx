/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Transaction } from "../types";
import { 
  Printer, 
  X, 
  Bluetooth, 
  Usb, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  HelpCircle,
  Scissors
} from "lucide-react";
import { translations } from "../utils/lang";
import {
  connectBluetoothPrinter,
  connectSerialPrinter,
  connectUsbPrinter,
  disconnectPrinter,
  sendBytesToPrinter,
  generateEscPosBytes,
  generateTestBytes,
  subscribeToPrinterState,
  PrinterDevice
} from "../utils/printer";

interface ReceiptPrintoutProps {
  transaction: Transaction | null;
  printerName: string;
  onClose: () => void;
}

export const ReceiptPrintout: React.FC<ReceiptPrintoutProps> = ({
  transaction,
  printerName,
  onClose,
}) => {
  if (!transaction) return null;

  const t = translations.ID;
  const [activePrinter, setActivePrinter] = useState<PrinterDevice>({
    type: "none",
    name: "Tidak Terhubung",
    rawDevice: null
  });
  const [printStatus, setPrintStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message?: string;
  }>({ type: "idle" });

  // Subscribe to global active printer state
  useEffect(() => {
    const unsubscribe = subscribeToPrinterState((device) => {
      setActivePrinter(device);
    });
    return unsubscribe;
  }, []);

  const handlePrintLegacy = () => {
    const printContent = document.getElementById("thermal-receipt-print-area")?.innerHTML;
    if (!printContent) return;
    
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak Nota GOSPLASH #${transaction.id}</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                width: 58mm;
                margin: 0 auto;
                padding: 10px;
                font-size: 11px;
                color: #000;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .separator { border-top: 1px dashed #000; margin: 8px 0; }
              .flex-between { display: flex; justify-content: space-between; }
              @media print {
                body { width: 100%; margin: 0; padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div style="text-align: center;">
              <span style="font-size: 16px; font-weight: bold; display: block; letter-spacing: 1px;">GOSPLASH</span>
            </div>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  const handleDirectPrint = async () => {
    setPrintStatus({ type: "loading", message: "Menghubungi printer..." });
    try {
      const bytes = generateEscPosBytes(transaction);
      await sendBytesToPrinter(bytes);
      setPrintStatus({ type: "success", message: "Nota berhasil dikirim ke printer!" });
      setTimeout(() => setPrintStatus({ type: "idle" }), 4000);
    } catch (error: any) {
      console.error(error);
      setPrintStatus({ type: "error", message: error.message || "Gagal mencetak." });
    }
  };

  const handlePrintTestPage = async () => {
    setPrintStatus({ type: "loading", message: "Mengirim halaman uji..." });
    try {
      const bytes = generateTestBytes();
      await sendBytesToPrinter(bytes);
      setPrintStatus({ type: "success", message: "Halaman uji berhasil dicetak!" });
      setTimeout(() => setPrintStatus({ type: "idle" }), 4000);
    } catch (error: any) {
      console.error(error);
      setPrintStatus({ type: "error", message: error.message || "Gagal mencetak halaman uji." });
    }
  };

  const handleConnectBluetooth = async () => {
    setPrintStatus({ type: "loading", message: "Membuka bluetooth pairing..." });
    try {
      await connectBluetoothPrinter();
      setPrintStatus({ type: "success", message: "Bluetooth Printer Terhubung!" });
      setTimeout(() => setPrintStatus({ type: "idle" }), 3000);
    } catch (error: any) {
      console.error(error);
      setPrintStatus({ type: "error", message: error.message || "Gagal menghubungkan Bluetooth." });
    }
  };

  const handleConnectSerial = async () => {
    setPrintStatus({ type: "loading", message: "Meminta akses Serial Port..." });
    try {
      await connectSerialPrinter();
      setPrintStatus({ type: "success", message: "Printer Kabel/Serial Terhubung!" });
      setTimeout(() => setPrintStatus({ type: "idle" }), 3000);
    } catch (error: any) {
      console.error(error);
      setPrintStatus({ type: "error", message: error.message || "Gagal menghubungkan printer kabel." });
    }
  };

  const handleConnectUsb = async () => {
    setPrintStatus({ type: "loading", message: "Meminta akses USB Printer..." });
    try {
      await connectUsbPrinter();
      setPrintStatus({ type: "success", message: "Printer USB Terhubung!" });
      setTimeout(() => setPrintStatus({ type: "idle" }), 3000);
    } catch (error: any) {
      console.error(error);
      setPrintStatus({ type: "error", message: error.message || "Gagal menghubungkan printer USB." });
    }
  };

  const handleDisconnect = async () => {
    setPrintStatus({ type: "loading", message: "Memutuskan printer..." });
    await disconnectPrinter();
    setPrintStatus({ type: "idle" });
  };

  const formattedDate = new Date(transaction.tanggal).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isPrinterConnected = activePrinter.type !== "none";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-800 overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800/80 flex justify-between items-center relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Dashboard Pencetakan Nota</h3>
              <p className="text-xs text-slate-400 font-sans">Kelola printer thermal hardware langsung & cetak nota fisik</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition duration-150"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Status Bar */}
        {printStatus.type !== "idle" && (
          <div className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 transition duration-200 ${
            printStatus.type === "loading" ? "bg-blue-600/20 text-blue-300 border-b border-blue-500/20" :
            printStatus.type === "success" ? "bg-emerald-600/20 text-emerald-300 border-b border-emerald-500/20" :
            "bg-rose-600/20 text-rose-300 border-b border-rose-500/20"
          }`}>
            {printStatus.type === "loading" && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {printStatus.type === "success" && <CheckCircle2 className="w-3.5 h-3.5" />}
            {printStatus.type === "error" && <AlertTriangle className="w-3.5 h-3.5" />}
            <span className="font-sans">{printStatus.message}</span>
          </div>
        )}

        {/* Two-Column Responsive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 overflow-y-auto flex-1">
          
          {/* Left Column: Authentic Paper Thermal Preview */}
          <div className="md:col-span-5 bg-slate-950 p-6 flex flex-col items-center justify-center border-r border-slate-800/60 min-h-[400px]">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 block">Pratinjau Nota Thermal</span>
            
            {/* Elegant physical paper-like container with drop shadow */}
            <div
              id="thermal-receipt"
              className="bg-neutral-50 text-neutral-900 p-6 shadow-[0_15px_30px_rgba(0,0,0,0.5)] rounded-sm font-mono text-[11px] w-[58mm] min-h-[110mm] relative border-t-4 border-amber-600 select-none overflow-hidden"
              style={{ fontFamily: "'Courier New', Courier, monospace" }}
            >
              {/* Paper cut edge simulation */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-600"></div>

              <div id="thermal-receipt-print-area">
                <div className="text-center font-bold">
                  <span className="font-extrabold text-sm block tracking-wider">GOSPLASH</span>
                  <span className="text-[10px] uppercase font-bold block">Waterpark GoSplash</span>
                </div>
                
                <div className="border-t border-dashed border-neutral-400 my-2.5"></div>
                
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span>No. Nota:</span>
                    <span className="font-bold">#{transaction.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tanggal:</span>
                    <span>{formattedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hari:</span>
                    <span className="font-bold">
                      {transaction.jenis_hari === "Sabtu-Minggu/Libur" ? "Sabtu-Minggu" : "Senin-Jumat"}
                    </span>
                  </div>
                </div>
                
                <div className="border-t border-dashed border-neutral-400 my-2.5"></div>
                
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between font-bold">
                    <span>Item</span>
                    <span>Total</span>
                  </div>
                  <div className="flex justify-between text-neutral-800">
                    <span>Tiket Masuk ({transaction.jumlah_pengunjung}x)</span>
                    <span>Rp {(transaction.harga_satuan * transaction.jumlah_pengunjung).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="pl-1.5 text-[9px] text-neutral-500">
                    @ Rp {transaction.harga_satuan.toLocaleString("id-ID")}
                  </div>
                  
                  {transaction.diskon_persen > 0 && (
                    <div className="flex justify-between text-neutral-700">
                      <span>Diskon ({transaction.nama_diskon}):</span>
                      <span>-{transaction.diskon_persen}%</span>
                    </div>
                  )}

                  {transaction.sewa_loker && transaction.sewa_loker !== "Tidak" && (
                    <div className="flex justify-between text-neutral-800 pt-0.5 border-t border-dotted border-neutral-300">
                      <span>Sewa Loker ({transaction.sewa_loker}):</span>
                      <span>Rp {(transaction.harga_loker || 0).toLocaleString("id-ID")}</span>
                    </div>
                  )}

                  {transaction.sewa_tempat && transaction.sewa_tempat !== "Tidak" && (
                    <div className="flex justify-between text-neutral-800 pt-0.5 border-t border-dotted border-neutral-300">
                      <span>Sewa Saung ({transaction.sewa_tempat}):</span>
                      <span>Rp {(transaction.harga_tempat || 0).toLocaleString("id-ID")}</span>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-dashed border-neutral-400 my-2.5"></div>
                
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between font-bold text-xs">
                    <span>TOTAL:</span>
                    <span>Rp {transaction.total_bayar.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-neutral-700">
                    <span>Metode:</span>
                    <span className="font-bold">{transaction.metode_pembayaran || "Tunai"}</span>
                  </div>
                  {(transaction.metode_pembayaran === "Tunai" || !transaction.metode_pembayaran) && (
                    <>
                      <div className="flex justify-between text-neutral-700">
                        <span>Bayar:</span>
                        <span>Rp {transaction.bayar.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="flex justify-between text-neutral-700 font-bold">
                        <span>Kembalian:</span>
                        <span>Rp {transaction.kembalian.toLocaleString("id-ID")}</span>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="border-t border-dashed border-neutral-400 my-2.5"></div>
                
                <div className="text-center space-y-1.5 mt-1.5">
                  <p className="text-[8px] text-neutral-500 leading-tight">
                    Harap simpan nota ini.<br />
                    Sebagai bukti masuk wahana.<br />
                    Terima kasih atas kunjungan Anda!
                  </p>
                  
                  {/* Simulated Barcode */}
                  <div className="flex flex-col items-center pt-1">
                    <div className="h-5 w-28 bg-neutral-900 flex items-center justify-around px-2 text-[6px] text-white overflow-hidden font-sans font-black tracking-widest">
                      ||||||||||||||||||||||||||||||||||
                    </div>
                    <span className="text-[7px] text-neutral-400 mt-0.5 font-sans">GS-{transaction.id}-{transaction.jumlah_pengunjung}</span>
                  </div>
                </div>
              </div>

              {/* Jagged bottom edge simulation */}
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-slate-200 via-transparent to-transparent"></div>
            </div>
          </div>

          {/* Right Column: Hardware Printer Direct Dashboard */}
          <div className="md:col-span-7 p-6 bg-slate-900 flex flex-col justify-between space-y-6">
            
            {/* Connection Control Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Koneksi Hardware Printer</span>
                
                {/* Pulsing Connected Status Indicator */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${
                  isPrinterConnected 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    isPrinterConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`} />
                  {isPrinterConnected ? "Printer Siap" : "Belum Terhubung"}
                </div>
              </div>

              {/* Status Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    isPrinterConnected ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"
                  }`}>
                    {activePrinter.type === "bluetooth" && <Bluetooth className="w-5 h-5" />}
                    {activePrinter.type === "serial" && <Usb className="w-5 h-5" />}
                    {activePrinter.type === "usb" && <Usb className="w-5 h-5" />}
                    {activePrinter.type === "none" && <Activity className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Nama Perangkat Aktif</span>
                    <span className="text-sm font-bold text-slate-200">{activePrinter.name}</span>
                    {isPrinterConnected && (
                      <span className="text-[10px] text-emerald-400 block font-semibold mt-0.5 font-sans capitalize">
                        Koneksi: {activePrinter.type === "serial" ? "Kabel Serial (COM)" : activePrinter.type}
                      </span>
                    )}
                  </div>
                </div>

                {isPrinterConnected && (
                  <button
                    onClick={handleDisconnect}
                    className="bg-slate-800 hover:bg-slate-700 hover:text-rose-400 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg transition duration-150 border border-slate-700/80"
                  >
                    Putus
                  </button>
                )}
              </div>

              {/* Connection Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={handleConnectBluetooth}
                  className="flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-800 transition"
                >
                  <Bluetooth className="w-4 h-4 text-blue-500" />
                  Bluetooth
                </button>

                <button
                  onClick={handleConnectSerial}
                  className="flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-800 transition"
                >
                  <Usb className="w-4 h-4 text-emerald-500" />
                  Kabel Serial
                </button>

                <button
                  onClick={handleConnectUsb}
                  className="flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-800 transition"
                >
                  <Usb className="w-4 h-4 text-purple-500" />
                  WebUSB Port
                </button>
              </div>

              {/* Troubleshooting Info Alert */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-slate-400 font-sans text-xs space-y-1.5">
                <p className="font-bold text-slate-300 flex items-center gap-1">
                  <HelpCircle className="w-4 h-4 text-blue-400" /> Panduan Cetak Langsung:
                </p>
                <ul className="list-disc pl-4 space-y-1 leading-relaxed">
                  <li>Nyalakan Bluetooth / tancapkan kabel printer thermal Anda ke komputer/ponsel.</li>
                  <li>Gunakan browser <strong>Google Chrome</strong> atau <strong>Edge</strong> agar Web Bluetooth & Web Serial dapat berfungsi penuh.</li>
                  <li>Setelah terhubung, klik tombol hijau di bawah untuk mencetak pesanan secara instant tanpa dialog popup browser!</li>
                </ul>
              </div>
            </div>

            {/* Action Bottom Section */}
            <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
              
              {/* Direct Print Button (Web Bluetooth/USB) */}
              <button
                onClick={handleDirectPrint}
                disabled={!isPrinterConnected}
                className={`w-full flex items-center justify-center gap-2 font-extrabold py-3.5 px-4 rounded-2xl text-sm tracking-wide transition duration-150 shadow-md ${
                  isPrinterConnected
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-[0.98]"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                }`}
              >
                <Printer className="w-5 h-5 animate-pulse" />
                CETAK NOTA LANGSUNG (BLUETOOTH/KABEL)
              </button>

              <div className="grid grid-cols-2 gap-2">
                {/* Print Test Page */}
                <button
                  onClick={handlePrintTestPage}
                  disabled={!isPrinterConnected}
                  className={`flex items-center justify-center gap-1.5 font-bold py-2 px-3 rounded-xl text-xs transition border ${
                    isPrinterConnected
                      ? "bg-slate-850 hover:bg-slate-800 text-slate-200 border-slate-700"
                      : "bg-slate-900/50 text-slate-600 border-transparent cursor-not-allowed"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Print Test Page
                </button>

                {/* Legacy Browser Print */}
                <button
                  onClick={handlePrintLegacy}
                  className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold py-2 px-3 rounded-xl text-xs transition border border-slate-700"
                >
                  <Scissors className="w-3.5 h-3.5 text-amber-500" />
                  Cetak via Browser PDF
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 font-bold py-2 px-4 rounded-xl text-xs transition"
              >
                Tutup Jendela Dashboard
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
