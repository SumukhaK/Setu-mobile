import { DEFAULT_CONFIG, DETERMINISTIC_CHECK_IDS } from "./config.mjs";

export const LABELS = Object.freeze({
  queued: "gitkeeper/worker-queued",
  running: "gitkeeper/worker-running",
  blocked: "gitkeeper/worker-blocked",
});

const REQUIRED_STEPS = Object.freeze([
  "Checkout repository",
  "Set up JDK 17",
  "Run Android checks",
]);
const MAX_AUTOMATIC_INVOCATIONS = 3;

function classifyEligibility(pr, run) {
  if (!pr || !run || !pr.head || pr.head.sha !== run.head_sha) {
    return "stale";
  }
  if (run.actor?.login !== "SumukhaK"
      || !pr.pull_request
      || pr.state !== "open"
      || pr.draft !== false
      || pr.user?.login !== "SumukhaK"
      || pr.head.repo?.full_name !== "SumukhaK/Setu-mobile") {
    return "ineligible";
  }
  return null;
}

function isCompleteOutcome(value) {
  return value === "success" || value === "skipped";
}

function classifyChecks(run, jobs, deterministicCheckIds) {
  if (run.conclusion === "success") {
    const job = jobs.length === 1 ? jobs[0] : null;
    const steps = new Map((job?.steps ?? []).map((step) => [step.name, step.conclusion]));
    if (job?.name && deterministicCheckIds.includes(job.name)
        && steps.size === (job.steps ?? []).length
        && job.conclusion === "success"
        && REQUIRED_STEPS.every((name) => steps.get(name) === "success")
        && (job.steps ?? []).every((step) => isCompleteOutcome(step.conclusion))) {
      return "ready";
    }
    return "blocked";
  }

  if (run.conclusion !== "failure" || jobs.length !== 1) {
    return "blocked";
  }

  const [job] = jobs;
  const steps = new Map((job.steps ?? []).map((step) => [step.name, step.conclusion]));
  const gradleFailed = steps.get("Run Android checks") === "failure";
  const setupPassed = REQUIRED_STEPS.slice(0, 2).every((name) => steps.get(name) === "success");
  const allOtherStepsCompleted = (job.steps ?? []).every((step) => (
    step.name === "Run Android checks"
      ? step.conclusion === "failure"
      : isCompleteOutcome(step.conclusion)
  ));
  if (job.name && deterministicCheckIds.includes(job.name)
      && steps.size === (job.steps ?? []).length
      && job.conclusion === "failure"
      && gradleFailed
      && setupPassed
      && allOtherStepsCompleted) {
    return "deterministic-failure";
  }
  return "blocked";
}

export function classifyWorkflowRun({
  config = DEFAULT_CONFIG,
  pr,
  run,
  jobs,
  retryCount,
  workflowTrusted = true,
}) {
  const eligibility = classifyEligibility(pr, run);
  if (eligibility) {
    return { decision: eligibility };
  }
  if (!workflowTrusted) {
    return { decision: "blocked" };
  }
  const configuredCheckIds = config?.deterministic_check_ids;
  const checkIds = Array.isArray(configuredCheckIds)
      && configuredCheckIds.length === DETERMINISTIC_CHECK_IDS.length
      && configuredCheckIds.every((checkId, index) => checkId === DETERMINISTIC_CHECK_IDS[index])
    ? configuredCheckIds
    : [];
  const outcome = classifyChecks(run, jobs ?? [], checkIds);
  if (outcome === "ready") {
    return { decision: "ready" };
  }
  if (outcome !== "deterministic-failure") {
    return { decision: "blocked" };
  }
  if (!config.worker_enabled) {
    return { decision: "disabled" };
  }
  if (!Number.isInteger(retryCount) || retryCount < 0) {
    return { decision: "blocked" };
  }
  return {
    decision: retryCount < MAX_AUTOMATIC_INVOCATIONS ? "queue" : "blocked",
  };
}

export function countAutomaticInvocations(events) {
  if (!Array.isArray(events)) {
    throw new TypeError("timeline events must be an array");
  }
  let cycleStart = Number.NEGATIVE_INFINITY;
  for (const event of events) {
    if (event.event === "opened" || event.event === "reopened") {
      const timestamp = Date.parse(event.created_at);
      if (!Number.isFinite(timestamp)) {
        throw new TypeError("open/reopen timeline event has an invalid timestamp");
      }
      cycleStart = Math.max(cycleStart, timestamp);
    }
  }
  if (cycleStart === Number.NEGATIVE_INFINITY) {
    throw new TypeError("timeline does not contain an open/reopen event");
  }
  let count = 0;
  for (const event of events) {
    if (event.event !== "labeled" || event.label?.name !== LABELS.queued) {
      continue;
    }
    if (typeof event.actor?.login !== "string") {
      throw new TypeError("queued-label timeline event has no actor");
    }
    if (event.actor.login !== "github-actions[bot]") {
      continue;
    }
    const timestamp = Date.parse(event.created_at);
    if (!Number.isFinite(timestamp)) {
      throw new TypeError("queued-label timeline event has an invalid timestamp");
    }
    if (timestamp >= cycleStart) {
      count += 1;
    }
  }
  return count;
}

export function getLabelOperations(result) {
  switch (result.decision) {
    case "ready":
      return { add: [], remove: Object.values(LABELS) };
    case "queue":
      return { add: [LABELS.queued], remove: [LABELS.blocked] };
    case "blocked":
      return { add: [LABELS.blocked], remove: [LABELS.queued] };
    case "disabled":
      return { add: [], remove: [LABELS.queued, LABELS.blocked] };
    default:
      return { add: [], remove: [] };
  }
}

export async function writeLabels(octokit, { owner, repo, pullRequest }) {
  const operations = getLabelOperations(pullRequest.classification);
  const currentLabels = new Set((pullRequest.labels ?? []).map((label) => label.name));
  for (const name of operations.remove) {
    if (currentLabels.has(name)) {
      await octokit.rest.issues.removeLabel({ owner, repo, issue_number: pullRequest.number, name });
    }
  }
  const labelsToAdd = operations.add.filter((name) => !currentLabels.has(name));
  if (labelsToAdd.length > 0) {
    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: pullRequest.number,
      labels: labelsToAdd,
    });
  }
}
