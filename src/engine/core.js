/**
 * DAVID V1 — Core Engine Globals (GoatBot Pattern)
 * Copyright © DJAMEL
 */
"use strict";

const path = require("path");

function initGlobals(config) {
  global.GoatBot = {
    startTime:    Date.now(),
    config,
    commands:     new Map(),
    eventCommands: new Map(),
    aliases:      new Map(),
    onChat:       [],
    onReply:      new Map(),
    onReaction:   new Map(),
    onEvent:      [],
    fcaApi:       null,
    botID:        null,
    angelIntervals: {},
    divelWatchers:  {},
    dmLocked:     false,
    allThreadData: {},
    reLoginBot:   function() {},
  };

  global.db = {
    allThreadData: [],
    allUserData:   [],
  };

  global.utils = {
    calcHumanTypingDelay: require("../../Djamel-fca").calcTypingDelay,
    simulateTyping:       require("../../Djamel-fca").simulateTyping,
    log:                  require("./logger"),
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    isNumber: v => !isNaN(parseFloat(v)) && isFinite(v),
    getPrefix: () => global.GoatBot?.config?.prefix || "/",
  };

  // backwards compat aliases
  global.log     = global.utils.log;
  global.config  = config;
  global.ownerID = config.ownerID || "";
  global.commandPrefix = config.prefix || "/";
  global.commands      = global.GoatBot.commands;
  global.djamelbot     = { startTime: Date.now(), version: config.botVersion || "2.0.0", api: null };
}

module.exports = { initGlobals };
