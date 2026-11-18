export default {
  botname: 'Silent404 Bot',
  owner: [
    '628xxxxxxxxxx' // Ganti dengan nomor owner tanpa +, spasi, atau tanda -
  ],
  prefix: '.',
  sessionDir: './session',
  // Versi WhatsApp Web. Biarkan null (otomatis). Isi hanya jika log menunjukkan Code 405, contoh: [2, 3000, 1035194821]
  waVersion: null,
  printQRInTerminal: true,
  defaultJpmDelay: 1500,
  // JID grup yang tidak boleh menerima .jpm dan .swgc
  jpmBlacklist: [],
  // Command yang hanya boleh dipakai owner
  ownerOnly: ['jpm', 'bljpm', 'joinall', 'swgc', 'self', 'public', 'jpmht', 'delbljpm', 'pushkontak', 'savecontact', 'setjedapush', 'setjedajpm'],

  // Delay (ms) antar aksi massal agar tidak terlalu agresif
  joinDelay: 3000,
  swgcDelay: 2500,
  // Jeda (ms) antar kontak pada .pushkontak (ditambah acak 0-2 dtk). Jangan terlalu kecil!
  pushDelay: 5000,

  // File penyimpanan (antilink dsb.)
  dbPath: './database/db.json',

  // Atribut "Fake Channel" untuk semua balasan bot
  channel: {
    link: 'https://whatsapp.com/channel/0029VbE3MRY1HspuRdaT3v3b',
    code: '0029VbE3MRY1HspuRdaT3v3b',
    // Kosongkan: JID & nama channel diambil otomatis dari invite code saat bot terhubung.
    // Isi manual (contoh '120363xxxxxxxxxx@newsletter') jika ingin melewati lookup.
    jid: '',
    name: '',
    thumbnail: 'https://files.catbox.moe/fhht0s.png'
  },

  style: {
    // 'fake'  = quote berupa template undangan channel (QuoteTemplate Fake Channel)
    // 'real'  = quote pesan asli pengguna (atribut channel tetap dipakai)
    quoteMode: 'fake',
    // true = thumbnail besar pada externalAdReply
    largeThumbnail: false
  }
};
