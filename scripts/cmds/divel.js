/**
 * DAVID V1 — /divel command
 * Monitor and restore group settings automatically
 * Copyright © DJAMEL
 */

"use strict";

const fs   = require("fs-extra");
const path = require("path");

const DATA_PATH = path.join(process.cwd(), "database/data/divelData.json");

function load() {
  try {
    if (fs.existsSync(DATA_PATH)) return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  } catch (_) {}
  return {};
}

function save(data) {
  fs.ensureDirSync(path.dirname(DATA_PATH));
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function isBotAdmin(uid) {
  return (global.GoatBot?.config?.adminBot || []).map(String).includes(String(uid));
}

if (!global.GoatBot.divelWatchers) global.GoatBot.divelWatchers = {};

function startWatcher(api, threadID, config) {
  stopWatcher(threadID);

  const intervalMs = (config.intervalMinutes || 10) * 60_000;

  global.GoatBot.divelWatchers[threadID] = setInterval(async () => {
    try {
      const info = await new Promise((res, rej) =>
        api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d))
      );

      const tasks = [];

      if (config.name && info.name !== config.name) {
        tasks.push(
          new Promise(res => api.setTitle(config.name, threadID, () => res()))
        );
      }

      await Promise.allSettled(tasks);
    } catch (_) {}
  }, intervalMs);
}

function stopWatcher(threadID) {
  if (global.GoatBot.divelWatchers[threadID]) {
    clearInterval(global.GoatBot.divelWatchers[threadID]);
    delete global.GoatBot.divelWatchers[threadID];
  }
}

module.exports = {
  config: {
    name:      "divel",
    aliases:   [],
    version:   "1.0.0",
    author:    "DJAMEL",
    countDown: 5,
    role:      2,
    category:  "admin",
    shortDescription: "Monitor & auto-restore group settings",
    longDescription:  "/divel start [name] — Start monitoring\n/divel stop — Stop\n/divel status — View config",
    guide: "{p}divel start [name]\n{p}divel stop\n{p}divel status",
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, senderID } = event;

    if (!isBotAdmin(senderID)) {
      return message.reply("⛔ Only bot admins can use this command.");
    }

    const sub = (args[0] || "").toLowerCase();

    if (sub === "stop") {
      stopWatcher(threadID);
      const data = load();
      delete data[threadID];
      save(data);
      return message.reply("🛑 Divel watcher stopped.");
    }

    if (sub === "status") {
      const data  = load();
      const entry = data[threadID];
      if (!entry) return message.reply("💤 Divel is not active in this group.");
      return message.reply(
        `👁 Divel is active\n` +
        `📝 Watching name: ${entry.name || "(none)"}\n` +
        `⏱ Check every: ${entry.intervalMinutes || 10} min`
      );
    }

    // start
    const name          = args.slice(1).join(" ").trim() || null;
    const intervalMinutes = parseInt(args[0]) || 10;

    const data = load();
    const cfg  = { name, intervalMinutes, startedBy: senderID };
    data[threadID] = cfg;
    save(data);

    startWatcher(api, threadID, cfg);

    return message.reply(
      `✅ Divel watcher started!\n` +
      `📝 Name lock: ${name || "off"}\n` +
      `⏱ Checking every ${intervalMinutes} minute(s).`
    );
  },
};
