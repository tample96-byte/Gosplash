# Panduan Cara Menjalankan Aplikasi POS Kasir Tiket Wisata

Panduan ini menjelaskan langkah-langkah untuk menjalankan aplikasi POS Kasir Tiket dan Penyewaan Wisata ini di komputer lokal Anda (Localhost).

---

## Prasyarat (Prerequisites)
Sebelum memulai, pastikan komputer Anda sudah terinstal:
1. **Node.js** (Sangat direkomendasikan versi 18 atau yang lebih baru)
2. **NPM** (Biasanya otomatis terinstal bersama Node.js)

---

## Langkah-Langkah Instalasi & Menjalankan Aplikasi

### 1. Ekstrak Proyek & Masuk ke Direktori
Jika Anda mengunduh proyek ini sebagai file ZIP dari AI Studio (melalui Settings -> Export to ZIP), ekstrak file tersebut terlebih dahulu, lalu buka terminal atau Command Prompt (CMD) di dalam folder proyek tersebut:
```bash
cd nama-folder-proyek
```

### 2. Instal Dependensi (Library)
Instal semua package/library yang dibutuhkan oleh aplikasi dengan menjalankan perintah berikut:
```bash
npm install
```

### 3. Jalankan Server Pengembangan (Development Mode)
Untuk menjalankan aplikasi dalam mode pengembangan lokal dengan fitur Live Reload (otomatis memuat ulang saat kode diubah), jalankan:
```bash
npm run dev
```
Setelah menjalankan perintah di atas, buka browser Anda dan akses alamat berikut:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## Langkah Build untuk Produksi (Production Build)

Jika Anda ingin mengompilasi aplikasi ini menjadi file HTML, CSS, dan JavaScript statis yang siap dideploy ke server hosting, ikuti langkah berikut:

### 1. Build Aplikasi
Jalankan perintah build:
```bash
npm run build
```
Perintah ini akan menghasilkan folder bernama `/dist` yang berisi seluruh aset produksi yang telah dioptimalkan secara kompresi.

### 2. Preview Hasil Build
Untuk menguji hasil build produksi di komputer lokal sebelum benar-benar dideploy, jalankan:
```bash
npm run preview
```
Aplikasi akan dapat diakses melalui port lokal yang diberikan di terminal (biasanya port 4173 atau sesuai konfigurasi).

---

## Struktur Perintah yang Tersedia (NPM Scripts)

Di dalam file `package.json`, berikut adalah daftar perintah yang bisa Anda gunakan:
- **`npm run dev`**: Menjalankan server lokal (Vite) untuk pengembangan.
- **`npm run build`**: Mengompilasi aplikasi ke folder `/dist` siap produksi.
- **`npm run preview`**: Menjalankan server lokal untuk menguji file produksi di folder `/dist`.
- **`npm run lint`**: Memeriksa kesalahan pengetikan tipe data (TypeScript) pada kode program.
