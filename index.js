const express = require("express");
const pino = require("pino");
const fs = require("fs-extra");
const path = require("path");
const { db } = require("./lib/blockDB");
const { ref, set, get, remove, child } = require("firebase/database");
const config = require("./config");
const NodeCache = require("node-cache");
const { Mutex } = require("async-mutex");
const mutex = new Mutex();
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  Browsers,
  makeCacheableSignalKeyStore,
  DisconnectReason,
} = require("@whiskeysockets/baileys");

const { WhatsApp, manager, getSessionPath } = require("./lib/client");
const {
  initSessions,
  saveSession,
  getAllSessions,
  deleteSession,
} = require("./lib");

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== UTILITY FUNCTIONS ====================
function sanitizeNumber(num) {
  return num ? num.replace(/[^0-9]/g, "") : null;
}

// Check if user is blocked
async function isBlocked(number) {
  try {
    const snapshot = await get(child(ref(db), `blocked/${number}`));
    return snapshot.exists();
  } catch (err) {
    console.error("Error checking block status:", err);
    return false;
  }
}

// ==================== PAIRING CONNECTOR ====================
var session;
const msgRetryCounterCache = new NodeCache();
async function connector(Num, res) {
  const sessionDir = getSessionPath(Num);
  await fs.ensureDir(sessionDir);

  console.log(`📂 Pairing - Session path: ${sessionDir}`);

  var { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  session = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino({ level: "fatal" }).child({ level: "fatal" })
      ),
    },
    logger: pino({ level: "fatal" }).child({ level: "fatal" }),
    browser: Browsers.macOS("Safari"),
    markOnlineOnConnect: false,
    msgRetryCounterCache,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 0,
    keepAliveIntervalMs: 10000,
    emitOwnEvents: false,
  });

  if (!session.authState.creds.registered) {
    await delay(1500);
    Num = Num.replace(/[^0-9]/g, "");
    var code = await session.requestPairingCode(Num);
    console.log(`📱 Pairing code for ${Num}: ${code}`);
    res.send({
      status: "success",
      code: code?.match(/.{1,4}/g)?.join("-"),
      number: Num,
      message: "Enter this code in WhatsApp: Link a Device",
    });
  }

  session.ev.on("creds.update", async () => {
    try {
      await saveCreds();
      console.log(`💾 Credentials file updated for ${Num}`);
    } catch (err) {
      console.error(`❌ Failed to save credentials file for ${Num}:`, err);
    }
  });

  session.ev.on("connection.update", async (update) => {
    var { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log(`✅ Pairing successful for ${Num}`);

      // ✅ Acquire mutex lock to prevent race condition
      const release = await mutex.acquire();

      try {
        // ✅ Double-check after acquiring lock
        if (manager.isConnected(Num) || manager.isConnecting(Num)) {
          console.log(
            `⚠️ ${Num} already connecting/connected after lock, skipping bot start`
          );
          return;
        }

        // Verify credentials were saved
        const credsPath = path.join(sessionDir, "creds.json");
        const credExists = await fs.pathExists(credsPath);
        console.log(`📝 Credentials path: ${credsPath}`);
        console.log(`📝 Credentials exist: ${credExists ? "YES ✅" : "NO ❌"}`);

        if (!credExists) {
          throw new Error("Credentials were not saved properly");
        }

        // List all files saved
        const files = await fs.readdir(sessionDir);
        console.log(
          `📁 Session files (${files.length}):`,
          files.slice(0, 10).join(", ")
        );

        // Read credentials and save to database
        console.log(`📖 Reading credentials from ${credsPath}...`);
        const creds = await fs.readJSON(credsPath);
        console.log(`✅ Credentials loaded successfully`);

        console.log(`💾 Saving to database...`);
        await saveSession(Num, creds);
        console.log(`✅ Session saved to database for ${Num}`);

        // Close pairing socket
        await delay(3000);
        if (session) {
          session.end();
          session = null;
          console.log(`🔌 Pairing socket closed for ${Num}`);
        }

        console.log(`⏳ Waiting 5 seconds before starting bot...`);
        await delay(5000);

        // ✅ Final check before starting
        if (manager.isConnected(Num) || manager.isConnecting(Num)) {
          console.log(
            `⚠️ ${Num} already connected (final check), skipping bot start`
          );
          return;
        }

        console.log(`🚀 Starting bot connection for ${Num}...`);

        // Start the actual bot connection
        const bot = new WhatsApp(Num);
        await bot.connect();

        console.log(`✅ Bot started successfully for ${Num}`);
      } catch (err) {
        console.error(`❌ Failed to start bot for ${Num}:`, err.message);
        console.error(err.stack);
      } finally {
        // ✅ Always release mutex lock
        release();
        console.log(`🔓 Released pairing mutex lock for ${Num}`);
      }
    } else if (connection === "close") {
      var reason = lastDisconnect?.error?.output?.statusCode;
      reconn(reason, Num, res);
    }
  });
}

