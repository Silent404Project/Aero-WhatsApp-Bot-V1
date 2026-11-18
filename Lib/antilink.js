import { normalizeJid } from './function.js';
import db from './db.js';

export const GROUP_LINK_RE = /(?:https?:\/\/)?chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9_-]{20,24})/gi;
const warnedAt = new Map();

const idsOf = p => [p?.id, p?.lid, p?.phoneNumber, p?.jid].filter(Boolean).map(normalizeJid);

export function senderIds(m) {
  const ids = new Set([
    m.senderJid, m.key?.participantAlt, m.raw?.key?.participantAlt, m.raw?.key?.remoteJidAlt
  ].filter(Boolean).map(normalizeJid));
  if (m.senderPn) ids.add(`${m.senderPn}@s.whatsapp.net`);
  if (m.senderLid) ids.add(`${m.senderLid}@lid`);
  return ids;
}

/** Info admin pengirim & bot di grup. */
export async function getGroupAdminInfo(sock, chatJid, m) {
  const metadata = await sock.groupMetadata(chatJid);
  const participants = metadata.participants || [];
  const mine = senderIds(m);
  const botIds = new Set([sock.user?.id, sock.user?.lid].filter(Boolean).map(normalizeJid));
  const isAdminEntry = p => p.admin === 'admin' || p.admin === 'superadmin';
  const sender = participants.find(p => idsOf(p).some(id => mine.has(id)));
  const bot = participants.find(p => idsOf(p).some(id => botIds.has(id)));
  return {
    metadata, sender, bot,
    isAdmin: Boolean(sender && isAdminEntry(sender)),
    isBotAdmin: Boolean(bot && isAdminEntry(bot))
  };
}

/** Return true bila pesan sudah ditangani (ada link grup) dan tidak perlu diproses lebih lanjut. */
export async function handleAntilink({ sock, m, raw, config, styler }) {
  if (!m.isGroup) return false;
  const cfg = db.getAntilink(m.chatJid);
  if (!cfg.enabled) return false;
  const codes = [...String(m.text || '').matchAll(GROUP_LINK_RE)].map(x => x[1]);
  if (!codes.length) return false;
  if (m.isOwner) return false;

  let info;
  try { info = await getGroupAdminInfo(sock, m.chatJid, m); } catch { return false; }
  if (info.isAdmin) return false;

  if (!info.isBotAdmin) {
    const last = warnedAt.get(m.chatJid) || 0;
    if (Date.now() - last > 5 * 60_000) {
      warnedAt.set(m.chatJid, Date.now());
      await styler.reply(m.chatJid, 'Anti Link Grup aktif, tetapi bot belum menjadi admin sehingga tidak bisa menghapus pesan / mengeluarkan anggota.', { title: 'ANTI LINK GRUP' });
    }
    return false;
  }

  // Link ke grup ini sendiri diizinkan
  try {
    const own = await sock.groupInviteCode(m.chatJid);
    if (own && codes.every(c => c === own)) return false;
  } catch { /* abaikan */ }

  const targetJid = info.sender?.id || m.senderJid;
  const tag = `@${targetJid.split('@')[0]}`;
  try { await sock.sendMessage(m.chatJid, { delete: raw.key }); } catch { /* mungkin sudah terhapus */ }

  if (cfg.mode === 'kick') {
    try {
      await sock.groupParticipantsUpdate(m.chatJid, [targetJid], 'remove');
      await styler.reply(m.chatJid, `${tag} mengirim link grup dan telah dikeluarkan.`, { mentions: [targetJid], title: 'ANTI LINK GRUP' });
    } catch (err) {
      await styler.reply(m.chatJid, `Pesan ${tag} dihapus, tetapi gagal mengeluarkan: ${err.message}`, { mentions: [targetJid], title: 'ANTI LINK GRUP' });
    }
  } else {
    await styler.reply(m.chatJid, `${tag}, dilarang mengirim link grup di sini. Pesan dihapus.`, { mentions: [targetJid], title: 'ANTI LINK GRUP' });
  }
  return true;
}
