import { downloadMediaMessage, normalizeMessageContent } from '@silent404/baileys';
import pino from 'pino';

const silent = pino({ level: 'silent' });
const MEDIA_KEYS = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage', 'ptvMessage'];

const MIME_EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/3gpp': '3gp', 'video/webm': 'webm', 'video/quicktime': 'mov',
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/ogg; codecs=opus': 'ogg',
  'audio/aac': 'aac', 'audio/wav': 'wav', 'application/pdf': 'pdf', 'application/zip': 'zip',
  'application/vnd.android.package-archive': 'apk', 'text/plain': 'txt'
};

export function extFromMime(mime = '') {
  const clean = String(mime).toLowerCase();
  return MIME_EXT[clean] || MIME_EXT[clean.split(';')[0]] || clean.split('/')[1]?.split(';')[0] || 'bin';
}

export const formatBytes = (n = 0) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(2)} MB`;
};

function scan(message, key) {
  const content = normalizeMessageContent(message);
  const type = MEDIA_KEYS.find(k => content?.[k]);
  if (!type) return null;
  const node = content[type];
  return {
    type,
    kind: type.replace('Message', ''),
    mimetype: node.mimetype || '',
    fileName: node.fileName || '',
    caption: node.caption || '',
    msg: { key, message: content }
  };
}

/** Cari media pada pesan ini, atau pada pesan yang dibalas. */
export function findMedia(m) {
  return scan(m.raw?.message, m.key) || (m.quoted ? scan(m.quoted.message, m.quoted.key) : null);
}

export async function downloadMedia(sock, found) {
  return downloadMediaMessage(found.msg, 'buffer', {}, {
    logger: silent,
    reuploadRequest: sock.updateMediaMessage
  });
}

export async function uploadCatbox(buffer, filename, mimetype = 'application/octet-stream') {
  if (buffer.length > 200 * 1024 * 1024) throw new Error('Ukuran file melebihi batas catbox.moe (200 MB).');
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', new Blob([buffer], { type: mimetype }), filename);
  const res = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(180_000)
  });
  const text = (await res.text()).trim();
  if (!res.ok || !/^https?:\/\//i.test(text)) throw new Error(text || `HTTP ${res.status}`);
  return text;
}
