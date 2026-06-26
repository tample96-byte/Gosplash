# Panduan Prompt Detail: Membangun Aplikasi POS Kasir Tiket & Sewa Fasilitas Wisata

File ini berisi **Prompt Utama (Master Prompt)** yang sangat detail dan terstruktur untuk mereproduksi atau membuat ulang aplikasi POS (Point of Sale) Kasir ini menggunakan AI Coding Assistant (seperti Gemini, Claude, atau Antigravity).

Anda bisa menyalin seluruh isi prompt di bawah ini ke AI pilihan Anda untuk membuat aplikasi POS serupa dari awal dengan standar kualitas produksi tinggi.

---

```markdown
## ROLE & CONTEXT
Anda adalah Senior Software Engineer & UI/UX Designer berpengalaman. Anda bertugas membangun aplikasi POS (Point of Sale) Kasir Tiket dan Penyewaan Fasilitas Wisata (seperti Loker & Saung/Tempat) yang responsif, berkinerja tinggi, aman, dan memiliki antarmuka (UI) yang sangat modern dan elegan menggunakan React, TypeScript, dan Tailwind CSS.

## TECH STACK & REQUIREMENTS
- **Frontend**: React (v18+) + TypeScript + Vite.
- **Styling**: Tailwind CSS dengan tema Slate gelap yang futuristik (Cosmic Slate Theme) namun tetap bersih dan kontras tinggi untuk kenyamanan mata kasir.
- **Icons**: Lucide React.
- **Animations**: motion (motion/react).
- **Data Persistence**: Offline-first menggunakan `localStorage` dengan enkripsi sederhana untuk data-data sensitif (seperti password role).
- **Architecture**: Single-page, modular, bersih, tanpa dependensi server eksternal jika tidak diminta. Semua logic perhitungan keuangan dilakukan di sisi client dengan presisi tinggi.

---

## KETENTUAN UTAMA & ALUR FITUR (CORE FEATURES)

### 1. Sistem Multi-Role & Login Keamanan
- Sediakan halaman Login terenkripsi dengan dua role: **Admin** dan **Kasir**.
- Gunakan pengaman password untuk masing-masing role yang disimpan secara aman di lokal.
- Sediakan switcher bahasa di halaman login dan dashboard utama (Dukungan penuh Bahasa Indonesia [ID] & Inggris [EN]).

### 2. Panel Kasir (Cashier Panel)
- **Input Pengunjung**: Masukkan jumlah pengunjung (pax). Jumlah pengunjung boleh `0` jika pelanggan hanya ingin menyewa fasilitas (loker/saung) saja tanpa membeli tiket masuk.
- **Penyewaan Fasilitas**:
  - Sewa Loker: Pilihan "Tidak Sewa", "Tarif 1", "Tarif 2" dengan harga dinamis yang dikonfigurasi oleh Admin.
  - Sewa Saung/Tempat: Pilihan "Tidak Sewa", "Tarif 1", "Tarif 2" dengan harga dinamis.
- **Diskon/Promo**: Dropdown pilihan promo/diskon aktif yang diambil dari database Admin.
- **Perhitungan Harga**:
  - Otomatis menghitung Subtotal Tiket berdasarkan Jenis Hari (Senin-Jumat vs Sabtu-Minggu/Libur).
  - Menghitung diskon hanya pada item tiket masuk (atau sesuai kustomisasi).
  - Menghitung total akhir (Tiket + Sewa Loker + Sewa Saung).
- **Metode Pembayaran**: Pilihan metode pembayaran "Tunai" (Cash), "QRIS", atau "EDC Kartu" (Debit/Kredit).
  - Jika Tunai, sediakan input "Uang Diterima" dengan validasi uang kurang, serta kalkulator kembalian instan. Sediakan tombol shortcut nominal cepat (Pas, Rp 10.000, Rp 50.000, Rp 100.000, dsb).
  - Jika non-tunai (QRIS/EDC), uang diterima otomatis disamakan dengan total akhir dan kembalian diset `0`.

### 3. Emulator Printer Termal & Cetak Struk (ESC/POS Emulation)
- Setelah transaksi berhasil disubmit:
  - Tampilkan modal visual struk belanja bergaya kertas printer termal (58mm/80mm) yang realistis.
  - Integrasikan simulasi koneksi printer termal (Bluetooth, Serial, dsb).
  - Tulis modul printer utilitas untuk mengonversi data transaksi menjadi baris teks ESC/POS mentah dengan format rata tengah, kanan, kiri, dan dekorasi garis pembatas yang rapi.
  - Sediakan fitur "Cetak Struk" simulasi serta tombol tutup modal.
  - Pastikan jika tiket masuk `0` pax, baris "Tiket Masuk" dan "Diskon" di struk tidak dicetak, melainkan hanya mencetak penyewaan loker/saung yang aktif.

### 4. Panel Admin (Admin Dashboard)
Panel khusus admin untuk memantau, mengonfigurasi, dan memanipulasi seluruh data aplikasi:
- **Statistik Ringkasan (Dashboard)**:
  - Menampilkan metrik utama: Pendapatan Hari Ini, Total Pengunjung, Jumlah Transaksi, Rasio Non-Tunai, dan Pendapatan Sewa Fasilitas.
  - Grafik interaktif (menggunakan `recharts` atau `d3`) untuk memvisualisasikan tren penjualan tiket dan sewa harian.
- **Manajemen Transaksi**:
  - Tabel riwayat transaksi lengkap dengan fungsi Pencarian (berdasarkan ID atau nama petugas) dan Filter (metode pembayaran, jenis hari).
  - **Fitur Edit Transaksi**: Admin dapat mengubah jumlah pengunjung (boleh diset `0` jika sewa fasilitas aktif), mengubah tipe hari, mengubah diskon, mengubah sewa loker/saung, dan mengubah metode pembayaran/nominal bayar secara real-time. Total akhir dan kembalian harus otomatis dikalkulasi ulang dengan benar.
  - **Fitur Hapus Transaksi**: Admin dapat menghapus transaksi dengan konfirmasi aman.
- **Pengaturan Harga & Fasilitas**:
  - Konfigurasi harga Tiket Masuk Hari Kerja (Weekday) vs Hari Libur (Weekend).
  - Konfigurasi tarif sewa Loker 1 & Loker 2 serta Saung 1 & Saung 2.
- **Manajemen Diskon (Promo)**:
  - Admin dapat menambah, mengedit, atau menghapus promo aktif (Nama promo, persentase diskon, status aktif).
- **Konfigurasi Keamanan & Sistem**:
  - Form untuk mengubah password Admin dan password Kasir.
  - Tombol reset total database jika ingin memulai hari baru.

---

## DESIGN SYSTEM & STYLE GUIDELINES (TAILWIND CSS)
- **Tema Warna**: Dominan Slate gelap (`bg-slate-950` untuk halaman, `bg-slate-900` untuk card utama) dipadukan dengan aksen biru elektrik (`text-blue-500`, `bg-blue-600`) dan hijau emerald untuk indikator sukses keuangan.
- **Tipografi**: Gunakan font sans-serif modern (seperti Inter atau Space Grotesk) untuk UI umum, dan monospace (JetBrains Mono) khusus untuk angka nominal uang, jam digital live, indikator struk, dan kode ID transaksi.
- **Spacing & Layout**: Berikan padding yang lega, border halus berkualitas tinggi (`border-slate-800/80`), efek blur backdrop (`backdrop-blur-md`), serta efek bayangan melayang (`shadow-2xl`) untuk memberikan kesan aplikasi desktop kelas premium.
- **UX Micro-interactions**: Hover state yang responsif pada tombol, animasi transisi halus saat berpindah tab atau memunculkan modal, serta warning toast non-intrusif saat terjadi kesalahan input data.
```

---

## CARA MENGGUNAKAN PROMPT INI
1. Buat folder proyek baru dan inisialisasi dengan React, TypeScript, dan Vite.
2. Instal pustaka ikon `lucide-react` dan animasi `motion` (atau `framer-motion`).
3. Salin prompt di atas secara utuh dan berikan kepada AI Coding Assistant Anda.
4. AI akan otomatis menstrukturkan file menjadi modular (seperti `src/components/LoginPage.tsx`, `src/components/CashierPanel.tsx`, `src/components/AdminPanel.tsx`, dan modul utilitas printer/storage) sesuai rancangan terbaik.