function reconn(reason, Num, res) {
  if (
    [
      DisconnectReason.connectionLost,
      DisconnectReason.connectionClosed,
      DisconnectReason.restartRequired,
    ].includes(reason)
  ) {
    console.log(`🔄 Pairing connection lost for ${Num}, reconnecting...`);
    connector(Num, res);
  } else {
    console.log(`🛑 Pairing disconnected for ${Num}, reason: ${reason}`);
    if (session) {
      session.end();
      session = null;
    }
  }
}

// ==================== SESSION RESTORATION ====================
async function restoreSessions() {
  try {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔄 Starting session restoration...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await config.DATABASE.sync();

    const baseDir = path.join(__dirname, "sessions");
    await fs.ensureDir(baseDir);
    console.log(`📂 Scanning sessions in: ${baseDir}`);

    // 1️⃣ Get sessions from DB
    const dbSessions = await getAllSessions();
    const dbNumbers = dbSessions.map((s) => s.number);
    console.log(`💾 Database sessions: ${dbNumbers.length}`);

    // 2️⃣ Get sessions from local folder
    const folderNames = await fs.readdir(baseDir);
    const folderNumbers = [];
    for (const folder of folderNames) {
      const credPath = path.join(baseDir, folder, "creds.json");
      if (await fs.pathExists(credPath)) {
        folderNumbers.push(folder);
      }
    }
    console.log(`📁 Local folder sessions: ${folderNumbers.length}`);

    // 3️⃣ Merge DB + Folder (avoid duplicates)
    const allNumbers = [...new Set([...dbNumbers, ...folderNumbers])];

    if (!allNumbers.length) {
      console.log("⚠️ No valid sessions found");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return;
    }

    console.log(`♻️ Total unique sessions found: ${allNumbers.length}`);
    allNumbers.forEach((n, i) => console.log(`   ${i + 1}. ${n}`));

    // 4️⃣ Filter blocked & already connected
    const validSessions = [];
    for (const number of allNumbers) {
      // Check if already connected
      if (manager.isConnected(number) || manager.isConnecting(number)) {
        console.log(`⚠️ ${number} already connected/connecting, skipping`);
        continue;
      }

      // Check if blocked
      const blocked = await isBlocked(number);
      if (blocked) {
        console.log(`⛔ ${number} is blocked, skipping`);
        continue;
      }

      validSessions.push(number);
    }

    if (!validSessions.length) {
      console.log("⚠️ No valid sessions to restore after filtering");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return;
    }

    console.log(
      `\n✅ ${validSessions.length} sessions ready for restoration\n`
    );

    // 5️⃣ Restore in batches
    const BATCH_SIZE = 2;
    const BATCH_DELAY = 10000;
    const SESSION_DELAY = 5000;

    for (let i = 0; i < validSessions.length; i += BATCH_SIZE) {
      const batch = validSessions.slice(i, i + BATCH_SIZE);
      console.log(
        `📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          validSessions.length / BATCH_SIZE
        )}: ${batch.join(", ")}`
      );

      for (const number of batch) {
        // ✅ Acquire mutex for each session
        const release = await mutex.acquire();

        try {
          // ✅ Double-check after acquiring lock
          if (manager.isConnected(number) || manager.isConnecting(number)) {
            console.log(
              `⚠️ ${number} already connected/connecting (locked check), skipping`
            );
            continue;
          }

          const sessionDir = path.join(baseDir, number);
          await fs.ensureDir(sessionDir);
          const credPath = path.join(sessionDir, "creds.json");

          let creds;

          // 6️⃣ Two-way sync: Local ↔ Database
          if (await fs.pathExists(credPath)) {
            // Local has creds → Sync to DB
            creds = await fs.readJSON(credPath);
            await saveSession(number, creds);
            console.log(`💾 ${number} synced to database`);
          } else {
            // DB has creds → Sync to Local
            const dbSession = dbSessions.find((s) => s.number === number);
            if (dbSession?.creds) {
              creds = dbSession.creds;
              await fs.writeJSON(credPath, creds, { spaces: 2 });
              console.log(`📁 ${number} synced to local folder`);
            }
          }

          // 7️⃣ Start the bot
          if (creds) {
            console.log(`🔌 Restoring: ${number}`);
            const bot = new WhatsApp(number);
            await bot.connect();
            console.log(`✅ ${number} restoration initiated`);
            await new Promise((r) => setTimeout(r, SESSION_DELAY));
          } else {
            console.log(`⚠️ No creds found for ${number}, skipping`);
          }
        } catch (err) {
          console.error(`❌ Failed to restore ${number}:`, err.message);
        } finally {
          // ✅ Always release mutex
          release();
          console.log(`🔓 Released restore lock for ${number}`);
        }
      }

      // Wait before next batch
      if (i + BATCH_SIZE < validSessions.length) {
        console.log(
          `\n⏳ Waiting ${BATCH_DELAY / 1000}s before next batch...\n`
        );
        await new Promise((r) => setTimeout(r, BATCH_DELAY));
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(
      `✅ Restoration complete. Active: ${manager.connections.size}/${validSessions.length}`
    );
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (err) {
    console.error("❌ Session restoration failed:", err);
    console.error(err.stack);
  }
}

// ==================== API ROUTES ====================

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "online",
    uptime: process.uptime(),
    active_sessions: manager.connections.size,
    timestamp: new Date().toISOString(),
  });
});

