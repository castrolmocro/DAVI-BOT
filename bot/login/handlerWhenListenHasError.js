/**
 * DAVID V1 — Error Handler for Listen Loop
 * Copyright © DJAMEL
 */

"use strict";

const autoRelogin = require("../autoRelogin/index.js");

module.exports = async function handlerWhenListenHasError(error, api) {
  const log = global.utils?.log;
  const errMsg = error?.message || String(error);

  log?.err?.("LISTEN_ERR", errMsg);

  const cookieErrors = [
    "login",
    "checkpoint",
    "Please log in",
    "Not logged in",
    "Session expired",
    "400",
    "cookie",
  ];

  const isCookieError = cookieErrors.some(e => errMsg.toLowerCase().includes(e.toLowerCase()));

  if (isCookieError) {
    log?.warn?.("LISTEN_ERR", "Cookie error detected — triggering auto re-login");
    await autoRelogin(api);
  } else {
    log?.warn?.("LISTEN_ERR", "Non-cookie error — restarting bot process in 5s");
    setTimeout(() => process.exit(1), 5_000);
  }
};
