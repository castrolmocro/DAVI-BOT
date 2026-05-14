/**
 * DAVID V1 — Check and sync thread/user data from DB
 * Copyright © DJAMEL
 */

"use strict";

module.exports = async function handlerCheckData(event, { threadsData, usersData }) {
  try {
    const { threadID, senderID, type } = event;
    if (!threadID) return;

    // ── Thread data ──────────────────────────────────────────────────────────
    let threadData = await threadsData.get(threadID);
    if (!threadData) {
      threadData = {
        threadID,
        members: [],
        adminIDs: [],
        imageSrc: "",
        name: "",
        userInfo: [],
        blocked: false,
        data: {},
      };
      await threadsData.set(threadID, threadData);
    }

    // ── User data ────────────────────────────────────────────────────────────
    if (senderID) {
      let userData = await usersData.get(senderID);
      if (!userData) {
        userData = {
          userID: senderID,
          name: "",
          exp: 0,
          banned: { status: false, reason: "", time: 0 },
          data: {},
        };
        await usersData.set(senderID, userData);
      }
    }

    return threadData;
  } catch (e) {
    global.utils?.log?.err?.("CHECK_DATA", e.message);
  }
};
