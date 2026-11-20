import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG } from "../scripts/gitkeeper/config.mjs";
import {
  classifyWorkflowRun,
  countAutomaticInvocations,
  getLabelOperations,
  writeLabels,
} from "../scripts/gitkeeper/policy.mjs";

const trustedPr = {
  number: 12,
  state: "open",
  draft: false,
  user: { login: "SumukhaK" },
  head: {
    sha: "abc123",
    repo: { full_name: "SumukhaK/Setu-mobile" },
  },
};

const passingSteps = [
  { name: "Checkout repository", conclusion: "success" },
  { name: "Set up JDK 17", conclusion: "success" },
  { name: "Run Android checks", conclusion: "success" },
];

const run = { head_sha: "abc123", conclusion: "success" };

function classify(overrides = {}) {
  const config = structuredClone(DEFAULT_CONFIG);
  config.worker.enabled = true;
  return classifyWorkflowRun({
    config,
    pr: structuredClone(trustedPr),
    run: { ...run },
    jobs: [{ name: "Android CI", conclusion: run.conclusion, steps: [...passingSteps] }],
    retryCount: 0,
    ...overrides,
  });
}

test("all checks passing clears worker state and leaves the PR ready", () => {
  const result = classify();
  assert.equal(result.decision, "ready");
  assert.deepEqual(getLabelOperations(result), {
    add: [],
    remove: ["gitkeeper/worker-queued", "gitkeeper/worker-running", "gitkeeper/worker-blocked"],
  });
});

test("queues only an allowlisted Gradle check failure on the current trusted PR SHA", () => {
  const jobs = [{ name: "Android CI", conclusion: "failure", steps: [
    ...passingSteps.slice(0, 2),
    { name: "Run Android checks", conclusion: "failure" },
  ] }];
  const result = classify({ run: { ...run, conclusion: "failure" }, jobs });
  assert.equal(result.decision, "queue");
  assert.deepEqual(getLabelOperations(result), {
    add: ["gitkeeper/worker-queued"],
    remove: ["gitkeeper/worker-blocked"],
  });
});

test("blocks setup, runner, timeout, cancellation, missing and unknown outcomes", () => {
  const setupFailure = [{ name: "Android CI", conclusion: "failure", steps: [
    { name: "Checkout repository", conclusion: "failure" },
    { name: "Set up JDK 17", conclusion: "skipped" },
    { name: "Run Android checks", conclusion: "skipped" },
  ] }];
  assert.equal(classify({ run: { ...run, conclusion: "failure" }, jobs: setupFailure }).decision, "blocked");
  assert.equal(classify({ run: { ...run, conclusion: "timed_out" } }).decision, "blocked");
  assert.equal(classify({ run: { ...run, conclusion: "cancelled" } }).decision, "blocked");
  assert.equal(classify({ jobs: [] }).decision, "blocked");
  assert.equal(classify({
    run: { ...run, conclusion: "failure" },
    jobs: [{ name: "Android CI", conclusion: "failure", steps: [
      ...passingSteps.slice(0, 2),
      { name: "Run Android checks", conclusion: "action_required" },
    ] }],
  }).decision, "blocked");
  assert.equal(classify({ workflowTrusted: false }).decision, "blocked");
});

test("does not write labels for stale or ineligible PRs", () => {
  assert.equal(classify({ run: { ...run, head_sha: "old-sha" } }).decision, "stale");
  assert.equal(classify({
    pr: { ...trustedPr, user: { login: "another-user" } },
  }).decision, "ineligible");
  assert.equal(classify({
    pr: { ...trustedPr, head: { ...trustedPr.head, repo: { full_name: "fork/Setu-mobile" } } },
  }).decision, "ineligible");
  assert.equal(classify({ pr: { ...trustedPr, draft: true } }).decision, "ineligible");
  assert.equal(classify({ pr: { ...trustedPr, state: "closed" } }).decision, "ineligible");
});

test("disabled config never queues failures and the retry budget blocks after three queues", () => {
  const disabled = structuredClone(DEFAULT_CONFIG);
  disabled.worker.enabled = false;
  assert.equal(classify({ config: disabled }).decision, "ready");
  const jobs = [{ name: "Android CI", conclusion: "failure", steps: [
    ...passingSteps.slice(0, 2),
    { name: "Run Android checks", conclusion: "failure" },
  ] }];
  const failure = { run: { ...run, conclusion: "failure" }, jobs };
  assert.equal(classify({ ...failure, config: disabled }).decision, "disabled");
  assert.equal(classify({ ...failure, retryCount: 2 }).decision, "queue");
  assert.equal(classify({ ...failure, retryCount: 3 }).decision, "blocked");
});

test("counts queue-label history only within the latest open/reopen cycle", () => {
  const events = [
    { event: "labeled", actor: { login: "github-actions[bot]" }, label: { name: "gitkeeper/worker-queued" }, created_at: "2026-01-01T00:00:00Z" },
    { event: "reopened", created_at: "2026-02-01T00:00:00Z" },
    { event: "labeled", actor: { login: "SumukhaK" }, label: { name: "gitkeeper/worker-queued" }, created_at: "2026-02-01T12:00:00Z" },
    { event: "labeled", actor: { login: "github-actions[bot]" }, label: { name: "gitkeeper/worker-queued" }, created_at: "2026-02-02T00:00:00Z" },
    { event: "unlabeled", label: { name: "gitkeeper/worker-queued" }, created_at: "2026-02-03T00:00:00Z" },
  ];
  assert.equal(countAutomaticInvocations(events), 1);
  assert.throws(() => countAutomaticInvocations([
    { event: "opened", created_at: "2026-01-01T00:00:00Z" },
    { event: "labeled", label: { name: "gitkeeper/worker-queued" }, created_at: "2026-01-02T00:00:00Z" },
  ]), /actor/i);
});

test("the label writer exposes only the three GitKeeper labels", () => {
  assert.deepEqual(getLabelOperations({ decision: "blocked" }), {
    add: ["gitkeeper/worker-blocked"],
    remove: ["gitkeeper/worker-queued"],
  });
  assert.deepEqual(getLabelOperations({ decision: "ignore" }), { add: [], remove: [] });
  assert.deepEqual(getLabelOperations({ decision: "disabled" }), {
    add: [],
    remove: ["gitkeeper/worker-queued", "gitkeeper/worker-blocked"],
  });
  assert.deepEqual(getLabelOperations({ decision: "queue" }), {
    add: ["gitkeeper/worker-queued"],
    remove: ["gitkeeper/worker-blocked"],
  });
});

test("the API label writer uses only narrow add/remove operations and never adds running", async () => {
  const calls = [];
  const octokit = {
    rest: {
      issues: {
        removeLabel: async (input) => calls.push({ operation: "remove", ...input }),
        addLabels: async (input) => calls.push({ operation: "add", ...input }),
      },
    },
  };
  await writeLabels(octokit, {
    owner: "SumukhaK",
    repo: "Setu-mobile",
    pullRequest: {
      number: 12,
      labels: [{ name: "gitkeeper/worker-blocked" }, { name: "gitkeeper/worker-running" }],
      classification: { decision: "queue" },
    },
  });
  assert.deepEqual(calls, [
    { operation: "remove", owner: "SumukhaK", repo: "Setu-mobile", issue_number: 12, name: "gitkeeper/worker-blocked" },
    { operation: "add", owner: "SumukhaK", repo: "Setu-mobile", issue_number: 12, labels: ["gitkeeper/worker-queued"] },
  ]);
});
