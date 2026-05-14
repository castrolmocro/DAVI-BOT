/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           DJAMEL-FCA — Facebook Client Abstractions             ║
 * ║           Copyright © 2025 DJAMEL — All rights reserved        ║
 * ║           Built exclusively for DAVID V1 Bot Engine             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * مكتبة مخصصة تُغلّف @dongdev/fca-unofficial وتضيف:
 *  ✦ دعم كوكيز c3c, JSON Array, Netscape, Header String
 *  ✦ تحقق تلقائي من صحة الجلسة عبر mbasic.facebook.com
 *  ✦ محاكاة سلوك بشري (تأخير كتابة ذكي + مؤشر typing)
 *  ✦ تدوير User-Agent تلقائي من pool واقعي
 *  ✦ ضغط وإزالة تكرار الكوكيز تلقائياً
 *  ✦ sendMessageHuman — إرسال مع تأخير بشري تلقائي
 *  ✦ معالجة أخطاء شاملة مع retry
 */
"use strict";

const loginFCA = require("@dongdev/fca-unofficial");
const axios    = require("axios");

// ─── User-Agent Pool ─────────────────────────────────────────────────────────
const UA_POOL = [
  "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11; Redmi Note 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; OnePlus 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
];
let _uaIdx = Math.floor(Math.random() * UA_POOL.length);
function getUA() { _uaIdx = (_uaIdx + 1) % UA_POOL.length; return UA_POOL[_uaIdx]; }

// ─── Cookie Parsers ──────────────────────────────────────────────────────────

function parseCookieInput(raw) {
  if (!raw || typeof raw !== "string") return { cookies: [], raw: "" };
  const text = raw.trim();

  // 1. JSON Array (standard AppState)
  if (text.startsWith("[")) {
    try {
      const arr = JSON.parse(text);
      if (Array.isArray(arr) && arr.length && arr[0]?.key)
        return { cookies: deduplicateCookies(arr), raw: text };
    } catch (_) {}
  }

  // 2. JSON Object — c3c format: { cookies: [{name, value, domain...}] }
  if (text.startsWith("{")) {
    try {
      const obj = JSON.parse(text);
      if (Array.isArray(obj.cookies)) {
        const mapped = obj.cookies.map(c => ({
          key:      c.name  || c.key  || "",
          value:    c.value || "",
          domain:   c.domain   || ".facebook.com",
          path:     c.path     || "/",
          secure:   c.secure   ?? true,
          httpOnly: c.httpOnly ?? false,
          sameSite: c.sameSite || "None",
        })).filter(c => c.key);
        return { cookies: deduplicateCookies(mapped), raw: text };
      }
    } catch (_) {}
  }

  // 3. Netscape / Header String: key=value; key2=value2
  if (text.includes("=")) {
    const pairs  = text.split(/;\s*/g).filter(Boolean);
    const mapped = pairs.map(p => {
      const i = p.indexOf("=");
      if (i === -1) return null;
      return { key: p.slice(0, i).trim(), value: p.slice(i + 1).trim(),
               domain: ".facebook.com", path: "/", secure: true, httpOnly: false, sameSite: "None" };
    }).filter(Boolean);
    if (mapped.length) return { cookies: deduplicateCookies(mapped), raw: text };
  }

  return { cookies: [], raw: text };
}

function deduplicateCookies(cookies) {
  const seen = new Map();
  for (const c of cookies) { if (c.key) seen.set(c.key, c); }
  return [...seen.values()];
}

function cookiesToString(cookies) {
  return cookies.map(c => `${c.key}=${c.value}`).join("; ");
}

function hasMandatory(cookies) {
  const keys = new Set(cookies.map(c => c.key));
  return keys.has("c_user") && keys.has("xs");
}

// ─── Cookie Validator ────────────────────────────────────────────────────────

async function checkLiveCookie(cookieStr, ua) {
  try {
    const res = await axios.get("https://mbasic.facebook.com/settings", {
      headers: {
        cookie: cookieStr, "user-agent": ua || getUA(),
        accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "accept-language": "ar,en-US;q=0.9,en;q=0.8",
        "sec-fetch-dest": "document", "sec-fetch-mode": "navigate",
        "upgrade-insecure-requests": "1",
      },
      timeout: 12000, validateStatus: null, maxRedirects: 3,
    });
    const b = String(res.data || "");
    return b.includes("/notifications.php?") || b.includes("/privacy/xcs/") ||
           b.includes("save-password") || b.includes("logout");
  } catch (_) { return false; }
}

