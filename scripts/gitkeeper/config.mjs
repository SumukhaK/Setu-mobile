const ROOT_KEYS = [
  "worker_enabled",
  "polling_preferences",
  "motion_preference",
  "deterministic_check_ids",
];
const POLLING_KEYS = ["mode"];
const ALLOWED_MOTION_PREFERENCES = new Set(["reduced", "disabled"]);
export const DETERMINISTIC_CHECK_IDS = Object.freeze(["Android CI"]);

export const DEFAULT_CONFIG = Object.freeze({
  worker_enabled: false,
  polling_preferences: Object.freeze({ mode: "adaptive" }),
  motion_preference: null,
  deterministic_check_ids: DETERMINISTIC_CHECK_IDS,
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
  if (typeof value.worker_enabled !== "boolean") {
    throw new TypeError("config.worker_enabled must be a boolean");
  }

  assertKeys(value.polling_preferences, POLLING_KEYS, "config.polling_preferences");
  if (value.polling_preferences.mode !== "adaptive") {
    throw new TypeError('config.polling_preferences.mode must be "adaptive"');
  }

  if (value.motion_preference !== null
      && !ALLOWED_MOTION_PREFERENCES.has(value.motion_preference)) {
    throw new TypeError('config.motion_preference must be null, "reduced", or "disabled"');
  }

  if (!Array.isArray(value.deterministic_check_ids)
      || value.deterministic_check_ids.length !== DETERMINISTIC_CHECK_IDS.length
      || value.deterministic_check_ids.some((checkId, index) => (
        checkId !== DETERMINISTIC_CHECK_IDS[index]
      ))) {
    throw new TypeError("config.deterministic_check_ids must exactly match the allowlist");
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
