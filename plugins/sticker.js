const {
  plugin,
  mode,
  config
} = require('../lib');
const fs = require("fs");
const path = require("path");

plugin(
  {
    pattern: "sticker",
    fromMe: mode,
    desc: 'make stickers',
    react: "🔁",
    type : 'converter',
  },
  async (message, match) => {
    if (!/image|video|webp/.test(message.mime)) return await message.send(
      '> 𝐑𝐞𝐩𝐥𝐲 𝐭𝐨 𝐚𝐧 𝐢𝐦𝐚𝐠𝐞 𝐨𝐫 𝐬𝐡𝐨𝐫𝐭 𝐯𝐢𝐝𝐞𝐨 𝐰𝐢𝐭𝐡 𝐭𝐡𝐞 𝐜𝐨𝐦𝐦𝐚𝐧𝐝 `𝐒𝐭𝐢𝐜𝐤𝐞𝐫`'
        );
     if (message.reply_message.mime) {
        let download = await message.reply_message.download();
        return await message.sendSticker(message.jid, download, {
          author: config.STICKER_DATA.split(/[|;,]/)[0] || config.STICKER_DATA,
          packname: config.STICKER_DATA.split(/[|;,]/)[1],
        });
      } else if (/image|video|webp/.test(message.mime)) {
        let download = await message.client.downloadMediaMessage(message);
        return await message.sendSticker(message.jid, download, {
          author: config.STICKER_DATA.split(/[|;,]/)[0] || config.STICKER_DATA,
          packname: config.STICKER_DATA.split(/[|;,]/)[1],
        });
      } else {
        return await message.send(
          '```invalid meda as you replied```'
        );
      }
  }
);
