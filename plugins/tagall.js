const { plugin, isAccess, mode } = require("../lib");

plugin(
  {
    pattern: "tagall",
    type: "group",
    fromMe: mode,
    desc: "Tag all group members with numbered clean style",
  },
  async (m, text) => {
    if (!m.isGroup) return await m.reply("*_𝐓𝐡𝐢𝐬 𝐂𝐨𝐦𝐦𝐚𝐧𝐝 𝐢𝐬 𝐨𝐧𝐥𝐲 𝐟𝐨𝐫 𝐠𝐫𝐨𝐮𝐩𝐬 😏💋_*");
    if (!(await isAccess(m))) {
      return await m.send(
        "*_𝐎𝐧𝐥𝐲 𝐛𝐨𝐭 𝐨𝐰𝐧𝐞𝐫 𝐚𝐧𝐝 𝐠𝐫𝐨𝐮𝐩 𝐚𝐝𝐦𝐢𝐧 𝐜𝐚𝐧 𝐮𝐬𝐞 𝐭𝐡𝐢𝐬 𝐜𝐨𝐦𝐦𝐚𝐧𝐝 🤧💔_*"
      );
    }

    try {
      const conn = m.client;
      const from = m.from;
      const groupMetadata = await conn.groupMetadata(from);
      const participants = groupMetadata.participants;
      let totalMembers = participants ? participants.length : 0;

      if (totalMembers === 0)
        return m.reply("*❌ 𝐍𝐨 𝐦𝐞𝐦𝐛𝐞𝐫𝐬 𝐟𝐨𝐮𝐧𝐝 𝐢𝐧 𝐭𝐡𝐢𝐬 𝐠𝐫𝐨𝐮𝐩 🥲💔*");

      const msgText = text?.trim() || "📢 𝐄𝐯𝐞𝐫𝐲𝐛𝐨𝐝𝐲 𝐡𝐞𝐫𝐞 😚💋";
      let tagText = `${msgText}\n\n`;

      participants.forEach((p, i) => {
        tagText += `${i + 1}. @${p.id.split("@")[0]}\n`;
      });

      tagText += `\n𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐛𝐲 𝐑4𝐛𝐛𝐢𝐭-𝐌𝐢𝐧𝐢 🐰`;

      const mentions = participants.map((p) => p.id);
      await conn.sendMessage(
        from,
        {
          text: tagText,
          mentions,
        },
        { quoted: m }
      );
    } catch (err) {
      console.error("tagall error:", err);
      m.reply("❌ An error occurred while tagging members.");
    }
  }
);
