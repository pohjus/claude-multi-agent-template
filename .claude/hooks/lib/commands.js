const path = require("node:path");

const SAFE_COMMAND = /^[\w./ -]+$/;
const GIT_READ_COMMANDS = [
  "git status --short -uall",
  "git diff --stat",
  "git diff",
];

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

module.exports = { isAllowedCommand, GIT_READ_COMMANDS };
