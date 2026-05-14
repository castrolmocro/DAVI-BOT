/**
 * DAVID V1 — Stealth System (Layer 1-5)
 * Copyright © DJAMEL
 */
"use strict";

const INTERVALS = [];
let _api = null;

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Layer 1: Presence cycling
function startPresenceCycle(api) {
  const iv = setInterval(() => {
    try {
      const hour = new Date().getHours();
      const cfg  = global.config?.stealth || {};
      const sleepStart = cfg.sleepStart ?? 1;
      const sleepEnd   = cfg.sleepEnd   ?? 7;
      if (hour >= sleepStart && hour < sleepEnd) return;
      const statuses = ["active", "idle"];
      const st = statuses[Math.floor(Math.random() * statuses.length)];
      if (api?.setPresenceStatus) api.setPresenceStatus(st);
    } catch (_) {}
  }, rand(8, 20) * 60_000);
  INTERVALS.push(iv);
}

// Layer 2: UA rotation
const UAS = [
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 11; Samsung SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.88 Mobile Safari/537.36",
];

// Layer 3: Sleep mode check
function isSleepMode() {
  const hour = new Date().getHours();
  const cfg  = global.config?.stealth || {};
  return hour >= (cfg.sleepStart ?? 1) && hour < (cfg.sleepEnd ?? 7);
}

// Layer 4: Warmup mode (first 15 minutes)
function isWarmup() {
  const startTime = global.djamelbot?.startTime || Date.now();
  return Date.now() - startTime < 15 * 60_000;
}

// Layer 5: Action jitter
async function actionJitter() {
  const ms = rand(150, 900);
  await sleep(ms);
}

// Layer 10: Typing delay calc
function calcHumanTypingDelay(text) {
  if (!text || typeof text !== "string") return 1200;
  const wpm     = rand(160, 300);
  const words   = text.split(/\s+/).length;
  const minutes = words / wpm;
  const ms      = Math.round(minutes * 60_000);
  const jitter  = rand(-400, 400);
  return Math.min(Math.max(ms + jitter, 800), 8000);
}

async function simulateTyping(api, threadID, delayMs) {
  try {
    const stop = api.sendTypingIndicator?.(threadID);
    await sleep(delayMs || 1500);
    if (typeof stop === "function") stop();
  } catch (_) { await sleep(delayMs || 1500); }
}

module.exports = {
  start(api) {
    _api = api;
    if (!global.config?.stealth?.enable) return;
    startPresenceCycle(api);
  },
  stop() {
    for (const iv of INTERVALS) clearInterval(iv);
    INTERVALS.length = 0;
    _api = null;
  },
  isSleepMode,
  isWarmup,
  actionJitter,
  calcHumanTypingDelay,
  simulateTyping,
  randomUA: () => UAS[rand(0, UAS.length - 1)],
};
