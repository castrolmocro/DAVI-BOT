/**
 * DAVID V1 — Command Loader
 * Copyright © DJAMEL
 */

"use strict";

const fs    = require("fs-extra");
const path  = require("path");
const chalk = require("chalk");

function loadCommands(dir) {
  const commands = new Map();

  if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); return commands; }

  const files = fs.readdirSync(dir).filter(f => f.endsWith(".js") && !f.startsWith("_"));

  console.log(chalk.hex("#00b4d8")(`\n  ─── تحميل الأوامر (${files.length}) ───`));

  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      delete require.cache[require.resolve(filePath)];
      const cmd = require(filePath);
      if (!cmd?.config?.name || !cmd?.execute) {
        console.log(chalk.yellow(`  ⏭  ${file}: مفقود config.name أو execute`));
        continue;
      }
      const names = [cmd.config.name.toLowerCase(), ...(cmd.config.aliases || []).map(a => a.toLowerCase())];
      for (const name of names) commands.set(name, cmd);
      console.log(chalk.green(`  ✅ ${cmd.config.name}`));
    } catch (e) {
      console.log(chalk.red(`  ❌ ${file}: ${e.message}`));
    }
  }
  console.log();
  return commands;
}

module.exports = { loadCommands };
