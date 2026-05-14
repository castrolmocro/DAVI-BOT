/**
 * DAVID V1 — /groupimg
 * Copyright © DJAMEL
 */
"use strict";

const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");

const TMP   = path.join(os.tmpdir(), "david_gimg");
fs.ensureDirSync(TMP);

if (!global._gImgTimers) global._gImgTimers = new Map();
if (!global._gImgPaths)  global._gImgPaths  = new Map();

module.exports = {
  config: { name: "groupimg", aliases: ["gcimg", "groupimage"], category: "admin" },
  async execute({ api, event, args, message }) {
    const { threadID, messageReply, attachments } = event;
    const sub = (args[0] || "").toLowerCase();

    if (sub === "off" || sub === "stop") {
      const t = global._gImgTimers.get(threadID);
      if (t) { clearInterval(t); global._gImgTimers.delete(threadID); }
      return message.reply("🔓 تم إلغاء قفل صورة المجموعة.");
    }

    if (sub === "status") {
      return message.reply(global._gImgTimers.has(threadID)
        ? "🔒 قفل الصورة نشط."
        : "💤 قفل الصورة غير نشط.");
    }

    let imageUrl = null;
    const attach = messageReply?.attachments?.[0] || attachments?.[0];
    if (attach?.type === "photo") imageUrl = attach.url || attach.playbackUrl || attach.previewUrl;
    if (!imageUrl && args[0]?.startsWith("http")) imageUrl = args[0];
    if (!imageUrl) return message.reply("⚠️ ارد على صورة أو أرسل رابط صورة.");

    try {
      const imgPath = path.join(TMP, `${threadID}.jpg`);
      const res     = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 20000 });
      fs.writeFileSync(imgPath, Buffer.from(res.data));
      await new Promise((ok, rej) => api.changeGroupImage(fs.createReadStream(imgPath), threadID, e => e ? rej(e) : ok()));

      const old = global._gImgTimers.get(threadID);
      if (old) clearInterval(old);

      const timer = setInterval(async () => {
        try {
          const p = global._gImgPaths.get(threadID);
          if (p) await new Promise((ok) => api.changeGroupImage(fs.createReadStream(p), threadID, () => ok()));
        } catch (_) {}
      }, 5 * 60_000);

      global._gImgTimers.set(threadID, timer);
      global._gImgPaths.set(threadID, imgPath);
      return message.reply("🔒 تم قفل صورة المجموعة! يتجدد كل 5 دقائق.");
    } catch (e) { return message.reply(`❌ ${e.message}`); }
  },
};
