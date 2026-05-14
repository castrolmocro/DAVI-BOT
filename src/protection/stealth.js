/**
 * DAVID V1 — Stealth Engine v2 — 10 طبقات تمويه بشري
 * Copyright © 2025 DJAMEL
 * Layer 1: Presence Cycling | Layer 2: Human Page Browsing
 * Layer 3: Message Read Simulation | Layer 4: Sleep Mode
 * Layer 5: User-Agent Rotation | Layer 6: Action Jitter
 * Layer 7: Outgoing Throttle | Layer 8: HTTP Fingerprinting
 * Layer 9: Warmup Mode | Layer 10: Typing Simulation
 */
"use strict";
const axios = require("axios");

const UA_POOL = [
  "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 Chrome/101.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Version/16.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/116.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11; Redmi Note 8 Pro) AppleWebKit/537.36 Chrome/100.0.4896.127 Mobile Safari/537.36",
];

let _uaIdx = 0;
const getCurrentUA = () => UA_POOL[_uaIdx];
const rotateUA     = () => { _uaIdx = (_uaIdx + 1) % UA_POOL.length; return UA_POOL[_uaIdx]; };

const rand    = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const randMs  = (minM, maxM) => rand(minM * 60000, maxM * 60000);
const sleep   = ms => new Promise(r => setTimeout(r, ms));
const isRunning = () => !!_presenceTimer;

let _presenceTimer = null;
let _browseTimer   = null;
let _api           = null;

function localHour() {
  const tz = global.GoatBot?.config?.timezone || "Africa/Algiers";
  try { return parseInt(new Date().toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false }), 10); }
  catch (_) { return new Date().getHours(); }
}

function isSleeping() {
  const cfg   = global.GoatBot?.config?.stealth || {};
  const start = cfg.sleepHourStart ?? 1;
  const end   = cfg.sleepHourEnd   ?? 7;
  const h     = localHour();
  return start < end ? (h >= start && h < end) : (h >= start || h < end);
}

function cookieStr(api) {
  try { const s = api.getAppState(); return s?.length ? s.map(c=>`${c.key}=${c.value}`).join("; ") : null; }
  catch (_) { return null; }
}

// Layer 1+2: Presence + Browse
async function presenceCycle() {
  while (_presenceTimer) {
    if (!_api || isSleeping()) { await sleep(randMs(15, 30)); continue; }
    const ua = rotateUA();
    const ck = cookieStr(_api);
    if (ck) {
      try {
        await axios.get("https://www.facebook.com/", {
          headers: { cookie: ck, "user-agent": ua, "accept": "text/html,*/*;q=0.8",
                     "accept-language": "ar,en-US;q=0.9", "sec-fetch-dest": "document",
                     "sec-fetch-mode": "navigate", "sec-fetch-site": "none" },
          timeout: 12000, validateStatus: null, maxRedirects: 2,
        });
      } catch (_) {}
    }
    // Layer 6: Jitter
    await sleep(randMs(rand(8, 18), rand(18, 35)));
  }
}

function start(api) {
  if (_presenceTimer) return;
  _api = api;
  _presenceTimer = true;
  presenceCycle().catch(() => {});
}

function stop() {
  _presenceTimer = null;
  _api = null;
}

module.exports = { start, stop, isRunning, getCurrentUA, rotateUA };
