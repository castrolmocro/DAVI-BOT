/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║     Djamel-fca — مكتبة Facebook Client Abstractions     ║
 * ║     المكتبة الرسمية للـ DAVID V1 — DjamelBot Engine    ║
 * ║     Copyright © DJAMEL — All rights reserved            ║
 * ╚══════════════════════════════════════════════════════════╝
 */

"use strict";

const rand  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const sleep = (ms)   => new Promise(r => setTimeout(r, ms));

/**
 * إرسال رسالة بتأخير بشري واقعي
 */
async function humanSend(api, msg, threadID, replyMID) {
  const body  = typeof msg === "string" ? msg : (msg?.body || "");
  const words = body.split(/\s+/).length;
  const delay = Math.min(Math.max(words * rand(55, 110), 900), 7000);

  try {
    const stop = api.sendTypingIndicator?.(threadID);
    await sleep(delay);
    if (typeof stop === "function") stop();
  } catch (_) { await sleep(delay); }

  await sleep(rand(150, 500));

  return new Promise((res, rej) => {
    const cb = (err, info) => err ? rej(err) : res(info);
    if (replyMID) api.sendMessage(msg, threadID, cb, replyMID);
    else          api.sendMessage(msg, threadID, cb);
  });
}

/** حساب التأخير البشري الواقعي */
function calcDelay(text) {
  if (!text || typeof text !== "string") return 1200;
  return Math.min(Math.max(text.length * 52, 1000), 7000) + rand(-300, 300);
}

/** تحويل appState إلى نص Cookie */
function appStateToCookieString(appState) {
  return Array.isArray(appState) ? appState.map(c => `${c.key}=${c.value}`).join("; ") : "";
}

/** التحقق من صحة appState */
function isValidAppState(appState) {
  if (!Array.isArray(appState) || !appState.length) return false;
  const keys = appState.map(c => c.key);
  return keys.includes("c_user") && keys.includes("xs");
}

/** جلب معلومات المحادثة */
function getThreadInfoAsync(api, threadID) {
  return new Promise((res, rej) => api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d)));
}

/** جلب معلومات المستخدم */
function getUserInfoAsync(api, userID) {
  return new Promise((res, rej) => api.getUserInfo(userID, (e, d) => e ? rej(e) : res(d?.[userID] || null)));
}

/** تغيير اسم المجموعة */
function setTitleAsync(api, title, threadID) {
  return new Promise((res, rej) => api.setTitle(title, threadID, e => e ? rej(e) : res()));
}

/** تغيير كنية العضو */
function changeNicknameAsync(api, nickname, threadID, participantID) {
  return new Promise((res, rej) => api.changeNickname(nickname, threadID, participantID, e => e ? rej(e) : res()));
}

/** طابور الرسائل مع rate limiting */
class MessageQueue {
  constructor(minGap = 700, maxGap = 2500) {
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
      await sleep(rand(this._minGap, this._maxGap));
      try { resolve(await fn()); } catch (e) { reject(e); }
    }
    this._running = false;
  }

  get length() { return this._queue.length; }
}

module.exports = {
  humanSend,
  calcDelay,
  appStateToCookieString,
  isValidAppState,
  getThreadInfoAsync,
  getUserInfoAsync,
  setTitleAsync,
  changeNicknameAsync,
  MessageQueue,
  sleep,
  rand,
  version: "1.0.0",
  author:  "DJAMEL",
  name:    "Djamel-fca",
};
