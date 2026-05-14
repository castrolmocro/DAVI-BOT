/**
 * DAVID V1 — Keep Alive System
 * Copyright © 2025 DJAMEL
 * يحافظ على الجلسة نشطة عبر ping دوري لـ mbasic.facebook.com
 */
"use strict";
const axios = require("axios");

let _timer = null;
const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;

async function doPing() {
  const api = global.GoatBot?.fcaApi;
  if (!api) return;
  try {
    const state = api.getAppState();
    if (!state?.length) return;
    const ck = state.map(c=>`${c.key}=${c.value}`).join("; ");
    let ua;
    try { ua = require("./stealth").getCurrentUA(); } catch(_) {}
    ua = ua || global.GoatBot?.config?.facebookAccount?.userAgent || "Mozilla/5.0";

    const res = await axios.head("https://mbasic.facebook.com/", {
      headers: { cookie: ck, "user-agent": ua, "accept": "text/html,*/*;q=0.8" },
      timeout: 10000, validateStatus: null, maxRedirects: 2,
    });

    if (res.status === 302 || String(res.headers?.location||"").includes("login")) {
      global.log?.warn?.("KEEP_ALIVE", "⚠️ Session expired");
      global.statusAccountBot = "session_expired";
    }
  } catch (_) {}
}

function start() {
  if (_timer) return;
  const cfg    = global.GoatBot?.config?.keepAlive || {};
  if (cfg.enable === false) return;
  const minMs  = (cfg.pingIntervalMinMinutes || 8)  * 60000;
  const maxMs  = (cfg.pingIntervalMaxMinutes || 15) * 60000;
  function schedule() {
    _timer = setTimeout(async () => {
      await doPing();
      schedule();
    }, rand(minMs, maxMs));
  }
  schedule();
}

function stop() { if (_timer) { clearTimeout(_timer); _timer = null; } }

module.exports = { start, stop };
