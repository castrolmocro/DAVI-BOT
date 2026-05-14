/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║        Djamel-fca — Facebook Client Abstractions        ║
 * ║        A مكاتب (library) for DAVID V1                  ║
 * ║        Copyright © DJAMEL — All rights reserved        ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * This library provides high-level abstractions over the fca-eryxenx
 * (Facebook Client API) for use with DAVID V1 bot engine.
 *
 * Features:
 *  - Human-like message sending with typing simulation
 *  - Cookie management & validation utilities
 *  - Message queue with rate limiting
 *  - Thread & user info helpers
 *  - Safe wrappers for common FCA operations
 */

"use strict";

// ─── Human-like send ─────────────────────────────────────────────────────────

/**
 * Send a message with human-like delay and typing indicator.
 * @param {object} api   - FCA API instance
 * @param {string} msg   - Message to send (string or object)
 * @param {string} tid   - Thread ID
 * @param {string} [mid] - Message ID to reply to (optional)
 */
async function humanSend(api, msg, tid, mid) {
  const body   = typeof msg === "string" ? msg : msg?.body || "";
  const delay  = calcDelay(body);

  // Typing indicator
  try {
    const stop = api.sendTypingIndicator?.(tid);
    await sleep(delay);
    if (typeof stop === "function") stop();
  } catch (_) {
    await sleep(delay);
  }

  // Add jitter before sending
  await sleep(randInt(150, 600));

  return new Promise((res, rej) => {
    const cb = (err, info) => err ? rej(err) : res(info);
    if (mid) api.sendMessage(msg, tid, cb, mid);
    else     api.sendMessage(msg, tid, cb);
  });
}

/**
 * Calculate realistic typing delay based on message length.
 */
function calcDelay(text) {
  if (!text || typeof text !== "string") return 1_200;
  const base   = Math.min(Math.max(text.length * 52, 1_000), 7_000);
  const jitter = randInt(-250, 250);
  return base + jitter;
}

// ─── Cookie utilities ─────────────────────────────────────────────────────────

/**
 * Convert appState array to cookie string format.
 */
function appStateToCookieString(appState) {
  if (!Array.isArray(appState)) return "";
  return appState.map(c => `${c.key}=${c.value}`).join("; ");
}

/**
 * Parse a cookie string into a basic appState array.
 */
function cookieStringToAppState(cookieStr) {
  return cookieStr.split(";").map(pair => {
    const [key, ...rest] = pair.trim().split("=");
    return {
      key:    key.trim(),
      value:  rest.join("=").trim(),
      domain: ".facebook.com",
      path:   "/",
    };
  }).filter(c => c.key);
}

/**
 * Check if an appState has the required Facebook cookies.
 */
function isValidAppState(appState) {
  if (!Array.isArray(appState) || appState.length === 0) return false;
  const required = ["c_user", "xs"];
  const keys = appState.map(c => c.key);
  return required.every(k => keys.includes(k));
}

// ─── Thread helpers ───────────────────────────────────────────────────────────

/**
 * Get thread info as a promise.
 */
function getThreadInfoAsync(api, threadID) {
  return new Promise((res, rej) =>
    api.getThreadInfo(threadID, (err, data) => err ? rej(err) : res(data))
  );
}

/**
 * Get user info as a promise.
 */
function getUserInfoAsync(api, userID) {
  return new Promise((res, rej) =>
    api.getUserInfo(userID, (err, data) => err ? rej(err) : res(data?.[userID] || null))
  );
}

/**
 * Set group title as a promise.
 */
function setTitleAsync(api, title, threadID) {
  return new Promise((res, rej) =>
    api.setTitle(title, threadID, (err) => err ? rej(err) : res())
  );
}

/**
 * Change nickname as a promise.
 */
function changeNicknameAsync(api, nickname, threadID, participantID) {
  return new Promise((res, rej) =>
    api.changeNickname(nickname, threadID, participantID, (err) => err ? rej(err) : res())
  );
}

// ─── Message queue ────────────────────────────────────────────────────────────

class MessageQueue {
  constructor(minGap = 700, maxGap = 2_500) {
    this._queue   = [];
    this._running = false;
    this._minGap  = minGap;
    this._maxGap  = maxGap;
  }

  enqueue(fn) {
    return new Promise((resolve, reject) => {
      this._queue.push({ fn, resolve, reject });
      if (!this._running) this._process();
    });
  }

  async _process() {
    this._running = true;
    while (this._queue.length > 0) {
      const { fn, resolve, reject } = this._queue.shift();
      const gap = randInt(this._minGap, this._maxGap);
      await sleep(gap);
      try { resolve(await fn()); } catch (e) { reject(e); }
    }
    this._running = false;
  }

  get length() { return this._queue.length; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  // Human-like messaging
  humanSend,
  calcDelay,

  // Cookie utilities
  appStateToCookieString,
  cookieStringToAppState,
  isValidAppState,

  // Thread/User helpers
  getThreadInfoAsync,
  getUserInfoAsync,
  setTitleAsync,
  changeNicknameAsync,

  // Message queue
  MessageQueue,

  // Primitives
  sleep,
  randInt,

  // Metadata
  version: "1.0.0",
  author:  "DJAMEL",
  name:    "Djamel-fca",
};
