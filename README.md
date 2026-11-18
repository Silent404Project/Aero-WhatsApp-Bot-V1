# Aero WhatsApp Bot V1

Bot WhatsApp berbasis **Node.js (ESM)** dan `@silent404/baileys`, dengan pilihan login **Pairing Code** atau **QR Code**.

Repository: https://github.com/Silent404Project/Aero-WhatsApp-Bot-V1

## Fitur

- Login WhatsApp menggunakan Pairing Code atau QR Code.
- Sistem plugin untuk command bot.
- Informasi log command, jenis chat, JID, PN, dan LID.
- Pengaturan owner, prefix, nama bot, dan konfigurasi lainnya melalui `config.js`.
- Fitur grup seperti anti-link, hidetag, dan pengelolaan grup.
- Database lokal untuk menyimpan pengaturan bot.

## Tutorial Instalasi di Termux

Ikuti langkah-langkah berikut secara berurutan.

### 1. Install Termux

Disarankan menggunakan Termux versi terbaru dari sumber resmi seperti F-Droid atau GitHub Termux.

Buka Termux, lalu jalankan:

```bash
pkg update && pkg upgrade -y
```

### 2. Install kebutuhan

Install Git dan Node.js:

```bash
pkg install git nodejs-lts -y
```

Periksa apakah instalasi berhasil:

```bash
node -v
npm -v
git --version
```

**Catatan:** Bot ini membutuhkan **Node.js versi 20 atau lebih baru**. Pastikan hasil `node -v` menunjukkan versi 20+.

Jika perintah `nodejs-lts` tidak tersedia di repositori Termux yang digunakan, perbarui Termux dan repositorinya terlebih dahulu.

### 3. Clone repository

Download source code dari GitHub:

```bash
git clone https://github.com/Silent404Project/Aero-WhatsApp-Bot-V1.git
```

Masuk ke folder project:

```bash
cd Aero-WhatsApp-Bot-V1
```

Pastikan file project terlihat:

```bash
ls
```

### 4. Install dependency

Jalankan perintah:

```bash
npm install
```

Tunggu sampai proses instalasi selesai. Pastikan tidak ada error sebelum melanjutkan.

### 5. Atur konfigurasi bot

Buka file konfigurasi:

```bash
nano config.js
```

Sesuaikan bagian berikut dengan kebutuhan:

```javascript
export default {
  botname: 'Aero WhatsApp Bot',
  owner: [
    '628xxxxxxxxxx'
  ],
  prefix: '.',

  // Konfigurasi lainnya tetap seperti bawaan
};
```

Keterangan:

- `botname`: nama bot.
- `owner`: nomor WhatsApp pemilik bot, gunakan format internasional tanpa tanda `+`, spasi, atau strip. Contoh: `6281234567890`.
- `prefix`: awalan command bot, bawaan menggunakan titik (`.`).

Jangan menghapus konfigurasi lain yang sudah ada jika tidak memahami fungsinya.

Simpan file di Nano dengan menekan `CTRL + O`, tekan `Enter`, lalu `CTRL + X`.

### 6. Jalankan bot

Setelah konfigurasi selesai, jalankan:

```bash
npm start
```

Pada proses pertama, terminal akan menampilkan pilihan metode login:

```text
[1] Pairing Code
[2] QR Code
Pilih metode login (1/2):
```

Pilih salah satu metode berikut.

#### Login dengan Pairing Code

1. Ketik `1`, lalu tekan `Enter`.
2. Masukkan nomor WhatsApp dengan format internasional, misalnya `6281234567890`.
3. Tunggu sampai Pairing Code muncul di Termux.
4. Buka WhatsApp pada HP yang akan ditautkan.
5. Masuk ke **Perangkat tertaut**.
6. Pilih **Tautkan perangkat**, lalu pilih opsi **Tautkan dengan nomor telepon**.
7. Masukkan Pairing Code yang tampil di Termux.

#### Login dengan QR Code

1. Ketik `2`, lalu tekan `Enter`.
2. Tunggu QR Code muncul di terminal.
3. Buka WhatsApp pada HP yang akan ditautkan.
4. Masuk ke **Perangkat tertaut** → **Tautkan perangkat**.
5. Scan QR Code yang ditampilkan Termux.

Jika berhasil, terminal akan menampilkan informasi bahwa bot telah terhubung.

## Menjalankan kembali bot

Setelah bot pernah berhasil login, session akan disimpan di folder `session`. Untuk menjalankan bot kembali, masuk ke folder project lalu jalankan:

```bash
cd ~/Aero-WhatsApp-Bot-V1
npm start
```

Session yang masih valid tidak perlu ditautkan ulang. Jangan menghapus folder `session` jika ingin mempertahankan koneksi WhatsApp.

## Menghentikan bot

Tekan:

```text
CTRL + C
```

## Memperbarui source code

Jika ingin mengambil pembaruan dari GitHub:

```bash
cd ~/Aero-WhatsApp-Bot-V1
git pull
npm install
npm start
```

Sebaiknya cadangkan `config.js` dan folder `session` sebelum melakukan perubahan besar. Jika ada konflik saat `git pull`, selesaikan konflik terlebih dahulu dan jangan menimpa konfigurasi atau session secara tidak sengaja.

## Troubleshooting

**1. `node: command not found`**

Install Node.js:

```bash
pkg install nodejs-lts -y
```

**2. Versi Node.js di bawah 20**

Perbarui paket Termux, lalu install Node.js LTS:

```bash
pkg update && pkg upgrade -y
pkg install nodejs-lts -y
node -v
```

**3. Error dependency atau `Cannot find package`**

Pastikan berada di folder project, lalu jalankan:

```bash
npm install
```

**4. Pairing Code atau QR tidak muncul**

Pastikan koneksi internet stabil, tunggu proses koneksi, lalu periksa pesan error di terminal. Jika sesi login sebelumnya gagal dan belum terdaftar, bot akan membersihkan session yang tidak valid saat dijalankan kembali.

**5. Koneksi terputus**

Bot akan mencoba menyambungkan ulang secara otomatis. Pastikan Termux tetap berjalan dan koneksi internet tersedia.

**6. WhatsApp menampilkan perangkat tertaut yang tidak dikenal**

Periksa daftar **Perangkat tertaut** di WhatsApp dan keluarkan perangkat yang tidak kamu kenali.

## Catatan Penting

- Jangan membagikan folder `session`, file kredensial, atau Pairing Code kepada siapa pun. Data tersebut dapat memberikan akses ke akun WhatsApp yang ditautkan.
- Jangan mengunggah session atau kredensial ke repository publik.
- Gunakan bot secara bertanggung jawab. Pengiriman pesan massal atau aktivitas otomatis yang berlebihan dapat menyebabkan pembatasan akun WhatsApp.
- Beberapa fitur dapat bergantung pada dukungan versi aplikasi WhatsApp.
- Agar bot tetap berjalan, jangan tutup paksa Termux. Android juga dapat menghentikan proses di latar belakang karena pengaturan penghemat baterai.

## Developer

**Silent404Project**

- GitHub: https://github.com/Silent404Project
- Repository: https://github.com/Silent404Project/Aero-WhatsApp-Bot-V1
