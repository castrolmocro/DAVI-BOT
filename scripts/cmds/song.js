/**
 * DAVID V1 — /song command
 * Search and send songs from YouTube
 * Copyright © DJAMEL
 */

"use strict";

const axios  = require("axios");
const fs     = require("fs-extra");
const path   = require("path");
const os     = require("os");
const yts    = require("yt-search");

const TMP_DIR = path.join(os.tmpdir(), "david_songs");
fs.ensureDirSync(TMP_DIR);

function isBotAdmin(uid) {
  return (global.GoatBot?.config?.adminBot || []).map(String).includes(String(uid));
}

// Multiple API fallbacks for audio download
const AUDIO_APIS = [
  async (url) => {
    const r = await axios.get(`https://api.fabdl.com/youtube/get?url=${encodeURIComponent(url)}`, { timeout: 20_000 });
    if (r.data?.audio) return r.data.audio;
    return null;
  },
  async (url) => {
    const r = await axios.get(`https://yt-download.vercel.app/api/button/mp3?url=${encodeURIComponent(url)}`, { timeout: 20_000 });
    if (r.data?.downloadUrl) return r.data.downloadUrl;
    return null;
  },
];

async function getAudioUrl(videoUrl) {
  for (const api of AUDIO_APIS) {
    try {
      const url = await api(videoUrl);
      if (url) return url;
    } catch (_) {}
  }
  return null;
}

module.exports = {
  config: {
    name:      "song",
    aliases:   ["music", "play", "sing"],
    version:   "1.0.0",
    author:    "DJAMEL",
    countDown: 15,
    role:      2,
    category:  "media",
    shortDescription: "Search and download songs",
    longDescription:  "Search YouTube and send a song as audio.\nUsage: /song [song name or URL]",
    guide: "{p}song [song name]\n{p}song [YouTube URL]",
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID, senderID } = event;

    if (!isBotAdmin(senderID)) {
      return message.reply("⛔ Only bot admins can use this command.");
    }

    const query = args.join(" ").trim();
    if (!query) return message.reply("🎵 Please provide a song name or YouTube URL.\nUsage: /song [name]");

    await api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      let videoUrl = query;
      let title    = query;
      let duration = "";

      if (!query.startsWith("http")) {
        const results = await yts(query);
        const video   = results?.videos?.[0];
        if (!video) throw new Error("No results found for that song.");
        videoUrl = video.url;
        title    = video.title;
        duration = video.duration?.timestamp || "";
      }

      const audioUrl = await getAudioUrl(videoUrl);
      if (!audioUrl) throw new Error("Could not fetch audio. Please try a different song.");

      const tmpPath = path.join(TMP_DIR, `${Date.now()}.mp3`);
      const resp    = await axios.get(audioUrl, { responseType: "arraybuffer", timeout: 30_000 });
      fs.writeFileSync(tmpPath, Buffer.from(resp.data));

      await api.setMessageReaction("✅", messageID, () => {}, true);

      await api.sendMessage(
        {
          body:        `🎵 ${title}${duration ? `\n⏱ Duration: ${duration}` : ""}`,
          attachment:  fs.createReadStream(tmpPath),
        },
        threadID
      );

      fs.remove(tmpPath).catch(() => {});
    } catch (e) {
      await api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply(`❌ Error: ${e.message}`);
    }
  },
};
