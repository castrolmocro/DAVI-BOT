/**
 * DAVID V1 — Loading spinner helper
 * Copyright © DJAMEL
 */
const ora = require("ora");

module.exports = function loading(text, options = {}) {
  const spinner = ora({ text, spinner: "dots", color: "cyan", ...options });
  spinner.start();
  return {
    succeed: (t) => spinner.succeed(t),
    fail:    (t) => spinner.fail(t),
    warn:    (t) => spinner.warn(t),
    info:    (t) => spinner.info(t),
    stop:    ()  => spinner.stop(),
    text:    (t) => { spinner.text = t; },
  };
};
