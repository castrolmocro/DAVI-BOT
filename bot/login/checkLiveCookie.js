/**
 * DAVID V1 — Cookie Liveness Check (Layer 14)
 * Copyright © DJAMEL
 */

"use strict";

const axios = require("axios");

module.exports = async function checkLiveCookie(cookie, userAgent) {
  try {
    const resp = await axios({
      url: "https://mbasic.facebook.com/settings",
      method: "GET",
      headers: {
        cookie,
        "user-agent": userAgent || "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9,ar;q=0.8",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
      },
      timeout: 15_000,
      maxRedirects: 0,
      validateStatus: s => s < 500,
    });
    const loc = resp.headers?.location || "";
    if (loc.includes("login") || loc.includes("checkpoint")) return false;
    if (resp.status === 302 && loc.includes("facebook.com/login")) return false;
    return resp.status < 400;
  } catch (_) {
    return false;
  }
};
