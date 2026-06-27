# Panduan Menjalankan & Detail Arsitektur POS Kasir GoSplash (Offline-First)

Dokumen ini berisi panduan lengkap untuk memasang, menjalankan, serta memahami arsitektur canggih yang diterapkan pada aplikasi **GoSplash POS Kasir Tiket & Sewa Fasilitas Wisata**.

---

## 🚀 Langkah-Langkah Instalasi & Menjalankan Aplikasi

### 1. Prasyarat (Prerequisites)
Pastikan perangkat Anda sudah terinstal:
- **Node.js** (Sangat direkomendasikan versi 18 atau yang lebih baru)
- **NPM** (Bawaan dari instalasi Node.js)

### 2. Ekstrak & Masuk ke Folder Proyek
Ekstrak file ZIP proyek yang diunduh dari AI Studio, lalu buka terminal atau Command Prompt (CMD) di dalam direktori proyek tersebut:
```bash
cd go-splash-pos-app
```

### 3. Instal Seluruh Dependensi (Library)
Jalankan perintah berikut untuk menginstal seluruh pustaka yang diperlukan (termasuk React, Dexie, Tailwind CSS, Lucide Icons, Recharts, dan Firebase SDK):
```bash
npm install
```

### 4. Jalankan Aplikasi dalam Mode Pengembangan
Gunakan perintah berikut untuk menyalakan server lokal pengembangan yang mendukung auto-reload:
```bash
npm run dev
```
Setelah berjalan, buka browser Anda dan kunjungi tautan berikut:
👉 **[http://localhost:3000](http://localhost:3000)**

### 5. Kompilasi Siap Produksi (Production Build)
Untuk memaketkan aplikasi menjadi file statis teroptimasi yang siap diunggah ke server hosting atau ditaruh pada mesin POS kasir lokal:
```bash
npm run build
```
File hasil build akan berada di dalam folder `/dist`. Untuk mengujinya di lokal sebelum deployment, jalankan:
```bash
npm run preview
```

---

## 🛠️ Detail Arsitektur Sistem Canggih (Senior Architect Level)

Aplikasi GoSplash ini telah dirancang dengan standar keandalan tinggi untuk mengantisipasi gangguan jaringan internet yang sering terjadi di area tempat wisata outdoor. Berikut adalah rincian pilar utamanya:

### 📶 1. Arsitektur Offline-First (Dexie.js & IndexedDB)
- **Penyimpanan Lokal Reaktif**: Aplikasi menggunakan **Dexie.js** untuk mengelola basis data lokal di peramban kasir. Seluruh data transaksi, harga tiket aktif, tarif fasilitas, dan daftar promo tersimpan secara lokal dan diakses secara reaktif lewat hook `useLiveQuery`.
- **Pengoperasian Tanpa Internet**: Kasir dapat login, memasukkan pesanan, menghitung kembalian, dan mencetak struk secara instan walaupun kabel internet terputus sepenuhnya.
- **Antrean Sinkronisasi (Sync Queue)**: Saat offline, transaksi baru akan disimpan ke dalam tabel lokal dan instruksinya diantrekan dalam `syncQueue`. Ketika koneksi kembali online, antrean ini langsung dikirim secara berurutan ke Firebase Firestore secara otomatis.

### 🧹 2. Pembersihan Riwayat Otomatis 30 Hari (Memory Efficiency)
- Untuk mencegah memori browser membengkak pada mesin POS kasir dengan spesifikasi rendah, aplikasi secara otomatis menyisir dan menghapus transaksi lokal di IndexedDB yang telah berusia **lebih dari 30 hari**.
- Penghapusan riwayat ini **hanya terjadi secara lokal** dan tidak memengaruhi master data transaksi jangka panjang yang tersimpan aman di cloud Firebase Firestore.
- Aliran data real-time (`onSnapshot`) dibatasi menggunakan filter query untuk hanya mengambil transaksi 45 hari terakhir guna menghindari konflik unduhan data yang telah dihapus lokal.

### 🔒 3. Enkripsi AES-256-GCM & Validasi Keamanan
- **Enkripsi Kunci Simetris**: Fitur Ekspor/Impor data cadangan (Backup) menggunakan algoritma enkripsi **AES-GCM 256-bit** standar perbankan lewat Web Crypto API.
- **Derivasi Kunci PBKDF2**: Kunci sandi diturunkan menggunakan PBKDF2 dengan 100.000 iterasi SHA-256 dan salt acak 16-byte untuk menjamin pertahanan tinggi terhadap serangan brute-force.
- **IV Acak Per Operasi**: Setiap kali file diekspor, Initialization Vector (IV) 12-byte acak dibuat sehingga teks terenkripsi selalu berbeda meskipun datanya identik.
- **Validasi Keamanan Impor**:
  - **Uji Timestamp**: Memblokir berkas cadangan dengan tanggal masa depan untuk mencegah manipulasi data jam sistem kasir (clock-spoofing).
  - **Ringkasan Jejak Audit & Checksum**: Membaca ringkasan audit tersemat dan memverifikasi integritas nilai total bayar serta jumlah pax pengunjung sebelum proses penimpaan database diizinkan.

### 🖨️ 4. ESC/POS Emulator Printer Termal
- Transaksi POS diakhiri dengan tampilan visual struk kertas printer termal 58mm/80mm yang sangat realistis.
- Mengandung modul parser utilitas yang memetakan objek transaksi JavaScript menjadi baris-baris perintah teks ESC/POS mentah yang siap dikirim langsung ke printer Bluetooth atau USB kasir asli.

---

## 👥 Pengaturan Akun Bawaan (Default Credentials)
Aplikasi diinisialisasi dengan konfigurasi akun pengaman berikut:
* **Role Admin**:
  - Sandi Default: `admin123`
* **Role Kasir**:
  - Sandi Default: `kasir123`