// ─── Human Behavior ──────────────────────────────────────────────────────────

function calcTypingDelay(text) {
  const len = String(text || "").replace(/<[^>]*>/g, "").length;
  const wpm = 200 + Math.floor(Math.random() * 100);
  const base = Math.round((len / (wpm * 5 / 60)) * 1000);
  return Math.min(Math.max(base + (Math.random() - 0.5) * 600, 700), 8000);
}

async function simulateTyping(api, threadID, ms) {
  try {
    if (typeof api?.sendTypingIndicator === "function") {
      const stop = api.sendTypingIndicator(threadID, () => {});
      await new Promise(r => setTimeout(r, ms ?? 1500));
      if (typeof stop === "function") stop();
    } else {
      await new Promise(r => setTimeout(r, ms ?? 1500));
    }
  } catch (_) { await new Promise(r => setTimeout(r, ms ?? 1500)); }
}

// ─── Main Login Function ──────────────────────────────────────────────────────

function login(cookieInput, opts, callback) {
  if (typeof opts === "function") { callback = opts; opts = {}; }
  opts = opts || {};

  const UA = opts.userAgent || getUA();
  let appState;

  if (Array.isArray(cookieInput)) {
    appState = deduplicateCookies(cookieInput);
  } else {
    const parsed = parseCookieInput(String(cookieInput || ""));
    appState = parsed.cookies;
  }

  if (!appState.length)
    return callback(new Error("[Djamel-fca] لا توجد كوكيز صالحة في المدخل"), null);
  if (!hasMandatory(appState))
    return callback(new Error("[Djamel-fca] الكوكيز ناقصة: يجب أن تحتوي c_user و xs"), null);

  const loginOptions = {
    appState, forceLogin: false, logLevel: "silent",
    listenEvents: true, selfListen: false, autoReconnect: false,
    autoMarkDelivery: false, autoMarkRead: false, userAgent: UA,
    ...(opts.fca || {}),
  };

  loginFCA(loginOptions, (err, api) => {
    if (err) return callback(err, null);

    // ── تحسينات API ──────────────────────────────────────────────────────────
    api.setOptions({ listenEvents: true, selfListen: false, autoReconnect: false, userAgent: UA });
    api.getUID = () => api.getCurrentUserID();

    // إرسال مع تأخير بشري
    api.sendMessageHuman = async (msg, tid, cb) => {
      const delay = calcTypingDelay(typeof msg === "string" ? msg : msg?.body || "");
      await simulateTyping(api, tid, delay);
      return api.sendMessage(msg, tid, cb);
    };

    // Helper: reply wrapper compatible with GoatBot's message.reply()
    api.buildMessageReply = (event) => ({
      reply:    async (msg, cb) => api.sendMessageHuman(msg, event.threadID, cb),
      unsend:   (mid, cb)      => api.unsendMessage(mid, cb),
      react:    (emoji, mid, cb) => api.setMessageReaction(emoji, mid || event.messageID, cb, true),
    });

    // تحديث AppState بعد تسجيل الدخول
    let freshState = appState;
    try { freshState = deduplicateCookies(api.getAppState() || []); } catch (_) {}

    callback(null, api, { appState: freshState, ua: UA, calcTypingDelay, simulateTyping });
  });
}

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports              = login;
module.exports.login        = login;
module.exports.parseCookieInput   = parseCookieInput;
module.exports.deduplicateCookies = deduplicateCookies;
module.exports.cookiesToString    = cookiesToString;
module.exports.hasMandatory       = hasMandatory;
module.exports.checkLiveCookie    = checkLiveCookie;
module.exports.getUA              = getUA;
module.exports.calcTypingDelay    = calcTypingDelay;
module.exports.simulateTyping     = simulateTyping;
module.exports.version            = "2.0.0";
module.exports.author             = "DJAMEL";
