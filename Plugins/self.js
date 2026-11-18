import db from '../Lib/db.js';

export default {
  name: 'self',
  description: 'Mode self: hanya owner yang dapat memakai bot',
  async execute({ reply }) {
    db.setMode('self');
    await reply('Hanya owner (dan akun bot) yang dapat memakai command.', { title: 'MODE SELF' });
  }
};
