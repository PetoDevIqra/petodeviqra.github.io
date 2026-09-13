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

   Setiap sheet menggunakan kolom audit `DIBUAT PADA` dan `DIBUAT OLEH`. Kolom tersebut diisi otomatis dari waktu server dan username session admin saat nomor surat dibuat.

6. Pada project Apps Script verification, jalankan `rebuildVerificationIndex()` satu kali setelah data sheet siap. Fungsi ini membuat index nomor surat untuk mempercepat pencarian.
7. Berikan izin yang diminta Google Apps Script.
8. Pada project Apps Script yang berisi `Code.gs` root untuk verifikasi publik, buka **Project Settings > Script properties**, lalu tambahkan property `VERIFICATION_SECRET` dengan nilai acak yang panjang.
9. Jalankan fungsi `setAdminCredentials('nama-pengguna', 'password-minimal-12-karakter')` untuk membuat akun admin pertama. Password wajib minimal 12 karakter.
10. Untuk menambah atau memperbarui akun, jalankan fungsi yang sama dengan username dan password yang baru.
11. Pilih **Deploy > New deployment**.
12. Pilih tipe **Web app**.
13. Atur **Execute as** ke akun pemilik script dan atur akses sesuai kebutuhan.
14. Deploy, lalu salin URL yang berakhiran `/exec`.
15. Masukkan URL tersebut sebagai `API_URL` di `assets/js/management.js`.

## Deployment Frontend

1. Commit dan push seluruh repository ke GitHub.
2. Di repository GitHub, buka **Settings > Pages**.
3. Pilih branch publikasi dan folder root `/` sebagai source.
4. Buka domain GitHub Pages atau domain pada `CNAME` untuk menguji portal.
5. Halaman manajemen tersedia melalui `/manage/` jika folder dipublikasikan langsung, atau melalui route yang dipetakan oleh konfigurasi hosting.

## Cache Edge Cloudflare

Worker cache tersedia di `cloudflare/verification-worker.js`. Worker ini menyimpan hasil nomor surat yang ditemukan selama 1 jam dan hasil nomor yang belum ditemukan selama 1 menit. Apps Script tetap menjadi sumber data utama.

1. Di Cloudflare, buat Worker baru dan salin isi `cloudflare/verification-worker.js`.
2. Deploy Worker, lalu buat route seperti `api.vrai.sdislamiqrapetobo.sch.id/*` atau `/api/verification*` pada domain yang dikelola Cloudflare.
3. Pastikan DNS domain atau subdomain tersebut menggunakan proxy Cloudflare.
4. Uji endpoint Worker dengan `?id=09.066%2FSDIIP%2FVI%2F2026`.
5. Setelah endpoint berhasil, ubah `API_URL` pada `assets/js/verification.js` dari URL Apps Script menjadi URL Worker.
6. Periksa header `X-Verification-Cache`: respons pertama biasanya `MISS`, request berikutnya `HIT`.

Jangan gunakan Worker ini untuk endpoint manajemen karena login dan token tidak boleh disimpan di cache publik.

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
- Setelah login berhasil, flag `vrai_has_logged_in` dan session disimpan pada domain yang sama agar halaman management langsung membuka dashboard saat refresh. Flag dan session dihapus saat pengguna memilih keluar; session server tetap mengikuti TTL backend.
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

### Nomor surat terdeteksi ganda

Pembuatan nomor baru akan melewati nomor yang sudah ada pada sheet. Jika data lama sudah memiliki nomor yang sama lebih dari satu kali, verification akan menampilkan status `Nomor ganda`; hapus atau koreksi salah satu baris duplikat di spreadsheet.