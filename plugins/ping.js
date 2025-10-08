const { plugin, mode } = require('../lib');

plugin({
  pattern: 'ping|pong',
  desc: 'Check bot response speed',
  react: '⚡',
  fromMe: mode,
  type: 'info'
}, async (message) => {
  const start = Date.now();
  
  // Send the initial "Pinging..." message
  const sent = await message.send('🏓 𝐏𝐢𝐧𝐠𝐢𝐧𝐠...');
  
  const end = Date.now();
  const ping = end - start;

  // Send the pong reply message (no edit)
  await message.client.sendMessage(message.chat, {
    text: `*╰┈➤ 𝐏O͒N͒𝐆: ${ping} ms*`
  }, { quoted: sent });
});
