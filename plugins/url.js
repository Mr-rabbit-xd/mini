const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');
const { plugin, mode } = require('../lib');

// ========= CONFIG =========
const CATBOX_USERHASH = "2dc8e4a4318cb9cf474463609"; // <-- এখানে রাখবেন
const CUSTOM_DOMAIN = "https://www.rabbit.zone.id"; // Masked domain

plugin({
  pattern: 'url',
  desc: 'Upload any file to masked Catbox (UserHash)',
  react: "⛰️",
  fromMe: mode,
  type: "converter"
}, async (message) => {
  let tempFilePath = '';
  try {
    const quotedMsg = message.quoted ? message.quoted : message;
    const mimeType = (quotedMsg.msg || quotedMsg).mimetype || '';

    if (!mimeType && !(quotedMsg.msg || quotedMsg).fileName) {
      throw new Error("Invalid file. Reply to a valid file (image, video, audio, document, apk, zip, etc.)");
    }

    // Download file
    const mediaBuffer = await quotedMsg.download();
    tempFilePath = path.join(os.tmpdir(), `catbox_upload_${Date.now()}`);
    fs.writeFileSync(tempFilePath, mediaBuffer);

    // Detect extension
    let extension = path.extname((quotedMsg.msg || quotedMsg).fileName || '') || '';
    if (!extension) {
      const extMap = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'video/mp4': '.mp4',
        'video/webm': '.webm',
        'audio/mpeg': '.mp3',
        'audio/ogg': '.ogg',
        'audio/wav': '.wav'
      };
      extension = extMap[mimeType] || '.bin';
    }

    const fileName = `file${extension}`;
    const form = new FormData();
    form.append('fileToUpload', fs.createReadStream(tempFilePath), fileName);
    form.append('reqtype', 'fileupload');
    form.append('userhash', CATBOX_USERHASH);

    // Upload to Catbox
    const response = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
      timeout: 30000
    });

    if (!response.data) throw new Error("Upload failed");

    // Mask Catbox URL
    let mediaUrl = response.data.trim();
    mediaUrl = mediaUrl.replace('https://files.catbox.moe', CUSTOM_DOMAIN);

    // Detect media type for UI
    let mediaType = 'File';
    if (mimeType.includes('image')) mediaType = 'Image';
    else if (mimeType.includes('video')) mediaType = 'Video';
    else if (mimeType.includes('audio')) mediaType = 'Audio';

    const fileSize = formatSize(mediaBuffer.length);

    // Send Fancy UI Message
    await message.reply(
`╭━━━「 UPLOAD SUCCESSFUL 」━━━┈⊷
┃ ✅ Type: ${mediaType}
┃ 📦 Size: ${fileSize}
┃ ${mediaUrl}
╰━━━━━━━━━━━━━━━━━━━┈⊷`
    );

  } catch (error) {
    console.error(error); // Server log only
    let errMsg = "🙁 Upload failed. Please try again later."; // Default masked error

    // Masked detailed errors
    if (error.code === 'ETIMEDOUT') {
      errMsg = "❌ Upload failed: Server not responding. Try again later.";
    } else if (error.response?.status === 413) {
      errMsg = "❌ Upload failed: File too large.";
    } else if (error.message && error.message.includes("Invalid file")) {
      errMsg = "❌ Upload failed: Unsupported or invalid file type.";
    }

    await message.reply(errMsg); // User never sees Catbox
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
});

// ========= UTILITY =========
function formatSize(bytes) {
  if (!bytes) return "Unknown";
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}
