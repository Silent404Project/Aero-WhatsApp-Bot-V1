import { safeJson } from '../Lib/function.js';

export default {
  name: 'statsgrup',
  description: 'Statistik dan metadata grup',
  async execute({ sock, m, reply }) {
    if (!m.isGroup) return reply('Command ini hanya dapat digunakan di grup.');
    const metadata = await sock.groupMetadata(m.chatJid);
    const participants = metadata.participants || [];
    const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
    const data = {
      id: metadata.id, subject: metadata.subject,
      owner: metadata.owner, subjectOwner: metadata.subjectOwner,
      subjectTime: metadata.subjectTime, creation: metadata.creation,
      desc: metadata.desc, descId: metadata.descId,
      descOwner: metadata.descOwner, descTime: metadata.descTime,
      announce: metadata.announce, restrict: metadata.restrict,
      memberAddMode: metadata.memberAddMode,
      joinApprovalMode: metadata.joinApprovalMode,
      size: participants.length,
      admins: admins.map(p => ({ id: p.id, lid: p.lid, admin: p.admin })),
      participants: participants.map(p => ({
        id: p.id, lid: p.lid, phoneNumber: p.phoneNumber,
        admin: p.admin, isSuperAdmin: p.admin === 'superadmin'
      }))
    };
    await reply(`「 GROUP INFO 」\n${safeJson(data)}`);
  }
};
