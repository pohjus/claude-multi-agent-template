const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { findViolation } = require("../guard");

const PROJECT = "/project";
const CONFIG = {
  paths: { src: "src", tests: "tests", plans: "docs/plans" },
  testCommand: "node --test",
  agents: {
    orchestrator: { write: [], bash: ["test", "git"] },
    "planner-agent": { write: ["plans"], bash: [] },
    "implementer-agent": { write: ["src", "tests"], bash: ["test"] },
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

  it("does not restrict the main session or unknown agents", () => {
    assert.equal(check(write(undefined, "/etc/hosts")), null);
    assert.equal(check(write("Explore", "/etc/hosts")), null);
  });

  it("ignores tools that do not write or run commands", () => {
    const input = { agent_type: "planner-agent", tool_name: "Read" };
    assert.equal(check(input), null);
  });
});
