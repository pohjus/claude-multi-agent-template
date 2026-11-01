const path = require("node:path");
const { readHookInput, block } = require("./lib/hookInput");
const { loadConfig, resolveFolders } = require("./lib/config");

const SHELL_OPERATORS = /[;&|<>`$()\n]/;

const isTestPath = (arg, testDir) => {
  const normalized = path.normalize(arg);
  return (
    !path.isAbsolute(normalized) &&
    !normalized.split(path.sep).includes("..") &&
    (normalized === testDir || normalized.startsWith(`${testDir}${path.sep}`))
  );
};

const isAllowedCommand = (command, testCommand, testDir) => {
  if (SHELL_OPERATORS.test(command)) {
    return false;
  }
  const words = command.trim().split(/\s+/);
  const prefix = testCommand.trim().split(/\s+/);
  const startsWithTestCommand = prefix.every((word, i) => words[i] === word);
  const extraArgs = words.slice(prefix.length);
  return (
    startsWithTestCommand && extraArgs.every((arg) => isTestPath(arg, testDir))
  );
};

const main = async () => {
  const config = loadConfig();
  const [testDir] = resolveFolders(config, ["tests"]);
  const input = await readHookInput();
  const command = input.tool_input?.command ?? "";
  if (isAllowedCommand(command, config.testCommand, testDir)) {
    process.exit(0);
  }
  block(
    `Blocked: you may only run "${config.testCommand}", optionally with ` +
      `paths inside ${testDir}/. No other commands or shell operators.`,
  );
};

if (require.main === module) {
  main().catch((error) => block(`guard-bash failed: ${error.message}`));
}

module.exports = { isAllowedCommand };
