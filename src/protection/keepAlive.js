/**
 * DAVID V1 — Keep-Alive Ping (Layer 13)
 * Copyright © DJAMEL
 */
"use strict";

const axios = require("axios");
let _timer = null;

module.exports = {
  start() {
    clearInterval(_timer);
    _timer = setInterval(async () => {
      try { await axios.get("https://mbasic.facebook.com/", { timeout: 10000 }); }
      catch (_) {}
    }, 8 * 60_000);
  },
  stop() { clearInterval(_timer); _timer = null; },
};
