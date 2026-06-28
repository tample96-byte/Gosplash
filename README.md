# GoSplash Point-of-Sale (POS) & Ticketing System

An enterprise-grade, offline-first React POS and Ticketing system designed for modern theme parks and recreational facilities.

This application is built with a resilient, high-performance architecture capable of operating entirely offline without interrupting daily operations, seamlessly synchronizing data to Google Firebase Firestore once internet connectivity is restored.

---

## 🚀 Getting Started

### 1. Prerequisites
Make sure you have the following installed on your machine:
- **Node.js** (v18 or newer recommended)
- **NPM** (packaged automatically with Node.js)

### 2. Installation
Extract the project ZIP file, open your terminal in the root directory, and run:
```bash
npm install
```

### 3. Running in Development Mode
Start the local Vite server with:
```bash
npm run dev
```
Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

### 4. Compiling for Production
To bundle and optimize the application into static HTML, CSS, and JS files for deployment:
```bash
npm run build
```
The output will be placed inside the `/dist` directory. You can test the production build locally using:
```bash
npm run preview
```

---

## 🛠️ Key Architectural Pillars

### 📶 1. Offline-First Synchronization Engine (Dexie.js & IndexedDB)
- **Local Reactive Storage**: Powered by **Dexie.js** and `dexie-react-hooks`. Updates are instantly visible to the user without server round-trip latency.
- **Durable Sync Queue**: Every local modification (transaction insertions, pricing changes, active discounts) is queued locally inside `syncQueue`.
- **Automatic Sync Sessions**: Triggers automatically on connection recovery (`online` event) and runs verification cycles every 15 seconds to sync data to Firebase Firestore securely.

### 🧹 2. Memory-Efficient 30-Day Auto Cleanup
- To prevent storage fatigue and lag on lower-spec POS hardware, the local IndexedDB automatically prunes local transaction history older than **30 days**.
- Pruning runs entirely on the client, keeping your cloud master transactions in **Firestore** completely intact.
- Firebase snapshots are filtered dynamically to only fetch transactions from the last 45 days, avoiding conflicts with pruned local entries.

### 🔒 3. Safe Cryptographic Backups (AES-256-GCM)
- Local backup file exports are encrypted using industry-standard **AES-GCM (256-bit)** from the Web Crypto API.
- Keys are derived through **PBKDF2** with 100,000 iterations of SHA-256 and unique, cryptographically secure 16-byte random salts + 12-byte random initialization vectors (IVs) for every file export.
- **Security Validation on Import**:
  - Validates timestamps to prevent uploading backups from future dates (clock spoofing).
  - Displays lightweight audit-trail checksums for Admin approval before committing restores.

### 🆘 4. Single-PC Disaster Recovery (DR) Scenarios
The application implements a resilient 2-way disaster recovery architecture optimized for a single-PC dedicated booth deployment:
1. **Scenario A: Hardware Migration (Old PC partially functional)**:
   - If the old PC can be booted briefly or its hard drive is accessible, perform an encrypted backup export from the Admin Panel.
   - On the new replacement PC, import the backup file. The system will decrypt using AES-GCM, validate the backup timestamp to prevent spoofing, and immediately seed all prices, discounts, and transaction histories into the local IndexedDB.
2. **Scenario B: Sudden PC Failure (Old PC completely destroyed)**:
   - Connect the new replacement PC to the network. On first load, the local IndexedDB is automatically initialized and pre-seeded offline (`DEFAULT_PRICES`, `DEFAULT_DISCOUNTS`, `DEFAULT_RENTAL_PRICES`) so kasir sales can continue immediately.
   - As soon as the replacement PC establishes internet connectivity, the Firestore synchronization engine will pull down the master transaction data from the last 45 days. The active configurations (pricing and discounts) are synchronized dynamically.

### 🖨️ 5. Thermal ESC/POS Printer Emulation
- Supports high-fidelity 58mm/80mm layout previews resembling realistic thermal receipts.
- Includes a utility parser that formats sales into valid ESC/POS byte-sequences ready to be dispatched directly to physical thermal printers.

---

## 👥 Default Credentials
- **Admin**: `admin123`
- **Cashier**: `kasir123`

---

*Untuk panduan lengkap dalam Bahasa Indonesia, silakan buka file **[CARA_MENJALANKAN.md](./CARA_MENJALANKAN.md)**.*
