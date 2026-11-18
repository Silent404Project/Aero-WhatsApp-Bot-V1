import db from '../Lib/db.js';
import { getGroupAdminInfo } from '../Lib/antilink.js';

export default {
  name: 'antilink',
  description: 'Anti link grup: on/off dan kick/nokick',
  async execute({ sock, m, args, config, reply, sendButtons }) {
    if (!m.isGroup) return reply('Command ini hanya dapat digunakan di grup.');
    const info = await getGroupAdminInfo(sock, m.chatJid, m);
    if (!info.isAdmin && !m.isOwner) return reply('⛔ Hanya admin grup atau owner yang dapat mengatur anti link.');

    const input = args.join(' ').toLowerCase();
    const patch = {};
    if (/\boff\b/.test(input)) patch.enabled = false;
    else if (/\bon\b/.test(input)) patch.enabled = true;
    if (/no\s*-?\s*kick/.test(input)) patch.mode = 'nokick';
    else if (/kick/.test(input)) patch.mode = 'kick';

    const cfg = Object.keys(patch).length ? db.setAntilink(m.chatJid, patch) : db.getAntilink(m.chatJid);
    const p = config.prefix;
    const text = [
      '「 ANTI LINK GRUP 」', '',
      `Status : ${cfg.enabled ? '✅ ON' : '❌ OFF'}`,
      `Mode   : ${cfg.mode === 'kick' ? '🚪 KICK (hapus pesan + keluarkan)' : '🛡️ NO KICK (hapus pesan saja)'}`,
      '',
      info.isBotAdmin ? 'Bot adalah admin ✅' : '⚠️ Jadikan bot admin agar fitur ini bekerja.'
    ].join('\n');

    await sendButtons({
      text,
      buttons: [
        { type: 'reply', text: cfg.enabled ? '❌ Matikan' : '✅ Aktifkan', id: `${p}antilink ${cfg.enabled ? 'off' : 'on'}` },
        { type: 'reply', text: '🚪 Kick', id: `${p}antilink kick` },
        { type: 'reply', text: '🛡️ No Kick', id: `${p}antilink nokick` }
      ],
      fallback: `Ubah: ${p}antilink on|off , ${p}antilink kick|nokick`
    });
  }
};
