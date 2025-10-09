const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { fetchJson, getBuffer } = require('../../lib');

async function songCommand(Aliconn, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();

        if (!searchQuery) {
            await message.client.sendMessage(chatId, { text: '🎵 What song do you want to download?' }, { quoted: message });
            return;
        }

        let downloadUrl;
        let dataa;
        let buffer;

        // 🧠 Fetch buffer with browser-like headers
        const getBufferWithHeaders = async (url) => {
            try {
                const response = await axios({
                    method: 'GET',
                    url: url,
                    responseType: 'arraybuffer',
                    timeout: 60000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                        'Accept': '*/*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Connection': 'keep-alive',
                        'Referer': 'https://www.youtube.com/',
                    },
                });
                return Buffer.from(response.data);
            } catch (error) {
                console.error(`Failed to fetch buffer from ${url}:`, error.message);
                throw error;
            }
        };

        // 🟢 If it's a YouTube URL
        if (searchQuery.startsWith("https://youtu")) {
            try {
                // 🎯 Use Aswin Sparky API
                const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(searchQuery)}`;
                const down = await fetchJson(apiUrl);

                if (!down.status || !down.data || !down.data.url) {
                    throw new Error("Invalid API response");
                }

                dataa = {
                    title: down.data.title,
                    thumbnail: "https://i.ytimg.com/vi/" + searchQuery.split("youtu.be/")[1]?.split("?")[0] + "/hqdefault.jpg"
                };
                downloadUrl = down.data.url;

            } catch (err) {
                console.error("Failed to get video info:", err);
                return message.send("❌ Unable to fetch video information. Please try again later.");
            }

            // Try to get buffer
            try {
                buffer = await getBufferWithHeaders(downloadUrl);
            } catch (bufferErr) {
                console.error("Buffer fetch failed, trying fallback:", bufferErr.message);
                try {
                    buffer = await getBuffer(downloadUrl);
                } catch (fallbackErr) {
                    console.error("Fallback buffer fetch also failed:", fallbackErr.message);
                    return message.send("❌ Failed to download the audio file. The video might be restricted or temporarily unavailable.");
                }
            }

            // Send the audio
            await Aliconn.sendMessage(message.jid, {
                audio: buffer,
                mimetype: "audio/mpeg",
                contextInfo: {
                    externalAdReply: {
                        title: dataa.title,
                        body: '🎧 Powered by 🐰 R4BBIT × ASWIN SPARKY',
                        mediaType: 1,
                        sourceUrl: searchQuery,
                        thumbnailUrl: dataa.thumbnail
                    }
                }
            }, { quoted: message.data });

            return;
        }

        // 🔍 For search queries
        const search = await yts(searchQuery);
        if (!search.videos || search.videos.length === 0) {
            return message.send("❌ No results found for your search query.");
        }

        const datas = search.videos[0];
        const videoUrl = datas.url;

        try {
            const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(videoUrl)}`;
            const down = await fetchJson(apiUrl);

            if (!down.status || !down.data || !down.data.url) {
                throw new Error("Invalid API response");
            }

            downloadUrl = down.data.url;
            dataa = { title: down.data.title, thumbnail: datas.thumbnail };

            try {
                buffer = await getBufferWithHeaders(downloadUrl);
            } catch (bufferErr) {
                console.error("Buffer fetch failed:", bufferErr.message);
                buffer = await getBuffer(downloadUrl);
            }

        } catch (err) {
            console.error("Download failed:", err.message);
            return message.send("❌ Download failed. Please try again later.");
        }

        // 🎶 Send the audio
        await Aliconn.sendMessage(message.jid, {
            audio: buffer,
            mimetype: "audio/mpeg",
            contextInfo: {
                externalAdReply: {
                    title: `${dataa.title}`,
                    body: '🎧 Powered by 🐰 R4BBIT × ASWIN SPARKY',
                    mediaType: 1,
                    sourceUrl: videoUrl,
                    thumbnailUrl: dataa.thumbnail
                }
            }
        }, { quoted: message.data });

    } catch (err) {
        console.error("Main Error:", err);
        message.send(`❌ Error: ${err.message || 'Unknown error occurred'}`);
    }
}

module.exports = songCommand;                throw new Error("Invalid API response");
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
