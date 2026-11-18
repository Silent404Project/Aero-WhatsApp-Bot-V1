import { findMedia, downloadMedia, uploadCatbox, extFromMime, formatBytes } from '../Lib/media.js';

export default {
  name: 'tourl',
  aliases: ['tolink', 'upload'],
  description: 'Upload media ke catbox.moe dan kirim link + tombol salin',
  async execute({ sock, m, reply, sendCopy }) {
    const found = findMedia(m);
    if (!found) {
      return reply('Kirim media dengan caption *.tourl* atau balas media (gambar/video/audio/dokumen/stiker) dengan *.tourl*');
    }
    await reply('⏳ Mengunggah ke catbox.moe...');
    const buffer = await downloadMedia(sock, found);
    if (!buffer?.length) throw new Error('Gagal mengunduh media dari WhatsApp.');

    const ext = extFromMime(found.mimetype);
    const name = found.fileName && /\.\w+$/.test(found.fileName)
      ? found.fileName
      : `silent404-${Date.now()}.${ext}`;
    const url = await uploadCatbox(buffer, name, found.mimetype || 'application/octet-stream');

    await sendCopy({
      text: `「 TO URL 」\n\n📁 File : ${name}\n📦 Ukuran : ${formatBytes(buffer.length)}\n🔗 Link :\n${url}`,
      code: url,
      label: 'Salin Link',
      url,
      urlLabel: 'Buka Link'
    });
  }
};
