/**
 * v2.4.11 -- "do not show again" lasts for this install, not forever.
 *
 * Operator report: the switch dialog never appeared after a fresh install,
 * because a suppression chosen on an earlier build was still sitting in
 * localStorage -- which outlives the app. The stored value now carries the
 * build that wrote it.
 */

import { describe, expect, it } from "vitest";

import {
  ASK_BEFORE_MODEL_SWITCH_BUILD_KEY,
  ASK_BEFORE_MODEL_SWITCH_KEY,
  askBeforeModelSwitch,
  setAskBeforeModelSwitch,
  type PreferenceStorage,
} from "../src/shared/models/modelSwitchPreference";

function memoryStorage(seed: Record<string, string> = {}): PreferenceStorage & {
  data: Record<string, string>;
} {
  const data = { ...seed };
  return {
    data,
    getItem: (key) => (key in data ? data[key]! : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe("askBeforeModelSwitch", () => {
  it("asks by default", () => {
    expect(askBeforeModelSwitch(memoryStorage(), "build-1")).toBe(true);
  });

  it("honors a suppression made on this build", () => {
    const storage = memoryStorage();
    setAskBeforeModelSwitch(false, storage, "build-1");
    expect(askBeforeModelSwitch(storage, "build-1")).toBe(false);
  });

  it("asks again after a new install, and forgets the stale choice", () => {
    const storage = memoryStorage();
    setAskBeforeModelSwitch(false, storage, "build-1");

    expect(askBeforeModelSwitch(storage, "build-2")).toBe(true);
    // The stale value is cleared as it is read, so the next read agrees.
    expect(storage.data[ASK_BEFORE_MODEL_SWITCH_KEY]).toBe("true");
    expect(storage.data[ASK_BEFORE_MODEL_SWITCH_BUILD_KEY]).toBe("build-2");
    expect(askBeforeModelSwitch(storage, "build-2")).toBe(true);
  });

  it("asks when a suppression carries no build at all (pre-2.4.11 value)", () => {
    const storage = memoryStorage({ [ASK_BEFORE_MODEL_SWITCH_KEY]: "false" });
    expect(askBeforeModelSwitch(storage, "build-1")).toBe(true);
  });

  it("asks when storage is unavailable", () => {
    expect(askBeforeModelSwitch(null, "build-1")).toBe(true);
  });
});
