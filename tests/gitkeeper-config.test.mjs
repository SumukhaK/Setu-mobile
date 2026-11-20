import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, parseConfig, validateConfig } from "../scripts/gitkeeper/config.mjs";

test("the default config keeps the worker disabled without selecting a model", () => {
  assert.equal(DEFAULT_CONFIG.worker.enabled, false);
  assert.equal(DEFAULT_CONFIG.worker.modelId, null);
  assert.equal(DEFAULT_CONFIG.retry.maxAutomaticInvocations, 3);
  assert.equal(DEFAULT_CONFIG.polling.strategy, "adaptive");
  assert.deepEqual(DEFAULT_CONFIG.motionPreferences.allowed, ["system", "reduced", "full"]);
});

test("validates the complete config shape and rejects unknown keys", () => {
  assert.deepEqual(validateConfig(structuredClone(DEFAULT_CONFIG)), DEFAULT_CONFIG);
  assert.throws(() => validateConfig({ ...DEFAULT_CONFIG, command: "echo unsafe" }), /unknown key/i);
  assert.throws(() => validateConfig({
    ...DEFAULT_CONFIG,
    worker: { ...DEFAULT_CONFIG.worker, permissions: ["write"] },
  }), /unknown key/i);
});

test("rejects credentials, permission grants, arbitrary commands, and model fallbacks", () => {
  for (const unsafeKey of ["token", "credentials", "permissions", "command", "fallbackModelId"]) {
    assert.throws(() => validateConfig({
      ...DEFAULT_CONFIG,
      worker: { ...DEFAULT_CONFIG.worker, [unsafeKey]: "unsafe" },
    }), /unknown key/i);
  }
  assert.throws(() => validateConfig({
    ...DEFAULT_CONFIG,
    worker: { ...DEFAULT_CONFIG.worker, modelId: "ghp_abcdefghijklmnopqrstuvwxyz123456" },
  }), /model identifier/i);
});

test("validates constrained values instead of coercing invalid config", () => {
  assert.throws(() => validateConfig({
    ...DEFAULT_CONFIG,
    worker: { ...DEFAULT_CONFIG.worker, enabled: "true" },
  }), /enabled/i);
  assert.throws(() => validateConfig({
    ...DEFAULT_CONFIG,
    polling: { strategy: "fixed" },
  }), /adaptive/i);
  assert.throws(() => validateConfig({
    ...DEFAULT_CONFIG,
    motionPreferences: { allowed: ["execute-command"] },
  }), /motion/i);
  assert.throws(() => parseConfig("{broken"), /JSON/i);
});
