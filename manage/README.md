# Vrai Admin

## Menyiapkan Google Apps Script

1. Buka Google Apps Script dan buat project baru.
2. Salin isi `backend/Code.gs` ke project tersebut. `vrai-management/Code.gs` adalah salinan kompatibilitas lama; backend kanonis berada di folder `backend`.
3. Untuk spreadsheet kosong, jalankan `setupSpreadsheet()` sekali. Fungsi ini membuat nama sheet dan header baris 1 secara otomatis. Data baru akan dimulai dari baris 2. Jika sheet sudah berisi data, fungsi hanya memeriksa strukturnya dan tidak menimpa data:
   `01 SK`, `02 SU`, `03 SPm`, `04 Spb`, `05 SPp`, `06 Spn`, `07 SM`, `09 Sket`, `10 SR`, `11 SB`, `12 SPPD`, `13 SRT`, `14 PK`, `15 SPeng`.
4. Jalankan `setAdminCredentials('nama-pengguna', 'password-minimal-12-karakter')` untuk membuat akun pertama. Jalankan fungsi yang sama lagi dengan username berbeda untuk menambahkan akun kedua atau akun berikutnya. Password minimal 12 karakter dan tidak disimpan plaintext.
5. Deploy sebagai Web app. Pilih akun pemilik sebagai eksekutor dan akses sesuai kebutuhan aplikasi.
6. Salin URL `/exec` hasil deployment ke `apiUrl` pada `assets/js/app-config.js`.

## Portal Login Pusat

- Buka `/` untuk login pusat dan melihat daftar aplikasi.
- Manajemen Vrai dibuka dari kartu `Manajemen Vrai` atau langsung melalui `/vrai-management/`.
- Jika `/vrai-management/` dibuka tanpa session, pengguna diarahkan ke login pusat dan dikembalikan ke manajemen setelah berhasil login.
- Tambahkan aplikasi baru pada `config.yaml` di root repository tanpa membuat login baru.

## Keamanan

- Username dan password tidak dikirim atau disimpan di GitHub Pages. Backend hanya menyimpan hash SHA-256 password di Script Properties.
- Semua akun disimpan sebagai daftar pada Script Property `ADMIN_USERS`; akun lama dari `ADMIN_USERNAME` dan `ADMIN_PASSWORD_HASH` akan dimigrasikan otomatis saat login atau saat akun baru dibuat.
- Token sesi pusat disimpan dalam cookie `Secure` dan `SameSite=Lax` agar dapat dipakai lintas halaman aplikasi.
- Jika “Ingat saya selama 12 jam” dicentang, cookie memiliki `Max-Age=43200`; jika tidak, cookie hanya berlaku sampai browser ditutup.
- Metadata token sesi di server disimpan di `PropertiesService` dengan waktu kedaluwarsa 12 jam, dan logout menghapus cookie serta token server.
- Percobaan login dibatasi 5 kali per 15 menit per username.
- Sheet dan aksi tulis memakai whitelist backend; request tidak dapat memilih sheet atau baris arbitrer, sehingga mengurangi risiko IDOR.
- Nomor urut dibuat di bawah `LockService` agar dua request bersamaan tidak menghasilkan nomor yang sama.
- Record baru mengisi baris kosong pertama mulai baris 2; baris 1 digunakan sebagai header.
- Input panjang dibatasi, tanggal divalidasi, nilai teks di-render dengan `textContent`, dan karakter formula Spreadsheet dinetralkan.
- Untuk produksi, gunakan URL Web App dengan akses terbatas dan akun Google Workspace bila tersedia.