/**
 * DAVID V1 — /nick command
 * Lock all members' nicknames in a group
 * Copyright © DJAMEL
 */

"use strict";

if (!global._nickRunning) global._nickRunning = {};
if (!global._nickVersion) global._nickVersion = {};
if (!global._nickStop)    global._nickStop    = {};

function isBotAdmin(uid) {
  return (global.GoatBot?.config?.adminBot || []).map(String).includes(String(uid));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function sleepInterruptible(ms, tid, knownVer) {
  const step = 200;
  let elapsed = 0;
  while (elapsed < ms) {
    if (global._nickStop[tid]) return "stop";
    if ((global._nickVersion[tid] || 0) !== knownVer) return "version";
    await sleep(Math.min(step, ms - elapsed));
    elapsed += step;
  }
  return "ok";
}

async function runNickLoop(api, threadID, name) {
  const tid = String(threadID);
  global._nickStop[tid]    = false;
  global._nickRunning[tid] = true;
  const myVer = ++global._nickVersion[tid];

  while (!global._nickStop[tid] && (global._nickVersion[tid] || 0) === myVer) {
    try {
      const info = await new Promise((res, rej) =>
        api.getThreadInfo(tid, (e, d) => e ? rej(e) : res(d))
      );

      const members = info?.participantIDs || [];

      for (const uid of members) {
        if (global._nickStop[tid] || global._nickVersion[tid] !== myVer) break;
        try {
          await new Promise(res => api.changeNickname(name, tid, uid, () => res()));
        } catch (_) {}
        const sig = await sleepInterruptible(800, tid, myVer);
        if (sig !== "ok") break;
      }
    } catch (_) {}

    const sig = await sleepInterruptible(30_000, tid, myVer);
    if (sig !== "ok") break;
  }

  global._nickRunning[tid] = false;
}

module.exports = {
  config: {
    name:      "nick",
    aliases:   ["nickname"],
    version:   "1.0.0",
    author:    "DJAMEL",
    countDown: 5,
    role:      2,
    category:  "admin",
    shortDescription: "Lock group nicknames",
    longDescription:  "/nick [name] — Lock all nicknames\n/nick off — Stop\n/nick status — View status\n/nick reset — Remove all nicknames",
    guide: "{p}nick [name]\n{p}nick off\n{p}nick status\n{p}nick reset",
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, senderID } = event;

    if (!isBotAdmin(senderID)) {
      return message.reply("⛔ Only bot admins can use this command.");
    }

    const sub = (args[0] || "").toLowerCase();
    const tid = String(threadID);

    if (sub === "off" || sub === "stop") {
      global._nickStop[tid]    = true;
      global._nickRunning[tid] = false;
      return message.reply("🛑 Nick lock stopped.");
    }

    if (sub === "status") {
      const running = global._nickRunning[tid];
      return message.reply(running
        ? "🔒 Nick lock is currently active."
        : "💤 Nick lock is not running."
      );
    }

    if (sub === "reset" || sub === "remove") {
      global._nickStop[tid] = true;
      try {
        const info    = await new Promise((res, rej) =>
          api.getThreadInfo(tid, (e, d) => e ? rej(e) : res(d))
        );
        const members = info?.participantIDs || [];
        for (const uid of members) {
          await new Promise(res => api.changeNickname("", tid, uid, () => res()));
          await sleep(600);
        }
        return message.reply("✅ All nicknames removed.");
      } catch (e) {
        return message.reply(`❌ Error: ${e.message}`);
      }
    }

    const name = args.join(" ").trim();
    if (!name) return message.reply("⚠️ Please provide a nickname.\nUsage: /nick [name]");

    global._nickVersion[tid] = (global._nickVersion[tid] || 0) + 1;
    global._nickStop[tid]    = false;

    if (!global._nickRunning[tid]) runNickLoop(api, threadID, name).catch(() => {});

    return message.reply(`🔒 Nick lock started!\nAll members will be renamed to: "${name}"`);
  },
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
