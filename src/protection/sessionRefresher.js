/**
 * DAVID V1 — Session Refresher (Layer 15)
 * Copyright © DJAMEL
 */
"use strict";

const fs   = require("fs-extra");
const path = require("path");
const ACCOUNT_PATH = path.join(__dirname, "../../account.txt");
let _timer = null;

module.exports = {
  start(api) {
    clearInterval(_timer);
    _timer = setInterval(() => {
      try {
        const fresh = api.getAppState?.();
        if (fresh && fresh.length) {
          global._selfWrite = true;
          const { dedup } = require("../utils/cookieParser");
          fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(dedup(fresh), null, 2));
          setTimeout(() => { global._selfWrite = false; }, 5000);
        }
      } catch (_) {}
    }, 30 * 60_000);
  },
  stop() { clearInterval(_timer); _timer = null; },
};
