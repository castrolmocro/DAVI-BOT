/**
 * DAVID V1 — /angel command
 * Sends scheduled positive/motivational messages to a group
 * Copyright © DJAMEL
 */

"use strict";

const fs   = require("fs-extra");
const path = require("path");

const DATA_PATH = path.join(process.cwd(), "database/data/angelData.json");

const ANGEL_MSGS = [
  "🌟 Stay strong, you're doing great!",
  "💪 Every day is a new chance to shine.",
  "🌈 Keep going — better days are ahead.",
  "✨ You are capable of amazing things.",
  "🕊️ Peace, love, and positivity to all.",
  "💙 Spread kindness — it costs nothing.",
  "🌺 Today is a gift. Make it count.",
  "🦋 Growth happens outside your comfort zone.",
  "🌙 Rest well, rise stronger.",
  "⭐ Your potential is limitless.",
];

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

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

if (!global.GoatBot.angelIntervals) global.GoatBot.angelIntervals = {};

async function sendAngel(api, threadID) {
  const msg = rand(ANGEL_MSGS);
  const delay = Math.min(Math.max(msg.length * 55, 1200), 5000);
  await new Promise(r => setTimeout(r, delay));
  await api.sendMessage(`👼 Angel Message:\n\n${msg}`, threadID);
}

module.exports = {
  config: {
    name:      "angel",
    aliases:   [],
    version:   "1.0.0",
    author:    "DJAMEL",
    countDown: 5,
    role:      2,
    category:  "admin",
    shortDescription: "Send scheduled angel messages",
    longDescription:  "/angel start [minutes] — Start angel messages\n/angel stop — Stop\n/angel status — View status",
    guide: "{p}angel start [minutes]\n{p}angel stop\n{p}angel status",
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, senderID } = event;

    if (!isBotAdmin(senderID)) {
      return message.reply("⛔ Only bot admins can use this command.");
    }

    const sub = (args[0] || "").toLowerCase();

    if (sub === "stop") {
      if (global.GoatBot.angelIntervals[threadID]) {
        clearInterval(global.GoatBot.angelIntervals[threadID]);
        delete global.GoatBot.angelIntervals[threadID];
      }
      const data = load();
      delete data[threadID];
      save(data);
      return message.reply("🛑 Angel messages stopped.");
    }

    if (sub === "status") {
      const data  = load();
      const entry = data[threadID];
      if (!entry) return message.reply("💤 Angel is not running in this group.");
      return message.reply(`👼 Angel is active\n⏱ Interval: every ${entry.minutes} minute(s)`);
    }

    // start
    const minutes = parseInt(args[1] || args[0]) || 60;
    if (minutes < 1 || minutes > 1440) {
      return message.reply("⚠️ Interval must be between 1 and 1440 minutes.");
    }

    if (global.GoatBot.angelIntervals[threadID]) {
      clearInterval(global.GoatBot.angelIntervals[threadID]);
    }

    const data = load();
    data[threadID] = { minutes, startedBy: senderID };
    save(data);

    global.GoatBot.angelIntervals[threadID] = setInterval(
      () => sendAngel(api, threadID).catch(() => {}),
      minutes * 60_000
    );

    await sendAngel(api, threadID).catch(() => {});
    return message.reply(`✅ Angel messages started! Sending every ${minutes} minute(s).`);
  },
};
