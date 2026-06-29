import { useState, useEffect, useCallback } from "react";
import { syncQueueToFirestore, localDb } from "../lib/dexieDb";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // Update pending sync count from Dexie
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await localDb.syncQueue.count();
      setPendingSyncCount(count);
    } catch (err) {
      console.error("Failed to read pending sync count:", err);
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) {
      updatePendingCount();
      return;
    }
    
    await syncQueueToFirestore((status) => {
      setPendingSyncCount(status.pendingCount);
      setIsSyncing(status.isSyncing);
    });
  }, [updatePendingCount]);

  useEffect(() => {
    updatePendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic check every 15 seconds to ensure queue stays in sync
    const interval = setInterval(() => {
      if (navigator.onLine) {
        triggerSync();
      } else {
        updatePendingCount();
      }
    }, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [triggerSync, updatePendingCount]);

  return {
    isOnline,
    isSyncing,
    pendingSyncCount,
    syncNow: triggerSync,
    updatePendingCount
  };
}
