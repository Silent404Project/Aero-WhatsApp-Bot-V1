import fs from 'node:fs';
import path from 'node:path';
import config from '../config.js';

const file = path.resolve(config.dbPath || './database/db.json');
let data = { antilink: {}, mode: 'public', jpmBlacklist: [], settings: {} };
let timer = null;

try {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) data = { antilink: {}, mode: 'public', jpmBlacklist: [], settings: {}, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
} catch (err) {
  console.error('[DB] Gagal membaca database, memakai data kosong:', err.message);
}

export const db = {
  get data() { return data; },
  save() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
      } catch (err) {
        console.error('[DB] Gagal menyimpan database:', err.message);
      }
    }, 300);
  },
  /** Blacklist gabungan: config.jpmBlacklist + yang tersimpan di database. */
  getBlacklist(config) { return [...new Set([...(config?.jpmBlacklist || []), ...data.jpmBlacklist])]; },
  addBlacklist(jid) {
    if (!data.jpmBlacklist.includes(jid)) data.jpmBlacklist.push(jid);
    this.save();
  },
  removeBlacklist(jid) {
    const before = data.jpmBlacklist.length;
    data.jpmBlacklist = data.jpmBlacklist.filter(j => j !== jid);
    this.save();
    return data.jpmBlacklist.length < before;
  },
  clearBlacklist() { const n = data.jpmBlacklist.length; data.jpmBlacklist = []; this.save(); return n; },
  /** Jeda (ms): kind 'push' atau 'jpm'. Prioritas: pengaturan database > config.js > bawaan. */
  getDelay(kind, config) {
    const key = kind === 'push' ? 'pushDelay' : 'jpmDelay';
    const fallback = kind === 'push' ? (Number(config?.pushDelay) || 5000) : (Number(config?.defaultJpmDelay) || 1500);
    return Number(data.settings?.[key]) || fallback;
  },
  setDelay(kind, ms) {
    data.settings = data.settings || {};
    data.settings[kind === 'push' ? 'pushDelay' : 'jpmDelay'] = ms;
    this.save();
  },
  getMode() { return data.mode === 'self' ? 'self' : 'public'; },
  setMode(mode) { data.mode = mode === 'self' ? 'self' : 'public'; this.save(); return data.mode; },
  getAntilink(jid) {
    return data.antilink[jid] || { enabled: false, mode: 'kick' };
  },
  setAntilink(jid, patch) {
    data.antilink[jid] = { ...this.getAntilink(jid), ...patch };
    this.save();
    return data.antilink[jid];
  }
};

export default db;
