import { describe, expect, it } from "vitest";

import {
  AVATAR_INSTALL_SENTENCE,
  AVATAR_MIN_VRAM_GB,
  OFFICIAL_AVATAR_MODEL_ID,
  OFFICIAL_AVATAR_REPO,
  assertAvatarAllowed,
  avatarAvailable,
  avatarInstallRefusal,
  avatarOffered,
  officialAvatarInstalled,
} from "../../../../core/video/avatarGate.js";
import { buildAvatarProvenance, shortPayloadHash } from "../../../../core/video/avatarProvenance.js";

describe("assertAvatarAllowed", () => {
  const ok = {
    tierId: "diffusion-pro" as const,
    vramGB: 24,
    confirmed: true,
  };

  it("allows a confirmed diffusion-pro host at the VRAM floor", () => {
    expect(assertAvatarAllowed({ ...ok, vramGB: AVATAR_MIN_VRAM_GB })).toEqual({ ok: true });
  });

  it("refuses an unconfirmed request", () => {
    const r = assertAvatarAllowed({ ...ok, confirmed: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("avatar-unconfirmed");
  });

  it("refuses below diffusion-pro", () => {
    const r = assertAvatarAllowed({ ...ok, tierId: "diffusion-high" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("avatar-tier");
  });

  it("refuses a pro-tier host that is still under the VRAM floor", () => {
    const r = assertAvatarAllowed({ ...ok, vramGB: 16 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("avatar-vram");
  });

  it("refuses a community weight repo", () => {
    const r = assertAvatarAllowed({
      ...ok,
      weightRepo: "someone/LongCat-Video-FP8",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("avatar-unofficial");
  });

  it("refuses a non-catalog model id", () => {
    const r = assertAvatarAllowed({ ...ok, modelId: "ltx-video" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("avatar-model");
  });
});

describe("avatarAvailable", () => {
  it("is true only on diffusion-pro at the VRAM floor", () => {
    expect(avatarAvailable("diffusion-pro", 20)).toBe(true);
    expect(avatarAvailable("diffusion-pro", 19.9)).toBe(false);
    expect(avatarAvailable("diffusion-high", 24)).toBe(false);
  });
});

describe("avatarOffered", () => {
  it("requires hardware and a strict installed flag", () => {
    expect(avatarOffered("diffusion-pro", 24, true)).toBe(true);
    expect(avatarOffered("diffusion-pro", 24, false)).toBe(false);
    expect(avatarOffered("diffusion-mid", 24, true)).toBe(false);
    expect(avatarOffered("diffusion-pro", 16, true)).toBe(false);
    expect(avatarOffered("diffusion-pro", 24, undefined as unknown as boolean)).toBe(false);
  });
});

describe("officialAvatarInstalled", () => {
  const registryRow = {
    id: OFFICIAL_AVATAR_MODEL_ID,
    installed: true,
    source: "registry",
  };

  it("accepts the official registry row with or without a meituan-longcat repo", () => {
    expect(officialAvatarInstalled([registryRow])).toBe(true);
    expect(
      officialAvatarInstalled([{ ...registryRow, repo: OFFICIAL_AVATAR_REPO }]),
    ).toBe(true);
  });

  it("rejects an unloaded list, a non-registry source, and any other id", () => {
    expect(officialAvatarInstalled(null)).toBe(false);
    expect(officialAvatarInstalled(undefined)).toBe(false);
    expect(officialAvatarInstalled([])).toBe(false);
    expect(officialAvatarInstalled([{ ...registryRow, installed: false }])).toBe(false);
    expect(officialAvatarInstalled([{ ...registryRow, installed: "true" }])).toBe(false);
    expect(officialAvatarInstalled([{ id: OFFICIAL_AVATAR_MODEL_ID, installed: true }])).toBe(
      false,
    );
    expect(officialAvatarInstalled([{ ...registryRow, source: "" }])).toBe(false);
    expect(officialAvatarInstalled([{ ...registryRow, source: "catalog-only" }])).toBe(false);
    expect(officialAvatarInstalled([{ ...registryRow, source: "external" }])).toBe(false);
    expect(
      officialAvatarInstalled([{ ...registryRow, repo: "someone/LongCat-Video-FP8" }]),
    ).toBe(false);
    expect(officialAvatarInstalled([{ ...registryRow, repo: "" }])).toBe(false);
    expect(
      officialAvatarInstalled([
        { id: "wan2.1-t2v-1.3b", installed: true, source: "registry" },
      ]),
    ).toBe(false);
  });
});

describe("avatarInstallRefusal", () => {
  const capable = {
    tierId: "diffusion-pro" as const,
    vramGB: 24,
    installed: false,
    hasAudio: true,
  };

  it("names the weights and Settings when a capable host lacks them and has audio", () => {
    const sentence = avatarInstallRefusal(capable);
    expect(sentence).toBe(AVATAR_INSTALL_SENTENCE);
    expect(sentence).toContain("longcat-video-avatar-1.5");
    expect(sentence).toContain("Settings > Models");
    expect(avatarInstallRefusal({ ...capable, hasAudio: false })).toBeNull();
  });

  it("returns null below the hardware gate and when the offer is already true", () => {
    expect(avatarInstallRefusal({ ...capable, tierId: "diffusion-mid" })).toBeNull();
    expect(avatarInstallRefusal({ ...capable, vramGB: 12 })).toBeNull();
    expect(avatarInstallRefusal({ ...capable, installed: true })).toBeNull();
  });
});

describe("buildAvatarProvenance", () => {
  it("marks output as local and hashes photo plus audio", () => {
    const provenance = buildAvatarProvenance({
      sourceImage: "data:image/png;base64,AAA",
      sourceAudio: "data:audio/wav;base64,BBB",
    });
    expect(provenance.generatedBy).toBe("nexus");
    expect(provenance.local).toBe(true);
    expect(provenance.neverLeftDevice).toBe(true);
    expect(provenance.weightVariant).toBe("int8");
    expect(provenance.weightRepo).toBe("meituan-longcat/LongCat-Video-Avatar-1.5");
    expect(provenance.sourcePhotoHash).toBe(shortPayloadHash("data:image/png;base64,AAA"));
    expect(provenance.sourceAudioHash).toBe(shortPayloadHash("data:audio/wav;base64,BBB"));
  });
});
