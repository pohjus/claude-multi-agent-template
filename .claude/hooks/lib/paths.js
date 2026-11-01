const path = require("node:path");

const toProjectPath = (filePath, projectDir) =>
  path.relative(projectDir, path.resolve(projectDir, filePath));

const isInside = (relativePath, folder) =>
  relativePath === folder || relativePath.startsWith(`${folder}${path.sep}`);

const isAllowedPath = (filePath, projectDir, folders) => {
  const relativePath = toProjectPath(filePath, projectDir);
  return folders.some((folder) => isInside(relativePath, folder));
};

module.exports = { isAllowedPath, toProjectPath };
