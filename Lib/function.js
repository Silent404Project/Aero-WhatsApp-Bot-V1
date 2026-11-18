import chalk from 'chalk';
import readline from 'node:readline';
import { promisify } from 'node:util';

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export const formatNumber = value => String(value ?? '').replace(/[^0-9]/g, '');

export function normalizeJid(jid = '') {
  if (!jid || typeof jid !== 'string') return '';
  return jid.replace(/:\d+@/, '@');
}

export function getPnFromJid(jid = '') {
  const normalized = normalizeJid(jid);
  if (normalized.endsWith('@s.whatsapp.net')) return normalized.split('@')[0];
  return '';
}

export function getLidFromJid(jid = '') {
  const normalized = normalizeJid(jid);
  if (normalized.endsWith('@lid')) return normalized.split('@')[0];
  return '';
}

export function makeLogger() {
  return {
    info: (message, ...args) => console.log(chalk.cyan('[INFO]'), message, ...args),
    success: (message, ...args) => console.log(chalk.green('[ OK ]'), message, ...args),
    warn: (message, ...args) => console.log(chalk.yellow('[WARN]'), message, ...args),
    error: (message, ...args) => console.log(chalk.red('[ERR ]'), message, ...args),
    command: data => {
      console.log(chalk.magenta('\n[ COMMAND ]'), chalk.white(data.command));
      console.log(chalk.gray('  From    :'), data.pushName || '-');
      console.log(chalk.gray('  Chat    :'), data.chatType, data.chatJid || '-');
      console.log(chalk.gray('  Sender  :'), data.senderJid || '-');
      console.log(chalk.gray('  PN      :'), data.pn || '-');
      console.log(chalk.gray('  LID     :'), data.lid || '-');
      console.log(chalk.gray('  Text    :'), data.text || '-');
    }
  };
}

export async function chooseLoginMethod() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = promisify(rl.question).bind(rl);
  console.log(chalk.bold.cyan('\n╭─ SILENT404 WHATSAPP LOGIN'));
  console.log(chalk.cyan('│  [1] Pairing Code'));
  console.log(chalk.cyan('│  [2] QR Code'));
  console.log(chalk.cyan('╰──────────────────────────'));
  let choice;
  while (!['1', '2'].includes(String(choice).trim())) {
    choice = await ask(chalk.yellow('Pilih metode login (1/2): '));
  }
  let phone = '';
  if (choice === '1') {
    phone = formatNumber(await ask(chalk.yellow('Nomor WhatsApp (contoh 62812xxxx): ')));
    if (!phone || phone.length < 8) {
      rl.close();
      throw new Error('Nomor WhatsApp tidak valid.');
    }
  }
  rl.close();
  return { method: choice === '1' ? 'pairing' : 'qr', phone };
}

function nativeFlowId(paramsJson) {
  if (!paramsJson) return '';
  try {
    const parsed = JSON.parse(paramsJson);
    return String(parsed.id || parsed.selectedId || parsed.selected_id || '');
  } catch {
    return String(paramsJson);
  }
}

export function getMessageText(message = {}) {
  const m = message.message || {};
  const candidates = [
    m.conversation,
    m.extendedTextMessage?.text,
    m.imageMessage?.caption,
    m.videoMessage?.caption,
    m.documentMessage?.caption,
    m.buttonsResponseMessage?.selectedButtonId,
    m.listResponseMessage?.singleSelectReply?.selectedRowId,
    m.templateButtonReplyMessage?.selectedId,
    nativeFlowId(m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson)
  ];
  return String(candidates.find(v => typeof v === 'string' && v.length) || '');
}

export function unwrapMessage(message = {}) {
  let content = message.message || {};
  for (let i = 0; i < 6; i++) {
    const key = Object.keys(content)[0];
    if (key === 'ephemeralMessage' || key === 'viewOnceMessage' ||
        key === 'viewOnceMessageV2' || key === 'viewOnceMessageV2Extension' ||
        key === 'documentWithCaptionMessage' || key === 'editedMessage') {
      content = content[key]?.message || content;
    } else break;
  }
  return content;
}

export function serialize(sock, raw = {}) {
  const key = raw.key || {};
  const message = unwrapMessage(raw);
  const chatJid = normalizeJid(key.remoteJid || '');
  const isGroup = chatJid.endsWith('@g.us');
  const participant = normalizeJid(key.participant || raw.participant || '');
  const senderJid = normalizeJid(isGroup ? (participant || (key.fromMe ? sock.user?.id : '')) : (key.fromMe ? sock.user?.id : chatJid));
  const alt = key.participantAlt || key.remoteJidAlt || raw.senderPn || '';
  const senderPn = getPnFromJid(senderJid) || getPnFromJid(normalizeJid(alt));
  const senderLid = getLidFromJid(senderJid) || getLidFromJid(normalizeJid(alt));
  const text = getMessageText({ ...raw, message });
  const context = Object.values(message).find(v => v?.contextInfo)?.contextInfo
    || message.extendedTextMessage?.contextInfo
    || message.imageMessage?.contextInfo
    || message.videoMessage?.contextInfo
    || {};
  const quoted = context.quotedMessage ? {
    key: {
      remoteJid: chatJid,
      participant: normalizeJid(context.participant || ''),
      id: context.stanzaId || ''
    },
    message: context.quotedMessage,
    sender: normalizeJid(context.participant || ''),
    text: getMessageText({ message: context.quotedMessage }),
    rawContextInfo: context
  } : null;

  return {
    raw, key, message, chatJid, chatType: isGroup ? 'group' : 'private',
    isGroup, isPrivate: !isGroup, isFromMe: Boolean(key.fromMe),
    id: key.id || '', senderJid, participantJid: participant,
    senderPn, senderLid, pushName: raw.pushName || '',
    chatLid: chatJid.endsWith('@lid') ? chatJid : '',
    chatPn: getPnFromJid(chatJid),
    text, body: text, quoted,
    mentionedJid: (context.mentionedJid || []).map(normalizeJid),
    timestamp: raw.messageTimestamp,
    messageType: Object.keys(message)[0] || 'unknown',
    isOwner: false
  };
}

export function extractAllUserIds(contact = {}) {
  const ids = new Set();
  for (const value of [
    contact.id, contact.jid, contact.lid, contact.phoneNumber,
    contact.pn, contact.participant, contact.participantAlt,
    contact.remoteJid, contact.remoteJidAlt
  ]) {
    if (typeof value === 'string' && value) ids.add(normalizeJid(value));
  }
  return [...ids];
}

export function isOwner(message, config) {
  const owners = (config.owner || []).map(formatNumber).filter(Boolean);
  const candidates = [
    message.senderJid, message.senderPn, message.senderLid,
    message.participantJid, message.key?.remoteJidAlt, message.key?.participantAlt
  ].filter(Boolean);
  const digits = candidates.map(formatNumber).filter(Boolean);
  return owners.some(owner => digits.some(id => id === owner || id.endsWith(owner)));
}

export function safeJson(value) {
  return JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2);
}

export function getQuotedRaw(message) {
  return message.quoted?.rawContextInfo?.quotedMessage || null;
}

export function shortJid(jid = '') {
  return jid || '-';
}