// Get pairing code
app.get("/pair", async (req, res) => {
  var Num = req.query.code;
  if (!Num) {
    return res.status(418).json({
      status: "error",
      message: "Phone number is required. Use: /pair?code=1234567890",
    });
  }

  // Sanitize number
  Num = Num.replace(/[^0-9]/g, "");

  if (!Num || Num.length < 10) {
    return res.status(400).json({
      status: "error",
      message: "Invalid phone number format",
    });
  }

  // Check if already blocked
  try {
    const blocked = await isBlocked(Num);
    if (blocked) {
      return res.status(403).json({
        status: "error",
        message: "This number is blocked",
      });
    }
  } catch (err) {
    console.error(`Error checking block status for ${Num}:`, err);
  }

  // Check if already connected
  if (manager.isConnected(Num)) {
    return res.status(409).json({
      status: "error",
      message: "This number is already connected",
      connected: true,
    });
  }

  // Check if already connecting
  if (manager.isConnecting(Num)) {
    return res.status(409).json({
      status: "error",
      message: "This number is already in pairing process",
      connecting: true,
    });
  }

  var release = await mutex.acquire();
  try {
    console.log(`\n🔐 Pairing request for: ${Num}`);
    await connector(Num, res);
  } catch (error) {
    console.error(`❌ Pairing error for ${Num}:`, error);
    res.status(500).json({
      status: "error",
      error: "Failed to connect",
      details: error.message,
    });
  } finally {
    release();
    console.log(`🔓 Released pairing API mutex for ${Num}`);
  }
});

