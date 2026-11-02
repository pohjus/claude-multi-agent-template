const { readHookInput, block } = require("./lib/hookInput");
const { loadConfig, resolveFolders } = require("./lib/config");
const { isAllowedPath, toProjectPath } = require("./lib/paths");
const { isAllowedCommand, GIT_READ_COMMANDS } = require("./lib/commands");

const WRITE_TOOLS = ["Write", "Edit", "NotebookEdit"];

const checkWrite = (input, rules, config, projectDir) => {
  const folders = resolveFolders(config, rules.write ?? []);
  const filePath =
    input.tool_input?.file_path ?? input.tool_input?.notebook_path;
  if (!filePath) {
    return "no file path in the tool call, blocking to be safe.";
  }
  if (isAllowedPath(filePath, projectDir, folders)) {
    return null;
  }
  const where = folders.length > 0 ? folders.join(", ") : "none";
  return (
    `${toProjectPath(filePath, projectDir)} is outside your allowed ` +
    `folders (${where}). Report this to the caller.`
  );
};

const describeAllowed = (options, config, testDir) => {
  const commands = [];
  if (options.allowTest) {
    commands.push(
      `"${config.testCommand}", optionally with paths inside ${testDir}/`,
    );
  }
  if (options.allowGit) {
    commands.push(...GIT_READ_COMMANDS.map((command) => `"${command}"`));
  }
  if (options.allowCommit) {
    const folders = options.commitFolders.join(", ");
    commands.push(
      `"git add" with paths inside ${folders}`,
      `'git commit -m "type(scope): subject"'`,
    );
  }
  return commands.join(", or ");
};

const checkBash = (input, rules, config) => {
  const allowed = rules.bash ?? [];
  if (allowed.length === 0) {
    return "you may not run shell commands. Report this to the caller.";
  }
  if (input.tool_input?.dangerouslyDisableSandbox) {
    return "commands may not disable the sandbox. Report this to the caller.";
  }
  const [testDir] = resolveFolders(config, ["tests"]);
  const command = input.tool_input?.command ?? "";
  const options = {
    allowTest: allowed.includes("test"),
    allowGit: allowed.includes("git"),
    allowCommit: allowed.includes("commit"),
    commitFolders: resolveFolders(config, Object.keys(config.paths ?? {})),
  };
  if (isAllowedCommand(command, config.testCommand, testDir, options)) {
    return null;
  }
  const allowedText = describeAllowed(options, config, testDir);
  return (
    `you may only run ${allowedText}. One command per call; only letters, ` +
    "digits, spaces, and . / _ - are allowed."
  );
};

const hasAgentRules = (config) =>
  typeof config.agents === "object" &&
  config.agents !== null &&
  !Array.isArray(config.agents);

const findViolation = (input, config, projectDir) => {
  if (!input.agent_type) {
    return null;
  }
  if (!hasAgentRules(config)) {
    return "workflow.json has no agents block, blocking to be safe.";
  }
  const rules = config.agents[input.agent_type];
  if (!rules) {
    return null;
  }
  if (WRITE_TOOLS.includes(input.tool_name)) {
    return checkWrite(input, rules, config, projectDir);
  }
  if (input.tool_name === "Bash") {
    return checkBash(input, rules, config);
  }
  return null;
};

const main = async () => {
  const input = await readHookInput();
  if (!input.agent_type) {
    process.exit(0);
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;
  const violation = findViolation(input, loadConfig(), projectDir);
  if (violation) {
    block(`Blocked: ${violation}`);
  }
  process.exit(0);
};

if (require.main === module) {
  main().catch((error) => block(`guard failed: ${error.message}`));
}

module.exports = { findViolation };
