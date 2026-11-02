const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { findViolation } = require("../guard");

const GUARD = path.join(__dirname, "..", "guard.js");
const TEMPLATE_ROOT = path.join(__dirname, "..", "..", "..");

const PROJECT = "/project";
const CONFIG = {
  paths: { src: "src", tests: "tests", plans: "docs/plans" },
  testCommand: "node --test",
  agents: {
    orchestrator: { write: [], bash: ["test", "git"] },
    "planner-agent": { write: ["plans"], bash: [] },
    "implementer-agent": { write: ["src", "tests"], bash: ["test"] },
    "git-agent": { write: [], bash: ["git"] },
  },
};

const write = (agent, filePath, tool = "Write") => ({
  agent_type: agent,
  tool_name: tool,
  tool_input: { file_path: filePath },
});

const bash = (agent, command) => ({
  agent_type: agent,
  tool_name: "Bash",
  tool_input: { command },
});

const check = (input) => findViolation(input, CONFIG, PROJECT);

describe("guard", () => {
  it("allows writes inside the agent's folders", () => {
    assert.equal(check(write("planner-agent", "docs/plans/a.md")), null);
    assert.equal(check(write("implementer-agent", "/project/src/a.js")), null);
  });

  it("blocks writes outside the agent's folders", () => {
    assert.match(check(write("planner-agent", "src/a.js")), /outside/);
    assert.match(
      check(write("implementer-agent", "CLAUDE.md", "Edit")),
      /outside/,
    );
  });

  it("blocks every write for an agent without folders", () => {
    assert.match(check(write("orchestrator", "src/a.js")), /\(none\)/);
  });

  it("blocks a write without a file path", () => {
    const input = { agent_type: "planner-agent", tool_name: "Write" };
    assert.match(check(input), /no file path/);
  });

  it("blocks Bash for an agent without shell access", () => {
    assert.match(check(bash("planner-agent", "node --test")), /may not run/);
  });

  it("allows only the test command for the implementer", () => {
    assert.equal(check(bash("implementer-agent", "node --test")), null);
    assert.match(check(bash("implementer-agent", "git diff")), /may only run/);
    assert.match(
      check(bash("implementer-agent", "node --test 2>&1 | tail")),
      /may only run/,
    );
  });

  it("allows read only git for the orchestrator", () => {
    assert.equal(check(bash("orchestrator", "git diff")), null);
    assert.match(check(bash("orchestrator", "git commit -m x")), /may only/);
  });

  it("allows add and commit only for an agent with commit", () => {
    const config = {
      ...CONFIG,
      agents: {
        ...CONFIG.agents,
        orchestrator: { write: [], bash: ["test", "git", "commit"] },
      },
    };
    const run = (agent, command) =>
      findViolation(bash(agent, command), config, PROJECT);
    const commit = 'git commit -m "feat(a.js): add x"';
    assert.equal(run("orchestrator", "git add src/a.js"), null);
    assert.equal(run("orchestrator", commit), null);
    assert.match(run("orchestrator", "git add -A"), /may only run/);
    assert.match(run("implementer-agent", commit), /may only run/);
    assert.match(check(bash("orchestrator", commit)), /may only run/);
  });

  it("does not restrict the main session or unknown agents", () => {
    assert.equal(check(write(undefined, "/etc/hosts")), null);
    assert.equal(check(write("Explore", "/etc/hosts")), null);
  });

  it("ignores tools that do not write or run commands", () => {
    const input = { agent_type: "planner-agent", tool_name: "Read" };
    assert.equal(check(input), null);
  });

  it("allows git but not the test command for a git only agent", () => {
    assert.equal(check(bash("git-agent", "git diff")), null);
    assert.match(check(bash("git-agent", "node --test")), /may only run/);
  });

  it("blocks commands that disable the sandbox", () => {
    const input = bash("implementer-agent", "node --test");
    input.tool_input.dangerouslyDisableSandbox = true;
    assert.match(check(input), /disable the sandbox/);
  });

  it("blocks agents when the agents block is missing", () => {
    const config = { ...CONFIG, agents: undefined };
    const input = write("planner-agent", "docs/plans/a.md");
    assert.match(findViolation(input, config, PROJECT), /no agents block/);
    assert.equal(findViolation(write(undefined, "x"), config, PROJECT), null);
  });
});

describe("guard.js as a hook process", () => {
  const runHook = (input) =>
    spawnSync(process.execPath, [GUARD], {
      input: JSON.stringify(input),
      encoding: "utf8",
      env: { ...process.env, CLAUDE_PROJECT_DIR: TEMPLATE_ROOT },
    });

  it("exits with 2 and a Blocked message for a forbidden write", () => {
    const result = runHook(write("planner-agent", "src/x.js"));
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^Blocked: src\/x\.js is outside/);
  });

  it("exits with 0 for an allowed write", () => {
    const result = runHook(write("planner-agent", "docs/plans/x.md"));
    assert.equal(result.status, 0);
  });

  it("exits with 0 for the main session", () => {
    const result = runHook(write(undefined, "src/x.js"));
    assert.equal(result.status, 0);
  });

  it("exits with 2 on malformed input", () => {
    const result = spawnSync(process.execPath, [GUARD], {
      input: "not json",
      encoding: "utf8",
    });
    assert.equal(result.status, 2);
  });
});
