import { sleep } from '../Lib/function.js';
import db from '../Lib/db.js';

export default {
  name: 'jpm',
  description: 'Broadcast ke grup (owner only)',
  async execute({ sock, m, args, config, reply, styler }) {
    const text = args.join(' ').trim();
    const quoted = m.quoted?.message || null;
    if (!text && !quoted) {
      return reply('Format: .jpm teks (opsional balas media dengan caption)');
    }

    const groups = await sock.groupFetchAllParticipating();
    const blocked = new Set(db.getBlacklist(config));
    const targets = Object.keys(groups).filter(jid => !blocked.has(jid));
    if (!targets.length) return reply('Tidak ada grup tujuan atau semua grup masuk blacklist.');

    await reply(`Memulai JPM ke ${targets.length} grup.`);
    let success = 0;
    let failed = 0;

    for (const jid of targets) {
      try {
        // Pesan teks selalu didukung. Media quoted perlu diunduh/dekripsi dahulu.
        if (quoted && text) {
          await styler.reply(jid, text, { keepText: true, title: 'JPM' });
        } else if (quoted) {
          await styler.reply(jid, m.quoted.text || 'Pesan media diteruskan sebagai teks saja.', { keepText: true, title: 'JPM' });
        } else {
          await styler.reply(jid, text, { keepText: true, title: 'JPM' });
        }
        success++;
      } catch {
        failed++;
      }
      await sleep(db.getDelay('jpm', config));
    }
    await reply(`JPM selesai.\nBerhasil: ${success}\nGagal: ${failed}\nCatatan: versi awal ini broadcast teks; media quoted belum diteruskan.`);
  }
};
