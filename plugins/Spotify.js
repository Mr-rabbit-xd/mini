const { plugin, mode } = require("../lib");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

plugin(
  {
    pattern: "spotify ?(.*)",
    desc: "Spotify song downloader (MP3) with externalAdReply",
    react: "🎧",
    fromMe: mode,
    type: "download",
  },
  async (message, match, Aliconn) => {
    try {
      const query = match?.trim() || 
                    message.reply_text?.trim() || 
                    message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || 
                    "";

      if (!query) return await message.reply("❌ Provide song name or Spotify link.");

      let trackUrl = query;

      // check if input is a Spotify link
      if (!query.includes("open.spotify.com")) {
        // search via API
        const searchApi = `https://api.zaynix.biz.id/api/s/spotify?query=${encodeURIComponent(query)}`;
        const { data: searchRes } = await axios.get(searchApi, { timeout: 20000 });

        if (!searchRes?.status || !Array.isArray(searchRes.data) || !searchRes.data.length)
          return await message.reply("🚫 No results found.");

        trackUrl = searchRes.data[0].track_url;
      }

      // download API
      const dlApi = `https://api.zaynix.biz.id/api/d/spotify?url=${encodeURIComponent(trackUrl)}`;
      const { data: dlRes } = await axios.get(dlApi, { timeout: 30000 });

      if (!dlRes?.status || !dlRes.data || !dlRes.data.download)
        return await message.reply("🚫 Could not get download link.");

      const downloadLink = dlRes.data.download;
      const songTitle = dlRes.data.title || "song";
      const thumbnail = dlRes.data.image || "";

      // temp file
      const tmpDir = path.join(process.cwd(), "tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      const tempFile = path.join(tmpDir, `sp_${Date.now()}.mp3`);

      // download MP3 as buffer
      const MAX_BYTES = 16 * 1024 * 1024; // 16MB
      let buffer;

      try {
        const { data, headers } = await axios.get(downloadLink, {
          responseType: "arraybuffer",
          timeout: 60000,
        });

        if (data.byteLength > MAX_BYTES) return await message.reply("File too big");

        buffer = Buffer.from(data);
      } catch {
        return await message.reply("⚠️ Download failed.");
      }

      // send audio with externalAdReply
      await Aliconn.sendMessage(message.jid, {
        audio: buffer,
        mimetype: "audio/mpeg",
        contextInfo: {
          externalAdReply: {
            title: songTitle,
            body: "🎧 Powered by 🐰 R4BBIT",
            mediaType: 1,
            sourceUrl: trackUrl,
            thumbnailUrl: thumbnail
          }
        }
      }, { quoted: message.data });

    } catch (err) {
      console.error("[SPOTIFY PLUGIN ERROR]", err);
      await message.reply("⚠️ Something went wrong.");
    }
  }
);
