import { formatNumber } from '../Lib/function.js';

export default {
  name: 'add',
  description: 'Tambah anggota grup via nomor telepon',
  async execute({ sock, m, args, reply }) {
    if (!m.isGroup) return reply('Command ini hanya dapat digunakan di grup.');
    const number = formatNumber(args[0] || '');
    if (number.length < 8) return reply('Format: .add 628xxxxxxxxxx');
    const result = await sock.groupParticipantsUpdate(m.chatJid, [`${number}@s.whatsapp.net`], 'add');
    await reply(`Hasil add:\n${JSON.stringify(result, null, 2)}`);
  }
};
