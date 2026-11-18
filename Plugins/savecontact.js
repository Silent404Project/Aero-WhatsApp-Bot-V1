import crypto from 'node:crypto';
import { sleep, normalizeJid } from '../Lib/function.js';

const jobs = new Map();
const TTL = 10 * 60_000;
let active = null;

const cleanup = () => { for (const [k, v] of jobs) if (Date.now() - v.createdAt > TTL) jobs.delete(k); };

function collect(sock, meta, prefix, start) {
  const botIds = new Set([sock.user?.id, sock.user?.lid].filter(Boolean).map(normalizeJid));
  const list = [];
  for (const p of meta.participants || []) {
    const ids = [p.id, p.lid, p.phoneNumber].filter(Boolean).map(normalizeJid);
    if (ids.some(id => botIds.has(id))) continue;
    const pn = [p.phoneNumber, p.id].filter(Boolean).map(normalizeJid).find(j => j.endsWith('@s.whatsapp.net')) || null;
    const lid = [p.lid, p.id].filter(Boolean).map(normalizeJid).find(j => j.endsWith('@lid')) || null;
    const index = pn || lid;
    if (!index) continue;
    list.push({ index, pn, lid });
  }
  return list.map((c, i) => ({ ...c, name: `${prefix} ${start + i}` }));
}

const toVcf = contacts => contacts.filter(c => c.pn).map(c =>
  `BEGIN:VCARD\nVERSION:3.0\nFN:${c.name}\nN:;${c.name};;;\nTEL;type=CELL;waid=${c.pn.split('@')[0]}:+${c.pn.split('@')[0]}\nEND:VCARD`
).join('\n');

export default {
  name: 'savecontact',
  description: 'Simpan semua member grup sebagai kontak "Member 1, 2, 3..."',
  async execute({ sock, m, args, config, reply, sendButtons, styler }) {
    cleanup();
    const p = config.prefix;
    const [sub, token] = args;

    if (sub === 'stop') {
      if (!active) return reply('Tidak ada proses simpan kontak yang berjalan.');
      active.cancel = true;
      return reply('Menghentikan proses simpan kontak...');
    }

    if (sub === 'batal' && jobs.has(token)) {
      jobs.delete(token);
      return reply('Dibatalkan.');
    }

    // Eksekusi setelah konfirmasi tombol
    if (sub === 'go' && jobs.has(token)) {
      const job = jobs.get(token);
      if (job.owner !== m.senderJid && !m.isOwner) return reply('Sesi ini bukan milikmu.');
      if (active) return reply(`Masih ada proses berjalan. Hentikan dengan ${p}savecontact stop`);
      jobs.delete(token);

      const state = active = { cancel: false };
      await reply(`⏳ Menyimpan *${job.contacts.length}* kontak dari grup *${job.subject}*...\nHentikan dengan ${p}savecontact stop`);
      (async () => {
        let ok = 0;
        const failed = [];
        try {
          for (const [i, c] of job.contacts.entries()) {
            if (state.cancel) break;
            if (i) await sleep(900);
            try {
              await sock.addOrEditContact(c.index, {
                fullName: c.name,
                firstName: c.name,
                saveOnPrimaryAddressbook: Boolean(c.pn),
                ...(c.pn ? { pnJid: c.pn } : {}),
                ...(c.lid ? { lidJid: c.lid } : {})
              });
              ok++;
            } catch (err) {
              failed.push(`${c.name}: ${err.message}`);
            }
          }
          const lines = [state.cancel ? '⏹️ Dihentikan.' : '✅ Selesai.', `Tersimpan : ${ok}`, `Gagal : ${failed.length}`, `Total : ${job.contacts.length}`];
          if (failed.length) lines.push('', ...failed.slice(0, 10).map(f => `• ${f}`));
          lines.push('', 'File .vcf berisi daftar yang sama dikirim sebagai cadangan; buka file tersebut di HP untuk mengimpor ke buku kontak bila ada yang belum muncul.');
          await reply(lines.join('\n'));

          const vcf = toVcf(job.contacts);
          if (vcf) {
            await sock.sendMessage(m.chatJid, {
              document: Buffer.from(vcf, 'utf8'),
              mimetype: 'text/vcard',
              fileName: `${job.prefix}-${job.subject}.vcf`.replace(/[\\/:*?"<>|]/g, '_'),
              contextInfo: await styler.contextInfo('SAVE CONTACT')
            }, { quoted: await styler.fakeQuote(m.chatJid, 'SAVE CONTACT') });
          }
        } catch (err) {
          await reply(`Proses berhenti: ${err.message}`).catch(() => {});
        } finally {
          active = null;
        }
      })();
      return;
    }

    // Perintah baru
    if (!m.isGroup) return reply('Command ini hanya dapat digunakan di grup.');
    const rest = [...args];
    let start = 1;
    if (rest.length && /^\d+$/.test(rest[rest.length - 1])) start = Number(rest.pop());
    const prefix = rest.join(' ').trim() || 'Member';

    const meta = await sock.groupMetadata(m.chatJid);
    const contacts = collect(sock, meta, prefix, start);
    if (!contacts.length) return reply('Tidak ada member yang bisa disimpan.');

    const id = `sc${crypto.randomBytes(3).toString('hex')}`;
    jobs.set(id, { owner: m.senderJid, contacts, subject: meta.subject, prefix, createdAt: Date.now() });
    await sendButtons({
      title: 'SAVE CONTACT',
      text: `Grup : ${meta.subject}\nJumlah : ${contacts.length} kontak\nNama : ${contacts[0].name} … ${contacts.at(-1).name}\n\n⚠️ Jika sebuah nomor sudah ada di kontakmu, namanya akan diganti menjadi "${prefix} N".\n\nLanjutkan?`,
      buttons: [
        { type: 'reply', text: '✅ Lanjut Simpan', id: `${p}savecontact go ${id}` },
        { type: 'reply', text: '✖️ Batal', id: `${p}savecontact batal ${id}` }
      ],
      fallback: `${p}savecontact go ${id}`
    });
  }
};
