import Dexie, { type Table } from "dexie";
import { Transaction, TicketPrice, Discount, RentalPrices } from "../types";
import { doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

// Define Sync Queue item interface
export interface SyncQueueItem {
  id?: number;
  action: "create" | "update" | "delete";
  collection: "transactions" | "prices" | "discounts" | "rental_prices";
  docId: string;
  payload: any;
  timestamp: number;
  attempts: number;
}

// Dexie Local Database Setup
class GoSplashLocalDB extends Dexie {
  transactions!: Table<Transaction, string>;
  prices!: Table<TicketPrice, string>;
  discounts!: Table<Discount, string>;
  rentalPrices!: Table<RentalPrices & { id: string }, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super("GoSplashLocalDB");
    this.version(1).stores({
      transactions: "id, tanggal, total_bayar",
      prices: "jenis_hari",
      discounts: "id, nama_diskon",
      rentalPrices: "id",
      syncQueue: "++id, action, collection, docId, timestamp",
    });
  }
}

export const localDb = new GoSplashLocalDB();

// Atomic Operations Helper
export async function saveTransactionLocally(tx: Transaction, isSyncing = false) {
  return localDb.transaction("rw", [localDb.transactions, localDb.syncQueue], async () => {
    await localDb.transactions.put(tx);
    if (!isSyncing) {
      await localDb.syncQueue.add({
        action: "create",
        collection: "transactions",
        docId: tx.id,
        payload: tx,
        timestamp: Date.now(),
        attempts: 0,
      });
    }
  });
}

export async function updateTransactionLocally(tx: Transaction, isSyncing = false) {
  return localDb.transaction("rw", [localDb.transactions, localDb.syncQueue], async () => {
    await localDb.transactions.put(tx);
    if (!isSyncing) {
      await localDb.syncQueue.add({
        action: "update",
        collection: "transactions",
        docId: tx.id,
        payload: tx,
        timestamp: Date.now(),
        attempts: 0,
      });
    }
  });
}

export async function deleteTransactionLocally(id: string, isSyncing = false) {
  return localDb.transaction("rw", [localDb.transactions, localDb.syncQueue], async () => {
    await localDb.transactions.delete(id);
    if (!isSyncing) {
      await localDb.syncQueue.add({
        action: "delete",
        collection: "transactions",
        docId: id,
        payload: null,
        timestamp: Date.now(),
        attempts: 0,
      });
    }
  });
}

export async function savePriceLocally(price: TicketPrice, isSyncing = false) {
  const id = price.jenis_hari.replace("/", "_");
  return localDb.transaction("rw", [localDb.prices, localDb.syncQueue], async () => {
    await localDb.prices.put(price);
    if (!isSyncing) {
      await localDb.syncQueue.add({
        action: "update",
        collection: "prices",
        docId: id,
        payload: price,
        timestamp: Date.now(),
        attempts: 0,
      });
    }
  });
}

export async function saveDiscountLocally(discount: Discount, isSyncing = false) {
  return localDb.transaction("rw", [localDb.discounts, localDb.syncQueue], async () => {
    await localDb.discounts.put(discount);
    if (!isSyncing) {
      await localDb.syncQueue.add({
        action: "update",
        collection: "discounts",
        docId: discount.id,
        payload: discount,
        timestamp: Date.now(),
        attempts: 0,
      });
    }
  });
}

export async function deleteDiscountLocally(id: string, isSyncing = false) {
  return localDb.transaction("rw", [localDb.discounts, localDb.syncQueue], async () => {
    await localDb.discounts.delete(id);
    if (!isSyncing) {
      await localDb.syncQueue.add({
        action: "delete",
        collection: "discounts",
        docId: id,
        payload: null,
        timestamp: Date.now(),
        attempts: 0,
      });
    }
  });
}

export async function saveRentalPricesLocally(prices: RentalPrices, isSyncing = false) {
  const record = { ...prices, id: "current" };
  return localDb.transaction("rw", [localDb.rentalPrices, localDb.syncQueue], async () => {
    await localDb.rentalPrices.put(record);
    if (!isSyncing) {
      await localDb.syncQueue.add({
        action: "update",
        collection: "rental_prices",
        docId: "current",
        payload: prices,
        timestamp: Date.now(),
        attempts: 0,
      });
    }
  });
}

// Synchronization Engine with robust retry & backoff
let isSyncingNow = false;
export async function syncQueueToFirestore(onStatusChange?: (status: { pendingCount: number; isSyncing: boolean }) => void): Promise<boolean> {
  if (isSyncingNow) return false;
  
  const pendingItems = await localDb.syncQueue.toArray();
  if (pendingItems.length === 0) {
    if (onStatusChange) onStatusChange({ pendingCount: 0, isSyncing: false });
    return true;
  }

  // Check connectivity
  if (!navigator.onLine) {
    if (onStatusChange) onStatusChange({ pendingCount: pendingItems.length, isSyncing: false });
    return false;
  }

  isSyncingNow = true;
  if (onStatusChange) onStatusChange({ pendingCount: pendingItems.length, isSyncing: true });

  console.log(`Starting synchronization of ${pendingItems.length} queued changes...`);

  let successCount = 0;
  for (const item of pendingItems) {
    try {
      const docRef = doc(db, item.collection, item.docId);
      
      if (item.action === "delete") {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, item.payload);
      }
      
      // Successfully synced, remove from queue
      if (item.id) {
        await localDb.syncQueue.delete(item.id);
        successCount++;
      }
    } catch (error: any) {
      console.error(`Failed to sync item ${item.id} (attempts: ${item.attempts}):`, error);
      
      // Increment attempt counter
      if (item.id) {
        if (item.attempts >= 5) {
          // Discard permanently failing item to prevent head-of-line blocking (e.g. permission denied)
          console.error(`Discarding item ${item.id} after 5 failed sync attempts.`);
          await localDb.syncQueue.delete(item.id);
        } else {
          await localDb.syncQueue.update(item.id, { attempts: item.attempts + 1 });
        }
      }
      
      // Stop synchronization loop on connection failures so we don't spam requests
      if (error?.code === "unavailable" || !navigator.onLine) {
        break;
      }
    }
  }

  isSyncingNow = false;
  const remainingCount = await localDb.syncQueue.count();
  if (onStatusChange) onStatusChange({ pendingCount: remainingCount, isSyncing: false });

  console.log(`Synchronization session completed. ${successCount} item(s) processed successfully.`);
  return remainingCount === 0;
}
