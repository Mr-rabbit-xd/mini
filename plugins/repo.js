const { plugin } = require('../lib');

plugin({
  pattern: "repo|script",
  fromMe: false,
  desc: "Display Rabbit FreeBot official deploy link",
  type: "info",
}, async (message, match) => {
  const pairLink = "https://hdhdhvercek.vercel.app";

  try {
    const caption = `
╭━━━〔 🐰 𝐑4𝐁𝐁𝐈𝐓 𝐌𝐈𝐍𝐈 〕━━━╮
│
│ 👋 𝗛𝗲𝗹𝗹𝗼, 𝗕𝗼𝘁 𝗨𝘀𝗲𝗿 💫  
│ Welcome to the most elegant and stable  
│ free bot system — powered by Rabbit ⚡
│
│ 🚀 𝗗𝗲𝗽𝗹𝗼𝘆 / 𝗣𝗮𝗶𝗿 𝗬𝗼𝘂𝗿 𝗕𝗼𝘁:
│ 🌐 ${pairLink}
│
│ 💡 𝗧𝗶𝗽:
│ You can also use the **.pair** command  
│ directly to connect your bot without using the web.
│
│ 💬 𝗦𝘂𝗽𝗽𝗼𝗿𝘁 𝗚𝗿𝗼𝘂𝗽:
│ 🔗 https://chat.whatsapp.com/CQyxExEBMGvEnkA32zqbNY
│
│ ❤️ 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗯𝘆 𝐑4𝐁𝐁𝐈𝐓 𝐌𝐈𝐍𝐈
╰━━━━━━━━━━━━━━━━━━━━━━╯
    `;

    await message.client.sendMessage(message.jid, {
      image: { url: "https://files.catbox.moe/6qfovj.jpg" },
      caption,
      contextInfo: {
        mentionedJid: [message.sender],
        forwardingScore: 999,
        isForwarded: true,
      },
    }, { quoted: message.data });

  } catch (err) {
    console.error("Error in repo command:", err);
    await message.send("⚠️ Something went wrong. Please try again later.");
  }
});
