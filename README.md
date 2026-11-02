# Claude multi agent template

A project template for Claude Code where the work on a feature is split between specialised subagents.
An orchestrator agent calls them in a fixed order and stops at checkpoints for your approval.
Hooks restrict which folders each agent may write to and which shell commands it may run.

New to this? Start with the step by step [tutorial](TUTORIAL.md).

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
* Test file naming: `tests/<name>.test.js`; the test command must find these files without arguments.
* Source folder and test folder: see `paths` in `.claude/workflow.json`.
```

Every agent reads this file, so add anything they all should know, such as coding conventions or libraries that are not allowed.
The test file naming matters: a plain `node --test` only finds files such as `*.test.js`, and a run that finds zero tests counts as a failure when the plan or spec has `[test]` criteria.
Keep the `# Workflow` section as it is.

### 2. Set folders and the test command in `.claude/workflow.json`

The guard hook reads this file: the folders, the test command, and what each agent may do.
The agent files never need to change when folders change.

For a Node.js project the defaults already fit.
For other stacks, change only `src`, `tests`, and `testCommand`, and leave every other key as it is.
Above all, keep the `agents` block: without it the guard blocks every agent call with a config error.

Java with Gradle:

```json
"src": "src/main",
"tests": "src/test",
"testCommand": "./gradlew test"
```

Android:

```json
"src": "app/src/main",
"tests": "app/src/test",
"testCommand": "./gradlew testDebugUnitTest"
```

`src` and `tests` live inside the `paths` block; `testCommand` is at the top level.

Agents may run the test command alone, or followed by paths inside the tests folder.
Commands may only contain letters, digits, spaces, and `.` `/` `_` `-`.
Pick a test command that runs the whole suite without extra flags.
Path arguments only help with runners that accept them, such as `node --test`.
Gradle reads extra arguments as task names, so for Gradle the agents should run the whole suite; say so in the `# Project` section of `CLAUDE.md`.

### 3. Gradle projects: let the sandbox reach Gradle

The sandbox only lets shell commands write inside the project and the temp folder.
Gradle also writes to `~/.gradle` and downloads dependencies, so add this to the `sandbox` block in `.claude/settings.json`:

```json
"sandbox": {
  "enabled": true,
  "filesystem": { "allowWrite": ["~/.gradle", "~/.android"] },
  "network": {
    "allowedDomains": [
      "services.gradle.org",
      "plugins.gradle.org",
      "repo.maven.apache.org",
      "dl.google.com"
    ]
  }
}
```

If the build still fails inside the sandbox, add `"excludedCommands": ["./gradlew *"]` to the same block; that runs Gradle outside the sandbox.

### 4. Check the guards and commit

The guards run from `.claude/settings.json`, so they work as soon as the files are in place.
Run the hook tests to check that `workflow.json` is still valid and every agent has rules:

```sh
node --test .claude/hooks/test/
git add CLAUDE.md .claude
git commit -m "chore(CLAUDE.md): describe project stack"
```

## Build a feature

Start the orchestrator in the project folder and describe the feature in plain words:

```sh
claude --agent orchestrator
```

```text
Add a command line search that finds recipes by ingredient.
```

The orchestrator first checks that `git status` is clean, so each feature starts from a commit.
Then it picks a feature name, used in every file the agents write, picks a workflow, and tells you which one and why.

At every step and checkpoint the orchestrator prints where you are:

```text
LIGHT WORKFLOW: recipe-search

 [x] 1. Plan           planner-agent
 [x]    Checkpoint A   you: APPROVE or feedback
 [>] 2. Implement      implementer-agent   <- now
 [ ] 3. Run tests      orchestrator
 [ ] 4. Review         reviewer-agent
 [ ]    Checkpoint B   you: APPROVE or FIX

Next: Nothing to do yet.
```

`[x]` is done, `[>]` is running, `[ ]` is still to come, and `[!]` means the orchestrator stopped and waits for you.
The `Next:` line under the list says whether you need to do anything and what you can type.

### Light workflow

This is the default and suits most small features.

| Step | Who | Result |
| --- | --- | --- |
| 1 | `planner-agent` | `docs/plans/<feature>.md` |
| | **Checkpoint A**: approve the plan | |
| 2 | `implementer-agent` | code in `src`, tests in `tests` |
| 3 | orchestrator | runs the tests itself; failures go back to the implementer |
| 4 | `reviewer-agent` | `docs/reports/<feature>-review.md` |
| | **Checkpoint B**: approve or ask for fixes | |

### Full workflow

Use this when a feature needs a written spec and a choice between designs.
Ask for it explicitly:

```text
Use the full workflow. Add user accounts with login and password reset.
```

| Step | Who | Result |
| --- | --- | --- |
| 1 | `requirements-agent` | `docs/requirements/<feature>.md` |
| | **Checkpoint A**: approve the spec | |
| 2 | `architect-agent` | `docs/design/<feature>.md` with three numbered designs |
| | **Checkpoint B**: pick a design | |
| 3 | `implementer-agent` | code in `src` |
| 4 | `tester-agent` | tests in `tests`, `docs/reports/<feature>-test-report.md` |
| 5 | `reviewer-agent` | `docs/reports/<feature>-review.md` |
| | **Checkpoint C**: approve or ask for fixes | |

