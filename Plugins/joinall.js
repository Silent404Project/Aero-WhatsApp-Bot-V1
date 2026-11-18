import { GROUP_LINK_RE } from '../Lib/antilink.js';

const ERRORS = {
  conflict: 'sudah tergabung',
  gone: 'link kedaluwarsa / dicabut',
  'not-authorized': 'bot pernah dikeluarkan / tidak diizinkan',
  forbidden: 'ditolak oleh grup',
  'resource-limit': 'grup sudah penuh',
  'not-acceptable': 'link tidak valid',
  'item-not-found': 'grup tidak ditemukan'
};
const why = e => ERRORS[String(e || '').toLowerCase()] || e || 'gagal';

export function extractGroupLinks(...texts) {
  const codes = new Set();
  for (const t of texts) {
    for (const match of String(t || '').matchAll(GROUP_LINK_RE)) codes.add(match[1]);
  }
  return [...codes].map(c => `https://chat.whatsapp.com/${c}`);
}

export default {
  name: 'joinall',
  description: 'Gabung ke semua link grup pada chat yang dibalas',
  async execute({ sock, m, args, config, reply }) {
    const links = extractGroupLinks(m.quoted?.text, args.join(' '));
    if (!links.length) {
      return reply('Balas chat yang berisi link grup (boleh lebih dari satu link) lalu ketik *.joinall*');
    }
    const delay = Number(config.joinDelay) || 3000;
    await reply(`⏳ Ditemukan *${links.length}* link grup. Mulai bergabung (jeda ${delay / 1000} detik per link)...`);

    let result;
    if (typeof sock.autoJoin === 'function') {
      // autoJoin bawaan Baileys Silent404 (menerima banyak link sekaligus)
      result = await sock.autoJoin(links, { delay, continueOnError: true });
    } else {
      result = { joined: [], failed: [], skipped: [] };
      for (const [i, link] of links.entries()) {
        if (i) await new Promise(r => setTimeout(r, delay));
        try {
          const id = await sock.groupAcceptInvite(link.split('/').pop());
          result.joined.push({ link, ...(id ? { id } : {}) });
        } catch (e) {
          result.failed.push({ link, error: e?.message });
        }
      }
    }

    const lines = [`「 JOIN ALL 」`, '', `✅ Berhasil : ${result.joined.length}`, `❌ Gagal : ${result.failed.length}`];
    if (result.skipped.length) lines.push(`⏭️ Dilewati : ${result.skipped.length}`);
    if (result.joined.length) {
      lines.push('', '*Berhasil:*');
      for (const j of result.joined) lines.push(`• ${j.link.split('/').pop()} ${j.id ? `→ ${j.id}` : '(menunggu persetujuan admin / terkirim)'}`);
    }
    if (result.failed.length) {
      lines.push('', '*Gagal:*');
      for (const f of result.failed) lines.push(`• ${f.link.split('/').pop()} — ${why(f.error)}`);
    }
    await reply(lines.join('\n'));
  }
};
