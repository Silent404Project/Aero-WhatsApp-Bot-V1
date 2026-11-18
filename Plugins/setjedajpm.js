import db from '../Lib/db.js';
import { parseDuration, formatDuration } from '../Lib/duration.js';

const MIN = 500;
const MAX = 10 * 60_000;

export default {
  name: 'setjedajpm',
  description: 'Atur jeda JPM / JPM hidetag',
  async execute({ args, config, reply }) {
    const p = config.prefix;
    const current = db.getDelay('jpm', config);
    if (!args.length) {
      return reply(`Jeda JPM / JPM hidetag saat ini : *${formatDuration(current)}*\n\nUbah dengan:\n${p}setjedajpm 5detik\n${p}setjedajpm 1500ms\n${p}setjedajpm 1menit\n\nBatas: ${formatDuration(MIN)} – ${formatDuration(MAX)}`);
    }
    const ms = parseDuration(args.join(' '));
    if (ms === null) return reply(`Format durasi tidak valid.\nContoh: ${p}setjedajpm 5detik`);
    if (ms < MIN || ms > MAX) return reply(`Jeda harus antara ${formatDuration(MIN)} dan ${formatDuration(MAX)}.`);
    db.setDelay('jpm', ms);
    await reply(`✅ Jeda JPM / JPM hidetag diubah\n${formatDuration(current)} → *${formatDuration(ms)}*${ms < 3000 ? '\n\n⚠️ Jeda pendek meningkatkan risiko akun dibatasi WhatsApp.' : ''}`);
  }
};
