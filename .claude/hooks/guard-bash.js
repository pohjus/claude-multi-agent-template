const path = require("node:path");
const { readHookInput, block } = require("./lib/hookInput");
const { loadConfig, resolveFolders } = require("./lib/config");

const SAFE_COMMAND = /^[\w./ -]+$/;
const GIT_READ_COMMANDS = ["git status --short", "git diff --stat", "git diff"];

const isTestPath = (arg, testDir) => {
  const normalized = path.normalize(arg);
  return (
    !path.isAbsolute(normalized) &&
    !arg.split("/").includes("..") &&
    (normalized === testDir || normalized.startsWith(`${testDir}${path.sep}`))
  );
};

const isTestCommand = (words, testCommand, testDir) => {
  const prefix = testCommand.trim().split(" ");
  const startsWithTestCommand = prefix.every((word, i) => words[i] === word);
  const extraArgs = words.slice(prefix.length);
  return (
    startsWithTestCommand && extraArgs.every((arg) => isTestPath(arg, testDir))
  );
};

const isAllowedCommand = (command, testCommand, testDir, allowGit = false) => {
  const trimmed = command.trim();
  if (!SAFE_COMMAND.test(trimmed)) {
    return false;
  }
  if (allowGit && GIT_READ_COMMANDS.includes(trimmed)) {
    return true;
  }
  return isTestCommand(trimmed.split(/ +/), testCommand, testDir);
};

const main = async () => {
  const config = loadConfig();
  const [testDir] = resolveFolders(config, ["tests"]);
  const allowGit = process.argv.slice(2).includes("git");
  const input = await readHookInput();
  const command = input.tool_input?.command ?? "";
  if (isAllowedCommand(command, config.testCommand, testDir, allowGit)) {
    process.exit(0);
  }
  const extra = allowGit ? `, or one of: ${GIT_READ_COMMANDS.join(", ")}` : "";
  block(
    `Blocked: you may only run "${config.testCommand}", optionally with ` +
      `paths inside ${testDir}/${extra}. Only letters, digits, spaces, ` +
      "and . / _ - are allowed.",
  );
};

if (require.main === module) {
  main().catch((error) => block(`guard-bash failed: ${error.message}`));
}

module.exports = { isAllowedCommand };
