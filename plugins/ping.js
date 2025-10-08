const { plugin, mode } = require('../lib');

plugin({
  pattern: 'ping|pong',
  desc: 'Check bot response speed',
  react: '🏓',
  fromMe: mode,
  type: 'info'
}, async (message) => {
  const start = Date.now();
  await message.send('🏓 𝐏𝐢𝐧𝐠𝐢𝐧𝐠...');
  const end = Date.now();
  const ping = end - start;

  const pongMsg = `*╰┈➤ 𝐏O͒N͒𝐆: ${ping} ms*`;

  // Reply directly to the command message
  await message.reply(pongMsg);
});
