/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
  loadActiveRole,
  saveActiveRole,
  loadPrinterName,
  savePrinterName,
  clearAllData,
  clearTransactionsOnly,
  DEFAULT_RENTAL_PRICES,
} from "./utils/storage";
import { UserRole, TicketPrice, Discount, Transaction, RentalPrices } from "./types";
import { RoleSelector } from "./components/RoleSelector";
import { CashierPanel } from "./components/CashierPanel";
import { AdminPanel } from "./components/AdminPanel";
import { ReceiptPrintout } from "./components/ReceiptPrintout";
import { LoginPage } from "./components/LoginPage";
import { Language, loadLanguage, saveLanguage } from "./utils/lang";

// Firebase Imports
import { collection, onSnapshot, doc, setDoc, writeBatch, getDocs, getDoc, getDocFromServer } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { DEFAULT_PRICES, DEFAULT_DISCOUNTS, generateMockTransactions } from "./data/mockData";

export default function App() {
  // Master states
  const [language, setLanguage] = useState<Language>("ID");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [activeRole, setActiveRole] = useState<UserRole>("Admin");
  const [prices, setPrices] = useState<TicketPrice[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [printerName, setPrinterName] = useState<string>("Canon");
  const [rentalPrices, setRentalPrices] = useState<RentalPrices>({
    harga_loker_1: 10000,
    harga_loker_2: 20000,
    harga_tempat_1: 50000,
    harga_tempat_2: 100000,
  });

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  // Validate Connection to Firestore on boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (error instanceof Error && error.message.includes("the client is offline")) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Load language and role preferences and initialize Firebase database on first boot
  useEffect(() => {
    setActiveRole(loadActiveRole());
    setPrinterName(loadPrinterName());
    setLanguage(loadLanguage());

    async function checkAndSeedDatabase() {
      try {
        const initDocRef = doc(db, "settings", "system_init");
        const initDocSnap = await getDoc(initDocRef);
        
        if (!initDocSnap.exists()) {
          console.log("Database GoSplash terdeteksi kosong. Melakukan inisialisasi data standar...");
          const batch = writeBatch(db);
          
          // 1. Inisialisasi harga tiket
          DEFAULT_PRICES.forEach((price) => {
            const id = price.jenis_hari.replace("/", "_");
            batch.set(doc(db, "prices", id), price);
          });
          
          // 2. Inisialisasi daftar diskon/promo
          DEFAULT_DISCOUNTS.forEach((disc) => {
            batch.set(doc(db, "discounts", disc.id), disc);
          });
          
          // 3. Inisialisasi harga sewa saung/loker
          batch.set(doc(db, "rental_prices", "current"), DEFAULT_RENTAL_PRICES);
          
          // 4. Inisialisasi riwayat transaksi awal (mock)
          const mockTx = generateMockTransactions();
          mockTx.slice(0, 25).forEach((tx) => {
            batch.set(doc(db, "transactions", tx.id), tx);
          });
          
          // 5. Tandai database telah diinisialisasi
          batch.set(initDocRef, { seeded: true });
          
          await batch.commit();
          console.log("Database GoSplash berhasil diinisialisasi!");
        }
      } catch (error) {
        console.error("Gagal melakukan inisialisasi database:", error);
      }
    }
    checkAndSeedDatabase();
  }, []);

  // Real-time listener for Transactions
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "transactions"),
      (snapshot) => {
        const txs: Transaction[] = [];
        snapshot.forEach((doc) => {
          txs.push(doc.data() as Transaction);
        });
        // Sort by date descending
        txs.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
        setTransactions(txs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "transactions");
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time listener for Prices
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "prices"),
      (snapshot) => {
        const prs: TicketPrice[] = [];
        snapshot.forEach((doc) => {
          prs.push(doc.data() as TicketPrice);
        });
        setPrices(prs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "prices");
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time listener for Discounts
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "discounts"),
      (snapshot) => {
        const dcs: Discount[] = [];
        snapshot.forEach((doc) => {
          dcs.push(doc.data() as Discount);
        });
        dcs.sort((a, b) => a.persen_diskon - b.persen_diskon);
        setDiscounts(dcs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "discounts");
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time listener for Rental Prices
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "rental_prices", "current"),
      (docSnap) => {
        if (docSnap.exists()) {
          setRentalPrices(docSnap.data() as RentalPrices);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "rental_prices/current");
      }
    );
    return () => unsubscribe();
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
  const handleUpdatePrices = async (newPrices: TicketPrice[]) => {
    try {
      setPrices(newPrices);
      const batch = writeBatch(db);
      newPrices.forEach((price) => {
        const id = price.jenis_hari.replace("/", "_");
        batch.set(doc(db, "prices", id), price);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "prices");
    }
  };

  // Sync rental prices update
  const handleUpdateRentalPrices = async (newRentalPrices: RentalPrices) => {
    try {
      setRentalPrices(newRentalPrices);
      await setDoc(doc(db, "rental_prices", "current"), newRentalPrices);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "rental_prices/current");
    }
  };

  // Sync discounts update
  const handleUpdateDiscounts = async (newDiscounts: Discount[]) => {
    try {
      setDiscounts(newDiscounts);
      const currentIds = discounts.map((d) => d.id);
      const newIds = newDiscounts.map((d) => d.id);
      const deletedIds = currentIds.filter((id) => !newIds.includes(id));

      const batch = writeBatch(db);
      newDiscounts.forEach((disc) => {
        batch.set(doc(db, "discounts", disc.id), disc);
      });
      deletedIds.forEach((id) => {
        batch.delete(doc(db, "discounts", id));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "discounts");
    }
  };

  // Sync printer update
  const handleUpdatePrinter = (name: string) => {
    setPrinterName(name);
    savePrinterName(name);
  };

  // Handler to add a new transaction
  const handleAddTransaction = async (tx: Omit<Transaction, "id">) => {
    try {
      const maxId = transactions.reduce((max, t) => Math.max(max, parseInt(t.id) || 0), 0);
      const newId = (maxId + 1).toString();
      const newTx: Transaction = {
        ...tx,
        id: newId,
      };
      // Do not await setDoc so that offline mode doesn't block the UI if promise hangs
      setDoc(doc(db, "transactions", newId), newTx).catch((error) => {
         console.warn("Background sync delay or error:", error);
      });
      return newTx;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `transactions/${Date.now()}`);
      throw error;
    }
  };

  // Sync transactions update
  const handleUpdateTransactions = async (newTransactions: Transaction[]) => {
    try {
      setTransactions(newTransactions);
      const currentIds = transactions.map((t) => t.id);
      const newIds = newTransactions.map((t) => t.id);
      const deletedIds = currentIds.filter((id) => !newIds.includes(id));

      const batch = writeBatch(db);
      newTransactions.forEach((tx) => {
        const existingTx = transactions.find((t) => t.id === tx.id);
        if (!existingTx || JSON.stringify(existingTx) !== JSON.stringify(tx)) {
          batch.set(doc(db, "transactions", tx.id), tx);
        }
      });
      deletedIds.forEach((id) => {
        batch.delete(doc(db, "transactions", id));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "transactions");
    }
  };

  // Reset total system (Restore factory defaults)
  const handleResetAllData = async () => {
    try {
      clearAllData();
      const transSnapshot = await getDocs(collection(db, "transactions"));
      const pricesSnapshot = await getDocs(collection(db, "prices"));
      const discountsSnapshot = await getDocs(collection(db, "discounts"));

      const batch = writeBatch(db);
      transSnapshot.forEach((doc) => batch.delete(doc.ref));
      pricesSnapshot.forEach((doc) => batch.delete(doc.ref));
      discountsSnapshot.forEach((doc) => batch.delete(doc.ref));
      batch.delete(doc(db, "rental_prices", "current"));
      batch.delete(doc(db, "settings", "system_init"));
      await batch.commit();

      // Seed defaults immediately
      const seedBatch = writeBatch(db);
      DEFAULT_PRICES.forEach((price) => {
        const id = price.jenis_hari.replace("/", "_");
        seedBatch.set(doc(db, "prices", id), price);
      });
      DEFAULT_DISCOUNTS.forEach((disc) => {
        seedBatch.set(doc(db, "discounts", disc.id), disc);
      });
      seedBatch.set(doc(db, "rental_prices", "current"), DEFAULT_RENTAL_PRICES);
      
      const mockTx = generateMockTransactions();
      mockTx.slice(0, 25).forEach((tx) => {
        seedBatch.set(doc(db, "transactions", tx.id), tx);
      });
      seedBatch.set(doc(db, "settings", "system_init"), { seeded: true });
      await seedBatch.commit();

      setActiveRole("Admin");
      setActiveReceipt(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "all_data");
    }
  };

  // Reset transactions only
  const handleResetTransactionsOnly = async () => {
    try {
      clearTransactionsOnly();
      const transSnapshot = await getDocs(collection(db, "transactions"));
      const batch = writeBatch(db);
      transSnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "transactions");
    }
  };

  // Restore all data from backup file
  const handleRestoreAllData = async (backupData: {
    prices: TicketPrice[];
    rentalPrices: RentalPrices;
    discounts: Discount[];
    transactions: Transaction[];
    printerName: string;
  }) => {
    try {
      const transSnapshot = await getDocs(collection(db, "transactions"));
      const pricesSnapshot = await getDocs(collection(db, "prices"));
      const discountsSnapshot = await getDocs(collection(db, "discounts"));

      let batch = writeBatch(db);
      transSnapshot.forEach((doc) => batch.delete(doc.ref));
      pricesSnapshot.forEach((doc) => batch.delete(doc.ref));
      discountsSnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      batch = writeBatch(db);
      backupData.prices.forEach((price) => {
        const id = price.jenis_hari.replace("/", "_");
        batch.set(doc(db, "prices", id), price);
      });
      backupData.discounts.forEach((disc) => {
        batch.set(doc(db, "discounts", disc.id), disc);
      });
      backupData.transactions.forEach((tx) => {
        batch.set(doc(db, "transactions", tx.id), tx);
      });
      batch.set(doc(db, "rental_prices", "current"), backupData.rentalPrices);
      batch.set(doc(db, "settings", "system_init"), { seeded: true });

      await batch.commit();

      savePrinterName(backupData.printerName);
      setPrinterName(backupData.printerName);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "restore_data");
    }
  };


  if (!isLoggedIn) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        language={language}
        onLanguageChange={(lang) => {
          setLanguage(lang);
          saveLanguage(lang);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* 1. Header with Role Switcher & Live Clock */}
      <RoleSelector
        activeRole={activeRole}
        onLogout={handleLogout}
        printerName={printerName}
        language={language}
        onLanguageChange={(lang) => {
          setLanguage(lang);
          saveLanguage(lang);
        }}
      />

      {/* 2. Main Content Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dynamic Dual-Layout: Left input forms, Right reporting dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Cashier ticket input panel (5 columns on desktop) */}
          <section className="lg:col-span-5 h-full">
            <CashierPanel
              transactions={transactions}
              prices={prices}
              discounts={discounts}
              rentalPrices={rentalPrices}
              onAddTransaction={handleAddTransaction}
              onShowReceipt={setActiveReceipt}
              language={language}
            />
          </section>

          {/* RIGHT: Reports table & Charts panel (7 columns on desktop) */}
          <section className="lg:col-span-7">
            <AdminPanel
              isLocked={activeRole === "Kasir"}
              transactions={transactions}
              prices={prices}
              discounts={discounts}
              rentalPrices={rentalPrices}
              printerName={printerName}
              onUpdatePrices={handleUpdatePrices}
              onUpdateRentalPrices={handleUpdateRentalPrices}
              onUpdateDiscounts={handleUpdateDiscounts}
              onUpdatePrinter={handleUpdatePrinter}
              onClearTransactions={handleResetAllData}
              onClearTransactionsOnly={handleResetTransactionsOnly}
              onRestoreAllData={handleRestoreAllData}
              onUpdateTransactions={handleUpdateTransactions}
              onShowReceipt={setActiveReceipt}
              language={language}
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
          language={language}
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
