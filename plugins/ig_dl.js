const { plugin, mode } = require("../lib");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

plugin(
  {
    pattern: "insta ?(.*)",
    desc: "Download Instagram Reels/Video in HD",
    react: "🎥",
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
        return await message.reply("❌ 𝐏𝐥𝐞𝐚𝐬𝐞 𝐬𝐞𝐧𝐝 𝐚𝐧 𝐈𝐧𝐬𝐭𝐚𝐠𝐫𝐚𝐦 𝐫𝐞𝐞𝐥/𝐯𝐢𝐝𝐞𝐨 𝐥𝐢𝐧𝐤 😚💋");
      }

      if (!query.includes("instagram.com")) {
        return await message.reply("🚫 𝐓𝐡𝐚𝐭’𝐬 𝐧𝐨𝐭 𝐚 𝐯𝐚𝐥𝐢𝐝 𝐈𝐧𝐬𝐭𝐚𝐠𝐫𝐚𝐦 𝐥𝐢𝐧𝐤 💔");
      }

      await message.reply("⏳ 𝐅𝐞𝐭𝐜𝐡𝐢𝐧𝐠 𝐲𝐨𝐮𝐫 𝐈𝐧𝐬𝐭𝐚𝐠𝐫𝐚𝐦 𝐯𝐢𝐝𝐞𝐨... 😚💋");

      // 🌐 API
      const api = `https://api-aswin-sparky.koyeb.app/api/downloader/igdl?url=${encodeURIComponent(
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

      if (!res?.status || !res?.data || !res.data[0]?.url) {
        return await message.reply(
          "🚫 𝐍𝐨 𝐝𝐨𝐰𝐧𝐥𝐨𝐚𝐝𝐚𝐛𝐥𝐞 𝐯𝐢𝐝𝐞𝐨 𝐟𝐨𝐮𝐧𝐝 😢💋"
        );
      }

      const videoUrl = res.data[0].url;
      const thumb = res.data[0].thumbnail;
      const title = "Instagram Reel";

      // 📁 Temp dir
      const tmpDir = path.join(process.cwd(), "tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const tempFile = path.join(tmpDir, `ig_${Date.now()}.mp4`);

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

      // 🎬 Send final video
      await message.client.sendMessage(
        message.chat,
        {
          video: { url: tempFile },
          mimetype: "video/mp4",
          caption: `╭───────────────◆\n🎬 *${title}*\n📍 𝐒𝐨𝐮𝐫𝐜𝐞: 𝐈𝐧𝐬𝐭𝐚𝐠𝐫𝐚𝐦\n╰───────────────◆\n> 𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐛𝐲 𝐑4𝐛𝐛𝐢𝐭-𝐌𝐢𝐧𝐢 😚💋`,
          thumbnail: thumb ? await (await axios.get(thumb, { responseType: "arraybuffer" })).data : null,
        },
        { quoted: message }
      );

      fs.unlinkSync(tempFile);
    } catch (err) {
      console.error("[PLUGIN IG ERROR]", err);
      await message.reply("⚠️ 𝐒𝐨𝐦𝐞𝐭𝐡𝐢𝐧𝐠 𝐰𝐞𝐧𝐭 𝐰𝐫𝐨𝐧𝐠 💔");
    }
  }
);
