import db from '../Lib/db.js';
import { buildGroupSections, bySubject } from '../Lib/groups.js';

export default {
  name: 'bljpm',
  description: 'Tambah grup ke blacklist JPM (pilih lewat tombol)',
  async execute({ sock, args, config, reply, sendButtons }) {
    const p = config.prefix;
    const all = await sock.groupFetchAllParticipating();
    const list = Object.values(all).sort(bySubject);
    if (!list.length) return reply('Tidak ada grup yang terdeteksi.');

    // Aksi dari tombol: .bljpm add <jid>
    if (args[0] === 'add' && args[1]) {
      const g = all[args[1]];
      if (!g) return reply('ID grup tidak ditemukan pada daftar grup bot.');
      if (db.getBlacklist(config).includes(g.id)) return reply(`${g.subject} sudah ada di blacklist.`);
      db.addBlacklist(g.id);
      return reply(`✅ ${g.subject}\nDitambahkan ke blacklist. Grup ini dilewati oleh .jpm, .jpmht, .swgc, dan .pushkontak.\n\nHapus dengan ${p}delbljpm`);
    }

    const blocked = new Set(db.getBlacklist(config));
    const blockedList = list.filter(g => blocked.has(g.id));
    const candidates = list.filter(g => !blocked.has(g.id));
    const lines = [
      `🚫 Diblacklist : ${blockedList.length}`,
      `✅ Aktif : ${candidates.length}`
    ];
    if (blockedList.length) lines.push('', ...blockedList.map((g, i) => `${i + 1}. ${g.subject}`));
    lines.push('', 'Pilih grup yang ingin ditambahkan ke blacklist:');

    if (!candidates.length) return reply('Semua grup sudah masuk blacklist.\nHapus dengan ' + p + 'delbljpm', { title: 'BLACKLIST JPM' });

    await sendButtons({
      title: 'BLACKLIST JPM',
      text: lines.join('\n'),
      buttons: [{
        type: 'list',
        text: 'Pilih Grup',
        sections: buildGroupSections(candidates, g => `${p}bljpm add ${g.id}`)
      }],
      fallback: `Ketik: ${p}bljpm add <id grup>`
    });
  }
};
