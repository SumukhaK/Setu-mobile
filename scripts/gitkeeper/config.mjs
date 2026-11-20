const ROOT_KEYS = ["schemaVersion", "worker", "retry", "polling", "motionPreferences"];
const WORKER_KEYS = ["enabled", "modelId"];
const RETRY_KEYS = ["maxAutomaticInvocations"];
const POLLING_KEYS = ["strategy"];
const MOTION_KEYS = ["allowed"];
const MOTION_PREFERENCES = new Set(["system", "reduced", "full"]);

export const DEFAULT_CONFIG = Object.freeze({
  schemaVersion: 1,
  worker: Object.freeze({ enabled: false, modelId: null }),
  retry: Object.freeze({ maxAutomaticInvocations: 3 }),
  polling: Object.freeze({ strategy: "adaptive" }),
  motionPreferences: Object.freeze({ allowed: Object.freeze(["system", "reduced", "full"]) }),
});

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertKeys(value, allowed, location) {
  if (!isRecord(value)) {
    throw new TypeError(`${location} must be an object`);
  }
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw new TypeError(`${location} contains unknown key: ${unknown.join(", ")}`);
  }
  for (const key of allowed) {
    if (!Object.hasOwn(value, key)) {
      throw new TypeError(`${location}.${key} is required`);
    }
  }
}

export function validateConfig(value) {
  assertKeys(value, ROOT_KEYS, "config");
  if (value.schemaVersion !== 1) {
    throw new TypeError("config.schemaVersion must be 1");
  }

  assertKeys(value.worker, WORKER_KEYS, "config.worker");
  if (typeof value.worker.enabled !== "boolean") {
    throw new TypeError("config.worker.enabled must be a boolean");
  }
  if (value.worker.modelId !== null
      && (typeof value.worker.modelId !== "string"
        || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(value.worker.modelId)
        || /^(gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,})$/.test(value.worker.modelId))) {
    throw new TypeError("config.worker.modelId must be null or a model identifier");
  }

  assertKeys(value.retry, RETRY_KEYS, "config.retry");
  if (value.retry.maxAutomaticInvocations !== 3) {
    throw new TypeError("config.retry.maxAutomaticInvocations must be 3");
  }

  assertKeys(value.polling, POLLING_KEYS, "config.polling");
  if (value.polling.strategy !== "adaptive") {
    throw new TypeError('config.polling.strategy must be "adaptive"');
  }

  assertKeys(value.motionPreferences, MOTION_KEYS, "config.motionPreferences");
  if (!Array.isArray(value.motionPreferences.allowed)
      || value.motionPreferences.allowed.some((preference) => !MOTION_PREFERENCES.has(preference))
      || new Set(value.motionPreferences.allowed).size !== value.motionPreferences.allowed.length) {
    throw new TypeError("config.motionPreferences.allowed contains an invalid motion preference");
  }

  return value;
}

export function parseConfig(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new SyntaxError("config must be valid JSON", { cause: error });
  }
  return validateConfig(parsed);
}
