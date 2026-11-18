import makeWASocket, {
  useMultiFileAuthState, fetchLatestBaileysVersion,
  DisconnectReason, Browsers
} from '@silent404/baileys';
import pino from 'pino';
import chalk from 'chalk';
import qrcode from 'qrcode-terminal';
import fs from 'node:fs';
import path from 'node:path';
import config from './config.js';
import {
  chooseLoginMethod, makeLogger, serialize, isOwner,
  normalizeJid, safeJson, sleep
} from './Lib/function.js';
import { createStyler } from './Lib/style.js';
import { handleAntilink } from './Lib/antilink.js';
import db from './Lib/db.js';

const logger = makeLogger();
const pluginDir = path.resolve('./Plugins');
const plugins = new Map();

async function loadPlugins() {
  plugins.clear();
  for (const file of fs.readdirSync(pluginDir).filter(f => f.endsWith('.js'))) {
    const mod = (await import(`./Plugins/${file}?update=${Date.now()}`)).default;
    if (mod?.name && typeof mod.execute === 'function') plugins.set(mod.name, mod);
  }
  logger.success(`${plugins.size} plugin berhasil dimuat.`);
}

function getPrefixCommand(text) {
  if (!text.startsWith(config.prefix)) return null;
  const [command, ...args] = text.slice(config.prefix.length).trim().split(/\s+/);
  return command ? { command: command.toLowerCase(), args } : null;
}

let loginChoice = null;   // dipilih sekali saja, tidak diulang saat reconnect
let firstRun = true;

