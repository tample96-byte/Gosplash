# Panduan Prompt Detail: Membangun Aplikasi POS Kasir Tiket & Sewa Fasilitas Wisata (Offline-First)

File ini berisi **Prompt Utama (Master Prompt)** yang sangat detail, modular, dan terstruktur untuk mereproduksi atau membuat ulang aplikasi POS (Point of Sale) Kasir GoSplash ini menggunakan AI Coding Assistant (seperti Gemini, Claude, atau Antigravity) dengan standar arsitektur tingkat lanjut (Senior Frontend Architect).

---

```markdown
## ROLE & CONTEXT
Anda adalah Senior Software Engineer & UI/UX Architect berpengalaman. Tugas Anda adalah membangun aplikasi POS (Point of Sale) Kasir Tiket dan Penyewaan Fasilitas Wisata (seperti Loker & Saung/Tempat) yang responsif, berkinerja tinggi, aman, dan memiliki antarmuka (UI) Slate gelap futuristik ("Cosmic Slate Theme") menggunakan React, TypeScript, Tailwind CSS, Dexie.js, dan Firebase Firestore.

## TECH STACK & REQUIREMENTS
- **Frontend Framework**: React (v18+) + TypeScript + Vite.
- **Styling**: Tailwind CSS dengan tema Slate gelap premium (`bg-slate-950` / `bg-slate-900`) dipadukan dengan aksen biru elektrik (`text-blue-500`) dan hijau emerald untuk penanda sukses.
- **Local Persistence & Offline-First**: Dexie.js (wrapper IndexedDB berkinerja tinggi) + `dexie-react-hooks` untuk update reaktif (`useLiveQuery`).
- **Cloud Database**: Firebase Firestore (sinkronisasi dua arah real-time saat online).
- **Icons & Animation**: Lucide React + Motion (motion/react) untuk animasi mikro-interaksi yang mulus.
- **Security & Integrity**: Web Crypto API (AES-256-GCM + PBKDF2 key derivation + unique random salt & IV) untuk keamanan file ekspor/impor cadangan.

---

## KETENTUAN ARSITEKTUR & DETAIL FITUR

### 1. Sistem Multi-Role & Login Keamanan
- Sediakan halaman Login terenkripsi dengan dua role: **Admin** dan **Kasir**.
- Gunakan pengaman password untuk masing-masing role yang disimpan secara aman di lokal.
- Sediakan switcher bahasa di halaman login dan dashboard utama (Dukungan penuh Bahasa Indonesia [ID] & Inggris [EN]).

### 2. Arsitektur Offline-First & Sinkronisasi Firestore (Dexie.js)
- **Database Lokal (IndexedDB)**:
  - Gunakan **Dexie.js** untuk mengelola lima tabel lokal utama: `transactions`, `prices`, `discounts`, `rentalPrices`, dan `syncQueue`.
  - Buat hook kustom `useOfflineSync` yang secara otomatis melacak status koneksi (`navigator.onLine`).
- **Antrean Sinkronisasi (Sync Queue)**:
  - Setiap kali transaksi, perubahan harga, atau diskon dibuat saat offline, simpan data ke tabel lokal dan masukkan instruksi aksi (`create`, `update`, `delete`) ke `syncQueue` secara atomik dalam satu transaksi database lokal.
  - Saat koneksi pulih (`online`), picu proses pengiriman antrean ke Firestore secara bertahap dengan penanganan kegagalan maksimal 5 kali percobaan (untuk mencegah head-of-line blocking).
  - Sinkronisasi periodik berjalan otomatis setiap 15 detik sebagai perlindungan tambahan.
- **Sinkronisasi Turun (Down-Sync)**:
  - Pasang listener real-time (`onSnapshot`) ke Firestore untuk mengalirkan pembaruan awan ke database lokal, memastikan kasir offline selalu memiliki data harga dan promo terbaru.

### 3. Pembersihan Riwayat Otomatis 30 Hari (Memory Efficiency)
- Tulis fungsi otomatis saat boot untuk menyisir database lokal Dexie dan menghapus transaksi yang sudah lebih dari 30 hari.
- Penghapusan ini bersifat lokal untuk memelihara kinerja penyimpanan perangkat kasir agar tidak lag (memory-efficient), namun data di cloud Firestore tetap utuh sebagai master data jangka panjang.
- Sesuaikan listener real-time di sisi client agar hanya mengunduh data 45 hari terakhir untuk mencegah konflik penghapusan lokal.

### 4. Ekspor/Impor Terenkripsi AES-GCM & Validasi Keamanan
- **Ekspor Data**:
  - Satukan transaksi, konfigurasi harga tiket, harga sewa, dan promo aktif menjadi satu file JSON.
  - Hitung checksum integritas ringan (`calculateIntegrityChecksum`) berbasis nominal keuangan dan jumlah pengunjung.
  - Enkripsi payload JSON menggunakan algoritma standar industri **AES-256-GCM** dengan derivasi kunci PBKDF2 (100.000 iterasi SHA-256), salt acak 16-byte, dan IV unik 12-byte per operasi.
- **Impor Data**:
  - Dekripsi payload dengan dukungan mundur (backward compatibility) untuk format plaintext JSON lama dan format XOR lama.
  - Lakukan validasi timestamp secara ketat (`validateBackupTimestamp`) untuk memblokir impor file dengan tanggal masa depan (tampered backup / clock spoofing).
  - Tampilkan rincian trail audit sebelum memulihkan data untuk konfirmasi Admin.

### 5. Panel Kasir & Emulator Printer Termal (ESC/POS)
- **Kalkulator POS Terpadu**:
  - Kasir dapat memasukkan pax pengunjung (boleh `0` jika hanya sewa fasilitas) dan memilih penyewaan saung/loker aktif dengan harga dinamis dari Admin.
  - Otomatis hitung subtotal berdasarkan jenis hari (weekday/weekend) dan hitung diskon pada tiket masuk.
  - Sediakan kalkulator pembayaran tunai dengan tombol shortcut nominal cepat dan kalkulator kembalian instan.
- **Simulasi Struk Printer Termal**:
  - Tampilkan struk bergaya kertas termal 58mm/80mm yang realistis.
  - Konversikan data transaksi menjadi struktur biner atau teks berbasis ESC/POS dengan pemisah garis rapi, rata kanan-kiri yang proporsional, serta penghilangan baris kosong jika jumlah pax `0`.

### 6. Panel Admin (Admin Dashboard)
- **Statistik & Visualisasi**:
  - Tampilkan kartu ringkasan metrik keuangan: Pendapatan Hari Ini, Total Pengunjung, Jumlah Transaksi, Rasio Non-Tunai, dan Pendapatan Fasilitas.
  - Visualisasikan tren harian tiket vs sewa secara interaktif menggunakan grafik `recharts` atau `d3`.
- **Manajemen Konfigurasi**:
  - Admin dapat mengedit detail transaksi (mengubah jumlah pax, metode bayar, diskon, tipe hari) yang secara otomatis menghitung ulang total bayar dan memperbarui sinkronisasi.
  - Konfigurasi tarif tiket weekday/weekend, tarif sewa loker & saung, serta penambahan diskon aktif.
```

---

## CARA MENGGUNAKAN PROMPT INI
1. Siapkan folder proyek baru dan inisialisasi menggunakan React + TypeScript + Vite.
2. Pasang pustaka inti yang dibutuhkan:
   ```bash
   npm install dexie dexie-react-hooks lucide-react motion recharts firebase
   ```
3. Salin prompt di atas secara utuh dan berikan kepada AI Coding Assistant Anda untuk merancang struktur file modular terbaik.
