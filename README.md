# Claude multi agent template

A project template for Claude Code with role based subagents, human checkpoints, and hooks that restrict what each agent may touch.

## Start a new project

```sh
newapp my-app            # private repo, cloned into ./my-app
newapp my-app --public   # public repo
```

`newapp` is a shell function; see [Shell function](#shell-function) below.
Without it, run:

```sh
gh repo create my-app --template pohjus/claude-multi-agent-template --private --clone
```

Then fill in the `# Project` section of `CLAUDE.md` and check `.claude/workflow.json`.

## Workflows

The main session is the orchestrator; the rules live in `CLAUDE.md`.

* **Light** (default): `planner-agent`, checkpoint, `implementer-agent` writes code and tests, `reviewer-agent`, checkpoint.
* **Full**: `requirements-agent`, checkpoint, `architect-agent`, checkpoint, `implementer-agent`, `tester-agent`, `reviewer-agent`, checkpoint.

Ask for the full workflow explicitly when a feature needs a written spec and a design choice.
For a one line fix, skip the workflow and just ask Claude directly.

At every checkpoint, type `APPROVE` to continue.
Anything else counts as not approved.

## Configuration

`.claude/workflow.json` holds the folders and the test command:

```json
{
  "paths": { "src": "src", "tests": "tests", "reports": "docs/reports" },
  "testCommand": "node --test"
}
```

Agents name folders by key in their hooks, for example `guard-paths.js src tests`.
Change the folder values here, not in the agent files.
For a Gradle project, set `testCommand` to `./gradlew test` and `src` to `app/src/main`.

## Where agents may write

| Agent | Writes to | Shell |
| --- | --- | --- |
| `planner-agent` | `docs/plans` | none |
| `requirements-agent` | `docs/requirements` | none |
| `architect-agent` | `docs/design` | none |
| `implementer-agent` | `src`, `tests` | test command only |
| `tester-agent` | `tests`, `docs/reports` | test command only |
| `reviewer-agent` | `docs/reports` | none |

Every Write, Edit, and Bash call is logged to `.claude/logs/tool-calls.log`, which git ignores.

## Limits of the guards

Hooks check the tool call, not what the code does when it runs.
A test file may still write anywhere the test process can write.
Sandboxing is enabled in `.claude/settings.json` to keep shell commands inside the project, but review agent changes before you commit them.

## Testing the hooks

```sh
node --test .claude/hooks/test/
```

## Shell function

Add this to `~/.zshrc`:

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
