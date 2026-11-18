import db from '../Lib/db.js';
import { parseDuration, formatDuration } from '../Lib/duration.js';

const MIN = 1000;
const MAX = 10 * 60_000;

export default {
  name: 'setjedapush',
  description: 'Atur jeda push kontak',
  async execute({ args, config, reply }) {
    const p = config.prefix;
    const current = db.getDelay('push', config);
    if (!args.length) {
      return reply(`Jeda push kontak saat ini : *${formatDuration(current)}*\n\nUbah dengan:\n${p}setjedapush 5detik\n${p}setjedapush 1500ms\n${p}setjedapush 1menit\n\nBatas: ${formatDuration(MIN)} – ${formatDuration(MAX)}`);
    }
    const ms = parseDuration(args.join(' '));
    if (ms === null) return reply(`Format durasi tidak valid.\nContoh: ${p}setjedapush 5detik`);
    if (ms < MIN || ms > MAX) return reply(`Jeda harus antara ${formatDuration(MIN)} dan ${formatDuration(MAX)}.`);
    db.setDelay('push', ms);
    await reply(`✅ Jeda push kontak diubah\n${formatDuration(current)} → *${formatDuration(ms)}*${ms < 3000 ? '\n\n⚠️ Jeda pendek meningkatkan risiko akun dibatasi WhatsApp.' : ''}`);
  }
};