If tests fail, the failures go back to the implementer and the tests run again.
After 3 failed fix rounds the orchestrator stops and asks you what to do.

When the workflow is done, the orchestrator lists the changed files and suggests a commit message.
It does not commit; you do.

### Small changes without the workflow

For a typo or a one line fix, the workflow is overhead.
Start plain `claude` instead of the orchestrator and ask directly.
A plain session has no path guards, so review the diff before you commit.

## Checkpoints

At a checkpoint the orchestrator stops and shows a summary.
At the last checkpoint the summary also warns about files changed outside the folders agents may write to.
Open the written file if you want the details.

* `APPROVE` continues to the next step.
* `APPROVE 2` at the design checkpoint picks design 2 instead of the recommended one.
* A question is answered, and you stay at the checkpoint.
* Before the last checkpoint, anything else is feedback: the orchestrator sends it to the agent that wrote the file, and you return to the same checkpoint.
* At the last checkpoint, `FIX` or any change request starts a fix round with the review findings plus your text.
  Code changes go to the implementer, test changes go to the tester in the full workflow, and then the tests and the review run again.

An agent may also stop and ask instead of delivering: questions, a proposal to split the feature, a proposal to switch to the full workflow, or a report that a test or the spec is wrong.
The orchestrator shows it to you and acts on your answer.
Agreeing that the plan or spec is wrong sends your correction to the agent that wrote it, and you return to that checkpoint.
Accepting a switch to the full workflow restarts at the spec step.
Accepting a split asks which part to build now; the other parts become later features.

Acceptance criteria are tagged `[test]` or `[review]`.
The `[test]` criteria become automated tests, and the reviewer checks that each one really has a test.
The `[review]` criteria are about code structure, and the reviewer checks them by reading the code.

## What each agent may do

| Agent | Writes to | Shell |
| --- | --- | --- |
| `orchestrator` | nothing | test command, `git status --short -uall`, `git diff`, `git diff --stat` |
| `planner-agent` | `docs/plans` | none |
| `requirements-agent` | `docs/requirements` | none |
| `architect-agent` | `docs/design` | none |
| `implementer-agent` | `src`, `tests` | test command |
| `tester-agent` | `tests`, `docs/reports` | test command |
| `reviewer-agent` | `docs/reports` | none |

These rules live in the `agents` block of `.claude/workflow.json`:

```json
"agents": {
  "orchestrator": { "write": [], "bash": ["test", "git"] },
  "planner-agent": { "write": ["plans"], "bash": [] },
  "implementer-agent": { "write": ["src", "tests"], "bash": ["test"] }
}
```

`write` lists folder keys from `paths`.
`bash` may contain `test` for the test command, `git` for the read only git commands, both, or neither.
No agent may switch off the sandbox for a command.
One hook, `.claude/hooks/guard.js`, checks every Write, Edit, and Bash call against these rules, using the agent name Claude Code passes to the hook.
A plain `claude` session and agents not listed in `agents` are not restricted.
Subagents cannot start other subagents, because `Agent` is not in their `tools`.

## Customize

### Change an agent's model

Edit the `model` field in the agent's front matter in `.claude/agents/`, for example `model: opus` or `model: sonnet`.

### Add an agent

1. Copy an existing file in `.claude/agents/` and change `name`, `description`, `tools`, and the instructions.
2. If it writes into a new folder, add a folder key to `paths` in `.claude/workflow.json`.
3. Add the agent's rules to `agents` in `.claude/workflow.json`, using the same name as in its front matter:

   ```json
   "my-agent": { "write": ["mykey"], "bash": [] }
   ```

   Without this entry the agent is not restricted at all.
   The hook tests fail if an agent in `.claude/agents/` has no entry, so run them after adding one.

4. In `.claude/agents/orchestrator.md`, add the agent to the `Agent(...)` list in `tools` and to a workflow; otherwise the orchestrator cannot call it.

### Change the workflow

The orchestrator follows `.claude/agents/orchestrator.md` literally.
Edit the steps or checkpoints there; no code changes are needed.

## Troubleshooting

### An agent reports `Blocked:`

The agent tried to write outside its folders or to run a command it is not allowed to run.
Usually this is correct, and the agent reports the problem back instead of working around it.
If the agent really needs that folder, add its key to the agent's `write` list in `.claude/workflow.json`.

### Every write is blocked with `unknown path key`

An agent's `write` list in `.claude/workflow.json` names a key that does not exist in `paths`.
Run the hook tests to find it.

### The guards do not seem to run

Check that `.claude/settings.json` still has the `guard.js` hook, and that the agent's name in its front matter matches its entry in `agents`.

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
Code run by the tests may write anywhere in the project, including `.claude/hooks/` and `.claude/agents/`, so it can loosen the guards themselves.
Sandboxing is enabled in `.claude/settings.json`, which keeps shell commands inside the project folder and the temp folder, but hooks themselves run outside the sandbox.
Before the last checkpoint the orchestrator warns about any changed file outside the source, tests, and docs folders.
Still review agent changes with `git diff`, and check `git diff -- .claude` in particular, before you commit them.

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
