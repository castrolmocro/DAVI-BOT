/**
 * DAVID V1 — /groupimg command
 * Lock and enforce group profile image
 * Copyright © DJAMEL
 */

"use strict";

const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");

const CACHE_DIR = path.join(os.tmpdir(), "david_groupimg");
fs.ensureDirSync(CACHE_DIR);

const locks = new Map(); // threadID → { imagePath, intervalId }

function isBotAdmin(uid) {
  return (global.GoatBot?.config?.adminBot || []).map(String).includes(String(uid));
}

function isGroupAdmin(threadData, uid) {
  return (threadData?.adminIDs || []).map(String).includes(String(uid));
}

async function downloadImage(url, dest) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15_000 });
  fs.writeFileSync(dest, Buffer.from(res.data));
  return dest;
}

async function applyImage(api, threadID, imagePath) {
  const stream = fs.createReadStream(imagePath);
  await new Promise((res, rej) =>
    api.changeGroupImage(stream, threadID, (err) => err ? rej(err) : res())
  );
}

module.exports = {
  config: {
    name:      "groupimg",
    aliases:   ["gcimg", "groupimage"],
    version:   "1.0.0",
    author:    "DJAMEL",
    countDown: 10,
    role:      2,
    category:  "admin",
    shortDescription: "Lock group profile image",
    longDescription:  "Reply to an image or send with a link to lock the group image.\n/groupimg off — Unlock\n/groupimg status — View status",
    guide: "{p}groupimg [reply to image]\n{p}groupimg off\n{p}groupimg status",
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, senderID, messageReply, attachments } = event;

    if (!isBotAdmin(senderID)) {
      return message.reply("⛔ Only bot admins can use this command.");
    }

    const sub = (args[0] || "").toLowerCase();

    if (sub === "off" || sub === "stop") {
      const lock = locks.get(threadID);
      if (lock?.intervalId) clearInterval(lock.intervalId);
      locks.delete(threadID);
      return message.reply("🔓 Group image lock disabled.");
    }

    if (sub === "status") {
      const lock = locks.get(threadID);
      if (!lock) return message.reply("💤 Group image lock is off.");
      return message.reply("🔒 Group image lock is active.");
    }

    // Find image URL from reply or attachment
    let imageUrl = null;
    const attach = messageReply?.attachments?.[0] || attachments?.[0];
    if (attach?.type === "photo") imageUrl = attach.url || attach.playbackUrl || attach.previewUrl;

    if (!imageUrl && args[0]?.startsWith("http")) imageUrl = args[0];

    if (!imageUrl) {
      return message.reply("⚠️ Please reply to a photo or provide an image URL.");
    }

    try {
      const imgPath = path.join(CACHE_DIR, `${threadID}.jpg`);
      await downloadImage(imageUrl, imgPath);
      await applyImage(api, threadID, imgPath);

      const existing = locks.get(threadID);
      if (existing?.intervalId) clearInterval(existing.intervalId);

      const intervalId = setInterval(async () => {
        try {
          const current = locks.get(threadID);
          if (!current) return;
          await applyImage(api, threadID, current.imagePath);
        } catch (_) {}
      }, 5 * 60_000);

      locks.set(threadID, { imagePath: imgPath, intervalId });

      return message.reply("🔒 Group image locked! It will be restored every 5 minutes.");
    } catch (e) {
      return message.reply(`❌ Failed to set group image: ${e.message}`);
    }
  },
};
