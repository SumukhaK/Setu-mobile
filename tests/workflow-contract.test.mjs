import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readWorkflow = (name) => readFile(new URL(`../.github/workflows/${name}`, import.meta.url), "utf8");

test("PR CI is read-only, secret-free, and runs only on PR open/synchronize events", async () => {
  const workflow = await readWorkflow("pr-ci.yml");
  assert.match(workflow, /pull_request:\s*\n\s+types:\s*\[opened,\s*synchronize\]/);
  assert.doesNotMatch(workflow, /^\s+push:/m);
  assert.doesNotMatch(workflow, /pull_request_target|secrets\./i);
  assert.match(workflow, /permissions:\s*\n\s+contents:\s+read/);
  assert.doesNotMatch(workflow, /:\s*(write|admin)\b/i);
  assert.equal((workflow.match(/\.\/gradlew testDebugUnitTest detekt lint/g) ?? []).length, 1);
});

test("the privileged workflow is default-branch workflow_run only and never consumes PR artifacts", async () => {
  const workflow = await readWorkflow("gitkeeper-state.yml");
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /branches:\s*\[main\]/);
  assert.doesNotMatch(workflow, /pull_request_target|download-artifact|actions\/download-artifact/i);
  assert.doesNotMatch(workflow, /pull_request:\s*\n/);
  assert.match(workflow, /ref:\s*\$\{\{\s*github\.event\.repository\.default_branch\s*\}\}/);
  assert.match(workflow, /workflow-run\.mjs/);
  assert.match(workflow, /actions:\s*read/);
  assert.match(workflow, /pull-requests:\s*write/);
  assert.doesNotMatch(workflow, /issues:\s*write/);
});

test("the state workflow reads config and metadata through API without running PR content", async () => {
  const script = await readFile(new URL("../scripts/gitkeeper/workflow-run.mjs", import.meta.url), "utf8");
  assert.match(script, /\.github\/gitkeeper\.json/);
  assert.match(script, /api\.github\.com/);
  assert.match(script, /\/pulls\/\$\{pullRequest\.number\}\/files/);
  assert.doesNotMatch(script, /execSync|spawnSync|child_process/);
  assert.doesNotMatch(script, /actions\/download-artifact|artifact/i);
});
