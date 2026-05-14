/**
 * DAVID V1 — Keep Alive (Layer 13)
 * Copyright © DJAMEL
 */

"use strict";

const axios  = require("axios");
const fs     = require("fs-extra");
const path   = require("path");

let pingTimer = null;
let saveTimer = null;
let isSaving  = false;

function randMs(minM, maxM) {
  const lo = minM * 60_000, hi = maxM * 60_000;
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function log(level, msg) {
  const l = global.utils?.log;
  if (level === "info") return l?.info("KEEP_ALIVE", msg);
  if (level === "warn") return l?.warn("KEEP_ALIVE", msg);
  if (level === "err")  return l?.err ("KEEP_ALIVE", msg);
}

async function doPing() {
  try {
    const api = global.GoatBot?.fcaApi;
    if (!api) return;
    const appState = api.getAppState?.();
    if (!appState?.length) return;
    const cookieStr = appState.map(c => `${c.key}=${c.value}`).join("; ");
    const ua = global.utils?.stealth?.getCurrentUA?.() || "Mozilla/5.0";
    await axios.get("https://www.facebook.com/", {
      headers: { cookie: cookieStr, "User-Agent": ua },
      timeout: 10_000,
    });
    log("info", "Keep-alive ping OK");
  } catch (_) {}
}

async function doSave() {
  if (isSaving) return;
  isSaving = true;
  try {
    const api = global.GoatBot?.fcaApi;
    if (!api) return;
    const appState = api.getAppState?.();
    if (!appState?.length) return;
    const accountPath = path.join(process.cwd(), "account.txt");
    fs.writeFileSync(accountPath, JSON.stringify(appState, null, 2));
    log("info", "Cookie auto-saved");
  } catch (e) {
    log("err", `Cookie save error: ${e.message}`);
  } finally {
    isSaving = false;
  }
}

function schedulePing() {
  clearTimeout(pingTimer);
  pingTimer = setTimeout(async () => {
    await doPing();
    schedulePing();
  }, randMs(20, 40));
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await doSave();
    scheduleSave();
  }, randMs(25, 50));
}

module.exports = {
  start() {
    log("info", "Keep-alive system started");
    schedulePing();
    scheduleSave();
  },
  stop() {
    clearTimeout(pingTimer);
    clearTimeout(saveTimer);
    log("info", "Keep-alive stopped");
  },
};
