const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isAllowedCommand } = require("../lib/commands");

const allowed = (command, testCommand = "node --test", allowGit = false) =>
  isAllowedCommand(command, testCommand, "tests", { allowGit });

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

  it("blocks the test command when only git is allowed", () => {
    const options = { allowTest: false, allowGit: true };
    assert.equal(
      isAllowedCommand("node --test", "node --test", "tests", options),
      false,
    );
    assert.equal(
      isAllowedCommand("git diff", "node --test", "tests", options),
      true,
    );
  });

  describe("commit commands", () => {
    const folders = ["src", "tests", "docs/plans"];
    const committer = (command, allowCommit = true) =>
      isAllowedCommand(command, "node --test", "tests", {
        allowTest: false,
        allowCommit,
        commitFolders: folders,
      });

    [
      "git add src/a.js",
      "git add src/a.js tests/b.test.js docs/plans/x.md",
      'git commit -m "feat(a.js): add reverse"',
      'git commit -m "fix: handle empty input, trim spaces"',
      'git commit -m "docs(docs/plans/x.md): update plan"',
    ].forEach((command) => {
      it(`allows ${JSON.stringify(command)}`, () => {
        assert.equal(committer(command), true);
      });
    });

    [
      "git add",
      "git add -A",
      "git add .",
      "git add .claude/hooks/guard.js",
      "git add src/../.claude/x",
      "git add /project/src/a.js",
      "git add srcevil/a.js",
      'git commit -m "feat(a.js): $(whoami)"',
      'git commit -m "feat(a.js): `whoami`"',
      'git commit -m "feat(a.js): a\\" b"',
      'git commit -m "feat(a.js): a\\nb"',
      'git commit -m "feat(a.js): a\nb"',
      'git commit -m "feat(a.js): x" && rm -rf src',
      'git commit -m "wip(a.js): x"',
      'git commit -m "feat(a.js) x"',
      'git commit -am "feat(a.js): x"',
      "git commit -m feat",
      "git push",
    ].forEach((command) => {
      it(`blocks ${JSON.stringify(command)}`, () => {
        assert.equal(committer(command), false);
      });
    });

    it("blocks add and commit without the commit permission", () => {
      assert.equal(committer("git add src/a.js", false), false);
      assert.equal(committer('git commit -m "feat: x"', false), false);
    });
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
