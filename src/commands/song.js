/**
 * DAVID V1 — /song
 * Copyright © DJAMEL
 */
"use strict";

const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");
const yts   = require("yt-search");

const TMP = path.join(os.tmpdir(), "david_song");
fs.ensureDirSync(TMP);

async function getAudioUrl(videoUrl) {
  const apis = [
    async (u) => {
      const r = await axios.get(`https://api.fabdl.com/youtube/get?url=${encodeURIComponent(u)}`, { timeout: 20000 });
      return r.data?.audio || null;
    },
    async (u) => {
      const r = await axios.get(`https://yt-download.vercel.app/api/button/mp3?url=${encodeURIComponent(u)}`, { timeout: 20000 });
      return r.data?.downloadUrl || null;
    },
    async (u) => {
      const r = await axios.get(`https://api.vevioz.com/@api/button/mp3/${encodeURIComponent(u)}`, { timeout: 20000 });
      return r.data?.url || null;
    },
  ];
  for (const fn of apis) {
    try { const url = await fn(videoUrl); if (url) return url; } catch (_) {}
  }
  return null;
}

module.exports = {
  config: { name: "song", aliases: ["music", "play"], category: "media" },
  async execute({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const query = args.join(" ").trim();
    if (!query) return message.reply("🎵 اكتب اسم الأغنية.\nمثال: /song اسم الأغنية");

    await api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      let videoUrl = query, title = query, duration = "";
      if (!query.startsWith("http")) {
        const results = await yts(query);
        const video   = results?.videos?.[0];
        if (!video) throw new Error("لم يتم العثور على نتائج.");
        videoUrl = video.url; title = video.title; duration = video.duration?.timestamp || "";
      }

      const audioUrl = await getAudioUrl(videoUrl);
      if (!audioUrl) throw new Error("تعذر الحصول على الصوت. جرب أغنية أخرى.");

      const tmpPath = path.join(TMP, `${Date.now()}.mp3`);
      const resp    = await axios.get(audioUrl, { responseType: "arraybuffer", timeout: 30000 });
      fs.writeFileSync(tmpPath, Buffer.from(resp.data));

      await api.setMessageReaction("✅", messageID, () => {}, true);
      await api.sendMessage({ body: `🎵 ${title}${duration ? `\n⏱ ${duration}` : ""}`, attachment: fs.createReadStream(tmpPath) }, threadID);
      fs.remove(tmpPath).catch(() => {});
    } catch (e) {
      await api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply(`❌ ${e.message}`);
    }
  },
};
