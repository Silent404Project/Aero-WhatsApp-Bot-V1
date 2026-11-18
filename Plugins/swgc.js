import crypto from 'node:crypto';
import { generateWAMessageContent } from '@silent404/baileys';
import { findMedia, downloadMedia } from '../Lib/media.js';
import { sleep } from '../Lib/function.js';
import db from '../Lib/db.js';

const jobs = new Map();
const TTL = 15 * 60_000;

const cleanup = () => {
  for (const [k, v] of jobs) if (Date.now() - v.createdAt > TTL) jobs.delete(k);
};

function parseSelection(input, max) {
  const picked = new Set();
  for (const part of String(input || '').split(/[\s,]+/).filter(Boolean)) {
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) {
      for (let i = Number(range[1]); i <= Number(range[2]); i++) if (i >= 1 && i <= max) picked.add(i);
    } else if (/^\d+$/.test(part) && Number(part) >= 1 && Number(part) <= max) picked.add(Number(part));
  }
  return [...picked];
}

async function listGroups(sock, config) {
  const all = await sock.groupFetchAllParticipating();
  const blocked = new Set(db.getBlacklist(config));
  return Object.values(all)
    .filter(g => !blocked.has(g.id))
    .sort((a, b) => String(a.subject).localeCompare(String(b.subject)))
    .map(g => ({ id: g.id, subject: g.subject || '(Tanpa nama)' }));
}

async function buildContent(sock, job) {
  if (!job.media) {
    return {
      groupStatusMessageV2: {
        message: { extendedTextMessage: { text: job.text, backgroundArgb: 0xFF0B141A, textArgb: 0xFFFFFFFF, font: 2 } }
      }
    };
  }
  const payload = job.media.kind === 'video'
    ? { video: job.media.buffer, caption: job.text || undefined, mimetype: job.media.mimetype || 'video/mp4' }
    : { image: job.media.buffer, caption: job.text || undefined };
  const inner = await generateWAMessageContent(payload, { upload: sock.waUploadToServer });
  return { groupStatusMessageV2: { message: inner } };
}

async function runPost({ sock, config, reply, job, targets }) {
  await reply(`⏳ Memposting Status Grup ke *${targets.length}* grup...`);
  const content = await buildContent(sock, job);
  let ok = 0;
  const failed = [];
  for (const [i, g] of targets.entries()) {
    if (i) await sleep(Number(config.swgcDelay) || 2500);
    try {
      await sock.sendMessage(g.id, content);
      ok++;
    } catch (err) {
      failed.push(`• ${g.subject} — ${err.message}`);
    }
  }
  const lines = ['「 SWGC SELESAI 」', '', `✅ Berhasil : ${ok}`, `❌ Gagal : ${failed.length}`];
  if (failed.length) lines.push('', ...failed.slice(0, 20), failed.length > 20 ? `… dan ${failed.length - 20} lainnya` : '');
  await reply(lines.filter(l => l !== '').join('\n'));
}

export default {
  name: 'swgc',
  description: 'Posting Status Grup (teks / media) ke semua atau grup tertentu',
  async execute(ctx) {
    const { sock, m, args, config, reply, sendButtons } = ctx;
    cleanup();
    const p = config.prefix;
    const [sub, token, ...rest] = args;

    // ----- Aksi dari tombol -----
    if (['all', 'target', 'send', 'batal'].includes(sub) && jobs.has(token)) {
      const job = jobs.get(token);
      if (job.owner !== m.senderJid && !m.isOwner) return reply('⛔ Sesi ini bukan milikmu.');

      if (sub === 'batal') {
        jobs.delete(token);
        return reply('Sesi SWGC dibatalkan.');
      }
      if (sub === 'all') {
        const targets = await listGroups(sock, config);
        if (!targets.length) return reply('Tidak ada grup tujuan.');
        jobs.delete(token);
        return runPost({ ...ctx, job, targets });
      }
      if (sub === 'target') {
        job.groups = await listGroups(sock, config);
        if (!job.groups.length) return reply('Tidak ada grup tujuan.');
        const sections = [];
        const shown = job.groups.slice(0, 100);
        for (let i = 0; i < shown.length; i += 10) {
          sections.push({
            title: `Grup ${i + 1}-${Math.min(i + 10, shown.length)}`,
            rows: shown.slice(i, i + 10).map((g, j) => ({
              title: g.subject.slice(0, 24), description: g.id, id: `${p}swgc send ${token} ${i + j + 1}`
            }))
          });
        }
        const numbered = job.groups.map((g, i) => `${i + 1}. ${g.subject}`).join('\n');
        return sendButtons({
          text: `「 TARGET GRUP 」\n\nPilih satu grup lewat tombol, atau kirim ke banyak grup dengan mengetik:\n*${p}swgc send ${token} 1,3,5-8*\n\n${numbered}`,
          buttons: [{ type: 'list', text: 'Pilih Grup', sections }],
          fallback: `Ketik: ${p}swgc send ${token} 1,3,5-8`
        });
      }
      if (sub === 'send') {
        if (!job.groups) return reply(`Pilih target dulu lewat tombol "Target Grup".`);
        const chosen = parseSelection(rest.join(' '), job.groups.length);
        if (!chosen.length) return reply(`Nomor grup tidak valid. Contoh: ${p}swgc send ${token} 1,3,5-8`);
        return runPost({ ...ctx, job, targets: chosen.map(n => job.groups[n - 1]) });
      }
    }

    // ----- Posting baru -----
    const text = args.join(' ').trim();
    const found = findMedia(m);
    let media = null;
    if (found) {
      if (!['image', 'video'].includes(found.kind)) return reply('Status grup hanya mendukung teks, gambar, atau video.');
      const buffer = await downloadMedia(sock, found);
      media = { kind: found.kind, mimetype: found.mimetype, buffer };
    }
    const caption = text || (found ? (m.quoted ? found.caption : '') : (m.quoted?.text || ''));
    if (!caption && !media) {
      return reply(`Format:\n${p}swgc teks status\natau kirim/balas gambar-video dengan caption ${p}swgc [teks opsional]`);
    }

    const id = `sw${crypto.randomBytes(3).toString('hex')}`;
    jobs.set(id, { owner: m.senderJid, text: caption, media, createdAt: Date.now() });
    const preview = caption ? caption.slice(0, 120) : '(tanpa teks)';
    await sendButtons({
      text: `「 STATUS GRUP 」\n\n📝 Isi : ${preview}\n🖼️ Media : ${media ? media.kind : 'tidak ada'}\n\nPilih tujuan posting:`,
      buttons: [
        { type: 'reply', text: '🌐 Semua Grup', id: `${p}swgc all ${id}` },
        { type: 'reply', text: '🎯 Target Grup', id: `${p}swgc target ${id}` },
        { type: 'reply', text: '✖️ Batal', id: `${p}swgc batal ${id}` }
      ],
      fallback: `${p}swgc all ${id}\n${p}swgc target ${id}`
    });
  }
};
