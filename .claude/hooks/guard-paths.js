const path = require("node:path");
const { readHookInput, block } = require("./lib/hookInput");
const { loadConfig, resolveFolders } = require("./lib/config");

const toProjectPath = (filePath, projectDir) =>
  path.relative(projectDir, path.resolve(projectDir, filePath));

const isInside = (relativePath, folder) =>
  relativePath === folder || relativePath.startsWith(`${folder}${path.sep}`);

const isAllowedPath = (filePath, projectDir, folders) => {
  const relativePath = toProjectPath(filePath, projectDir);
  return folders.some((folder) => isInside(relativePath, folder));
};

const main = async () => {
  const folders = resolveFolders(loadConfig(), process.argv.slice(2));
  const input = await readHookInput();
  const filePath = input.tool_input?.file_path;
  if (!filePath) {
    block("guard-paths: no file_path in the tool call, blocking to be safe");
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;
  if (isAllowedPath(filePath, projectDir, folders)) {
    process.exit(0);
  }
  block(
    `Blocked: ${toProjectPath(filePath, projectDir)} is outside your ` +
      `allowed folders (${folders.join(", ")}). Report this to the caller.`,
  );
};

if (require.main === module) {
  main().catch((error) => block(`guard-paths failed: ${error.message}`));
}

module.exports = { isAllowedPath };
