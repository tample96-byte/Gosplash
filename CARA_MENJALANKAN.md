# Panduan Menjalankan & Detail Arsitektur POS Kasir GoSplash (Single-PC Dedicated Resilient)

Dokumen ini berisi panduan lengkap untuk memasang, menjalankan, serta memahami arsitektur canggih tingkat lanjut yang diterapkan pada aplikasi **GoSplash POS Kasir Tiket & Sewa Fasilitas Wisata** dengan fokus pada skenario ketahanan ekstrim (Disaster Recovery & Offline-First).

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

## 🛠️ Detail Arsitektur Sistem Canggih (Single-PC Dedicated Resilient)

Aplikasi GoSplash ini telah dirancang dengan standar keandalan tinggi untuk mengantisipasi gangguan jaringan internet yang sering terjadi di area tempat wisata outdoor, mati listrik mendadak, hingga skenario komputer loket utama rusak total. Berikut adalah rincian pilar utamanya:

### 📶 1. Inisialisasi Keras Luring Firebase & Offline-First (Dexie.js)
- **Konfigurasi Firebase Kebal Offline**: Inisialisasi Firestore dikonfigurasi secara tangguh menggunakan `initializeFirestore()` yang dipasangkan dengan `persistentLocalCache()` dan `persistentMultipleTabManager()`. Modul Firebase **tidak akan melempar fatal error** atau membuat aplikasi membeku (freeze/stuck) saat mesin loket baru dinyalakan pertama kali dalam kondisi internet mati total.
- **Penyimpanan Lokal Reaktif (IndexedDB)**: Aplikasi menggunakan **Dexie.js** untuk mengelola basis data lokal di peramban kasir. Seluruh data transaksi, harga tiket aktif, tarif fasilitas, dan daftar promo tersimpan secara lokal dan diakses secara reaktif lewat hook kustom `useLiveQuery` untuk pengalaman interaksi bebas lag.
- **Antrean Sinkronisasi (Sync Queue)**: Saat offline, transaksi baru akan disimpan ke dalam tabel lokal IndexedDB dan instruksinya diantrekan dalam `syncQueue`. Ketika koneksi kembali online, antrean ini langsung dikirim secara berurutan ke Firebase Firestore secara otomatis.

### ⚠️ 2. Indikator Antrean Lokal pada Kasir (Real-Time Sync Warning)
- Pada header Panel Kasir (`CashierPanel.tsx`), terdapat sensor reaktif menggunakan `useLiveQuery(() => db.syncQueue.count())`.
- Jika terdapat transaksi yang tertahan lokal dan belum terunggah ke Firestore cloud karena gangguan internet, sistem menampilkan **Badge Peringatan Oranye/Amber yang berkedip (animate-pulse)**:
  👉 `⚠️ [Count] Transaksi Belum Terunggah`
- Indikator ini sangat penting bagi petugas kasir agar tidak terburu-buru mematikan komputer loket di akhir shift sebelum seluruh transaksi tersinkronisasi sempurna ke server pusat.

### 🧹 3. Pembersihan Riwayat Otomatis 30 Hari (Memory Efficiency)
- Untuk mencegah memori IndexedDB browser membengkak pada mesin POS kasir tunggal (Single-PC) setelah bertahun-tahun dipakai, aplikasi secara otomatis menyisir dan menghapus transaksi lokal yang telah berusia **lebih dari 30 hari** (`pruneOldLocalTransactions`).
- Pembersihan berkala ini **hanya beroperasi di tingkat lokal** untuk memelihara kinerja hard drive dan memori peramban agar tetap responsif, sementara data transaksi utama di awan Firebase Firestore tetap utuh selamanya.
- Filter query snapshop real-time dibatasi pada rentang waktu 45 hari terakhir guna mencegah konflik sinkronisasi turun (down-sync) yang dapat menghapus transaksi awan secara tidak sengaja.

### 🆘 4. Panduan Pemulihan Darurat 2 Arah (Disaster Recovery)
Aplikasi memfasilitasi dua jalur pemulihan darurat jika terjadi kerusakan hardware pada PC Utama Loket:
- **Jalur A: Migrasi via Ekspor/Impor File Terenkripsi (.enc)**:
  *Jika PC lama masih bisa dinyalakan singkat atau hard drivenya dapat diakses:* Admin mengekspor cadangan terenkripsi dari Panel Admin. Pada PC cadangan baru, import file tersebut. Sistem menggunakan **AES-256-GCM** dengan derivasi PBKDF2 (100.000 iterasi) untuk mendekripsi data secara aman, melakukan verifikasi ketat terhadap timestamp backup untuk mencegah manipulasi, lalu mengembalikan data seketika.
- **Jalur B: Sinkronisasi Awan Otomatis (PC lama rusak total/hancur)**:
  *Jika PC lama mati total:* Cukup siapkan PC loket pengganti, buka aplikasi GoSplash, dan jalankan. Fungsi `seedDatabaseIfEmpty()` akan mendeteksi IndexedDB kosong lalu segera menyuplai harga dasar loket secara instan walaupun PC baru berjalan offline (luring). Saat internet terhubung, mesin sinkronisasi Firebase otomatis menarik kembali (pull down) seluruh data transaksi 45 hari terakhir dari awan Firestore.

### 🛡️ 5. Proteksi Validasi Transaksi & Enkripsi AES-GCM
- **Validasi Angka Negatif & Transaksi Rp 0**: Input kasir dilindungi ketat dari masukan nilai minus atau kosong. Pembayaran tunai harus mencukupi dan sistem **memblokir transaksi dengan nilai total akhir Rp 0** untuk mencegah manipulasi keuangan.
- **Integrasi Keamanan Kriptografi**: Berkas backup lokal dienkripsi penuh menggunakan Web Crypto API dengan dynamic IV 12-byte acak pada tiap ekspor sehingga menghasilkan sandi non-deterministik yang aman dari tampering.

### 🖨️ 6. ESC/POS Emulator Printer Termal
- Transaksi POS diakhiri dengan tampilan visual struk kertas printer termal 58mm/80mm yang sangat realistis.
- Mengandung modul parser utilitas yang memetakan objek transaksi JavaScript menjadi baris-baris perintah teks ESC/POS mentah yang siap dikirim langsung ke printer Bluetooth atau USB kasir asli.

---

## 👥 Pengaturan Akun Bawaan (Default Credentials)
Aplikasi diinisialisasi dengan konfigurasi akun pengaman berikut:
* **Role Admin**:
  - Sandi Default: `admin123`
* **Role Kasir**:
  - Sandi Default: `kasir123`
