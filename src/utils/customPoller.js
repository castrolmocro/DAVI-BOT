/**
 * DAVID V1 — Custom HTTP Poller Fallback
 * Copyright © DJAMEL
 */

"use strict";

const chalk = require("chalk");
const moment = require("moment-timezone");
const ts = () => moment().tz(global.config?.timezone || "Africa/Algiers").format("HH:mm:ss");

let _timer = null, _running = false, _lastSeen = new Map(), _seenMsgIDs = new Set(), _startTs = 0, _failCount = 0;
const MAX_FAILS = 15;

function stopPoller() { if (_timer) { clearTimeout(_timer); _timer = null; } _running = false; }

function getThreadList(api) {
  return new Promise((res, rej) => {
    if (typeof api.getThreadList === "function") {
      api.getThreadList(20, null, ["INBOX"], (err, threads) => err ? rej(err) : res(threads || []));
    } else { rej(new Error("getThreadList not available")); }
  });
}

function getHistory(api, threadID, amount) {
  return new Promise((res, rej) => {
    if (typeof api.getThreadHistory === "function") {
      api.getThreadHistory(threadID, amount, undefined, (err, msgs) => err ? rej(err) : res(msgs || []));
    } else { rej(new Error("getThreadHistory not available")); }
  });
}

function buildEvent(msg, isGroup) {
  return { type: "message", senderID: String(msg.senderID || ""), body: msg.body || "", threadID: String(msg.threadID), messageID: msg.messageID, timestamp: msg.timestamp, attachments: msg.attachments || [], isGroup: !!isGroup, mentions: msg.mentions || {}, _poll: true };
}

async function pollOnce(api, eventHandler) {
  let threads;
  try { threads = await getThreadList(api); _failCount = 0; }
  catch (e) {
    _failCount++;
    if (_failCount % 5 === 1) console.log(`${chalk.gray(ts())} ${chalk.yellow("⚠")} poller (${_failCount}): ${String(e.message).slice(0, 60)}`);
    if (_failCount >= MAX_FAILS) { stopPoller(); setTimeout(() => { _running = false; }, 120000); }
    return;
  }

  for (const thread of threads) {
    const tid   = String(thread.threadID);
    const lastT = _lastSeen.get(tid) || _startTs;
    const threadTs = thread.timestamp ? parseInt(thread.timestamp) : 0;
    if (threadTs <= lastT) continue;
    const isGroup = !!(thread.isGroup || thread.threadName);
    let msgs; try { msgs = await getHistory(api, tid, 5); } catch { continue; }
    let maxTs = lastT;
    for (const msg of msgs) {
      const msgTs = parseInt(msg.timestamp) || 0;
      if (msgTs <= _startTs || msgTs <= lastT) continue;
      if (_seenMsgIDs.has(msg.messageID)) continue;
      if (String(msg.senderID) === api.getCurrentUserID()) continue;
      _seenMsgIDs.add(msg.messageID);
      if (maxTs < msgTs) maxTs = msgTs;
      try { await eventHandler(api, buildEvent(msg, isGroup), global.commands); } catch (_) {}
    }
    if (maxTs > lastT) _lastSeen.set(tid, maxTs);
  }
  if (_seenMsgIDs.size > 4000) { const arr = [..._seenMsgIDs]; _seenMsgIDs = new Set(arr.slice(-2000)); }
}

function scheduleNext(api, eventHandler, intervalMs) {
  if (!_running) return;
  _timer = setTimeout(async () => {
    await pollOnce(api, eventHandler);
    if (_running) scheduleNext(api, eventHandler, intervalMs);
  }, intervalMs);
}

function startPoller(api, eventHandler, intervalMs = 6000) {
  if (_running) stopPoller();
  _running = true;
  _startTs = Date.now();
  _failCount = 0;
  console.log(`${chalk.gray(ts())} ${chalk.cyan("•")} Custom Poller بدأ (كل ${intervalMs / 1000}s)`);
  scheduleNext(api, eventHandler, intervalMs);
}

module.exports = { startPoller, stopPoller };
