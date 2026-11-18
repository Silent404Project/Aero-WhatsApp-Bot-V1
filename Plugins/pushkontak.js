import crypto from 'node:crypto';
import db from '../Lib/db.js';
import { findMedia, downloadMedia } from '../Lib/media.js';
import { sleep, normalizeJid } from '../Lib/function.js';
import { buildGroupSections, parseSelection, bySubject } from '../Lib/groups.js';

const jobs = new Map();
const TTL = 15 * 60_000;
let active = null; // hanya satu proses push kontak pada satu waktu

const cleanup = () => { for (const [k, v] of jobs) if (Date.now() - v.createdAt > TTL) jobs.delete(k); };
const isAdmin = p => p.admin === 'admin' || p.admin === 'superadmin';

async function collectMembers(sock, targets) {
  const botIds = new Set([sock.user?.id, sock.user?.lid].filter(Boolean).map(normalizeJid));
  const seen = new Set();
  const members = [];
  for (const g of targets) {
    let meta;
    try { meta = await sock.groupMetadata(g.id); } catch { continue; }
    for (const p of meta.participants || []) {
      if (isAdmin(p)) continue;
      const ids = [p.id, p.lid, p.phoneNumber].filter(Boolean).map(normalizeJid);
      if (ids.some(id => botIds.has(id))) continue;
      const jid = normalizeJid(p.phoneNumber || p.id);
      if (!jid || seen.has(jid)) continue;
      seen.add(jid);
      members.push(jid);
    }
  }
  return members;
}

async function runPush({ sock, config, reply, styler, job, targets }) {
  if (active) return reply(`Masih ada proses push kontak yang berjalan.\nHentikan dengan ${config.prefix}pushkontak stop`);
  const members = await collectMembers(sock, targets);
  if (!members.length) return reply('Tidak ada member non-admin yang bisa dikirimi pesan.');

  const base = db.getDelay('push', config);
  const minutes = Math.ceil((members.length * (base + 1000)) / 60000);
  await reply(`⏳ Mulai push kontak ke *${members.length}* member (non-admin) dari *${targets.length}* grup.\nEstimasi ±${minutes} menit.\nHentikan kapan saja dengan ${config.prefix}pushkontak stop`);

  active = { cancel: false };
  const state = active;
  (async () => {
    let ok = 0;
    const failed = [];
    try {
      for (const [i, jid] of members.entries()) {
        if (state.cancel) break;
        if (i) await sleep(base + Math.floor(Math.random() * 2000));
        try {
          if (job.media) {
            const payload = job.media.kind === 'video'
              ? { video: job.media.buffer, mimetype: job.media.mimetype || 'video/mp4' }
              : { image: job.media.buffer };
            await sock.sendMessage(jid, {
              ...payload,
              caption: job.text || undefined,
              contextInfo: await styler.contextInfo()
            }, { quoted: await styler.fakeQuote(jid) });
          } else {
            await styler.reply(jid, job.text, { keepText: true });
          }
          ok++;
        } catch (err) {
          failed.push(`${jid.split('@')[0]}: ${err.message}`);
        }
      }
      const lines = [
        state.cancel ? '⏹️ Dihentikan.' : '✅ Selesai.',
        `Terkirim : ${ok}`, `Gagal : ${failed.length}`, `Total : ${members.length}`
      ];
      if (failed.length) lines.push('', ...failed.slice(0, 10).map(f => `• ${f}`), failed.length > 10 ? `… dan ${failed.length - 10} lainnya` : '');
      await reply(lines.filter(Boolean).join('\n'));
    } catch (err) {
      await reply(`Proses berhenti: ${err.message}`).catch(() => {});
    } finally {
      active = null;
    }
  })();
}

export default {
  name: 'pushkontak',
  description: 'Kirim teks/media ke chat pribadi semua member (non-admin) grup pilihan',
  async execute(ctx) {
    const { sock, m, args, config, reply, sendButtons } = ctx;
    cleanup();
    const p = config.prefix;
    const [sub, token, ...rest] = args;

    if (sub === 'stop') {
      if (!active) return reply('Tidak ada proses push kontak yang berjalan.');
      active.cancel = true;
      return reply('Menghentikan push kontak setelah pesan yang sedang dikirim...');
    }

    // Aksi dari tombol: .pushkontak send <token> <nomor...>
    if (sub === 'send' && jobs.has(token)) {
      const job = jobs.get(token);
      if (job.owner !== m.senderJid && !m.isOwner) return reply('Sesi ini bukan milikmu.');
      const chosen = parseSelection(rest.join(' '), job.groups.length);
      if (!chosen.length) return reply(`Nomor grup tidak valid. Contoh: ${p}pushkontak send ${token} 1,3,5-8`);
      jobs.delete(token);
      return runPush({ ...ctx, job, targets: chosen.map(n => job.groups[n - 1]) });
    }
    if (sub === 'send') return reply('Sesi kedaluwarsa. Kirim ulang perintah .pushkontak');

    // Pesan baru
    const text = args.join(' ').trim();
    const found = findMedia(m);
    let media = null;
    if (found) {
      if (!['image', 'video'].includes(found.kind)) return reply('Push kontak mendukung teks, gambar, atau video.');
      media = { kind: found.kind, mimetype: found.mimetype, buffer: await downloadMedia(sock, found) };
    }
    const caption = text || (found ? (m.quoted ? found.caption : '') : (m.quoted?.text || ''));
    if (!caption && !media) {
      return reply(`Format:\n${p}pushkontak <teks>\natau kirim/balas gambar-video dengan caption ${p}pushkontak [teks opsional]`);
    }

    const blocked = new Set(db.getBlacklist(config));
    const all = await sock.groupFetchAllParticipating();
    const groups = Object.values(all).filter(g => !blocked.has(g.id)).sort(bySubject);
    if (!groups.length) return reply('Tidak ada grup tujuan (semua grup masuk blacklist).');

    const id = `pk${crypto.randomBytes(3).toString('hex')}`;
    jobs.set(id, { owner: m.senderJid, text: caption, media, groups, createdAt: Date.now() });

    const numbered = groups.map((g, i) => `${i + 1}. ${g.subject}`).join('\n');
    await sendButtons({
      title: 'PUSH KONTAK',
      text: `📝 Isi : ${caption ? caption.slice(0, 120) : '(tanpa teks)'}\n🖼️ Media : ${media ? media.kind : 'tidak ada'}\n\nPesan akan dikirim ke chat pribadi semua member (kecuali admin) dari grup yang dipilih.\nPilih satu grup lewat tombol, atau banyak grup:\n*${p}pushkontak send ${id} 1,3,5-8*\n\n${numbered}`,
      buttons: [{ type: 'list', text: 'Pilih Grup', sections: buildGroupSections(groups, (g, i) => `${p}pushkontak send ${id} ${i + 1}`) }],
      fallback: `Ketik: ${p}pushkontak send ${id} 1,3,5-8`
    });
  }
};
