# Vrai Management

Panduan instalasi dan deployment halaman manajemen Vrai.

## Struktur File

- `manage/index.html`: halaman dashboard manajemen.
- `manage/Code.gs`: backend Google Apps Script untuk login, sesi, dan pembuatan nomor surat.
- `assets/js/management.js`: JavaScript dashboard manajemen.
- `assets/css/management.css`: stylesheet dashboard manajemen.
- `Code.gs`: backend Google Apps Script untuk verifikasi dokumen publik.
- `index.html`: halaman portal dan verifikasi dokumen.

## Prasyarat

- Akun Google dengan akses ke Google Sheets dan Google Apps Script.
- Repository yang sudah dipublikasikan melalui GitHub Pages.
- Spreadsheet dengan ID yang sesuai dengan `spreadsheetId` di `manage/Code.gs`.

## Instalasi Backend Manajemen

1. Buka [Google Apps Script](https://script.google.com/) dan buat project baru.
2. Salin seluruh isi `manage/Code.gs` ke file script project tersebut.
3. Pastikan `spreadsheetId` di bagian `CONFIG` menunjuk ke spreadsheet yang benar.
4. Jalankan fungsi `setupSpreadsheet()` satu kali. Fungsi ini membuat sheet dan header berikut:

   `01 SK`, `02 SU`, `03 SPm`, `04 Spb`, `05 SPp`, `06 Spn`, `07 SM`, `08 ST`, `09 Sket`, `10 SR`, `11 SB`, `12 SPPD`, `13 SRT`, `14 PK`, `15 SPeng`.

5. Berikan izin yang diminta Google Apps Script.
6. Pada project Apps Script yang berisi `Code.gs` root untuk verifikasi publik, buka **Project Settings > Script properties**, lalu tambahkan property `VERIFICATION_SECRET` dengan nilai acak yang panjang.
7. Jalankan fungsi `setAdminCredentials('nama-pengguna', 'password-minimal-12-karakter')` untuk membuat akun admin pertama. Password wajib minimal 12 karakter.
8. Untuk menambah atau memperbarui akun, jalankan fungsi yang sama dengan username dan password yang baru.
9. Pilih **Deploy > New deployment**.
10. Pilih tipe **Web app**.
11. Atur **Execute as** ke akun pemilik script dan atur akses sesuai kebutuhan.
12. Deploy, lalu salin URL yang berakhiran `/exec`.
13. Masukkan URL tersebut sebagai `API_URL` di `assets/js/management.js`.

## Deployment Frontend

1. Commit dan push seluruh repository ke GitHub.
2. Di repository GitHub, buka **Settings > Pages**.
3. Pilih branch publikasi dan folder root `/` sebagai source.
4. Buka domain GitHub Pages atau domain pada `CNAME` untuk menguji portal.
5. Halaman manajemen tersedia melalui `/manage/` jika folder dipublikasikan langsung, atau melalui route yang dipetakan oleh konfigurasi hosting.

## Pengujian

1. Buka halaman portal dan pastikan halaman dapat dimuat.
2. Buka halaman manajemen.
3. Login menggunakan akun admin yang dibuat di Apps Script.
4. Pastikan daftar jenis surat muncul.
5. Buat satu nomor surat percobaan.
6. Pastikan nomor, QR code, dan data baru muncul di sheet yang sesuai.
7. Buka URL verifikasi dari hasil tersebut untuk memastikan dokumen dapat ditemukan.

## Keamanan

- Jangan menyimpan password admin di repository.
- Password hanya dikirim saat menjalankan `setAdminCredentials()` dan backend menyimpan hash-nya di Script Properties. Gunakan password minimal 12 karakter.
- Sesi server dan penyimpanan session di browser berlaku maksimal 1 minggu pada domain yang sama. Session dihapus saat pengguna memilih keluar atau ketika TTL tersebut berakhir.
- Endpoint manajemen hanya menerima aksi melalui `POST`; jangan mengirim username, password, atau token melalui URL `GET`.
- `VERIFICATION_SECRET` wajib tersedia. Backend verifikasi akan berhenti jika property tersebut belum dikonfigurasi.
- Batasi akses deployment Apps Script sesuai kebutuhan produksi.
- Jangan membagikan URL deployment backend kepada pihak yang tidak berkepentingan.
- Jika endpoint deployment berubah, perbarui `API_URL` di `assets/js/management.js` lalu deploy ulang frontend.

## Troubleshooting

### Daftar jenis surat tidak muncul

Periksa URL `API_URL`, deployment Apps Script, dan izin akses Web app.

### Login selalu gagal

Jalankan kembali `setAdminCredentials()` dengan password minimal 12 karakter dan pastikan project Apps Script menggunakan spreadsheet yang benar.

### Sheet belum ditemukan

Jalankan `setupSpreadsheet()` dan pastikan nama sheet tidak diubah.

### Nomor surat berhasil dibuat tetapi QR tidak dapat diverifikasi

Periksa `verificationBaseUrl` di `manage/Code.gs` dan pastikan backend verifikasi pada `Code.gs` root sudah dipublikasikan.