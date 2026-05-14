/**
 * DAVID V1 — /tik command
 * Search and download TikTok videos (no watermark)
 * Copyright © DJAMEL
 */

"use strict";

const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");

const TMP_DIR     = path.join(os.tmpdir(), "david_tiktok");
const SEARCH_API  = "https://www.tikwm.com/api/feed/search";
const DETAIL_API  = "https://www.tikwm.com/api/";

fs.ensureDirSync(TMP_DIR);

function isBotAdmin(uid) {
  return (global.GoatBot?.config?.adminBot || []).map(String).includes(String(uid));
}

function formatNum(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

async function searchTikTok(query) {
  const r = await axios.get(SEARCH_API, {
    params: { keywords: query, count: 5, cursor: 0 },
    timeout: 15_000,
  });
  return r.data?.data?.videos || [];
}

async function getVideoNoWatermark(videoId) {
  const r = await axios.get(DETAIL_API, {
    params: { url: `https://www.tiktok.com/@x/video/${videoId}`, hd: 1 },
    timeout: 15_000,
  });
  return r.data?.data?.play || r.data?.data?.wmplay || null;
}

async function downloadVideo(url, dest) {
  const r = await axios.get(url, { responseType: "arraybuffer", timeout: 30_000 });
  fs.writeFileSync(dest, Buffer.from(r.data));
  return dest;
}

module.exports = {
  config: {
    name:      "tik",
    aliases:   ["tiktok", "tt"],
    version:   "1.0.0",
    author:    "DJAMEL",
    countDown: 15,
    role:      2,
    category:  "media",
    shortDescription: "Search and download TikTok videos",
    longDescription:  "Search TikTok and send a video without watermark.\nUsage: /tik [search query or URL]",
    guide: "{p}tik [search query]\n{p}tik [TikTok URL]",
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID, senderID } = event;

    if (!isBotAdmin(senderID)) {
      return message.reply("⛔ Only bot admins can use this command.");
    }

    const query = args.join(" ").trim();
    if (!query) return message.reply("🎵 Please provide a search query or TikTok URL.\nUsage: /tik [query]");

    await api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      let videoUrl  = null;
      let title     = "";
      let author    = "";
      let views     = "";
      let likes     = "";

      if (query.includes("tiktok.com")) {
        // Direct URL
        const r = await axios.get(DETAIL_API, {
          params: { url: query, hd: 1 },
          timeout: 15_000,
        });
        const data = r.data?.data;
        if (!data) throw new Error("Could not fetch that TikTok URL.");
        videoUrl = data.play || data.wmplay;
        title    = data.title || "";
        author   = data.author?.nickname || "";
        views    = formatNum(data.play_count);
        likes    = formatNum(data.digg_count);
      } else {
        // Search
        const videos = await searchTikTok(query);
        if (!videos.length) throw new Error("No TikTok videos found.");
        const video = videos[0];
        const dl    = await getVideoNoWatermark(video.video_id);
        videoUrl    = dl || video.play;
        title       = video.title || "";
        author      = video.author?.nickname || "";
        views       = formatNum(video.play_count);
        likes       = formatNum(video.digg_count);
      }

      if (!videoUrl) throw new Error("Could not get video download URL.");

      const tmpPath = path.join(TMP_DIR, `${Date.now()}.mp4`);
      await downloadVideo(videoUrl, tmpPath);

      await api.setMessageReaction("✅", messageID, () => {}, true);

      const caption = [
        title   ? `🎬 ${title}` : null,
        author  ? `👤 @${author}` : null,
        views   ? `👁️ ${views} views  ❤️ ${likes} likes` : null,
      ].filter(Boolean).join("\n");

      await api.sendMessage(
        { body: caption || "🎵 Here's your TikTok!", attachment: fs.createReadStream(tmpPath) },
        threadID
      );

      fs.remove(tmpPath).catch(() => {});
    } catch (e) {
      await api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply(`❌ Error: ${e.message}`);
    }
  },
};
