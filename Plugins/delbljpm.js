import db from '../Lib/db.js';
import { buildGroupSections, bySubject } from '../Lib/groups.js';

export default {
  name: 'delbljpm',
  description: 'Hapus grup dari blacklist JPM (pilih lewat tombol)',
  async execute({ sock, args, config, reply, sendButtons }) {
    const p = config.prefix;

    if (args[0] === 'all') {
      const n = db.clearBlacklist();
      return reply(`✅ ${n} grup dihapus dari blacklist.${config.jpmBlacklist?.length ? '\nCatatan: entri di config.js (jpmBlacklist) tidak ikut terhapus; edit file config.js untuk menghapusnya.' : ''}`);
    }

    const all = await sock.groupFetchAllParticipating();

    // Aksi dari tombol: .delbljpm <jid>
    if (args[0]) {
      const jid = args[0];
      if (config.jpmBlacklist?.includes(jid) && !db.data.jpmBlacklist.includes(jid)) {
        return reply('Grup ini diblacklist lewat config.js. Hapus dari jpmBlacklist di file config.js.');
      }
      if (!db.removeBlacklist(jid)) return reply('Grup tersebut tidak ada di blacklist.');
      return reply(`✅ ${all[jid]?.subject || jid}\nDihapus dari blacklist.`);
    }

    const stored = db.data.jpmBlacklist.map(id => all[id] || { id, subject: id, participants: [] }).sort(bySubject);
    if (!stored.length) return reply('Blacklist kosong.', { title: 'HAPUS BLACKLIST' });

    await sendButtons({
      title: 'HAPUS BLACKLIST',
      text: `🚫 Diblacklist : ${stored.length}\n\nPilih grup yang ingin dihapus dari blacklist:`,
      buttons: [
        { type: 'list', text: 'Pilih Grup', sections: buildGroupSections(stored, g => `${p}delbljpm ${g.id}`) },
        { type: 'reply', text: '🗑️ Hapus Semua', id: `${p}delbljpm all` }
      ],
      fallback: `Ketik: ${p}delbljpm <id grup> atau ${p}delbljpm all`
    });
  }
};
