const { plugin, mode } = require("../lib");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

plugin(
  {
    pattern: "fb ?(.*)",
    desc: "Download Facebook video in HD or SD",
    react: "📽️",
    fromMe: mode,
    type: "download",
  },
  async (message, match) => {
    try {
      // 🧠 Link detect
      const query =
        match?.trim() ||
        message.reply_text?.trim() ||
        message.message?.extendedTextMessage?.contextInfo?.quotedMessage
          ?.conversation ||
        "";

      if (!query) {
        return await message.reply("❌ 𝐏𝐥𝐞𝐚𝐬𝐞 𝐩𝐫𝐨𝐯𝐢𝐝𝐞 𝐚 𝐅𝐚𝐜𝐞𝐛𝐨𝐨𝐤 𝐥𝐢𝐧𝐤 😚💋");
      }

      if (!query.includes("facebook.com")) {
        return await message.reply("🚫 𝐓𝐡𝐚𝐭’𝐬 𝐧𝐨𝐭 𝐚 𝐯𝐚𝐥𝐢𝐝 𝐅𝐚𝐜𝐞𝐛𝐨𝐨𝐤 𝐥𝐢𝐧𝐤 💔");
      }

      await message.reply("⏳ 𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝𝐢𝐧𝐠 𝐲𝐨𝐮𝐫 𝐯𝐢𝐝𝐞𝐨... 😚💋");

      // 🌐 API
      const api = `https://api-aswin-sparky.koyeb.app/api/downloader/fbdl?url=${encodeURIComponent(
        query
      )}`;

      let res;
      try {
        const { data } = await axios.get(api);
        res = data;
      } catch {
        return await message.reply(
          "⚠️ 𝐒𝐨𝐫𝐫𝐲, 𝐜𝐨𝐮𝐥𝐝𝐧’𝐭 𝐟𝐞𝐭𝐜𝐡 𝐭𝐡𝐞 𝐯𝐢𝐝𝐞𝐨 😔💔"
        );
      }

      if (!res?.status || !res?.data) {
        return await message.reply(
          "🚫 𝐕𝐢𝐝𝐞𝐨 𝐧𝐨𝐭 𝐚𝐯𝐚𝐢𝐥𝐚𝐛𝐥𝐞 𝐫𝐢𝐠𝐡𝐭 𝐧𝐨𝐰 😢💋"
        );
      }

      const videoUrl = res.data.high || res.data.low;
      const quality = res.data.high ? "𝐇𝐃" : "𝐒𝐃";
      const title = res.data.title || "𝐅𝐚𝐜𝐞𝐛𝐨𝐨𝐤 𝐕𝐢𝐝𝐞𝐨";

      if (!videoUrl) {
        return await message.reply("❌ 𝐍𝐨 𝐝𝐨𝐰𝐧𝐥𝐨𝐚𝐝𝐚𝐛𝐥𝐞 𝐯𝐢𝐝𝐞𝐨 𝐟𝐨𝐮𝐧𝐝 💔");
      }

      // 📁 Temp dir
      const tmpDir = path.join(process.cwd(), "tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const tempFile = path.join(tmpDir, `fb_${Date.now()}.mp4`);

      const videoStream = await axios({
        method: "GET",
        url: videoUrl,
        responseType: "stream",
      });

      const writer = fs.createWriteStream(tempFile);
      videoStream.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      // 🎬 Send final message
      await message.client.sendMessage(
        message.chat,
        {
          video: { url: tempFile },
          mimetype: "video/mp4",
          caption: `╭───────────────◆\n🎬 *${title}*\n🎞️ 𝐐𝐮𝐚𝐥𝐢𝐭𝐲: ${quality}\n╰───────────────◆\n> 𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐛𝐲 𝐑4𝐛𝐛𝐢𝐭-𝐌𝐢𝐧𝐢 😚💋`,
        },
        { quoted: message }
      );

      fs.unlinkSync(tempFile);
    } catch (err) {
      console.error("[PLUGIN FB ERROR]", err);
      await message.reply("⚠️ 𝐒𝐨𝐦𝐞𝐭𝐡𝐢𝐧𝐠 𝐰𝐞𝐧𝐭 𝐰𝐫𝐨𝐧𝐠 💔");
    }
  }
);
