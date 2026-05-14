/**
 * ══════════════════════════════════════════════════════════════
 *  DAVID V1 — STEALTH ENGINE  v2 — Human Camouflage System
 *  Copyright © DJAMEL
 * ══════════════════════════════════════════════════════════════
 *
 * 20 Layers of protection — Bot Stealth Layers:
 *  Layer  1 — Presence Cycling
 *  Layer  2 — Human Page Browsing (real browser headers)
 *  Layer  3 — Message Read Simulation
 *  Layer  4 — Sleep Mode (01:00–08:00)
 *  Layer  5 — User-Agent Rotation
 *  Layer  6 — Rate Limiting (rateLimit.js)
 *  Layer  7 — Outgoing Throttle (outgoingThrottle.js)
 *  Layer  8 — HTTP Request Fingerprinting
 *  Layer  9 — Warmup Mode (first 15 min minimal activity)
 *  Layer 10 — Typing Indicator before replies
 *  Layer 11 — Action Jitter (random micro-delays)
 *  Layer 12 — MQTT Health Check
 *  Layer 13 — Auto Keep-Alive ping
 *  Layer 14 — Cookie Freshness Check
 *  Layer 15 — Auto Re-login on cookie expiry
 *  Layer 16 — Anti-Flood protection
 *  Layer 17 — Anti-Spam protection
 *  Layer 18 — DM Lock (block non-admins in DMs)
 *  Layer 19 — Anti-Impersonation guard
 *  Layer 20 — Bot-Detection Evasion (random delays, natural patterns)
 */

"use strict";

const axios = require("axios");

let _running = false;
let _currentUA = "";

const UA_POOL = [
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11; OnePlus 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36",
];

function log(level, msg) {
  const l = global.utils?.log;
  if (level === "info") return l?.info("STEALTH", msg);
  if (level === "warn") return l?.warn("STEALTH", msg);
}

function randMs(minMin, maxMin) {
  const lo = minMin * 60_000;
  const hi = maxMin * 60_000;
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function localHour() {
  const tz = global.GoatBot?.config?.timeZone || "Africa/Algiers";
  try {
    return parseInt(
      new Date().toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false }), 10
    );
  } catch (_) {
    return new Date().getHours();
  }
}

function isSleepTime() {
  const cfg   = global.GoatBot?.config?.stealth;
  const start = cfg?.sleepHourStart ?? 1;
  const end   = cfg?.sleepHourEnd   ?? 8;
  const h     = localHour();
  return start <= end ? (h >= start && h < end) : (h >= start || h < end);
}

function pickUA() {
  _currentUA = UA_POOL[randInt(0, UA_POOL.length - 1)];
  return _currentUA;
}

// ─── Layer 1: Presence cycling ───────────────────────────────────────────────
async function cyclePresence(api) {
  try {
    const states = ["active", "idle"];
    const state  = states[randInt(0, 1)];
    if (typeof api?.setOptions === "function") {
      api.setOptions({ presence: state });
    }
  } catch (_) {}
}

// ─── Layer 2: Human page browsing ────────────────────────────────────────────
async function browseFacebook() {
  const pages = [
    "https://www.facebook.com/",
    "https://www.facebook.com/messages/",
    "https://mbasic.facebook.com/",
  ];
  const url = pages[randInt(0, pages.length - 1)];
  try {
    await axios.get(url, {
      headers: {
        "User-Agent": pickUA(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
      },
      timeout: 8_000,
    });
  } catch (_) {}
}

// ─── Layer 10: Typing indicator ──────────────────────────────────────────────
async function simulateTyping(api, threadID, delayMs) {
  try {
    if (typeof api?.sendTypingIndicator === "function") {
      const stop = api.sendTypingIndicator(threadID);
      await sleep(Math.min(delayMs || 1_500, 8_000));
      if (typeof stop === "function") stop();
    } else {
      await sleep(Math.min(delayMs || 1_500, 8_000));
    }
  } catch (_) {
    await sleep(1_000);
  }
}

// ─── Layer 11: Action jitter ─────────────────────────────────────────────────
function actionJitter() {
  return sleep(randInt(200, 900));
}

// ─── Calculate typing delay (human-like) ─────────────────────────────────────
function calcHumanTypingDelay(text) {
  if (typeof text !== "string") return 1_500;
  const base = Math.min(Math.max(text.length * 55, 1_200), 7_500);
  const jitter = randInt(-300, 300);
  return base + jitter;
}

// ─── Main stealth loop ───────────────────────────────────────────────────────
async function stealthLoop() {
  _running = true;
  log("info", "Human camouflage system active (20 layers)");

  const warmupEnd = Date.now() + 15 * 60_000;

  while (_running) {
    const api = global.GoatBot?.fcaApi;

    if (Date.now() < warmupEnd) {
      await sleep(randMs(3, 6));
      continue;
    }

    if (isSleepTime()) {
      log("info", "Sleep mode active — reduced activity");
      await sleep(randMs(8, 15));
      continue;
    }

    try {
      if (api) await cyclePresence(api);
      await sleep(randInt(2_000, 8_000));
      await browseFacebook();
      await sleep(randMs(4, 8));
    } catch (_) {
      await sleep(randMs(2, 4));
    }
  }
}

module.exports = {
  start:     ()               => { if (!_running) stealthLoop(); },
  stop:      ()               => { _running = false; },
  isRunning: ()               => _running,
  getCurrentUA: ()            => _currentUA || pickUA(),
  simulateTyping,
  calcHumanTypingDelay,
  actionJitter,
  isSleepTime,
  pickUA,
};
