const { plugin, mode } = require('../lib');
const axios = require('axios');

plugin({
  pattern: 'insta ?(.*)',
  desc: 'Download Instagram videos or reels',
  react: '📸',
  fromMe: mode,
  type: 'download'
}, async (message, match) => {
  try {
    let text = (match && match.trim()) || '';
    if (!text && message.reply_text) text = message.reply_text.trim();

    const regex = /(https?:\/\/(?:www\.)?instagram\.com\/[^\s]+)/;
    const found = text.match(regex);
    if (!found) {
      return await message.reply('❌ 𝐏𝐥𝐞𝐚𝐬𝐞 𝐬𝐞𝐧𝐝 𝐚 𝐯𝐚𝐥𝐢𝐝 𝐈𝐧𝐬𝐭𝐚𝐠𝐫𝐚𝐦 𝐥𝐢𝐧𝐤 😚💋');
    }

    const url = found[0];
    const api = `https://api-aswin-sparky.koyeb.app/api/downloader/igdl?url=${url}`;
    const res = await axios.get(api);

    if (!res.data.status || !res.data.data?.length) {
      return await message.reply('💔 𝐂𝐨𝐮𝐥𝐝 𝐧𝐨𝐭 𝐝𝐨𝐰𝐧𝐥𝐨𝐚𝐝 𝐭𝐡𝐢𝐬 𝐯𝐢𝐝𝐞𝐨 😋');
    }

    const video = res.data.data[0].url;
    const caption = '𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐛𝐲 𝐑𝟒𝐛𝐛𝐢𝐭-𝐌𝐢𝐧𝐢 😚💋💔😍😋';

    await message.reply(video, { caption });
  } catch (e) {
    console.error('Instagram download error:', e);
    await message.reply('💔 𝐅𝐚𝐢𝐥𝐞𝐝 𝐭𝐨 𝐝𝐨𝐰𝐧𝐥𝐨𝐚𝐝. 𝐓𝐫𝐲 𝐚𝐠𝐚𝐢𝐧 😋');
  }
});
