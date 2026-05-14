/**
 * DAVID V1 — Event & Command Handler
 * Copyright © DJAMEL
 */

"use strict";

const fs         = require("fs-extra");
const rateLimit  = require("../protection/rateLimit.js");
const throttle   = require("../stealth/outgoingThrottle.js");
const mqttHealth = require("../mqttHealthCheck/index.js");

// ─── Role helpers ─────────────────────────────────────────────────────────────

function getRole(threadData, senderID) {
  const adminBot  = (global.GoatBot?.config?.adminBot  || []).map(String);
  const superAdmin = (global.GoatBot?.config?.superAdminBot || []).map(String);
  const sid = String(senderID);
  if (superAdmin.includes(sid)) return 3;
  if (adminBot.includes(sid))   return 2;
  if ((threadData?.adminIDs || []).map(String).includes(sid)) return 1;
  return 0;
}

function isBotAdmin(senderID) {
  const adminBot   = (global.GoatBot?.config?.adminBot   || []).map(String);
  const superAdmin = (global.GoatBot?.config?.superAdminBot || []).map(String);
  const sid = String(senderID);
  return adminBot.includes(sid) || superAdmin.includes(sid);
}

// ─── 20-Layer: Layer 16 Anti-Flood check ─────────────────────────────────────

function antiFloodCheck(senderID, threadID) {
  const key    = `flood:${threadID}:${senderID}`;
  const result = rateLimit.check(key, 8, 6_000);
  if (result.exceeded) {
    if (!result.warned) rateLimit.setWarned(key);
    return true;
  }
  return false;
}

// ─── 20-Layer: Layer 17 Anti-Spam check ──────────────────────────────────────

function antiSpamCheck(senderID) {
  const key    = `spam:${senderID}`;
  const result = rateLimit.check(key, 15, 30_000);
  return result.exceeded;
}

// ─── Main handler factory ─────────────────────────────────────────────────────

module.exports = function (api, threadsData, usersData) {
  return async function (event) {
    try {
      mqttHealth.markActivity();

      const { senderID, threadID, body = "", type } = event;
      if (!senderID || !threadID) return;

      // Layer 18: DM Lock
      const dmLockPath = require("path").join(process.cwd(), "database/data/dmLock.json");
      let dmLocked = false;
      try {
        if (fs.existsSync(dmLockPath)) dmLocked = JSON.parse(fs.readFileSync(dmLockPath, "utf8")).locked;
      } catch (_) {}

      if (!event.isGroup && !isBotAdmin(senderID) && dmLocked) return;

      // Layer 16+17: Anti-flood & anti-spam
      if (!isBotAdmin(senderID)) {
        if (antiFloodCheck(senderID, threadID)) return;
        if (antiSpamCheck(senderID))            return;
      }

      // ── Admin-only mode ───────────────────────────────────────────────────
      const adminOnlyCfg = global.GoatBot?.config?.adminOnly;
      if (adminOnlyCfg?.enable && !isBotAdmin(senderID)) return;

      const prefix = global.GoatBot?.config?.prefix || "/";
      const isCmd  = typeof body === "string" && body.startsWith(prefix);

      if (!isCmd) return;

      const args        = body.slice(prefix.length).trim().split(/\s+/);
      const commandName = args.shift().toLowerCase();

      if (!commandName) return;

      const commands = global.GoatBot?.commands;
      if (!commands) return;

      let cmd = commands.get(commandName);
      if (!cmd) {
        // Check aliases
        const aliases = global.GoatBot?.aliases;
        const realName = aliases?.get(commandName);
        if (realName) cmd = commands.get(realName);
      }

      if (!cmd) return;

      // Role check
      const threadData = await threadsData.get(threadID).catch(() => null);
      const userRole   = getRole(threadData, senderID);
      const required   = cmd.config?.role ?? 2;

      if (userRole < required) {
        if (userRole < 2) {
          await throttle.throttle(() =>
            api.sendMessage("⛔ This command is for bot admins only.", threadID)
          );
        }
        return;
      }

      // Layer 10: Typing indicator
      const stealth = global.utils?.stealth;
      const delay   = stealth?.calcHumanTypingDelay?.(body) || 1_200;
      await stealth?.simulateTyping?.(api, threadID, delay);

      // Layer 11: Action jitter
      await stealth?.actionJitter?.();

      // ── Execute command ───────────────────────────────────────────────────
      try {
        await cmd.onStart?.({
          api,
          event,
          args,
          prefix,
          threadsData,
          usersData,
          message: {
            reply: (msg) => throttle.throttle(() => api.sendMessage(msg, threadID, event.messageID)),
            send:  (msg) => throttle.throttle(() => api.sendMessage(msg, threadID)),
          },
        });
      } catch (e) {
        global.utils?.log?.err?.("CMD", `Error in /${commandName}: ${e.message}`);
        await throttle.throttle(() =>
          api.sendMessage(`❌ An error occurred: ${e.message}`, threadID)
        );
      }

    } catch (e) {
      global.utils?.log?.err?.("HANDLER", e.message);
    }
  };
};
