const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadConfig, resolveFolders } = require("../lib/config");

const AGENTS_DIR = path.join(__dirname, "..", "..", "agents");

const agentNames = () =>
  fs
    .readdirSync(AGENTS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const text = fs.readFileSync(path.join(AGENTS_DIR, file), "utf8");
      return text.match(/^name:\s*(\S+)/m)?.[1];
    });

describe("workflow.json", () => {
  const config = loadConfig();

  it("has guard rules for every agent in .claude/agents", () => {
    agentNames().forEach((name) => {
      assert.ok(config.agents[name], `no rules for ${name} in workflow.json`);
    });
  });

  it("only names folder keys that exist in paths", () => {
    Object.values(config.agents).forEach((rules) => {
      assert.doesNotThrow(() => resolveFolders(config, rules.write));
    });
  });

  it("has a tests folder and a test command", () => {
    assert.ok(config.paths.tests);
    assert.ok(config.testCommand);
  });
});