// List active sessions
app.get("/sessions", (req, res) => {
  const sessions = {};
  for (const [num, conn] of manager.connections) {
    sessions[num] = {
      connected: !!conn?.user,
      user: conn?.user?.id || "unknown",
      jid: conn?.user?.id || null,
    };
  }
  res.json({
    total: manager.connections.size,
    sessions,
    server_uptime: process.uptime(),
  });
});

// Check specific session status
app.get("/status", async (req, res) => {
  const num = sanitizeNumber(req.query.number);
  if (!num) {
    return res.status(400).json({
      error: "Please provide ?number=XXXXXXXXXX",
    });
  }

  const isConnected = manager.isConnected(num);
  const isConnecting = manager.isConnecting(num);
  const connection = manager.getConnection(num);
  const sessionPath = path.join(__dirname, "sessions", num);
  const sessionExists = await fs.pathExists(sessionPath);
  const credExists = await fs.pathExists(path.join(sessionPath, "creds.json"));

  res.json({
    number: num,
    connected: isConnected,
    connecting: isConnecting,
    user: connection?.user?.id || null,
    status: isConnected ? "online" : isConnecting ? "connecting" : "offline",
    session_exists: sessionExists,
    credentials_exist: credExists,
  });
});

// ✅ NEW: Detailed status endpoint
app.get("/detailed-status", async (req, res) => {
  const num = sanitizeNumber(req.query.number);
  if (!num) {
    return res.status(400).json({
      error: "Please provide ?number=XXXXXXXXXX",
    });
  }

  const bot = new WhatsApp(num);
  const status = bot.getStatus();
  const sessionPath = path.join(__dirname, "sessions", num);
  const sessionExists = await fs.pathExists(sessionPath);
  const credExists = await fs.pathExists(path.join(sessionPath, "creds.json"));

  res.json({
    number: num,
    ...status,
    session_exists: sessionExists,
    credentials_exist: credExists,
    total_active_sessions: manager.connections.size,
  });
});

