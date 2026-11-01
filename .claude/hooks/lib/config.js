const fs = require("node:fs");
const path = require("node:path");

const CONFIG_FILE = path.join(__dirname, "..", "..", "workflow.json");

const loadConfig = (configFile = CONFIG_FILE) =>
  JSON.parse(fs.readFileSync(configFile, "utf8"));

const resolveFolders = (config, keys) =>
  keys.map((key) => {
    const folder = config.paths?.[key];
    if (!folder) {
      throw new Error(`unknown path key "${key}" in workflow.json`);
    }
    return path.normalize(folder).replace(/[\\/]+$/, "");
  });

module.exports = { loadConfig, resolveFolders };
