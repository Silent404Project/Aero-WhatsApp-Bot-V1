export default {
  name: 'kick',
  description: 'Keluarkan anggota grup',
  async execute({ sock, m, reply }) {
    if (!m.isGroup) return reply('Command ini hanya dapat digunakan di grup.');
    const target = m.mentionedJid[0] || m.quoted?.sender;
    if (!target) return reply('Tag atau balas pesan anggota yang ingin dikeluarkan.');
    const result = await sock.groupParticipantsUpdate(m.chatJid, [target], 'remove');
    await reply(`Hasil kick:\n${JSON.stringify(result, null, 2)}`);
  }
};
