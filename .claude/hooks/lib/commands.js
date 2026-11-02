const path = require("node:path");

const SAFE_COMMAND = /^[\w./ -]+$/;
const GIT_READ_COMMANDS = [
  "git status --short -uall",
  "git diff --stat",
  "git diff",
];
const GIT_COMMIT_COMMAND =
  /^git commit -m "(feat|fix|docs|test|refactor|chore|style|perf)(\([\w./-]+\))?: [\w ./,-]+"$/;

const isPathInside = (arg, folder) => {
  const normalized = path.normalize(arg);
  return (
    !path.isAbsolute(normalized) &&
    !arg.split("/").includes("..") &&
    (normalized === folder || normalized.startsWith(`${folder}${path.sep}`))
  );
};

const isTestCommand = (words, testCommand, testDir) => {
  const prefix = testCommand.trim().split(" ");
  const startsWithTestCommand = prefix.every((word, i) => words[i] === word);
  const extraArgs = words.slice(prefix.length);
  return (
    startsWithTestCommand &&
    extraArgs.every((arg) => isPathInside(arg, testDir))
  );
};

const isGitAddCommand = (words, folders) => {
  const [git, add, ...paths] = words;
  return (
    git === "git" &&
    add === "add" &&
    paths.length > 0 &&
    paths.every((arg) => folders.some((folder) => isPathInside(arg, folder)))
  );
};

const isAllowedCommand = (command, testCommand, testDir, options = {}) => {
  const {
    allowTest = true,
    allowGit = false,
    allowCommit = false,
    commitFolders = [],
  } = options;
  const trimmed = command.trim();
  if (allowCommit && GIT_COMMIT_COMMAND.test(trimmed)) {
    return true;
  }
  if (!SAFE_COMMAND.test(trimmed)) {
    return false;
  }
  if (allowGit && GIT_READ_COMMANDS.includes(trimmed)) {
    return true;
  }
  const words = trimmed.split(/ +/);
  if (allowCommit && isGitAddCommand(words, commitFolders)) {
    return true;
  }
  return allowTest && isTestCommand(words, testCommand, testDir);
};

module.exports = { isAllowedCommand, GIT_READ_COMMANDS };
