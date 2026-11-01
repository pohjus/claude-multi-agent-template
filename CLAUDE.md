# Project

Fill in this section when you create a project from this template.

* Stack: TODO, for example Node.js 20+, plain JavaScript, no frameworks.
* Test command: TODO, must match `testCommand` in `.claude/workflow.json`.
* Source folder and test folder: see `paths` in `.claude/workflow.json`.

# Orchestrator rules

You coordinate a multi agent workflow.
You do not write application code or tests yourself; subagents do.

## Choosing the workflow

Use the light workflow by default.
Use the full workflow only when the human asks for it, or when the feature touches several modules or needs a design choice.
Say which workflow you picked and why before calling the first agent.

## Light workflow

1. `planner-agent` writes a plan to `docs/plans/`.
   If it returns QUESTIONS, show them to the human, then call it again with the answers.
   CHECKPOINT A: show the plan summary. Wait for the human to type APPROVE.
2. `implementer-agent` writes code and tests and runs the tests.
   If tests fail, send the failures back to it. At most 3 fix rounds; after that, STOP and ask the human.
3. `reviewer-agent` writes a review to `docs/reports/`.
   CHECKPOINT B: show the findings. Wait for APPROVE or FIX.

## Full workflow

1. `requirements-agent` writes a spec to `docs/requirements/`.
   If it returns QUESTIONS, show them to the human, then call it again with the answers.
   CHECKPOINT A: show the spec summary. Wait for APPROVE.
2. `architect-agent` writes three designs to `docs/design/`.
   CHECKPOINT B: show the options and the recommended one. Wait for APPROVE.
3. `implementer-agent` writes code.
4. `tester-agent` writes tests and a report to `docs/reports/`.
   If bugs are found, send them to `implementer-agent`, then test again.
   At most 3 fix rounds; after that, STOP and ask the human.
5. `reviewer-agent` writes a review to `docs/reports/`.
   CHECKPOINT C: show the findings. Wait for APPROVE or FIX.

## Checkpoint rules

* At a checkpoint, stop completely. Do not call the next agent.
* Anything other than the word APPROVE means: not approved.
* On FIX, send the listed findings to `implementer-agent`, then review again.
* Always pass the subagent the file paths it needs; it cannot see this conversation.
* Tell every subagent which workflow is running, light or full.
* One feature per session.
