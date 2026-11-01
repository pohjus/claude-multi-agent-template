const fs = require("node:fs");
const path = require("node:path");
const { readHookInput } = require("./lib/hookInput");

const LOG_FILE = path.join(__dirname, "..", "logs", "tool-calls.log");

const describeTarget = (toolInput) =>
  toolInput?.file_path ?? toolInput?.command ?? "";

const formatLine = (input) => {
  const agent = input.agent_type ?? "main-session";
  const target = describeTarget(input.tool_input);
  return `${new Date().toISOString()} ${agent} ${input.tool_name} ${target}\n`;
};

const main = async () => {
  const input = await readHookInput();
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, formatLine(input));
  process.exit(0);
};

main().catch((error) => {
  console.error(`log-tool-call failed: ${error.message}`);
  process.exit(1);
});
