import { generateWAMessageFromContent, proto, extractImageThumb } from '@silent404/baileys';
import crypto from 'node:crypto';

/** Ubah A-Z a-z 0-9 menjadi huruf tebal sans-serif (𝗔𝗯𝗰). */
export function boldSans(str = '') {
  return [...String(str)].map(ch => {
    const c = ch.codePointAt(0);
    if (c >= 65 && c <= 90) return String.fromCodePoint(0x1D5D4 + c - 65);
    if (c >= 97 && c <= 122) return String.fromCodePoint(0x1D5EE + c - 97);
    if (c >= 48 && c <= 57) return String.fromCodePoint(0x1D7EC + c - 48);
    return ch;
  }).join('');
}

// Judul di awal teks ("「 JUDUL 」" atau "🚫 *JUDUL*") dipindah menjadi atribut judul pesan.
// Jika tidak ada judul di teks, dipakai judul bawaan (opts.title), mis. nama command.
const HEADER_RES = [
  /^「\s*(.+?)\s*」[ \t]*\n*/,
  /^(?:[\p{Extended_Pictographic}\uFE0F\u200D]+\s*)?\*([^*\n]{2,40})\*[ \t]*:?[ \t]*\n+/u
];
function splitTitle(text, fallback, keepText = false) {
  const t = String(text);
  if (keepText) return { title: fallback, text: t };
  for (const re of HEADER_RES) {
    const match = t.match(re);
    if (match) return { title: match[1].trim(), text: t.slice(match[0].length).replace(/^\n+/, '') || t };
  }
  return { title: fallback, text: t };
}

/**
 * Styler: semua balasan bot dikirim lewat sini.
 * Atribut yang dipasang:
 *  - contextInfo.externalAdReply (thumbnail eksternal + link channel)
 *  - contextInfo.forwardedNewsletterMessageInfo (label "Diteruskan dari channel")
 *  - quote palsu berupa newsletterAdminInviteMessage (QuoteTemplate Fake Channel)
 */
