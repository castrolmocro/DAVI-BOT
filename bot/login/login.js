/**
 * DAVID V1 — Login Module (c3c / fca-eryxenx)
 * Copyright © DJAMEL
 */

"use strict";

const login       = require("fca-eryxenx");
const fs          = require("fs-extra");
const path        = require("path");
const gradient    = require("gradient-string");
const checkLive   = require("./checkLiveCookie.js");
const loadData    = require("./loadData.js");
const loadScripts = require("./loadScripts.js");
const handlerWhen = require("./handlerWhenListenHasError.js");
const handlerAct  = require("../handler/handlerAction.js");
const stealth     = require("../stealth/index.js");
const keepAlive   = require("../keepAlive/index.js");
const mqttHealth  = require("../mqttHealthCheck/index.js");
const { threadsData, usersData } = require("../../database/controller/index.js");

const ACCOUNT_PATH = path.join(process.cwd(), "account.txt");
const CONFIG_PATH  = path.join(process.cwd(), "config.json");

function getLoginCredentials() {
  // Priority 1: account.txt (cookie/appState)
  if (fs.existsSync(ACCOUNT_PATH)) {
    try {
      const raw = fs.readFileSync(ACCOUNT_PATH, "utf8").trim();
      if (raw && raw !== "" && raw.startsWith("[")) {
        const appState = JSON.parse(raw);
        if (Array.isArray(appState) && appState.length > 0) {
          const c_user = appState.find(c => c.key === "c_user");
          if (c_user && c_user.value && !c_user.value.startsWith("YOUR_")) {
            return { appState };
          }
        }
      }
    } catch (e) {
      global.utils?.log?.warn?.("LOGIN", `account.txt parse error: ${e.message}`);
    }
  }

  // Priority 2: config.json email/password
  const cfg = global.GoatBot?.config?.facebookAccount || {};
  if (cfg.email && cfg.password) {
    return { email: cfg.email, password: cfg.password };
  }

  return null;
}

module.exports = async function startLogin() {
  const log = global.utils?.log;

  console.log(gradient.pastel("\n  Connecting to Facebook Messenger...\n"));

  const creds = getLoginCredentials();
  if (!creds) {
    log?.err?.("LOGIN", "No credentials found! Add cookies to account.txt or email/password to config.json");
    process.exit(1);
  }

  const loginOptions = {
    ...creds,
    listenEvents: true,
    logLevel:     "silent",
    updatePresence: false,
    selfListen:   false,
    userAgent:    global.GoatBot?.config?.facebookAccount?.userAgent ||
                  "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36",
  };

  log?.info?.("LOGIN", "Authenticating...");

  return new Promise((resolve, reject) => {
    login(loginOptions, async (err, api) => {
      if (err) {
        log?.err?.("LOGIN", `Authentication failed: ${JSON.stringify(err)}`);
        return reject(err);
      }

      log?.success?.("LOGIN", "Authenticated successfully!");

      // Save updated appState back to account.txt
      try {
        const newState = api.getAppState();
        fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(newState, null, 2));
        log?.info?.("LOGIN", "Cookie saved to account.txt");
      } catch (e) {
        log?.warn?.("LOGIN", `Could not save cookie: ${e.message}`);
      }

      // Store API reference globally
      global.GoatBot.fcaApi = api;

      api.setOptions({
        listenEvents: true,
        logLevel: "silent",
        selfListen: false,
      });

      // Load startup data display
      await loadData(api).catch(() => {});

      // Load commands & events
      await loadScripts(api, threadsData, usersData).catch(e => {
        log?.err?.("LOADER", e.message);
      });

      // Start protection systems
      stealth.start();
      keepAlive.start();
      mqttHealth.start(api, async () => {
        log?.warn?.("MQTT", "MQTT stale — restarting listen...");
        setTimeout(() => process.exit(1), 2_000);
      });

      // Start dashboard
      try {
        require("../../dashboard/app.js");
      } catch (e) {
        log?.warn?.("DASHBOARD", `Dashboard could not start: ${e.message}`);
      }

      // ── Start listening ──────────────────────────────────────────────────
      const handler = handlerAct(api, threadsData, usersData);

      api.listen(async (err, event) => {
        if (err) {
          await handlerWhen(err, api);
          return;
        }
        handler(event);
      });

      resolve(api);
    });
  });
};
