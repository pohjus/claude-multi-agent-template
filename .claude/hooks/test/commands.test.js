const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isAllowedCommand } = require("../lib/commands");

const allowed = (command, testCommand = "node --test", allowGit = false) =>
  isAllowedCommand(command, testCommand, "tests", allowGit);

describe("commands", () => {
  it("allows the test command alone", () => {
    assert.equal(allowed("node --test"), true);
  });

  it("allows test paths inside the tests folder", () => {
    assert.equal(allowed("node --test tests/a.test.js tests/sub"), true);
  });

  it("allows a multi word test command from config", () => {
    assert.equal(allowed("./gradlew test", "./gradlew test"), true);
  });

  ["rm -rf src", "node src/app.js", "npm test", "node"].forEach((command) => {
    it(`blocks ${JSON.stringify(command)}`, () => {
      assert.equal(allowed(command), false);
    });
  });

  [
    "node --test; rm -rf src",
    "node --test && echo hi",
    "node --test > out.txt",
    "node --test $(whoami)",
    "node --test\nrm -rf src",
    "node --test\ttests",
    "node --test tests/{a,..}/src/x.js",
    "node --test tests/*",
    "node --test tests/~",
    "node --test tests/!x",
    'node --test "tests/a.js"',
  ].forEach((command) => {
    it(`blocks unsafe characters in ${JSON.stringify(command)}`, () => {
      assert.equal(allowed(command), false);
    });
  });

  [
    "node --test src/app.js",
    "node --test tests/../src",
    "node --test /etc/passwd",
    "node --test --import ./evil.js",
    "node --test testsevil/a.js",
  ].forEach((command) => {
    it(`blocks arguments outside tests in ${JSON.stringify(command)}`, () => {
      assert.equal(allowed(command), false);
    });
  });

  it("blocks git commands unless git is allowed", () => {
    assert.equal(allowed("git status --short -uall"), false);
    assert.equal(
      allowed("git status --short -uall", "node --test", true),
      true,
    );
    assert.equal(allowed("git diff --stat", "node --test", true), true);
  });

  [
    "git commit -m x",
    "git push",
    "git diff src",
    "git status",
    "git status --short",
  ].forEach((command) => {
    it(`blocks ${JSON.stringify(command)} even when git is allowed`, () => {
      assert.equal(allowed(command, "node --test", true), false);
    });
  });
});