/** Session yang belum terdaftar (sisa pairing/QR gagal) tidak berguna dan memicu 401 — hapus. */
function purgeStaleSession() {
  const dir = path.resolve(config.sessionDir);
  const credsFile = path.join(dir, 'creds.json');
  try {
    if (!fs.existsSync(credsFile)) return;
    const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
    // QR: creds.account terisi setelah scan berhasil; pairing code: creds.registered
    if (!creds.registered && !creds.account) {
      fs.rmSync(dir, { recursive: true, force: true });
      logger.warn('Session lama belum terdaftar (login sebelumnya gagal). Session dibersihkan.');
    }
  } catch {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function startBot() {
  if (firstRun) {
    console.clear();
    console.log(chalk.bold.cyan('╔══════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║       SILENT404 WHATSAPP BOT     ║'));
    console.log(chalk.bold.cyan('╚══════════════════════════════════╝'));
  }
  purgeStaleSession();
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);
  // Hanya tanya metode login bila belum ada session terdaftar
  const linked = Boolean(state.creds.registered || state.creds.account);
  if (!linked && !loginChoice) loginChoice = await chooseLoginMethod();
  const login = linked ? { method: 'none' } : loginChoice;
  firstRun = false;

  // Pakai versi WA bawaan fork kecuali config.waVersion diisi / versi terbaru berhasil diambil
  let version = config.waVersion;
  if (!version) {
    const latest = await fetchLatestBaileysVersion().catch(() => null);
    if (latest?.isLatest) version = latest.version;
  }
  const sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: state, printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: Browsers.ubuntu('Chrome'),
    connectTimeoutMs: 60_000,
    markOnlineOnConnect: false,
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);
  const styler = createStyler(sock, config);
  let pairingRequested = false;

  async function requestPairing(trigger) {
    if (pairingRequested || linked || login.method !== 'pairing') return;
    pairingRequested = true;
    try {
      // Beri server waktu menyelesaikan handshake sebelum companion_hello dikirim
      await sleep(trigger === 'qr' ? 1500 : 3000);
      if (!sock.ws?.isOpen) throw new Error('Koneksi belum siap');
      const code = await sock.requestPairingCode(login.phone);
      const pretty = code?.match(/.{1,4}/g)?.join('-') || code;
      console.log(chalk.bold.green(`\nPAIRING CODE: ${pretty}`));
      console.log(chalk.gray('Masukkan di WhatsApp > Perangkat tertaut > Tautkan perangkat > Tautkan dengan nomor telepon.'));
      console.log(chalk.gray('Kode hanya berlaku untuk sesi ini (±2 menit). Jika bot menampilkan kode BARU, pakai yang terbaru.\n'));
    } catch (err) {
      pairingRequested = false;
      logger.error(`Gagal meminta pairing code: ${err.message}`);
    }
  }

  // Cadangan: bila event qr tidak datang dalam 20 detik tetapi socket terbuka
  if (login.method === 'pairing') {
    setTimeout(() => { if (sock.ws?.isOpen) requestPairing('timer'); }, 20_000);
    sock.ev.on('creds.update', u => {
      if (u.registered) logger.info('Kode diterima di HP, sedang menautkan perangkat...');
    });
  }

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect, qr } = update;
    // Event qr = handshake selesai & socket siap; saat itulah pairing code boleh diminta
    if (qr) {
      if (login.method === 'qr') {
        console.log(chalk.yellow('\nScan QR ini melalui WhatsApp > Perangkat tertaut > Tautkan perangkat:\n'));
        qrcode.generate(qr, { small: true });
      } else await requestPairing('qr');
    }
    if (connection === 'connecting') logger.info('Menghubungkan ke WhatsApp...');
    if (connection === 'open') {
      logger.success(`Terhubung sebagai ${sock.user?.id || 'akun WhatsApp'}`);
      styler.resolveChannel().catch(() => {});
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      logger.warn(`Koneksi terputus. Code: ${code ?? 'unknown'} (${lastDisconnect?.error?.message || '-'})`);
      if (code === DisconnectReason.loggedOut) {
        logger.error('Session logout/ditolak. Folder session dihapus, jalankan ulang untuk login baru.');
        fs.rmSync(path.resolve(config.sessionDir), { recursive: true, force: true });
        process.exit(0);
      }
      if (code === 405) logger.warn('Server menolak versi WA. Isi waVersion di config.js (lihat README).');
      logger.info('Mencoba menyambungkan ulang...');
      setTimeout(() => startBot().catch(err => logger.error(err.message)), 2000);
    }
  });

  await loadPlugins();

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const raw of messages) {
      if (!raw.message) continue;
      const fromMe = Boolean(raw.key?.fromMe);
      const m = serialize(sock, raw);
      // Akun bot sendiri otomatis owner, ditambah nomor di config.owner
      m.isOwner = fromMe || isOwner(m, config);

      // Pesan dari akun bot sendiri hanya diproses bila berupa command (hindari loop dari balasan bot)
      if (fromMe && !getPrefixCommand(m.text)) continue;

      // Anti link grup berjalan untuk semua pesan grup, bukan hanya command
      try {
        if (!fromMe && await handleAntilink({ sock, m, raw, config, styler })) continue;
      } catch (err) {
        logger.error(`antilink: ${err.message}`);
      }

      const parsed = getPrefixCommand(m.text);
      if (!parsed) continue;
      const { command, args } = parsed;
      logger.command({ command, text: m.text, chatType: m.chatType, chatJid: m.chatJid,
        senderJid: m.senderJid, pn: m.senderPn, lid: m.senderLid, pushName: m.pushName });

      const plugin = plugins.get(command) || [...plugins.values()].find(p => p.aliases?.includes(command));
      // Semua balasan bot memakai style Fake Channel (externalAdReply + quote template)
      const cmdTitle = plugin?.name?.toUpperCase();
      const reply = (text, opts = {}) => styler.reply(m.chatJid, text, { quoted: raw, title: cmdTitle, ...opts });
      const sendButtons = (data, opts = {}) => styler.buttons(m.chatJid, data, { quoted: raw, title: cmdTitle, ...opts });
      const sendCopy = (data, opts = {}) => styler.copy(m.chatJid, data, { quoted: raw, title: cmdTitle, ...opts });
      if (!plugin) continue;
      // Mode self: hanya owner (termasuk akun bot) yang dilayani
      if (db.getMode() === 'self' && !m.isOwner) continue;
      if ((config.ownerOnly || []).includes(plugin.name) && !m.isOwner) {
        await reply('Command ini khusus owner bot.', { title: 'AKSES DITOLAK' });
        continue;
      }
      try {
        await plugin.execute({ sock, m, raw, args, config, reply, sendButtons, sendCopy, styler, logger });
      } catch (err) {
        logger.error(`${command}: ${err.stack || err.message}`);
        await reply(err.message, { title: 'TERJADI KESALAHAN' });
      }
    }
  });
}

process.on('unhandledRejection', err => logger.error('Unhandled rejection:', err));
process.on('uncaughtException', err => logger.error('Uncaught exception:', err));
startBot().catch(err => {
  logger.error(err.stack || err.message);
  process.exitCode = 1;
});
