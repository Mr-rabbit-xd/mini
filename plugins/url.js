const fs = require('fs');
const path = require('path');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const FormData = require('form-data');
const { plugin, mode, getBuffer, extractUrlsFromString } = require('../lib');

/////////////////////////
// /url command
/////////////////////////
plugin({
  pattern: 'url',
  desc: 'Convert image/video/audio to URL',
  react: "⛰️",
  fromMe: mode,
  type: "converter"
}, async (message, match) => {
  let tempFilePath = '';
  try {
    const quotedMsg = message.quoted ? message.quoted : message;
    const mimeType = (quotedMsg.msg || quotedMsg).mimetype || '';

    if (!mimeType) {
      throw "Please reply to an image, video, or audio file.";
    }

    const mediaBuffer = await quotedMsg.download();
    tempFilePath = path.join(os.tmpdir(), `catbox_upload_${Date.now()}`);

    fs.writeFileSync(tempFilePath, mediaBuffer);

    const extensionMap = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'audio/mpeg': '.mp3',
      'audio/ogg': '.ogg',
      'audio/wav': '.wav'
    };
    const extension = extensionMap[mimeType] || '';
    if (!extension) throw "Unsupported file type!";

    const fileName = `file${extension}`;
    const form = new FormData();
    form.append('fileToUpload', fs.createReadStream(tempFilePath), fileName);
    form.append('reqtype', 'fileupload');

    const response = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
      timeout: 15000
    });

    if (!response.data) throw "❌ No response from Catbox";

    let mediaUrl = response.data.trim();
    mediaUrl = mediaUrl.replace('https://files.catbox.moe', 'https://www.rabbit.zone.id');

    let mediaType = 'File';
    if (mimeType.includes('image')) mediaType = 'Image';
    else if (mimeType.includes('video')) mediaType = 'Video';
    else if (mimeType.includes('audio')) mediaType = 'Audio';

    await message.reply(
      `✅ ${mediaType} Uploaded Successfully\n` +
      `URL: ${mediaUrl}`
    );

  } catch (error) {
    console.error(error);
    let errMsg = error.code === 'ETIMEDOUT'
      ? "❌ Timeout: Catbox is not responding. Try again later."
      : "🙁 Something went wrong. Please try again later.";
    await message.reply(errMsg);
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
});

/////////////////////////
// /vdurl command
/////////////////////////
plugin({
  pattern: 'vdurl',
  desc: 'Convert audio reply to video with image URL background and return MP4 URL',
  fromMe: mode,
  type: "media"
}, async (message, match) => {
  let tempAudio = '';
  let tempVideo = '';
  let tempImage = '';
  try {
    if (!message.reply_message || !message.reply_message.audio) 
      return await message.send("_reply to an audio message_");

    // Download audio
    tempAudio = path.join(os.tmpdir(), `audio_${Date.now()}.mp3`);
    fs.writeFileSync(tempAudio, await message.reply_message.download());

    // Default background image URL
    const imageURL = 'https://www.rabbit.zone.id/dns1nn.jpg';
    const imageBuffer = await axios.get(imageURL, { responseType: 'arraybuffer' });
    tempImage = path.join(os.tmpdir(), `bg_${Date.now()}.jpg`);
    fs.writeFileSync(tempImage, imageBuffer.data);

    // Output video path
    tempVideo = path.join(os.tmpdir(), `video_${Date.now()}.mp4`);

    // Create video using ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(tempImage)
        .loop() // Loop the image for the duration of audio
        .input(tempAudio)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions('-pix_fmt yuv420p')
        .duration(30) // optional: or use audio duration dynamically
        .save(tempVideo)
        .on('end', resolve)
        .on('error', reject);
    });

    // Upload video to Catbox
    const form = new FormData();
    form.append('fileToUpload', fs.createReadStream(tempVideo));
    form.append('reqtype', 'fileupload');

    const response = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders(),
      timeout: 30000
    });

    if (!response.data) throw "❌ No response from Catbox";

    let videoUrl = response.data.trim();
    videoUrl = videoUrl.replace('https://files.catbox.moe', 'https://www.rabbit.zone.id');

    await message.send(
      `✅ Video Generated Successfully\n` +
      `URL: ${videoUrl}`
    );

  } catch (error) {
    console.error(error);
    await message.send("🙁 Something went wrong. Please try again later.");
  } finally {
    if (tempAudio && fs.existsSync(tempAudio)) fs.unlinkSync(tempAudio);
    if (tempVideo && fs.existsSync(tempVideo)) fs.unlinkSync(tempVideo);
    if (tempImage && fs.existsSync(tempImage)) fs.unlinkSync(tempImage);
  }
});
