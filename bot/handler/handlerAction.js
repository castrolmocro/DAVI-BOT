/**
 * DAVID V1 — Action Router (connects login → handler)
 * Copyright © DJAMEL
 */

"use strict";

const handlerEvents      = require("./handlerEvents.js");
const handlerCheckData   = require("./handlerCheckData.js");

module.exports = function (api, threadsData, usersData) {
  const handle = handlerEvents(api, threadsData, usersData);

  return async function (event) {
    try {
      await handlerCheckData(event, { threadsData, usersData });
      await handle(event);
    } catch (e) {
      global.utils?.log?.err?.("ACTION", e.message);
    }
  };
};
