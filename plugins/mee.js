const { plugin, mode } = require("../lib");

plugin(
  {
    pattern: "mee",
    fromMe: mode,
    desc: "Just tags the user who used the mee command (works in group & inbox)",
    type: "fun",
  },
  async (m) => {
    try {
      const sender = m.sender || m.key.participant || m.participant || m.from;
      const tag = "@" + sender.split("@")[0];
      await m.send(tag, { mentions: [sender] }); // ✅ Only mention, no text
    } catch (err) {
      console.error("Mee Command Error:", err);
    }
  }
);
