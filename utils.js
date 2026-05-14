/**
 * DAVID V1 — Global Utilities
 * Copyright © DJAMEL
 */

"use strict";

const moment  = require("moment-timezone");
const log     = require("./logger/log.js");
const loading = require("./logger/loading.js");
const stealth = require("./bot/stealth/index.js");
const getText = require("./languages/makeFuncGetLangs.js");
const { colors, isHexColor } = require("./func/colors.js");

function isNumber(v) {
  return typeof v === "number" && !isNaN(v);
}

function randomString(len = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < len; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function convertTime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  return `${d}d ${h}h ${m}m ${sc}s`;
}

function getPrefix(threadID) {
  return global.GoatBot?.config?.prefix || "/";
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function removeHomeDir(str) {
  const home = process.env.HOME || "";
  return home ? str.replace(new RegExp(home, "g"), "~") : str;
}

function createOraDots(text) {
  return loading(text);
}

function jsonStringifyColor(obj) {
  return colors.cyan(JSON.stringify(obj, null, 2));
}

module.exports = {
  log,
  loading,
  colors,
  isHexColor,
  isNumber,
  randomString,
  convertTime,
  getPrefix,
  sleep,
  formatBytes,
  removeHomeDir,
  createOraDots,
  jsonStringifyColor,
  getText,
  stealth,

  // Human-typing delay calculation
  calcHumanTypingDelay: (text) => stealth.calcHumanTypingDelay(text),
  simulateTyping:       (...args) => stealth.simulateTyping(...args),
  actionJitter:         () => stealth.actionJitter(),

  message: function (api) {
    return {
      reply:  (msg, threadID, msgID) => api.sendMessage(msg, threadID, msgID),
      send:   (msg, threadID)        => api.sendMessage(msg, threadID),
      react:  (emoji, msgID)         => api.setMessageReaction(emoji, msgID, () => {}, true),
      unsend: (msgID)                => api.unsendMessage(msgID),
    };
  },
};
