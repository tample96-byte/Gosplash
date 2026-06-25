/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Transaction } from "../types";
import { Printer, X } from "lucide-react";

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

  const handlePrint = () => {
    const printContent = document.getElementById("thermal-receipt-print-area")?.innerHTML;
    if (!printContent) return;
    
    // Create print window or use normal window print
    const originalContent = document.body.innerHTML;
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
                font-size: 12px;
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
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      // Fallback
      window.print();
    }
  };

  const formattedDate = new Date(transaction.tanggal).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white text-base">Pratinjau Nota Fisik</h3>
            <p className="text-xs text-slate-400">Printer: {printerName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-6 bg-slate-950 overflow-y-auto flex-1 flex justify-center">
          {/* Thermal Container */}
          <div
            id="thermal-receipt"
            className="bg-white text-neutral-950 p-6 shadow-lg rounded font-mono text-xs w-[58mm] min-h-[120mm]"
            style={{ fontFamily: "'Courier New', Courier, monospace" }}
          >
            <div id="thermal-receipt-print-area">
              <div className="text-center">
                <span className="font-bold text-base block tracking-wider">GOSPLASH</span>
              </div>
              
              <div className="border-t border-dashed border-neutral-400 my-3"></div>
              
              <div className="space-y-1 text-[11px]">
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
                  <span className="font-bold">{transaction.jenis_hari}</span>
                </div>
              </div>
              
              <div className="border-t border-dashed border-neutral-400 my-3"></div>
              
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-bold">
                  <span>Item</span>
                  <span>Total</span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-800">
                  <span>Tiket Masuk ({transaction.jumlah_pengunjung}x)</span>
                  <span>Rp {(transaction.harga_satuan * transaction.jumlah_pengunjung).toLocaleString("id-ID")}</span>
                </div>
                <div className="pl-2 text-[10px] text-neutral-500">
                  @ Rp {transaction.harga_satuan.toLocaleString("id-ID")}
                </div>
                
                {transaction.diskon_persen > 0 && (
                  <div className="flex justify-between text-neutral-700 text-[11px]">
                    <span>Diskon ({transaction.nama_diskon}):</span>
                    <span>-{transaction.diskon_persen}%</span>
                  </div>
                )}
              </div>
              
              <div className="border-t border-dashed border-neutral-400 my-3"></div>
              
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-bold text-sm">
                  <span>TOTAL:</span>
                  <span>Rp {transaction.total_bayar.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-neutral-700">
                  <span>Bayar:</span>
                  <span>Rp {transaction.bayar.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-neutral-700 font-bold">
                  <span>Kembalian:</span>
                  <span>Rp {transaction.kembalian.toLocaleString("id-ID")}</span>
                </div>
              </div>
              
              <div className="border-t border-dashed border-neutral-400 my-3"></div>
              
              <div className="text-center space-y-2 mt-2">
                <p className="text-[9px] text-neutral-500 leading-tight">
                  Harap simpan nota ini.<br />
                  Sebagai bukti masuk wahana.<br />
                  Terima kasih atas kunjungan Anda!
                </p>
                {/* Simulated Barcode */}
                <div className="flex flex-col items-center pt-1">
                  <div className="h-6 w-32 bg-neutral-900 flex items-center justify-around px-2 text-[8px] text-white overflow-hidden font-sans">
                    ||||||||||||||||||||||||||||||||||
                  </div>
                  <span className="text-[8px] text-neutral-500 mt-0.5">GS-{transaction.id}-{transaction.jumlah_pengunjung}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-700 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-xl transition duration-200"
          >
            <Printer className="w-4 h-4" />
            Cetak Nota
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-xl transition duration-200"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
