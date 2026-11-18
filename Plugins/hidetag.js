import { getGroupAdminInfo } from '../Lib/antilink.js';

export default {
  name: 'hidetag',
  aliases: ['ht'],
  description: 'Kirim pesan yang me-mention semua anggota tanpa menampilkan tag',
  async execute({ sock, m, args, config, reply, styler }) {
    if (!m.isGroup) return reply('Command ini hanya dapat digunakan di grup.');
    const info = await getGroupAdminInfo(sock, m.chatJid, m);
    if (!info.isAdmin && !m.isOwner) return reply('⛔ Hanya admin grup atau owner yang dapat memakai hidetag.');

    const text = args.join(' ').trim() || m.quoted?.text || '';
    if (!text) return reply(`Format: ${config.prefix}hidetag <teks>\nAtau balas sebuah pesan teks dengan ${config.prefix}hidetag`);

    const mentions = info.metadata.participants.map(p => p.id).filter(Boolean);
    await styler.reply(m.chatJid, text, { mentions, keepText: true, title: 'HIDETAG' });
  }
};
