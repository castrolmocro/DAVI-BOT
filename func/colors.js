/**
 * DAVID V1 — Color utilities
 * Copyright © DJAMEL
 */

const isHexColor = color => color?.match?.(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);

const colorFunctions = {
  bold:          text => `\x1b[1m${text}\x1b[0m`,
  italic:        text => `\x1b[3m${text}\x1b[0m`,
  underline:     text => `\x1b[4m${text}\x1b[0m`,
  strikethrough: text => `\x1b[9m${text}\x1b[0m`,
  blink:         text => `\x1b[5m${text}\x1b[0m`,
  inverse:       text => `\x1b[7m${text}\x1b[0m`,
  hidden:        text => `\x1b[8m${text}\x1b[0m`,

  black:       text => `\x1b[30m${text}\x1b[0m`,
  blue:        text => `\x1b[34m${text}\x1b[0m`,
  blueBright:  text => `\x1b[94m${text}\x1b[0m`,
  cyan:        text => `\x1b[36m${text}\x1b[0m`,
  cyanBright:  text => `\x1b[96m${text}\x1b[0m`,
  default:     text => text,
  gray:        text => `\x1b[90m${text}\x1b[0m`,
  green:       text => `\x1b[32m${text}\x1b[0m`,
  greenBright: text => `\x1b[92m${text}\x1b[0m`,
  grey:        text => `\x1b[90m${text}\x1b[0m`,
  magenta:     text => `\x1b[35m${text}\x1b[0m`,
  red:         text => `\x1b[31m${text}\x1b[0m`,
  redBright:   text => `\x1b[91m${text}\x1b[0m`,
  reset:       text => text,
  white:       text => `\x1b[37m${text}\x1b[0m`,
  whiteBright: text => `\x1b[97m${text}\x1b[0m`,
  yellow:      text => `\x1b[33m${text}\x1b[0m`,
  yellowBright:text => `\x1b[93m${text}\x1b[0m`,

  bgBlack:   text => `\x1b[40m${text}\x1b[0m`,
  bgBlue:    text => `\x1b[44m${text}\x1b[0m`,
  bgCyan:    text => `\x1b[46m${text}\x1b[0m`,
  bgGreen:   text => `\x1b[42m${text}\x1b[0m`,
  bgMagenta: text => `\x1b[45m${text}\x1b[0m`,
  bgRed:     text => `\x1b[41m${text}\x1b[0m`,
  bgWhite:   text => `\x1b[47m${text}\x1b[0m`,
  bgYellow:  text => `\x1b[43m${text}\x1b[0m`,

  hex: (color, text) => {
    if (!isHexColor(color)) return text;
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
  },

  bgHex: (color, text) => {
    if (!isHexColor(color)) return text;
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `\x1b[48;2;${r};${g};${b}m${text}\x1b[0m`;
  },
};

module.exports = { isHexColor, colors: colorFunctions };
