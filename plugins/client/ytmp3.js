const yts = require("yt-search");
const { fetchJson } = require("../../lib");
const { youtubeAPIs, timeout } = require("../../config");

const cache = new Map();

async function songCommand(Aliconn, chatId, message) {
  try {
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
    const query = text.trim();

    if (!query) {
      await message.client.sendMessage(chatId, { text: "🎧 Please provide a YouTube link or song name!" }, { quoted: message });
      return;
    }

    // Direct link দিলে
    if (query.startsWith("https://youtu")) {
      return await downloadAndSend(query, Aliconn, message);
    }

    // Cache check
    if (cache.has(query)) {
      return await downloadAndSend(cache.get(query), Aliconn, message);
    }

    // Super fast yt-search
    const searchPromise = yts({ query, pages: 1 });
    const raceTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Search timeout")), 4000));
    const search = await Promise.race([searchPromise, raceTimeout]);

    if (!search.videos || search.videos.length === 0)
      return message.send("❌ No results found.");

    const videoUrl = search.videos[0].url;
    cache.set(query, videoUrl);

    await downloadAndSend(videoUrl, Aliconn, message);
  } catch (err) {
    console.error("❌ Error:", err.message);
    message.send(`❌ Error: ${err.message}`);
  }
}

async function downloadAndSend(videoUrl, Aliconn, message) {
  try {
    const encoded = encodeURIComponent(videoUrl);
    const apiRequests = youtubeAPIs.map(api =>
      fetchJson(`${api.url}${encoded}`, { timeout })
        .then(res => ({ ...res, _source: api.name }))
        .catch(() => null)
    );

    const down = await Promise.race(apiRequests);
    if (!down) throw new Error("All APIs failed");

    let title, thumb, audio;

    if (down._source === "ZAYNIX") {
      title = down.result.title;
      thumb = down.result.thumbnail;
      audio = down.result.audio_download;
    } else if (down._source === "ASWIN-SPARKY") {
      title = down.data.title;
      thumb = "https://i.imgur.com/HNw2pCg.jpg";
      audio = down.data.url;
    }

    if (!audio) throw new Error("No audio URL found");

    console.log(`✅ Fastest API: ${down._source}`);

    await Aliconn.sendMessage(message.jid, {
      audio: { url: audio },
      mimetype: "audio/mpeg",
      contextInfo: {
        externalAdReply: {
          title: title,
          body: `⚡ Instant • ${down._source} • Powered by 🐰 R4BBIT`,
          mediaType: 1,
          sourceUrl: videoUrl,
          thumbnailUrl: thumb
        }
      }
    }, { quoted: message.data });

  } catch (err) {
    console.error("Download Error:", err.message);
    await message.send("❌ Download failed or all APIs slow.");
  }
}

module.exports = songCommand;        }
        
        const datas = search.videos[0];
        const videoUrl = datas.url;

        // Try to download using the new API structure
        try {
            const down = await fetchJson(`https://izumiiiiiiii.dpdns.org/downloader/youtube-play?query=${encodeURIComponent(videoUrl)}`);
            
            if (!down.status || !down.result) {
                throw new Error("Invalid API response");
            }
            
            downloadUrl = down.result.download; // Updated property name
            
            // Try to get buffer with enhanced headers
            try {
                buffer = await getBufferWithHeaders(downloadUrl);
            } catch (bufferErr) {
                console.error("Buffer fetch failed, trying fallback:", bufferErr.message);
                try {
                    buffer = await getBuffer(downloadUrl);
                } catch (fallbackErr) {
                    console.error("Fallback buffer fetch also failed:", fallbackErr.message);
                    throw new Error("Failed to download audio buffer");
                }
            }
        } catch (err) {
            console.error("Download method failed:", err.message);
            return message.send("❌ Download failed. The video might be restricted or temporarily unavailable.");
        }
        
        // Send audio directly with song details
        await Aliconn.sendMessage(message.jid, {
            audio: buffer,
            mimetype: "audio/mpeg",
            contextInfo: {
                externalAdReply: {
                    title: `${datas.title}`,
                    body: '𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐛𝐲 𝐑4𝐁𝐁𝐈𝐓',
                    mediaType: 1,
                    sourceUrl: 'https://youtube.com',
                    thumbnailUrl: datas.thumbnail
                }
            }
        }, { quoted: message.data });

    } catch (err) {
        console.error("Main Error:", err);
        message.send(`❌ Error: ${err.message || 'Unknown error occurred'}`);
    }
}

module.exports = songCommand;
