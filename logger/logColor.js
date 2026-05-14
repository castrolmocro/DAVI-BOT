/**
 * DAVID V1 — logColor
 * Copyright © DJAMEL
 */
const { colors } = require("../func/colors.js");
module.exports = (color, message) => console.log(colors.hex(color, message));
