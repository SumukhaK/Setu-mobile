import { readFile } from "node:fs/promises";
import { parseConfig } from "./config.mjs";
import { classifyWorkflowRun, countAutomaticInvocations, writeLabels } from "./policy.mjs";

const API_URL = process.env.GITHUB_API_URL ?? "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN;
const EVENT_PATH = process.env.GITHUB_EVENT_PATH;
const EXPECTED_REPOSITORY = "SumukhaK/Setu-mobile";
const API_VERSION = "2022-11-28";

if (!TOKEN || !EVENT_PATH) {
  throw new Error("GITHUB_TOKEN and GITHUB_EVENT_PATH are required");
}

const apiOrigin = new URL(API_URL).origin;

async function request(path, { method = "GET", body, allowNotFound = false } = {}) {
  const url = new URL(path, API_URL);
  if (url.origin !== apiOrigin) {
    throw new Error("GitHub API request escaped the configured API origin");
  }
  const response = await fetch(url, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${TOKEN}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      "x-github-api-version": API_VERSION,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (allowNotFound && response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status}) for ${url.pathname}`);
  }
  return response.json();
}

async function list(path) {
  const values = [];
  for (let page = 1; ; page += 1) {
    const url = new URL(path, API_URL);
    if (url.origin !== apiOrigin) {
      throw new Error("GitHub API request escaped the configured API origin");
    }
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    const response = await fetch(url, {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${TOKEN}`,
        "x-github-api-version": API_VERSION,
      },
    });
    if (!response.ok) {
      throw new Error(`GitHub API request failed (${response.status}) for ${url.pathname}`);
    }
    const pageValues = await response.json();
    if (!Array.isArray(pageValues)) {
      throw new TypeError(`Expected an array from ${url.pathname}`);
    }
    values.push(...pageValues);
    if (pageValues.length < 100) {
      return values;
    }
  }
}

async function listJobs(runId) {
  const result = await request(
    `/repos/${owner}/${repo}/actions/runs/${runId}/jobs?per_page=100&page=1`,
  );
  if (!Array.isArray(result.jobs) || result.total_count > result.jobs.length) {
    throw new TypeError("Expected the PR CI run to have a complete jobs list");
  }
  return result.jobs;
}

const event = JSON.parse(await readFile(EVENT_PATH, "utf8"));
const run = event.workflow_run;
if (!run || run.name !== "PR CI" || run.event !== "pull_request" || run.status !== "completed") {
  console.log("Ignoring a non-completed pull_request workflow run.");
  process.exit(0);
}
if (run.actor?.login !== "SumukhaK") {
  console.log("Ignoring a workflow run from an untrusted actor.");
  process.exit(0);
}
if (run.head_repository?.full_name !== EXPECTED_REPOSITORY) {
  console.log("Ignoring an ineligible head repository.");
  process.exit(0);
}

const [owner, repo] = EXPECTED_REPOSITORY.split("/");
const repository = await request(`/repos/${owner}/${repo}`);
if (repository.default_branch !== "main") {
  throw new Error("The configured default branch must be main");
}
const sourceWorkflow = await request(`/repos/${owner}/${repo}/actions/workflows/${run.workflow_id}`);
if (sourceWorkflow.path !== ".github/workflows/pr-ci.yml") {
  throw new Error("The completed workflow run did not originate from the PR CI workflow");
}

const configResponse = await request(
  `/repos/${owner}/${repo}/contents/.github/gitkeeper.json?ref=${encodeURIComponent(repository.default_branch)}`,
);
const config = parseConfig(Buffer.from(configResponse.content, "base64").toString("utf8"));
const jobs = await listJobs(run.id);
const runPullRequests = Array.isArray(run.pull_requests) ? run.pull_requests : [];
if (runPullRequests.length === 0) {
  console.log("The completed run has no associated pull request.");
  process.exit(0);
}

for (const candidate of runPullRequests) {
  if (!Number.isInteger(candidate.number)
      || typeof candidate.head?.ref !== "string"
      || typeof candidate.head?.sha !== "string"
      || typeof candidate.base?.sha !== "string") {
    continue;
  }

  const issue = await request(`/repos/${owner}/${repo}/issues/${candidate.number}`);
  if (!issue?.pull_request) {
    continue;
  }
  const currentHead = await request(
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(candidate.head.ref)}`,
    { allowNotFound: true },
  );
  const runHeadSha = candidate.head.sha;
  const pullRequest = {
    number: issue.number,
    state: issue.state,
    draft: issue.draft,
    pull_request: issue.pull_request,
    user: issue.user,
    head: {
      sha: currentHead?.object?.sha ?? null,
      repo: { full_name: run.head_repository.full_name },
    },
    labels: issue.labels,
  };
  const eligible = pullRequest.state === "open"
    && pullRequest.draft === false
    && pullRequest.user?.login === "SumukhaK"
    && pullRequest.head.repo.full_name === EXPECTED_REPOSITORY
    && pullRequest.head.sha === runHeadSha;
  let workflowTrusted = false;
  if (eligible) {
    const [baseWorkflow, headWorkflow] = await Promise.all([
      request(
        `/repos/${owner}/${repo}/contents/.github/workflows/pr-ci.yml?ref=${encodeURIComponent(candidate.base.sha)}`,
        { allowNotFound: true },
      ),
      request(
        `/repos/${owner}/${repo}/contents/.github/workflows/pr-ci.yml?ref=${encodeURIComponent(runHeadSha)}`,
        { allowNotFound: true },
      ),
    ]);
    workflowTrusted = Boolean(baseWorkflow?.sha)
      && baseWorkflow.sha === headWorkflow?.sha;
  }
  const base = {
    config,
    pr: pullRequest,
    run: { ...run, head_sha: runHeadSha },
    jobs,
  };
  let retryCount;
  if (eligible
      && workflowTrusted
      && config.worker_enabled
      && run.conclusion === "failure") {
    const events = await list(`/repos/${owner}/${repo}/issues/${pullRequest.number}/timeline`);
    retryCount = countAutomaticInvocations(events);
  }

  const classification = classifyWorkflowRun({ ...base, retryCount, workflowTrusted });
  if (classification.decision === "stale" || classification.decision === "ineligible") {
    continue;
  }
  await writeLabels({
    rest: {
      issues: {
        removeLabel: async ({ issue_number, name }) => {
          await request(
            `/repos/${owner}/${repo}/issues/${issue_number}/labels/${encodeURIComponent(name)}`,
            { method: "DELETE" },
          );
        },
        addLabels: async ({ issue_number, labels }) => {
          await request(
            `/repos/${owner}/${repo}/issues/${issue_number}/labels`,
            { method: "POST", body: { labels } },
          );
        },
      },
    },
  }, {
    owner,
    repo,
    pullRequest: { ...pullRequest, classification },
  });
  console.log(`PR #${pullRequest.number}: ${classification.decision}`);
}
