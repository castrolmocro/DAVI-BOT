/**
 * DAVID V1 — Cookie Liveness Checker
 * Copyright © DJAMEL
 */

"use strict";

const axios = require("axios");

module.exports = async function checkLiveCookie(cookieStr, userAgent) {
  try {
    const UA = userAgent || "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36";
    const resp = await axios.get("https://mbasic.facebook.com/settings", {
      timeout: 15000,
      headers: {
        cookie: cookieStr,
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "ar,en-US;q=0.9,en;q=0.8",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "upgrade-insecure-requests": "1",
      },
    });
    const html = String(resp.data || "");
    return (
      html.includes("/notifications.php?") ||
      html.includes("account/settings") ||
      html.includes("logout") ||
      html.includes("/privacy/xcs/") ||
      html.includes("/login/save-password")
    );
  } catch { return false; }
};
