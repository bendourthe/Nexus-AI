import { describe, expect, it } from "vitest";
import {
  ChatExplorerTreeResponse,
  SettingsGetResponse,
  SettingsSetRequest,
  SettingsSetResponse,
  StudioImageEditCommitRequest,
  StudioSessionTreeResponse,
} from "../sidecar/src/protocol";

describe("protocol compatibility across the Zod security upgrade", () => {
  it.each([
    ["chat tree", ChatExplorerTreeResponse, {}],
    ["studio tree", StudioSessionTreeResponse, {}],
    ["settings get", SettingsGetResponse, { key: "example" }],
    ["settings set request", SettingsSetRequest, { key: "example" }],
    ["settings set response", SettingsSetResponse, { key: "example" }],
    [
      "image edit commit",
      StudioImageEditCommitRequest,
      { grantId: "123e4567-e89b-42d3-a456-426614174000", expectedRevision: 0 },
    ],
  ] as const)("preserves omission of the unknown field in %s", (_name, schema, input) => {
    expect(schema.safeParse(input).success).toBe(true);
  });

  it("preserves structured setting values", () => {
    const input = { key: "example", value: { enabled: true, layers: [1, "two", null] } };
    expect(SettingsSetRequest.parse(input)).toEqual(input);
  });

  it("continues to reject missing setting keys and unexpected fields", () => {
    expect(SettingsSetRequest.safeParse({ value: true }).success).toBe(false);
    expect(SettingsSetRequest.safeParse({ key: "example", unexpected: true }).success).toBe(false);
  });
});
