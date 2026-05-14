/**
 * DAVID V1 — /tik
 * Copyright © DJAMEL
 */
"use strict";

const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");

const TMP = path.join(os.tmpdir(), "david_tik");
fs.ensureDirSync(TMP);

function fmtNum(n) {
  if (!n) return "0";
  if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n/1e3).toFixed(1)}K`;
  return String(n);
}

async function fetchTikTok(query) {
  const iUrl = query.includes("tiktok.com");
  const r = await axios.get("https://www.tikwm.com/api/", {
    params: iUrl ? { url: query, hd: 1 } : undefined,
    ...(iUrl ? {} : { params: undefined }),
    timeout: 20000,
  });

  if (iUrl) {
    const d = r.data?.data;
    if (!d) throw new Error("تعذر جلب الفيديو.");
    return { url: d.play || d.wmplay, title: d.title || "", author: d.author?.nickname || "", views: fmtNum(d.play_count), likes: fmtNum(d.digg_count) };
  }

  // Search
  const sr = await axios.get("https://www.tikwm.com/api/feed/search", {
    params: { keywords: query, count: 5, cursor: 0 }, timeout: 15000,
  });
  const videos = sr.data?.data?.videos;
  if (!videos?.length) throw new Error("لم يتم العثور على فيديو.");
  const v = videos[0];
  return { url: v.play, title: v.title || "", author: v.author?.nickname || "", views: fmtNum(v.play_count), likes: fmtNum(v.digg_count) };
}

module.exports = {
  config: { name: "tik", aliases: ["tiktok", "tt"], category: "media" },
  async execute({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const query = args.join(" ").trim();
    if (!query) return message.reply("🎬 اكتب اسم الفيديو أو رابط TikTok.");

    await api.setMessageReaction("⏳", messageID, () => {}, true);
    try {
      const { url, title, author, views, likes } = await fetchTikTok(query);
      if (!url) throw new Error("تعذر الحصول على رابط التحميل.");

      const tmpPath = path.join(TMP, `${Date.now()}.mp4`);
      const res     = await axios.get(url, { responseType: "arraybuffer", timeout: 30000 });
      fs.writeFileSync(tmpPath, Buffer.from(res.data));

      await api.setMessageReaction("✅", messageID, () => {}, true);
      const caption = [title && `🎬 ${title}`, author && `👤 @${author}`, views && `👁️ ${views}  ❤️ ${likes}`].filter(Boolean).join("\n");
      await api.sendMessage({ body: caption || "🎵 TikTok", attachment: fs.createReadStream(tmpPath) }, threadID);
      fs.remove(tmpPath).catch(() => {});
    } catch (e) {
      await api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply(`❌ ${e.message}`);
    }
  },
};
