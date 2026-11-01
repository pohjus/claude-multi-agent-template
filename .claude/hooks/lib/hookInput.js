const readHookInput = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const block = (message) => {
  console.error(message);
  process.exit(2);
};

module.exports = { readHookInput, block };
