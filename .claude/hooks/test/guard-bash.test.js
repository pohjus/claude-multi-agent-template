const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isAllowedCommand } = require("../guard-bash");

const allowed = (command, testCommand = "node --test") =>
  isAllowedCommand(command, testCommand, "tests");

describe("guard-bash", () => {
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
  ].forEach((command) => {
    it(`blocks shell operators in ${JSON.stringify(command)}`, () => {
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
});
