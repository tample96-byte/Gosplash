# Panduan Prompt Detail: Membangun Aplikasi POS Kasir Tiket & Sewa Wisata (Single-PC Dedicated Resilient)

File ini berisi **Prompt Utama (Master Prompt)** yang sangat detail, modular, dan terstruktur untuk mereproduksi atau membuat ulang aplikasi POS (Point of Sale) Kasir GoSplash ini menggunakan AI Coding Assistant (seperti Gemini, Claude, atau Antigravity) dengan standar arsitektur tangguh siap bencana (Disaster Recovery).

---

```markdown
## ROLE & CONTEXT
Anda adalah Senior Software Engineer & UI/UX Architect berpengalaman dalam merancang aplikasi POS kasir mandiri (Single-PC Dedicated) untuk tempat wisata dengan lalu lintas padat. Tugas Anda adalah membangun aplikasi POS Kasir Tiket dan Penyewaan Saung/Loker yang responsif, berkinerja tinggi, aman, dan memiliki antarmuka (UI) Slate gelap futuristik ("Cosmic Slate Theme") menggunakan React, TypeScript, Tailwind CSS, Dexie.js (IndexedDB lokal), dan Firebase Firestore.

## TECH STACK & ARCHITECTURE REQUIREMENTS
- **Frontend Framework**: React (v18+) + TypeScript + Vite.
- **Styling**: Tailwind CSS dengan tema Slate gelap premium (`bg-slate-950` / `bg-slate-900`) dipadukan dengan aksen biru elektrik (`text-blue-500`) dan kuning amber untuk penanda antrean lokal.
- **Local Persistence & Offline-First**: Dexie.js (wrapper IndexedDB berkinerja tinggi) + `dexie-react-hooks` untuk update reaktif (`useLiveQuery`).
- **Resilient Cloud Database**: Firebase Firestore (sinkronisasi dua arah real-time saat online).
- **Icons & Animation**: Lucide React + Motion (motion/react) untuk animasi mikro-interaksi yang mulus.
- **Security & Integrity**: Web Crypto API (AES-256-GCM + PBKDF2 key derivation + unique random salt & IV) untuk keamanan file ekspor/impor cadangan.

---

## KETENTUAN ARSITEKTUR & DETAIL FITUR

### 1. Inisialisasi Keras Luring Firebase (firebase.ts)
- Konfigurasikan inisialisasi Firebase Firestore menggunakan `initializeFirestore()` dengan mengaktifkan localCache lewat `persistentLocalCache()` dan `persistentMultipleTabManager()`.
- Pastikan modul Firebase terkonfigurasi tangguh agar tidak melempar fatal error atau membuat aplikasi membeku (stuck/freeze) ketika PC loket dinyalakan pertama kali dalam kondisi internet mati total (network-dead state).

### 2. Antrean Sinkronisasi & Indikator Kasir (CashierPanel.tsx)
- **Database Lokal (IndexedDB)**:
  - Gunakan **Dexie.js** untuk mengelola tabel lokal utama: `transactions`, `prices`, `discounts`, `rentalPrices`, dan `syncQueue`.
  - Buat hook kustom `useOfflineSync` yang secara otomatis melacak status koneksi (`navigator.onLine`) dan menyalurkan antrean transaksi ke Firestore secara bertahap saat koneksi pulih (`online`).
- **Indikator Sync Queue Reaktif**:
  - Di header panel kasir, ambil jumlah item yang tertahan di antrean lokal secara reaktif menggunakan `useLiveQuery(() => db.syncQueue.count()) ?? 0`.
  - Tampilkan sebuah Badge peringatan berwarna amber/oranye yang berkedip (`animate-pulse`) HANYA jika antrean lebih besar dari 0 (Contoh: "⚠️ {pendingCount} Transaksi Belum Terunggah"). Ini memberi tahu kasir bahwa data aman lokal namun PC belum boleh dimatikan sebelum sinkronisasi selesai.

### 3. Pembersihan Riwayat Otomatis 30 Hari & Keamanan Memori
- Tulis fungsi otomatis saat boot untuk menyisir database lokal Dexie dan menghapus transaksi yang sudah lebih dari 30 hari (`pruneOldLocalTransactions`).
- Penghapusan ini bersifat lokal untuk memelihara kinerja penyimpanan IndexedDB PC tunggal agar tetap responsif, namun data di cloud Firestore tetap utuh sebagai master data jangka panjang.
- Sesuaikan listener real-time di sisi client agar hanya mengunduh data 45 hari terakhir untuk mencegah konflik penghapusan lokal.

### 4. Ekspor/Impor Terenkripsi AES-GCM & Validasi Keamanan (crypto.ts)
- **Ekspor Data**:
  - Satukan transaksi, konfigurasi harga tiket, harga sewa, dan promo aktif menjadi satu file JSON. Enkripsi payload JSON menggunakan algoritma standar industri **AES-256-GCM** dengan derivasi kunci PBKDF2 (100.000 iterasi SHA-256), salt acak 16-byte, dan IV unik 12-byte per operasi.
- **Impor Data & Disaster Recovery**:
  - Dekripsi payload dengan dukungan backward compatibility untuk format plaintext JSON lama dan format XOR lama.
  - Lakukan validasi timestamp secara ketat (`validateBackupTimestamp`) untuk memblokir impor file dengan tanggal masa depan (tampered backup / clock spoofing).
  - Tampilkan rincian trail audit sebelum memulihkan data untuk konfirmasi Admin.

### 5. Panduan Pemulihan Bencana 2 Arah (Disaster Recovery)
Desain arsitektur Single-PC dengan pemulihan 2 arah:
- **Jalur 1: Migrasi Manual (PC Lama Menyala)**: Admin melakukan ekspor cadangan terenkripsi (.enc) lalu memulihkannya ke PC loket cadangan baru.
- **Jalur 2: Sinkronisasi Awan Otomatis (PC Lama Rusak Total)**: Ketika PC loket pengganti pertama kali dibuka luring, fungsi `seedDatabaseIfEmpty()` segera menginisialisasi database lokal dengan harga standar. Begitu internet terhubung, Firebase otomatis menarik (pull-down) seluruh data transaksi 45 hari terakhir dari Firestore awan.

### 6. Panel Kasir & Emulator Printer Termal (ESC/POS)
- **Kalkulator POS Terpadu**:
  - Kasir dapat memasukkan pax pengunjung (boleh `0` jika hanya sewa fasilitas) dan memilih penyewaan saung/loker aktif dengan harga dinamis dari Admin.
  - Lindungi masukan angka dari karakter minus atau nilai di bawah 0. Blokir transaksi dengan nominal akhir total Rp 0.
- **Simulasi Struk Printer Termal**:
  - Tampilkan struk bergaya kertas termal 58mm/80mm yang realistis. Konversikan data transaksi menjadi struktur teks berbasis ESC/POS yang siap dicetak ke printer USB/Bluetooth.
```

---

## CARA MENGGUNAKAN PROMPT INI
1. Siapkan folder proyek baru dan inisialisasi menggunakan React + TypeScript + Vite.
2. Pasang pustaka inti yang dibutuhkan:
   ```bash
   npm install dexie dexie-react-hooks lucide-react motion recharts firebase
   ```
3. Salin prompt di atas secara utuh dan berikan kepada AI Coding Assistant Anda untuk merancang struktur file modular terbaik.
