import { describe, expect, it } from "vitest";

import { profileCommands, runProfile } from "../../../scripts/ci-profile.mjs";

describe("ci profiles", () => {
  it("lists the five profiles without running them", () => {
    const names = ["fast", "full", "platform", "report", "release"] as const;
    for (const name of names) {
      const result = runProfile({ profile: name, list: true, reportsDir: "reports/ci-profile" });
      expect(result.exitCode).toBe(0);
      expect(result.payload.profile).toBe(name);
    }
  });

  it("keeps the test suite in full and out of fast", () => {
    const fast = profileCommands("fast").map(([cmd, args]) => [cmd, ...args].join(" "));
    const full = profileCommands("full").map(([cmd, args]) => [cmd, ...args].join(" "));
    expect(fast.some((line) => line.includes("npm test"))).toBe(false);
    expect(full.some((line) => line.startsWith("npm test"))).toBe(true);
    expect(profileCommands("release").map(([cmd]) => cmd)).toContain("node");
    expect(profileCommands("platform", "win32")[0][0]).toBe("pwsh");
    expect(profileCommands("platform", "linux")[0][0]).toBe("bash");
  });

  it("rejects an unknown profile", () => {
    expect(() => profileCommands("nightly")).toThrow(/unknown profile/);
  });
});
