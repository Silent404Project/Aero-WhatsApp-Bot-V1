import fs from 'node:fs';
import db from '../Lib/db.js';
import { boldSans } from '../Lib/style.js';

const version = (() => {
  try { return JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version; }
  catch { return '1.0.0'; }
})();

const CATEGORIES = {
  main: {
    title: 'MAIN MENU',
    items: p => [
      `${p}menu`, `${p}tourl  (kirim/balas media → link catbox)`,
      `${p}cekidch <link channel>`, `${p}cekchat  (balas pesan)`, `${p}cekuser  (balas pesan user)`
    ]
  },
  group: {
    title: 'GROUP MENU',
    items: p => [
      `${p}antilink on|off , kick|nokick`, `${p}kick @tag / balas pesan`, `${p}add 628xxxx`,
      `${p}hidetag <teks>`, `${p}statsgrup`
    ]
  },
  owner: {
    title: 'OWNER MENU',
    items: p => [
      `${p}self  (hanya owner)`, `${p}public  (semua pengguna)`,
      `${p}jpm <teks>`, `${p}jpmht <teks/media>  (alias .jpmtag)`,
      `${p}bljpm  (tambah blacklist JPM)`, `${p}delbljpm  (hapus blacklist JPM)`,
      `${p}setjedapush 5detik`, `${p}setjedajpm 2detik`,
      `${p}pushkontak <teks/media>`, `${p}savecontact  (di grup, simpan semua member)`,
      `${p}joinall  (balas chat berisi link grup)`, `${p}swgc <teks/media>  (Status Grup)`
    ]
  }
};

const block = (c, p) => c.items(p).map(i => `• ${i}`).join('\n');

export default {
  name: 'menu',
  aliases: ['help'],
  description: 'Menampilkan daftar command',
  async execute({ m, args, config, reply, sendButtons }) {
    const p = config.prefix;
    const choice = (args[0] || '').toLowerCase();

    if (choice === 'all') {
      await reply(['main', 'group', 'owner'].map(k => `${boldSans(CATEGORIES[k].title)}\n${block(CATEGORIES[k], p)}`).join('\n\n'), { title: 'ALL MENU' });
      return;
    }
    if (CATEGORIES[choice]) {
      await sendButtons({
        title: CATEGORIES[choice].title,
        text: block(CATEGORIES[choice], p),
        buttons: [{ type: 'reply', text: '⬅️ Kembali ke Menu', id: `${p}menu` }],
        fallback: `${p}menu`
      });
      return;
    }

    const text = [
      `Status User : ${m.isOwner ? 'Owner' : 'User'}`,
      `Version : ${version}`,
      `Prefix : ${p}`,
      `Mode : ${db.getMode() === 'self' ? 'Self' : 'Public'}`
    ].join('\n');

    await sendButtons({
      title: config.botname,
      text,
      buttons: [{
        type: 'list',
        text: 'Select Menu',
        sections: [{
          title: 'Pilih Menu',
          rows: [
            { title: 'Group Menu', description: 'Antilink, kick, hidetag, dll.', id: `${p}menu group` },
            { title: 'Owner Menu', description: 'Self/public, jpm, joinall, swgc', id: `${p}menu owner` },
            { title: 'Main Menu', description: 'Tourl, cekidch, dll.', id: `${p}menu main` },
            { title: 'All Menu', description: 'Tampilkan semua command', id: `${p}menu all` }
          ]
        }]
      }, {
        type: 'url',
        text: 'Channel Developer',
        url: config.channel.link
      }],
      fallback: `${p}menu group | owner | main | all\n${config.channel.link}`
    });
  }
};
