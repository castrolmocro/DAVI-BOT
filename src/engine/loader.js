/**
 * DAVID V1 — Command Loader
 * Copyright © DJAMEL
 */
"use strict";

const fs   = require("fs-extra");
const path = require("path");
const log  = require("./logger");

function loadCommands(dir) {
  const commands = new Map();
  // حل المسار المطلق دائماً
  const absDir = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(absDir)) return commands;

  const files = fs.readdirSync(absDir).filter(f => f.endsWith(".js"));
  let loaded = 0, failed = 0;

  console.log();
  console.log(`\x1b[36m  ─── تحميل الأوامر (${files.length}) ───\x1b[0m`);

  for (const file of files) {
    const filePath = path.resolve(absDir, file);
    try {
      delete require.cache[filePath];
      const cmd = require(filePath);

      // صيغة GoatBot (config.name + onStart/onChat)
      if (cmd?.config?.name) {
        const name = cmd.config.name.toLowerCase();
        commands.set(name, cmd);

        if (Array.isArray(cmd.config.aliases)) {
          for (const alias of cmd.config.aliases) {
            if (alias) commands.set(String(alias).toLowerCase(), cmd);
          }
        }

        if (typeof cmd.onChat === "function" && global.GoatBot) {
          if (!global.GoatBot.onChat.includes(name))
            global.GoatBot.onChat.push(name);
        }

        console.log(`  \x1b[32m✅\x1b[0m ${name}`);
        loaded++;
      }
      // صيغة قديمة (name + run)
      else if (cmd?.name && typeof cmd?.run === "function") {
        const name = String(cmd.name).toLowerCase();
        const wrapped = {
          config: { name, aliases: cmd.aliases || [], category: cmd.category || "other", role: 2 },
          onStart: async ctx => cmd.run(ctx),
        };
        commands.set(name, wrapped);
        console.log(`  \x1b[32m✅\x1b[0m ${name} (legacy)`);
        loaded++;
      } else {
        console.log(`  \x1b[33m⚠\x1b[0m ${file}: لا يوجد config.name`);
        failed++;
      }
    } catch (e) {
      console.log(`  \x1b[31m❌\x1b[0m ${file}: ${e.message}`);
      failed++;
    }
  }

  console.log();
  log.ok("LOADER", `تم تحميل ${loaded} أمر${failed ? ` (${failed} فشل)` : ""} ✔`);
  return commands;
}

module.exports = { loadCommands };
