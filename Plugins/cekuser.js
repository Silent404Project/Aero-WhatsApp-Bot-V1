import { safeJson, normalizeJid } from '../Lib/function.js';

export default {
  name: 'cekuser',
  description: 'Informasi user dari pesan yang dibalas atau mention',
  async execute({ sock, m, reply }) {
    const target = normalizeJid(m.quoted?.sender || m.mentionedJid?.[0] || m.senderJid);
    let contact = {};
    try {
      const found = await sock.onWhatsApp(target);
      contact = found?.[0] || {};
    } catch {}
    const data = {
      target,
      senderJid: m.senderJid,
      senderPn: m.senderPn,
      senderLid: m.senderLid,
      quotedSender: m.quoted?.sender || null,
      mentionedJid: m.mentionedJid,
      onWhatsApp: contact,
      note: 'WhatsApp hanya mengirim PN/LID/alt-JID tertentu pada konteks tertentu; field yang tidak tersedia tidak dapat ditebak.'
    };
    await reply(`「 USER TRACE 」\n${safeJson(data)}`);
  }
};
