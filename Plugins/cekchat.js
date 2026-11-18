import { safeJson } from '../Lib/function.js';

export default {
  name: 'cekchat',
  description: 'Detail lengkap pesan yang dibalas',
  async execute({ m, reply }) {
    if (!m.quoted) return reply('Balas pesan yang ingin diperiksa, lalu ketik .cekchat');
    const data = {
      chatJid: m.chatJid, chatType: m.chatType,
      quotedKey: m.quoted.key,
      quotedSender: m.quoted.sender,
      quotedText: m.quoted.text,
      quotedMessage: m.quoted.message,
      rawContextInfo: m.quoted.rawContextInfo
    };
    await reply(`「 DETAIL QUOTED CHAT 」\n${safeJson(data)}`);
  }
};
