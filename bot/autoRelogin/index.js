/**
 * DAVID V1 — Auto Re-Login (Layer 15)
 * Copyright © DJAMEL
 */

"use strict";

const login      = require("fca-eryxenx");
const fs         = require("fs-extra");
const path       = require("path");

const COOLDOWN_MS      = 3 * 60_000;
const MAX_RETRIES      = 3;
const RESTART_DELAY_MS = 3_000;

let lastAttempt  = 0;
let retryCount   = 0;
let isAttempting = false;

function log(level, msg) {
  try {
    const logger = global.utils?.log;
    if (level === "info")  return logger?.info ("AUTO_RELOGIN", msg);
    if (level === "warn")  return logger?.warn ("AUTO_RELOGIN", msg);
    if (level === "error") return logger?.err  ("AUTO_RELOGIN", msg);
  } catch (_) {}
  console.log("[AUTO_RELOGIN]", msg);
}

function notifyAdmins(api, message) {
  try {
    const admins = global.GoatBot?.config?.adminBot || [];
    for (const adminID of admins) {
      api.sendMessage(message, String(adminID)).catch(() => {});
    }
  } catch (_) {}
}

module.exports = async function autoRelogin(api) {
  const now = Date.now();
  if (isAttempting || now - lastAttempt < COOLDOWN_MS) return;
  if (retryCount >= MAX_RETRIES) {
    log("error", `Max retries (${MAX_RETRIES}) reached. Giving up.`);
    return;
  }

  isAttempting = true;
  lastAttempt  = now;
  retryCount++;

  log("warn", `Cookie expired — attempting re-login (attempt ${retryCount}/${MAX_RETRIES})`);
  notifyAdmins(api, `⚠️ DAVID V1: Cookie expired, attempting re-login (${retryCount}/${MAX_RETRIES})...`);

  try {
    const cfg   = global.GoatBot?.config?.facebookAccount;
    if (!cfg?.email || !cfg?.password) {
      log("error", "No email/password in config. Cannot re-login.");
      return;
    }

    const newAppState = await new Promise((resolve, reject) => {
      login({ email: cfg.email, password: cfg.password }, (err, newApi) => {
        if (err) return reject(err);
        resolve(newApi.getAppState());
      });
    });

    const accountPath = path.join(process.cwd(), "account.txt");
    fs.writeFileSync(accountPath, JSON.stringify(newAppState, null, 2));
    log("info", "Re-login successful. Cookie saved. Restarting bot...");
    notifyAdmins(api, "✅ DAVID V1: Re-login successful! Bot restarting...");

    setTimeout(() => process.exit(0), RESTART_DELAY_MS);
  } catch (e) {
    log("error", `Re-login failed: ${e.message}`);
    notifyAdmins(api, `❌ DAVID V1: Re-login failed — ${e.message}`);
  } finally {
    isAttempting = false;
  }
};
