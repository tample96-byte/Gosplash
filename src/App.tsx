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

// Dexie Local Database and Offline Sync
import { useLiveQuery } from "dexie-react-hooks";
import {
  localDb,
  saveTransactionLocally,
  updateTransactionLocally,
  deleteTransactionLocally,
  savePriceLocally,
  saveDiscountLocally,
  deleteDiscountLocally,
  saveRentalPricesLocally,
} from "./utils/dexieDb";
import { useOfflineSync } from "./hooks/useOfflineSync";

export default function App() {
  // Master states
  const [language, setLanguage] = useState<Language>("ID");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [activeRole, setActiveRole] = useState<UserRole>("Admin");
  const [printerName, setPrinterName] = useState<string>("Canon");

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  // Offline Sync State & Indicators
  const { isOnline, isSyncing, pendingSyncCount, syncNow } = useOfflineSync();

  // Retrieve states reactively from Dexie Local DB using useLiveQuery
  const transactions = useLiveQuery(
    () => localDb.transactions.toArray().then(arr => 
      arr.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
    ),
    []
  ) || [];

  const prices = useLiveQuery(() => localDb.prices.toArray(), []) || [];

  const discounts = useLiveQuery(
    () => localDb.discounts.toArray().then(arr => 
      arr.sort((a, b) => a.persen_diskon - b.persen_diskon)
    ),
    []
  ) || [];

  const dbRentalPrices = useLiveQuery(() => localDb.rentalPrices.get("current"), []);
  const rentalPrices = dbRentalPrices || {
    harga_loker_1: 10000,
    harga_loker_2: 20000,
    harga_tempat_1: 50000,
    harga_tempat_2: 100000,
  };

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
        // Initialize local db standard seeds if empty
        const localTxCount = await localDb.transactions.count();
        const localPricesCount = await localDb.prices.count();

        if (localPricesCount === 0) {
          console.log("Dexie DB terdeteksi kosong. Mengisi standard seed data lokal...");
          await localDb.transaction("rw", [localDb.prices, localDb.discounts, localDb.rentalPrices, localDb.transactions], async () => {
            for (const price of DEFAULT_PRICES) {
              await localDb.prices.put(price);
            }
            for (const disc of DEFAULT_DISCOUNTS) {
              await localDb.discounts.put(disc);
            }
            await localDb.rentalPrices.put({ ...DEFAULT_RENTAL_PRICES, id: "current" });
            
            if (localTxCount === 0) {
              const mockTx = generateMockTransactions();
              for (const tx of mockTx.slice(0, 25)) {
                await localDb.transactions.put(tx);
              }
            }
          });
        }

        // Initialize Firebase Firestore only if we are online and settings are missing
        if (navigator.onLine) {
          const initDocRef = doc(db, "settings", "system_init");
          const initDocSnap = await getDoc(initDocRef);
          
          if (!initDocSnap.exists()) {
            console.log("Database Firestore terdeteksi kosong. Melakukan inisialisasi cloud data...");
            const batch = writeBatch(db);
            
            DEFAULT_PRICES.forEach((price) => {
              const id = price.jenis_hari.replace("/", "_");
              batch.set(doc(db, "prices", id), price);
            });
            
            DEFAULT_DISCOUNTS.forEach((disc) => {
              batch.set(doc(db, "discounts", disc.id), disc);
            });
            
            batch.set(doc(db, "rental_prices", "current"), DEFAULT_RENTAL_PRICES);
            
            const mockTx = generateMockTransactions();
            mockTx.slice(0, 25).forEach((tx) => {
              batch.set(doc(db, "transactions", tx.id), tx);
            });
            
            batch.set(initDocRef, { seeded: true });
            await batch.commit();
            console.log("Database Firestore berhasil diinisialisasi!");
          }
        }
      } catch (error) {
        console.error("Gagal melakukan inisialisasi database:", error);
      }
    }
    checkAndSeedDatabase();
  }, []);

  // Real-time listener for Transactions: Sync down to Dexie DB
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "transactions"),
      async (snapshot) => {
        const txs: Transaction[] = [];
        snapshot.forEach((doc) => {
          txs.push(doc.data() as Transaction);
        });
        
        if (txs.length > 0) {
          // Put the synced elements down into local storage
          await localDb.transactions.bulkPut(txs);
        }

        // Clean up locally any items that were deleted directly on the Firestore Console
        const serverIds = snapshot.docs.map(d => d.id);
        const localKeys = await localDb.transactions.toCollection().primaryKeys();
        const deletedKeys = localKeys.filter(k => !serverIds.includes(k));
        if (deletedKeys.length > 0) {
          await localDb.transactions.bulkDelete(deletedKeys);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "transactions");
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time listener for Prices: Sync down to Dexie DB
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "prices"),
      async (snapshot) => {
        const prs: TicketPrice[] = [];
        snapshot.forEach((doc) => {
          prs.push(doc.data() as TicketPrice);
        });
        if (prs.length > 0) {
          await localDb.prices.bulkPut(prs);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "prices");
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time listener for Discounts: Sync down to Dexie DB
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "discounts"),
      async (snapshot) => {
        const dcs: Discount[] = [];
        snapshot.forEach((doc) => {
          dcs.push(doc.data() as Discount);
        });
        if (dcs.length > 0) {
          await localDb.discounts.bulkPut(dcs);
        }

        const serverIds = snapshot.docs.map(d => d.id);
        const localKeys = await localDb.discounts.toCollection().primaryKeys();
        const deletedKeys = localKeys.filter(k => !serverIds.includes(k));
        if (deletedKeys.length > 0) {
          await localDb.discounts.bulkDelete(deletedKeys);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "discounts");
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time listener for Rental Prices: Sync down to Dexie DB
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "rental_prices", "current"),
      async (docSnap) => {
        if (docSnap.exists()) {
          const rPrices = docSnap.data() as RentalPrices;
          await localDb.rentalPrices.put({ ...rPrices, id: "current" });
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
      for (const price of newPrices) {
        await savePriceLocally(price);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "prices");
    }
  };

  // Sync rental prices update
  const handleUpdateRentalPrices = async (newRentalPrices: RentalPrices) => {
    try {
      await saveRentalPricesLocally(newRentalPrices);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "rental_prices/current");
    }
  };

  // Sync discounts update
  const handleUpdateDiscounts = async (newDiscounts: Discount[]) => {
    try {
      const currentIds = discounts.map((d) => d.id);
      const newIds = newDiscounts.map((d) => d.id);
      const deletedIds = currentIds.filter((id) => !newIds.includes(id));

      for (const disc of newDiscounts) {
        await saveDiscountLocally(disc);
      }
      for (const id of deletedIds) {
        await deleteDiscountLocally(id);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "discounts");
    }
  };

  // Sync printer update
  const handleUpdatePrinter = (name: string) => {
    setPrinterName(name);
    savePrinterName(name);
  };

  // Handler to add a new transaction (Offline-first, instant, queued)
  const handleAddTransaction = async (tx: Omit<Transaction, "id">) => {
    try {
      const maxId = transactions.reduce((max, t) => Math.max(max, parseInt(t.id) || 0), 0);
      const newId = (maxId + 1).toString();
      const newTx: Transaction = {
        ...tx,
        id: newId,
      };
      
      // Atomic local save with auto-sync queue injection
      await saveTransactionLocally(newTx);
      
      // Run sync in background (non-blocking)
      syncNow();
      
      return newTx;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `transactions/${Date.now()}`);
      throw error;
    }
  };

  // Sync transactions update
  const handleUpdateTransactions = async (newTransactions: Transaction[]) => {
    try {
      const currentIds = transactions.map((t) => t.id);
      const newIds = newTransactions.map((t) => t.id);
      const deletedIds = currentIds.filter((id) => !newIds.includes(id));

      for (const tx of newTransactions) {
        await updateTransactionLocally(tx);
      }
      for (const id of deletedIds) {
        await deleteTransactionLocally(id);
      }
      
      syncNow();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "transactions");
    }
  };

  // Reset total system (Restore factory defaults)
  const handleResetAllData = async () => {
    try {
      clearAllData();

      // Clear local database tables
      await localDb.transaction("rw", [localDb.transactions, localDb.prices, localDb.discounts, localDb.rentalPrices, localDb.syncQueue], async () => {
        await localDb.transactions.clear();
        await localDb.prices.clear();
        await localDb.discounts.clear();
        await localDb.rentalPrices.clear();
        await localDb.syncQueue.clear();
      });

      if (navigator.onLine) {
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

        // Repopulate standard seeds on Firestore & Dexie
        const seedBatch = writeBatch(db);
        
        for (const price of DEFAULT_PRICES) {
          await savePriceLocally(price, true);
          const id = price.jenis_hari.replace("/", "_");
          seedBatch.set(doc(db, "prices", id), price);
        }
        for (const disc of DEFAULT_DISCOUNTS) {
          await saveDiscountLocally(disc, true);
          seedBatch.set(doc(db, "discounts", disc.id), disc);
        }
        await saveRentalPricesLocally(DEFAULT_RENTAL_PRICES, true);
        seedBatch.set(doc(db, "rental_prices", "current"), DEFAULT_RENTAL_PRICES);

        const mockTx = generateMockTransactions();
        for (const tx of mockTx.slice(0, 25)) {
          await saveTransactionLocally(tx, true);
          seedBatch.set(doc(db, "transactions", tx.id), tx);
        }
        
        seedBatch.set(doc(db, "settings", "system_init"), { seeded: true });
        await seedBatch.commit();
      } else {
        // Offline-only reset (populate local DB immediately, sync queued when online)
        await localDb.transaction("rw", [localDb.prices, localDb.discounts, localDb.rentalPrices, localDb.transactions], async () => {
          for (const price of DEFAULT_PRICES) {
            await localDb.prices.put(price);
          }
          for (const disc of DEFAULT_DISCOUNTS) {
            await localDb.discounts.put(disc);
          }
          await localDb.rentalPrices.put({ ...DEFAULT_RENTAL_PRICES, id: "current" });
          const mockTx = generateMockTransactions();
          for (const tx of mockTx.slice(0, 25)) {
            await localDb.transactions.put(tx);
          }
        });
      }

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
      await localDb.transaction("rw", [localDb.transactions, localDb.syncQueue], async () => {
        await localDb.transactions.clear();
      });

      if (navigator.onLine) {
        const transSnapshot = await getDocs(collection(db, "transactions"));
        const batch = writeBatch(db);
        transSnapshot.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
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
      // Clear local database
      await localDb.transaction("rw", [localDb.transactions, localDb.prices, localDb.discounts, localDb.rentalPrices], async () => {
        await localDb.transactions.clear();
        await localDb.prices.clear();
        await localDb.discounts.clear();
        await localDb.rentalPrices.clear();
      });

      if (navigator.onLine) {
        const transSnapshot = await getDocs(collection(db, "transactions"));
        const pricesSnapshot = await getDocs(collection(db, "prices"));
        const discountsSnapshot = await getDocs(collection(db, "discounts"));

        let batch = writeBatch(db);
        transSnapshot.forEach((doc) => batch.delete(doc.ref));
        pricesSnapshot.forEach((doc) => batch.delete(doc.ref));
        discountsSnapshot.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        batch = writeBatch(db);
        for (const price of backupData.prices) {
          await savePriceLocally(price, true);
          const id = price.jenis_hari.replace("/", "_");
          batch.set(doc(db, "prices", id), price);
        }
        for (const disc of backupData.discounts) {
          await saveDiscountLocally(disc, true);
          batch.set(doc(db, "discounts", disc.id), disc);
        }
        for (const tx of backupData.transactions) {
          await saveTransactionLocally(tx, true);
          batch.set(doc(db, "transactions", tx.id), tx);
        }
        await saveRentalPricesLocally(backupData.rentalPrices, true);
        batch.set(doc(db, "rental_prices", "current"), backupData.rentalPrices);
        batch.set(doc(db, "settings", "system_init"), { seeded: true });

        await batch.commit();
      } else {
        // Offline-only restore to local DB
        await localDb.transaction("rw", [localDb.prices, localDb.discounts, localDb.rentalPrices, localDb.transactions], async () => {
          for (const price of backupData.prices) {
            await localDb.prices.put(price);
          }
          for (const disc of backupData.discounts) {
            await localDb.discounts.put(disc);
          }
          await localDb.rentalPrices.put({ ...backupData.rentalPrices, id: "current" });
          for (const tx of backupData.transactions) {
            await localDb.transactions.put(tx);
          }
        });
      }

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
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingSyncCount={pendingSyncCount}
        onSyncNow={syncNow}
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
