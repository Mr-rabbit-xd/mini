const axios = require("axios");
const { plugin, mode } = require("../lib");

plugin(
  {
    pattern: "pair ?(.*)",
    desc: "Generate WhatsApp Pair Code",
    react: "🔐",
    fromMe: mode,
    type: "system",
  },
  async (message, match) => {
    try {
      const number = match?.trim();
      if (!number)
        return await message.reply("⚠️ 𝐄𝐱𝐚𝐦𝐩𝐥𝐞: *.pair 919876543210* 💋");

      const waitMsg = await message.reply("⏳ 𝐆𝐞𝐧𝐞𝐫𝐚𝐭𝐢𝐧𝐠... 😚");

      const api = `https://mainline.proxy.rlwy.net:55620/pair?code=${number}`;
      const { data } = await axios.get(api);

      if (data?.status === "success" && data?.code) {
        await message.client.sendMessage(message.jid, {
          text: `🔑 ${data.code}`,
        });
      } else {
        await message.reply("💔 𝐅𝐚𝐢𝐥𝐞𝐝 𝐓𝐫𝐲 𝐀𝐠𝐚𝐢𝐧 😋");
      }
    } catch {
      await message.reply("⚠️ 𝐒𝐞𝐫𝐯𝐞𝐫 𝐄𝐫𝐫𝐨𝐫 😚");
    }
  }
);
