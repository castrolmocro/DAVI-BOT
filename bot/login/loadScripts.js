/**
 * DAVID V1 — Load Commands & Events
 * Copyright © DJAMEL
 */

"use strict";

const { readdirSync } = require("fs-extra");
const path            = require("path");
const log             = global.utils?.log || console;

function logCmd(type, name, status) {
  const icons = { ok: "✅", fail: "❌", skip: "⏭ " };
  const icon  = icons[status] || "•";
  const label = type === "cmd" ? "CMD" : "EVT";
  console.log(`  ${icon}  [${label}] ${name}`);
}

module.exports = async function loadScripts(api, threadsData, usersData) {
  const { commands, aliases, eventCommands } = global.GoatBot;

  const folders = ["cmds", "events"];

  for (const folder of folders) {
    const isCmd    = folder === "cmds";
    const dir      = path.join(process.cwd(), `scripts/${folder}`);
    let   files    = [];

    try {
      files = readdirSync(dir).filter(f => f.endsWith(".js") && !f.endsWith("eg.js"));
    } catch (e) {
      log?.warn?.("LOADER", `Could not read scripts/${folder}: ${e.message}`);
      continue;
    }

    console.log(`\n  ─── Loading ${isCmd ? "Commands" : "Events"} (${files.length}) ───`);

    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        delete require.cache[require.resolve(filePath)];
        const module = require(filePath);

        if (!module?.config?.name) {
          logCmd(isCmd ? "cmd" : "evt", file, "skip");
          continue;
        }

        const { name, aliases: cmdAliases = [] } = module.config;

        if (isCmd) {
          commands.set(name, module);
          for (const alias of cmdAliases) {
            if (!aliases.has(alias)) aliases.set(alias, name);
          }
        } else {
          eventCommands.set(name, module);
        }

        logCmd(isCmd ? "cmd" : "evt", name, "ok");
      } catch (e) {
        logCmd(isCmd ? "cmd" : "evt", file.replace(".js", ""), "fail");
        log?.err?.("LOADER", `Failed to load ${file}: ${e.message}`);
      }
    }
  }

  console.log("\n  ✅  All scripts loaded successfully.\n");
};
