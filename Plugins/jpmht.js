import { sleep } from '../Lib/function.js';
import db from '../Lib/db.js';
import { findMedia, downloadMedia } from '../Lib/media.js';

export default {
  name: 'jpmht',
  aliases: ['jpmtag'],
  description: 'JPM dengan hidetag (mention semua anggota) ke semua grup',
  async execute({ sock, m, args, config, reply, styler }) {
    const found = findMedia(m);
    if (found && !['image', 'video'].includes(found.kind)) {
      return reply('JPM hidetag mendukung teks, gambar, atau video.');
    }
    const text = args.join(' ').trim() || (found ? found.caption : m.quoted?.text) || '';
    if (!text && !found) {
      return reply(`Format: ${config.prefix}jpmht <teks>\nAtau kirim/balas gambar-video dengan caption ${config.prefix}jpmht [teks]`);
    }

    const groups = await sock.groupFetchAllParticipating();
    const blocked = new Set(db.getBlacklist(config));
    const targets = Object.values(groups).filter(g => !blocked.has(g.id));
    if (!targets.length) return reply('Tidak ada grup tujuan atau semua grup masuk blacklist.');

    const buffer = found ? await downloadMedia(sock, found) : null;
    await reply(`⏳ Memulai JPM Hidetag ke *${targets.length}* grup...`);

    let success = 0;
    const failed = [];
    for (const [i, g] of targets.entries()) {
      if (i) await sleep(db.getDelay('jpm', config));
      try {
        const mentions = (g.participants || []).map(p => p.id).filter(Boolean);
        if (buffer) {
          const payload = found.kind === 'video'
            ? { video: buffer, mimetype: found.mimetype || 'video/mp4' }
            : { image: buffer };
          await sock.sendMessage(g.id, {
            ...payload,
            caption: text || undefined,
            mentions,
            contextInfo: await styler.contextInfo()
          }, { quoted: await styler.fakeQuote(g.id) });
        } else {
          await styler.reply(g.id, text, { mentions, keepText: true, title: 'JPM HIDETAG' });
        }
        success++;
      } catch (err) {
        failed.push(`• ${g.subject || g.id} — ${err.message}`);
      }
    }

    const lines = ['「 JPM HIDETAG SELESAI 」', '', `✅ Berhasil : ${success}`, `❌ Gagal : ${failed.length}`];
    if (failed.length) lines.push('', ...failed.slice(0, 15), failed.length > 15 ? `… dan ${failed.length - 15} lainnya` : '');
    await reply(lines.filter(Boolean).join('\n'));
  }
};
