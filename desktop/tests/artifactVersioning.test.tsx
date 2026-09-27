import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InteractiveArtifact } from "../src/components/InteractiveArtifact";
import {
  MAX_ARTIFACT_VERSIONS,
  pruneArtifactVersions,
  versionById,
  type ArtifactVersion,
} from "../src/shared/studio/artifactVersions";

function versions(count: number): ArtifactVersion[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `v${index + 1}`,
    payload: `payload-${index + 1}`,
    sequence: index + 1,
  }));
}

describe("artifact versions", () => {
  it("prunes oldest first, keeps the viewed version, and does not shift by position", () => {
    const atBound = pruneArtifactVersions(versions(MAX_ARTIFACT_VERSIONS), "v1");
    expect(atBound.pruned).toBe(false);
    expect(atBound.versions).toHaveLength(MAX_ARTIFACT_VERSIONS);

    const over = pruneArtifactVersions(versions(MAX_ARTIFACT_VERSIONS + 1), "v20");
    expect(over.pruned).toBe(true);
    expect(over.versions.map((version) => version.id)).not.toContain("v1");
    expect(versionById(over.versions, "v20")?.payload).toBe("payload-20");

    const viewingOldest = pruneArtifactVersions(versions(MAX_ARTIFACT_VERSIONS + 1), "v1");
    expect(viewingOldest.versions[0]?.id).toBe("v1");
    expect(viewingOldest.versions).toHaveLength(MAX_ARTIFACT_VERSIONS);
    expect(versionById(viewingOldest.versions, "v1")?.payload).toBe("payload-1");
  });

  it("navigates successive artifact payloads by stable id", async () => {
    const { rerender } = render(
      <InteractiveArtifact html={'<form data-nexus-artifact="true"><input name="a" /></form>'} />,
    );
    rerender(
      <InteractiveArtifact html={'<form data-nexus-artifact="true"><input name="b" /></form>'} />,
    );
    const buttons = await screen.findAllByRole("button", { name: /Artifact version artifact-v/ });
    expect(buttons.length).toBeGreaterThan(1);
    const latest = buttons[buttons.length - 1]!;
    latest.click();
    expect(latest.getAttribute("aria-current")).toBe("true");
  });
});
