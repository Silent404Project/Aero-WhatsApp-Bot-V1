const CHANNEL_RE = /whatsapp\.com\/channel\/([A-Za-z0-9_-]{10,})/i;

export default {
  name: 'cekidch',
  description: 'Ambil ID channel dari link channel WhatsApp',
  async execute({ sock, args, config, reply, sendCopy }) {
    const input = args.join(' ').trim();
    const code = input.match(CHANNEL_RE)?.[1] || (/^[A-Za-z0-9_-]{16,}$/.test(input) ? input : null);
    if (!code) {
      return reply(`Format: ${config.prefix}cekidch <link channel>\nContoh: ${config.prefix}cekidch https://whatsapp.com/channel/0029Vxxxxxxxxxxxx`);
    }

    let meta;
    try {
      meta = await sock.newsletterMetadata('invite', code);
    } catch (err) {
      return reply(`❌ Gagal mengambil data channel: ${err.message}`);
    }
    if (!meta?.id) return reply('❌ Channel tidak ditemukan. Periksa kembali link-nya.');

    const name = meta.name || meta.thread_metadata?.name?.text || '-';
    const subs = meta.subscribers ?? meta.thread_metadata?.subscribers_count;
    const lines = ['「 CEK ID CHANNEL 」', '', `📢 Nama : ${name}`, `🆔 ID : ${meta.id}`];
    if (subs !== undefined) lines.push(`👥 Pengikut : ${subs}`);
    lines.push(`🔗 Link : https://whatsapp.com/channel/${code}`);

    await sendCopy({ text: lines.join('\n'), code: meta.id, label: 'Salin ID Channel', url: `https://whatsapp.com/channel/${code}`, urlLabel: 'Buka Channel' });
  }
};