// Delete session
app.get("/delete", async (req, res) => {
  const num = sanitizeNumber(req.query.number);
  if (!num) {
    return res.status(400).json({
      error: "Please provide ?number=XXXXXXXXXX",
    });
  }

  try {
    const sessionPath = path.join(__dirname, "sessions", num);
    console.log(`🗑️ Deleting session at: ${sessionPath}`);

    if (!(await fs.pathExists(sessionPath))) {
      return res.status(404).json({
        status: "error",
        message: "No session found",
        path: sessionPath,
      });
    }

    // Disconnect and remove from manager
    manager.removeConnection(num);
    manager.clearScheduledReconnect(num);

    // Delete from database
    await deleteSession(num);

    // Delete session files
    await fs.remove(sessionPath);

    res.json({
      status: "success",
      message: `Deleted session for ${num}`,
    });
  } catch (err) {
    console.error(`❌ Failed to delete session for ${num}:`, err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
});

// Block user
app.get("/block", async (req, res) => {
  const num = sanitizeNumber(req.query.number);
  if (!num) {
    return res.status(400).json({
      error: "Please provide ?number=XXXXXXXXXX",
    });
  }

  try {
    // Mark as blocked in DB
    await set(ref(db, `blocked/${num}`), {
      blocked: true,
      timestamp: Date.now(),
    });

    // Disconnect and delete session
    manager.removeConnection(num);
    manager.clearScheduledReconnect(num);

    const sessionPath = path.join(__dirname, "sessions", num);
    if (await fs.pathExists(sessionPath)) {
      await deleteSession(num);
      await fs.remove(sessionPath);
    }

    res.json({
      status: "success",
      message: `${num} blocked and session removed`,
    });
  } catch (err) {
    console.error(`❌ Block failed for ${num}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Unblock user
app.get("/unblock", async (req, res) => {
  const num = sanitizeNumber(req.query.number);
  if (!num) {
    return res.status(400).json({
      error: "Please provide ?number=XXXXXXXXXX",
    });
  }

  try {
    await remove(ref(db, `blocked/${num}`));
    res.json({
      status: "success",
      message: `${num} unblocked`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get blocklist
app.get("/blocklist", async (req, res) => {
  try {
    const snapshot = await get(ref(db, "blocked"));
    if (snapshot.exists()) {
      res.json(snapshot.val());
    } else {
      res.json({ message: "No blocked users" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restart specific session
app.get("/restart", async (req, res) => {
  const num = sanitizeNumber(req.query.number);
  if (!num) {
    return res.status(400).json({
      error: "Please provide ?number=XXXXXXXXXX",
    });
  }

  try {
    console.log(`🔄 Restarting session: ${num}`);

    // Remove existing connection
    manager.removeConnection(num);
    manager.clearScheduledReconnect(num);

    await delay(2000);

    // Check if session exists
    const sessionPath = path.join(__dirname, "sessions", num);
    const credExists = await fs.pathExists(
      path.join(sessionPath, "creds.json")
    );

    if (!credExists) {
      return res.status(404).json({
        status: "error",
        message: "No session credentials found. Please pair the device first.",
      });
    }

    // Start new connection
    const bot = new WhatsApp(num);
    await bot.connect();

    res.json({
      status: "success",
      message: `Restarted session for ${num}`,
    });
  } catch (err) {
    console.error(`❌ Restart failed for ${num}:`, err);
    res.status(500).json({
      status: "error",
      error: err.message,
    });
  }
});

// Debug endpoint
app.get("/debug-paths", async (req, res) => {
  const num = sanitizeNumber(req.query.number) || "TEST";
  const sessionPath = path.join(__dirname, "sessions", num);
  const credPath = path.join(sessionPath, "creds.json");

  let allSessions = [];
  try {
    allSessions = await fs.readdir(path.join(__dirname, "sessions"));
  } catch {}

  res.json({
    baseDir: __dirname,
    sessionPath: sessionPath,
    credPath: credPath,
    sessionExists: await fs.pathExists(sessionPath),
    credExists: await fs.pathExists(credPath),
    allSessions: allSessions,
    manager: {
      connected: manager.isConnected(num),
      connecting: manager.isConnecting(num),
      totalConnections: manager.connections.size,
    },
  });
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error("Express error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    available_routes: [
      "GET /",
      "GET /pair?code=NUMBER",
      "GET /sessions",
      "GET /status?number=NUMBER",
      "GET /detailed-status?number=NUMBER",
      "GET /delete?number=NUMBER",
      "GET /block?number=NUMBER",
      "GET /unblock?number=NUMBER",
      "GET /blocklist",
      "GET /restart?number=NUMBER",
      "GET /debug-paths?number=NUMBER",
    ],
  });
});

// ==================== GRACEFUL SHUTDOWN ====================
async function shutdown() {
  console.log("\n👋 Shutting down gracefully...");

  // Disconnect all bots
  for (const [num] of manager.connections) {
    console.log(`🔌 Disconnecting: ${num}`);
    manager.removeConnection(num);
    manager.clearScheduledReconnect(num);
  }

  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Handle uncaught errors
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

// ==================== START SERVER ====================
app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════╗
║   🚀 Multi-User WhatsApp Bot Server   ║
║   🌐 Port: ${PORT.toString().padEnd(28)}║
║   📅 ${new Date().toLocaleString().padEnd(34)}║
╚═══════════════════════════════════════╝
  `);

  // Restore all sessions
  await restoreSessions();
  await initSessions();

  console.log(`
✅ Server ready!
📊 Active sessions: ${manager.connections.size}
🔗 Endpoints:
   - GET  /                         (Health check)
   - GET  /pair?code=NUM             (Get pairing code)
   - GET  /sessions                  (List active sessions)
   - GET  /status?number=NUM         (Check session status)
   - GET  /detailed-status?number=NUM (Detailed status)
   - GET  /delete?number=NUM         (Delete session)
   - GET  /block?number=NUM          (Block user)
   - GET  /unblock?number=NUM        (Unblock user)
   - GET  /blocklist                 (View blocked users)
   - GET  /restart?number=NUM        (Restart session)
   - GET  /debug-paths?number=NUM    (Debug paths)
  `);
});
