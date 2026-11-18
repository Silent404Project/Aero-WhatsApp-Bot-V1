import db from '../Lib/db.js';

export default {
  name: 'public',
  description: 'Mode public: semua orang dapat memakai bot',
  async execute({ reply }) {
    db.setMode('public');
    await reply('Semua pengguna dapat memakai command.', { title: 'MODE PUBLIC' });
  }
};
