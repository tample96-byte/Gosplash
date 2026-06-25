/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
  loadActiveRole,
  saveActiveRole,
  loadPrices,
  savePrices,
  loadDiscounts,
  saveDiscounts,
  loadTransactions,
  saveTransactions,
  addTransaction,
  loadPrinterName,
  savePrinterName,
  clearAllData,
} from "./utils/storage";
import { UserRole, TicketPrice, Discount, Transaction } from "./types";
import { RoleSelector } from "./components/RoleSelector";
import { CashierPanel } from "./components/CashierPanel";
import { AdminPanel } from "./components/AdminPanel";
import { ReceiptPrintout } from "./components/ReceiptPrintout";
import { LoginPage } from "./components/LoginPage";

export default function App() {
  // Master states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [activeRole, setActiveRole] = useState<UserRole>("Admin");
  const [prices, setPrices] = useState<TicketPrice[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [printerName, setPrinterName] = useState<string>("Canon");

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  // Load initial settings
  useEffect(() => {
    setActiveRole(loadActiveRole());
    setPrices(loadPrices());
    setDiscounts(loadDiscounts());
    setTransactions(loadTransactions());
    setPrinterName(loadPrinterName());
  }, []);

  // Handle Login success
  const handleLoginSuccess = (role: UserRole) => {
    setActiveRole(role);
    saveActiveRole(role);
    setIsLoggedIn(true);
  };

  // Handle Logout
  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  // Sync prices update
  const handleUpdatePrices = (newPrices: TicketPrice[]) => {
    setPrices(newPrices);
    savePrices(newPrices);
  };

  // Sync discounts update
  const handleUpdateDiscounts = (newDiscounts: Discount[]) => {
    setDiscounts(newDiscounts);
    saveDiscounts(newDiscounts);
  };

  // Sync printer update
  const handleUpdatePrinter = (name: string) => {
    setPrinterName(name);
    savePrinterName(name);
  };

  // Handler to add a new transaction (updates cashier & table immediately)
  const handleAddTransaction = (tx: Omit<Transaction, "id">) => {
    const newTx = addTransaction(tx);
    // Reload transactions to trigger list/chart updates
    setTransactions([newTx, ...transactions]);
    return newTx;
  };

  // Sync transactions update
  const handleUpdateTransactions = (newTransactions: Transaction[]) => {
    setTransactions(newTransactions);
    saveTransactions(newTransactions);
  };

  // Reset total system
  const handleResetAllData = () => {
    clearAllData();
    // Reload state back to default
    setActiveRole("Admin");
    setPrices(loadPrices());
    setDiscounts(loadDiscounts());
    setTransactions(loadTransactions());
    setPrinterName(loadPrinterName());
    setActiveReceipt(null);
  };

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* 1. Header with Role Switcher & Live Clock */}
      <RoleSelector
        activeRole={activeRole}
        onLogout={handleLogout}
        printerName={printerName}
      />

      {/* 2. Main Content Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dynamic Dual-Layout: Left input forms, Right reporting dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Cashier ticket input panel (5 columns on desktop) */}
          <section className="lg:col-span-5 h-full">
            <CashierPanel
              prices={prices}
              discounts={discounts}
              onAddTransaction={handleAddTransaction}
              onShowReceipt={setActiveReceipt}
            />
          </section>

          {/* RIGHT: Reports table & Charts panel (7 columns on desktop) */}
          <section className="lg:col-span-7">
            <AdminPanel
              isLocked={activeRole === "Kasir"}
              transactions={transactions}
              prices={prices}
              discounts={discounts}
              printerName={printerName}
              onUpdatePrices={handleUpdatePrices}
              onUpdateDiscounts={handleUpdateDiscounts}
              onUpdatePrinter={handleUpdatePrinter}
              onClearTransactions={handleResetAllData}
              onUpdateTransactions={handleUpdateTransactions}
            />
          </section>
        </div>
      </main>

      {/* 3. Receipt Printer Simulation Modal */}
      {activeReceipt && (
        <ReceiptPrintout
          transaction={activeReceipt}
          printerName={printerName}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* 4. Humble professional footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-400 font-sans">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 GoSplash Waterpark. All Rights Reserved.</p>
          <p className="mt-1 text-[10px] text-slate-300">
            GoSplash Ticketing System
          </p>
        </div>
      </footer>
    </div>
  );
}
