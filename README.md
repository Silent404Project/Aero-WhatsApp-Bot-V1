# Silent404 WhatsApp Bot v1.1.0

Bot ESM berbasis `@silent404/baileys` 7.0.1 (login Pairing Code / QR).

## Instalasi
```bash
npm install ./silent404-baileys-7_0_1.tgz   # Baileys lokal kamu (Node >= 20)
npm install
npm start
```
Edit `config.js`: `owner`, `botname`, `prefix`, dan blok `channel` / `style`.

## Style semua balasan (Fake Channel)
Semua balasan (termasuk error, tombol, anti-link, hasil JPM) dikirim via `Lib/style.js`:
- `externalAdReply` dengan thumbnail `https://files.catbox.moe/fhht0s.png` + link channel
- `forwardedNewsletterMessageInfo` (JID & nama channel diambil otomatis dari invite code lewat `sock.newsletterMetadata`)
- Quote template palsu `newsletterAdminInviteMessage` (QuoteTemplate Fake Channel)
- `style.quoteMode: 'real'` untuk kembali mengutip pesan asli pengguna; `style.largeThumbnail: true` untuk thumbnail besar.

## Command
| Command | Keterangan |
|---|---|
| `.tourl` | Kirim/balas media → upload catbox.moe, hasil dengan tombol **Salin Link** & **Buka Link** |
| `.jpmht` / `.jpmtag` | JPM + hidetag: kirim teks/gambar/video ke semua grup dengan mention semua anggota (grup di `jpmBlacklist` dilewati) — owner |
| `.bljpm` / `.delbljpm` | Tambah / hapus blacklist grup lewat tombol pilihan (tersimpan permanen di `database/db.json`; berlaku untuk jpm, jpmht, swgc, pushkontak) — owner |
| `.pushkontak` | Teks/gambar/video → chat pribadi semua member non-admin grup pilihan (`.pushkontak stop` untuk berhenti, jeda `pushDelay`) — owner |
| `.savecontact [awalan] [nomor awal]` | Di grup: simpan semua member sebagai kontak "Member 1, 2, 3…" (via `addOrEditContact` + `saveOnPrimaryAddressbook`), ada konfirmasi dan file `.vcf` cadangan — owner |
| `.setjedapush` / `.setjedajpm` | Atur jeda antar pesan untuk pushkontak / jpm & jpmht, contoh `.setjedapush 5detik`, `.setjedajpm 1500ms`, `.setjedapush 1menit` (tersimpan permanen) — owner |
| `.joinall` | Balas chat berisi satu/banyak link grup → bot gabung semua (memakai `sock.autoJoin`, jeda `joinDelay`) — owner |
| `.swgc teks` / media | Posting Status Grup (`groupStatusMessageV2`). Tombol **Semua Grup** / **Target Grup** — owner |
| `.antilink on/off` `kick/nokick` | Anti link grup per-grup, tersimpan di `database/db.json` — admin/owner |
| `.hidetag teks` | Mention semua anggota tanpa tag terlihat (admin/owner) |
| `.cekidch <link>` | Ambil ID channel dari link channel |
| `.menu .add .kick .statsgrup .cekchat .cekuser .jpm .bljpm` | Bawaan |

### Detail `.swgc`
- Teks: `.swgc halo semua`; media: kirim/balas gambar atau video dengan `.swgc [teks opsional]`.
- **Target Grup**: pilih 1 grup lewat daftar, atau banyak grup: `.swgc send <kode> 1,3,5-8`.
- Grup di `jpmBlacklist` dilewati. Jeda antar grup: `swgcDelay`.

### Catatan
- Anti link: bot harus admin. Link ke grup itu sendiri diizinkan; admin & owner dikecualikan.
- Tombol native flow bergantung versi klien WhatsApp; jika gagal terkirim, bot otomatis fallback ke teks.
- Gunakan `.joinall`, `.swgc`, `.jpm` secukupnya (jeda sudah diatur) — aksi massal berisiko pembatasan akun.

## Owner
- Akun yang dipakai login bot otomatis menjadi owner (ketik command dari nomor bot sendiri, termasuk di chat "Pesan ke diri sendiri").
- Nomor lain dapat ditambahkan di `config.owner` (format `628xxxx`).

## waVersion (opsional)
Biarkan `waVersion: null`. Isi hanya bila log menampilkan `Code: 405`, misalnya `waVersion: [2, 3000, 1035194821]`. Code 428/515 saat login itu normal (bot menyambung ulang sendiri).

## Mode & Menu
- `.self` : hanya owner (termasuk akun bot) yang dilayani; `.public` : semua pengguna. Tersimpan di `database/db.json`. Anti link tetap berjalan di kedua mode.
- `.menu` menampilkan info singkat + tombol **Select Menu** dan **Channel Developer** (Group / Owner / Main / All). Bisa juga langsung: `.menu group`, `.menu owner`, `.menu main`, `.menu all`.