export function createStyler(sock, config) {
  const ch = config.channel;
  const style = config.style || {};
  const state = { jid: ch.jid || '', name: ch.name || '', resolved: Boolean(ch.jid && ch.name), resolving: null };
  const thumb = { raw: null, ad: null, quote: null, failedAt: 0 };

  async function loadThumb() {
    if (thumb.raw) return thumb;
    if (Date.now() - thumb.failedAt < 60_000) return thumb;
    try {
      const res = await fetch(ch.thumbnail, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      thumb.raw = Buffer.from(await res.arrayBuffer());
      try { thumb.ad = (await extractImageThumb(thumb.raw, 300)).buffer; } catch { thumb.ad = thumb.raw; }
      try { thumb.quote = (await extractImageThumb(thumb.raw, 96)).buffer; } catch { thumb.quote = null; }
    } catch {
      thumb.failedAt = Date.now();
    }
    return thumb;
  }

  async function resolveChannel() {
    if (state.resolved) return state;
    if (state.resolving) return state.resolving;
    state.resolving = (async () => {
      try {
        const meta = await sock.newsletterMetadata('invite', ch.code);
        const name = meta?.name || meta?.thread_metadata?.name?.text || '';
        if (meta?.id) {
          state.jid = state.jid || meta.id;
          state.name = state.name || name;
          state.resolved = true;
        }
      } catch { /* dicoba lagi pada pesan berikutnya */ }
      state.name = state.name || config.botname;
      state.resolving = null;
      return state;
    })();
    return state.resolving;
  }

  async function contextInfo(title) {
    await resolveChannel();
    const t = await loadThumb();
    const ctx = {
      externalAdReply: {
        title: boldSans(title || config.botname),
        body: state.name || config.botname,
        mediaType: 1,
        thumbnailUrl: ch.thumbnail,
        sourceUrl: ch.link,
        renderLargerThumbnail: Boolean(style.largeThumbnail),
        showAdAttribution: false,
        ...(t.ad ? { thumbnail: t.ad } : {})
      }
    };
    if (state.jid) {
      ctx.isForwarded = true;
      ctx.forwardingScore = 999;
      ctx.forwardedNewsletterMessageInfo = {
        newsletterJid: state.jid,
        newsletterName: state.name || config.botname,
        serverMessageId: 100
      };
    }
    return ctx;
  }

  async function fakeQuote(jid, title) {
    await resolveChannel();
    const t = await loadThumb();
    return {
      key: {
        remoteJid: jid,
        fromMe: false,
        id: `S404${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
        participant: '0@s.whatsapp.net'
      },
      message: {
        newsletterAdminInviteMessage: {
          newsletterJid: state.jid || '0@newsletter',
          newsletterName: state.name || config.botname,
          caption: boldSans(title || config.botname),
          inviteExpiration: 0,
          ...(t.quote ? { jpegThumbnail: t.quote } : {})
        }
      }
    };
  }

  async function pickQuote(jid, opts) {
    if (style.quoteMode === 'real' && opts.quoted) return opts.quoted;
    return fakeQuote(jid, opts.title);
  }

  /** Kirim teks bergaya channel. */
  async function reply(jid, rawText, opts = {}) {
    const { title, text } = splitTitle(rawText, opts.title, opts.keepText);
    opts = { ...opts, title };
    const content = {
      text,
      linkPreview: null,
      contextInfo: await contextInfo(title)
    };
    if (opts.mentions?.length) content.mentions = opts.mentions;
    return sock.sendMessage(jid, content, { quoted: await pickQuote(jid, opts) });
  }

  function toNativeButton(b) {
    if (b.type === 'copy') {
      return { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: b.text, copy_code: b.code }) };
    }
    if (b.type === 'url') {
      return { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: b.text, url: b.url, merchant_url: b.url }) };
    }
    if (b.type === 'list') {
      return {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
          title: b.text,
          sections: b.sections.map(s => ({
            title: s.title,
            rows: s.rows.map(r => ({ header: r.header || '', title: r.title, description: r.description || '', id: r.id }))
          }))
        })
      };
    }
    return { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id }) };
  }

  /**
   * Kirim pesan tombol (native flow). Jika gagal, otomatis fallback ke teks biasa.
   * buttons: [{type:'reply'|'copy'|'url'|'list', text, id|code|url|sections}]
   */
  async function buttons(jid, { text: rawText, footer, buttons: list, fallback = '', title: explicitTitle }, opts = {}) {
    const { title, text } = splitTitle(rawText, explicitTitle || opts.title);
    opts = { ...opts, title };
    try {
      const interactiveMessage = proto.Message.InteractiveMessage.create({
        body: { text },
        footer: { text: footer || config.botname },
        contextInfo: await contextInfo(title),
        nativeFlowMessage: { buttons: list.map(toNativeButton), messageParamsJson: '' }
      });
      const content = {
        viewOnceMessage: {
          message: {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage
          }
        }
      };
      const msg = generateWAMessageFromContent(jid, content, {
        userJid: sock.user.id,
        quoted: await pickQuote(jid, opts)
      });
      await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
      return msg;
    } catch (err) {
      console.warn('[STYLE] Tombol gagal dikirim, fallback ke teks:', err.message);
      return reply(jid, `${text}${fallback ? `\n\n${fallback}` : ''}`, opts);
    }
  }

  /** Teks + tombol salin (+ tombol buka link opsional). */
  function copy(jid, { text, code, label = 'Salin', url, urlLabel = 'Buka Link' }, opts = {}) {
    const list = [{ type: 'copy', text: label, code }];
    if (url) list.push({ type: 'url', text: urlLabel, url });
    return buttons(jid, { text, buttons: list, fallback: code }, opts);
  }

  return { reply, buttons, copy, contextInfo, fakeQuote, resolveChannel };
}
