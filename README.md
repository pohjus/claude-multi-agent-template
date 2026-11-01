# Claude multi agent template

A project template for Claude Code where the work on a feature is split between specialised subagents.
The main Claude session acts as the orchestrator: it calls the agents in a fixed order and stops at checkpoints for your approval.
Hooks restrict which folders each agent may write to and which shell commands it may run.

## Prerequisites

* [Claude Code](https://claude.com/claude-code)
* Node.js 20 or newer, because the hooks are Node scripts, whatever stack your project uses
* The [GitHub CLI](https://cli.github.com/), logged in with `gh auth login`

## Create a project

Pick one of these three ways.

With the `newapp` shell function (see [Shell function](#shell-function)):

```sh
newapp my-app            # private repo, cloned into ./my-app
newapp my-app --public   # public repo
```

With the GitHub CLI directly:

```sh
gh repo create my-app --template pohjus/claude-multi-agent-template --private --clone
cd my-app
```

With the browser: open the template on GitHub, click **Use this template**, then clone the new repo.

## First time setup

Do this once in every new project, before the first feature.

### 1. Describe the project in `CLAUDE.md`

Replace the TODO lines in the `# Project` section:

```markdown
# Project

* Stack: Node.js 20+, plain JavaScript, no frameworks.
* Test command: node --test
* Source folder and test folder: see `paths` in `.claude/workflow.json`.
```

Add anything every agent should know, such as coding conventions or libraries that are not allowed.

### 2. Set folders and the test command in `.claude/workflow.json`

The hooks read this file, so the agent files never need to change when folders change.

Node.js:

```json
{
  "paths": {
    "src": "src",
    "tests": "tests",
    "plans": "docs/plans",
    "requirements": "docs/requirements",
    "design": "docs/design",
    "reports": "docs/reports"
  },
  "testCommand": "node --test"
}
```

Java with Gradle:

```json
{
  "paths": {
    "src": "src/main",
    "tests": "src/test",
    "plans": "docs/plans",
    "requirements": "docs/requirements",
    "design": "docs/design",
    "reports": "docs/reports"
  },
  "testCommand": "./gradlew test"
}
```

Android:

```json
{
  "paths": {
    "src": "app/src/main",
    "tests": "app/src/test",
    "plans": "docs/plans",
    "requirements": "docs/requirements",
    "design": "docs/design",
    "reports": "docs/reports"
  },
  "testCommand": "./gradlew testDebugUnitTest"
}
```

The agents may run the test command alone, or followed by paths inside the tests folder.
Every other shell command is blocked, so pick a command that runs the whole suite without extra flags.

### 3. Commit

```sh
git add CLAUDE.md .claude/workflow.json
git commit -m "chore(CLAUDE.md): describe project stack"
```

## Build a feature

Start Claude Code in the project folder and describe the feature in plain words:

```sh
claude
```

```text
Add a command line search that finds recipes by ingredient.
```

Claude picks a workflow, tells you which one and why, and calls the first agent.

### Light workflow

This is the default and suits most small features.

| Step | Agent | Writes |
| --- | --- | --- |
| 1 | `planner-agent` | `docs/plans/<feature>.md` |
| | **Checkpoint A**: approve the plan | |
| 2 | `implementer-agent` | code in `src`, tests in `tests`, then runs the tests |
| 3 | `reviewer-agent` | `docs/reports/<feature>-review.md` |
| | **Checkpoint B**: approve or ask for fixes | |

### Full workflow

Use this when a feature needs a written spec and a choice between designs.
Ask for it explicitly:

```text
Use the full workflow. Add user accounts with login and password reset.
```

| Step | Agent | Writes |
| --- | --- | --- |
| 1 | `requirements-agent` | `docs/requirements/<feature>.md` |
| | **Checkpoint A**: approve the spec | |
| 2 | `architect-agent` | `docs/design/<feature>.md` with three designs |
| | **Checkpoint B**: approve the recommended design, or name another | |
| 3 | `implementer-agent` | code in `src` |
| 4 | `tester-agent` | tests in `tests`, `docs/reports/<feature>-test-report.md` |
| 5 | `reviewer-agent` | `docs/reports/<feature>-review.md` |
| | **Checkpoint C**: approve or ask for fixes | |

If the tests fail, Claude sends the failures back to the implementer.
After 3 failed fix rounds it stops and asks you what to do.

### Skipping the workflow

For a typo or a one line fix, the workflow is overhead.
Say so directly:

```text
Skip the workflow and fix the typo in src/cli.js line 12.
```

## Checkpoints

At a checkpoint Claude stops and shows a summary.
Open the written file if you want the details.

* Type `APPROVE` to continue to the next step.
* Type `FIX` at the last checkpoint to send the review findings back to the implementer.
* Anything else counts as not approved: write what should change, and Claude sends it back to the same agent.

Before writing a plan or spec, the planning agent may return **QUESTIONS**.
Claude shows them to you; answer in one message, numbered the same way.

Acceptance criteria are tagged `[test]` or `[review]`.
The `[test]` criteria become automated tests.
The `[review]` criteria are about code structure, and the reviewer checks them by reading the code.

## Where agents may write

| Agent | Writes to | Shell |
| --- | --- | --- |
| `planner-agent` | `docs/plans` | none |
| `requirements-agent` | `docs/requirements` | none |
| `architect-agent` | `docs/design` | none |
| `implementer-agent` | `src`, `tests` | test command only |
| `tester-agent` | `tests`, `docs/reports` | test command only |
| `reviewer-agent` | `docs/reports` | none |

The folder names in this table are the defaults from `.claude/workflow.json`.

## Customize

### Change an agent's model

Edit the `model` field in the agent's front matter in `.claude/agents/`, for example `model: opus` or `model: sonnet`.

### Add an agent

1. Copy an existing file in `.claude/agents/` and change `name`, `description`, `tools`, and the instructions.
2. If it writes files, add a folder key to `paths` in `.claude/workflow.json`.
3. Pass that key to the path guard in the agent's front matter:

   ```yaml
   hooks:
     PreToolUse:
       - matcher: "Write|Edit"
         hooks:
           - type: command
             command: node "$CLAUDE_PROJECT_DIR/.claude/hooks/guard-paths.js" mykey
   ```

4. Add the agent to a workflow in `CLAUDE.md`, otherwise the orchestrator never calls it.

### Change the workflow

The orchestrator follows `CLAUDE.md` literally.
Edit the steps or checkpoints there; no code changes are needed.

## Troubleshooting

### An agent reports `Blocked:`

The agent tried to write outside its folders or to run a command other than the test command.
Usually this is correct, and the agent reports the problem back instead of working around it.
If the agent really needs that folder, add its key to the agent's `guard-paths.js` line.

### Every write is blocked with `unknown path key`

An agent file names a folder key that does not exist in `.claude/workflow.json`.
Fix the key in one of the two files.

### See what the agents did

Every Write, Edit, and Bash call is logged with the agent name:

```sh
cat .claude/logs/tool-calls.log
```

The log folder is ignored by git.

### Check that the hooks work

```sh
node --test .claude/hooks/test/
```

## Limits of the guards

Hooks check the tool call, not what the code does when it runs.
A test file may still write anywhere the test process can write.
Sandboxing is enabled in `.claude/settings.json` to keep shell commands inside the project.
Review agent changes with `git diff` before you commit them.

## Shell function

Add this to `~/.zshrc`, then open a new terminal or run `source ~/.zshrc`:

```sh
newapp() {
  if [[ -z "$1" ]]; then
    echo "Usage: newapp <name> [--public]" >&2
    return 1
  fi
  local visibility="--private"
  [[ "$2" == "--public" ]] && visibility="--public"
  gh repo create "$1" --template pohjus/claude-multi-agent-template \
    "$visibility" --clone && cd "$1"
}
```
