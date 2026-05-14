/**
 * DAVID V1 — Load & display bot startup data
 * Copyright © DJAMEL
 */

"use strict";

const chalk = require("chalk");
const path  = require("path");

const BANNER = `
██████╗  █████╗ ██╗   ██╗██╗██████╗     ██╗   ██╗ ██╗
██╔══██╗██╔══██╗██║   ██║██║██╔══██╗    ██║   ██║███║
██║  ██║███████║██║   ██║██║██║  ██║    ██║   ██║╚██║
██║  ██║██╔══██║╚██╗ ██╔╝██║██║  ██║    ╚██╗ ██╔╝ ██║
██████╔╝██║  ██║ ╚████╔╝ ██║██████╔╝     ╚████╔╝  ██║
╚═════╝ ╚═╝  ╚═╝  ╚═══╝  ╚═╝╚═════╝       ╚═══╝   ╚═╝
`;

const COPYRIGHT = `
  ╔══════════════════════════════════════════════════╗
  ║   Copyright © DJAMEL — All rights reserved      ║
  ║   DAVID V1 — Messenger Bot Engine               ║
  ║   Powered by Djamel-fca & White Bot Engine      ║
  ╚══════════════════════════════════════════════════╝
`;

function sep(char = "━", len = 56) {
  return chalk.hex("#00b4d8")(char.repeat(len));
}

function label(icon, key, val) {
  return `  ${icon}  ${chalk.hex("#ffd166")(key)}: ${chalk.white(val)}`;
}

module.exports = async function loadData(api) {
  const config = global.GoatBot?.config || {};

  // Print banner
  console.log(chalk.hex("#00b4d8")(BANNER));
  console.log(chalk.hex("#90e0ef")(COPYRIGHT));
  console.log(sep());
  console.log();

  try {
    const userInfo = await new Promise((res, rej) => {
      api.getUserInfo(api.getCurrentUserID(), (err, data) => {
        if (err) return rej(err);
        res(data);
      });
    });

    const uid  = api.getCurrentUserID();
    const name = userInfo?.[uid]?.name || "Unknown";

    console.log(chalk.hex("#06d6a0")("  ┌── BOT INFO ──────────────────────────────────────────┐"));
    console.log(label("🤖", "Bot Name",    config.botName    || "DAVID V1"));
    console.log(label("📦", "Version",     config.botVersion || "1.0.0"));
    console.log(label("👤", "Account",     name));
    console.log(label("🆔", "UID",         uid));
    console.log(label("📌", "Prefix",      config.prefix     || "/"));
    console.log(label("🌍", "Language",    config.language   || "en"));
    console.log(label("🛡 ", "Admins",     (config.adminBot || []).length));
    console.log(label("⚙️ ", "Stealth",    config.stealth?.enable ? "ON" : "OFF"));
    console.log(label("🔒", "Protection",  "20 Layers Active"));
    console.log(chalk.hex("#06d6a0")("  └────────────────────────────────────────────────────────┘"));
  } catch (e) {
    console.log(chalk.red(`  ⚠ Could not fetch account info: ${e.message}`));
  }

  console.log();
  console.log(sep());
  console.log(chalk.hex("#06d6a0")("  ✅  DAVID V1 is online and ready!"));
  console.log(sep());
  console.log();
};
