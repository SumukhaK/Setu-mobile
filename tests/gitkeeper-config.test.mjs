import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, parseConfig, validateConfig } from "../scripts/gitkeeper/config.mjs";

test("the default config uses only the approved fields and values", () => {
  assert.deepEqual(Object.keys(DEFAULT_CONFIG).sort(), [
    "deterministic_check_ids",
    "motion_preference",
    "polling_preferences",
    "worker_enabled",
  ]);
  assert.equal(DEFAULT_CONFIG.worker_enabled, false);
  assert.deepEqual(DEFAULT_CONFIG.polling_preferences, { mode: "adaptive" });
  assert.equal(DEFAULT_CONFIG.motion_preference, null);
  assert.deepEqual(DEFAULT_CONFIG.deterministic_check_ids, ["Android CI"]);
});

test("accepts only the supported worker, polling, motion, and deterministic-check values", () => {
  for (const worker_enabled of [true, false]) {
    assert.equal(validateConfig({ ...DEFAULT_CONFIG, worker_enabled }).worker_enabled, worker_enabled);
  }
  for (const motion_preference of [null, "reduced", "disabled"]) {
    assert.equal(validateConfig({ ...DEFAULT_CONFIG, motion_preference }).motion_preference, motion_preference);
  }
  assert.deepEqual(validateConfig({
    ...DEFAULT_CONFIG,
    polling_preferences: { mode: "adaptive" },
    deterministic_check_ids: ["Android CI"],
  }), DEFAULT_CONFIG);
});

test("rejects all unknown keys, including model IDs, retry config, credentials, permissions, and commands", () => {
  for (const key of [
    "modelId",
    "model_id",
    "retry",
    "fallbackModelId",
    "token",
    "credentials",
    "permissions",
    "command",
  ]) {
    assert.throws(() => validateConfig({ ...DEFAULT_CONFIG, [key]: "unsafe" }), /unknown key/i);
  }
  assert.throws(() => validateConfig({
    ...DEFAULT_CONFIG,
    polling_preferences: { mode: "adaptive", command: "echo unsafe" },
  }), /unknown key/i);
});

test("rejects unsupported values and absent or unknown deterministic check IDs", () => {
  for (const worker_enabled of ["true", 1, null]) {
    assert.throws(() => validateConfig({ ...DEFAULT_CONFIG, worker_enabled }), /worker_enabled/i);
  }
  for (const mode of ["fixed", null, "adaptive "]) {
    assert.throws(() => validateConfig({
      ...DEFAULT_CONFIG,
      polling_preferences: { mode },
    }), /adaptive/i);
  }
  for (const motion_preference of ["system", "full", "execute-command", true]) {
    assert.throws(() => validateConfig({ ...DEFAULT_CONFIG, motion_preference }), /motion_preference/i);
  }
  for (const deterministic_check_ids of [undefined, [], ["Other CI"], ["Android CI", "Other CI"], ["Android CI", "Android CI"]]) {
    const config = { ...DEFAULT_CONFIG };
    if (deterministic_check_ids === undefined) {
      delete config.deterministic_check_ids;
    } else {
      config.deterministic_check_ids = deterministic_check_ids;
    }
    assert.throws(() => validateConfig(config), /deterministic_check_ids/i);
  }
  assert.throws(() => parseConfig("{broken"), /JSON/i);
});
