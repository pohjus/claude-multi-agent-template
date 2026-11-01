const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isAllowedPath } = require("../guard-paths");
const { resolveFolders } = require("../lib/config");

const PROJECT = "/project";
const CONFIG = {
  paths: { src: "src", tests: "tests/", reports: "docs/reports" },
};

describe("guard-paths", () => {
  it("allows files inside an allowed folder", () => {
    assert.equal(isAllowedPath("src/a.js", PROJECT, ["src"]), true);
    assert.equal(isAllowedPath("/project/src/a/b.js", PROJECT, ["src"]), true);
  });

  it("blocks files outside the allowed folders", () => {
    assert.equal(isAllowedPath("tests/a.js", PROJECT, ["src"]), false);
    assert.equal(isAllowedPath("/etc/hosts", PROJECT, ["src"]), false);
  });

  it("blocks path traversal and lookalike folders", () => {
    assert.equal(isAllowedPath("src/../CLAUDE.md", PROJECT, ["src"]), false);
    assert.equal(isAllowedPath("srcevil/a.js", PROJECT, ["src"]), false);
  });

  it("resolves folder keys and strips trailing slashes", () => {
    assert.deepEqual(resolveFolders(CONFIG, ["tests", "reports"]), [
      "tests",
      "docs/reports",
    ]);
  });

  it("throws on an unknown folder key", () => {
    assert.throws(() => resolveFolders(CONFIG, ["nope"]), /unknown path key/);
  });
});
