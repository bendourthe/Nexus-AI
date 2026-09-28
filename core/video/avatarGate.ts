/**
 * v2.0.0 Phase 3 -- gate the talking-head (`audio2video`) mode.
 *
 * Avatar-1.5 INT8 is `diffusion-pro` only, needs an explicit user action,
 * and only the official `meituan-longcat` org is eligible. Community
 * re-quantizations are rejected here and again in the Python adapter.
 */

import type { DiffusionTierId } from "../config/DiffusionTier.js";

export const AVATAR_MIN_VRAM_GB = 20;
export const AVATAR_REQUIRED_TIER: DiffusionTierId = "diffusion-pro";
export const OFFICIAL_AVATAR_ORG = "meituan-longcat";
export const OFFICIAL_AVATAR_REPO = "meituan-longcat/LongCat-Video-Avatar-1.5";
export const OFFICIAL_AVATAR_MODEL_ID = "longcat-video-avatar-1.5";

export type AvatarGateResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string; readonly message: string };

export function assertAvatarAllowed(input: {
  readonly tierId: DiffusionTierId;
  readonly vramGB: number;
  readonly confirmed: boolean;
  readonly weightRepo?: string;
  readonly modelId?: string;
}): AvatarGateResult {
  if (!input.confirmed) {
    return {
      ok: false,
      code: "avatar-unconfirmed",
      message:
        "Avatar mode needs an explicit confirmation that the talking-head video is generated locally and never leaves this device.",
    };
  }
  if (input.tierId !== AVATAR_REQUIRED_TIER) {
    return {
      ok: false,
      code: "avatar-tier",
      message:
        "Avatar mode is gated to diffusion-pro (about 20 GB+ VRAM). This host's video tier cannot run LongCat-Video-Avatar-1.5 INT8.",
    };
  }
  if (!(input.vramGB >= AVATAR_MIN_VRAM_GB)) {
    return {
      ok: false,
      code: "avatar-vram",
      message: `Avatar mode needs at least ${AVATAR_MIN_VRAM_GB} GB VRAM. Detected ${input.vramGB} GB.`,
    };
  }
  if (input.modelId && input.modelId !== OFFICIAL_AVATAR_MODEL_ID) {
    return {
      ok: false,
      code: "avatar-model",
      message: "Avatar mode only runs the official longcat-video-avatar-1.5 catalog entry.",
    };
  }
  if (input.weightRepo && !input.weightRepo.startsWith(`${OFFICIAL_AVATAR_ORG}/`)) {
    return {
      ok: false,
      code: "avatar-unofficial",
      message:
        "Only official meituan-longcat weights are eligible. Community re-quantizations are rejected.",
    };
  }
  return { ok: true };
}

export function avatarAvailable(tierId: DiffusionTierId, vramGB: number): boolean {
  return tierId === AVATAR_REQUIRED_TIER && vramGB >= AVATAR_MIN_VRAM_GB;
}

/**
 * A raw models-list row. `repo` is optional: the desktop DTO has no repo
 * field, and the list check then uses the official id plus `source`.
 */
export interface AvatarModelRow {
  readonly id?: string;
  readonly installed?: unknown;
  readonly source?: unknown;
  readonly repo?: string | null;
}

/** Names the catalog id and Settings > Models. Returned only for the install refusal. */
export const AVATAR_INSTALL_SENTENCE =
  "Install longcat-video-avatar-1.5 in Settings > Models. This host can run a talking-head, but those weights are not installed.";

/**
 * True only when hardware allows avatar and the caller says the official
 * weights are installed. A missing or non-boolean `installed` is not installed.
 */
export function avatarOffered(
  tierId: DiffusionTierId,
  vramGB: number,
  installed: boolean,
): boolean {
  return avatarAvailable(tierId, vramGB) && installed === true;
}

/**
 * Whether the raw models list (not the owned studio feed) has the official
 * avatar weights installed from the registry. Any other video id is ignored.
 */
export function officialAvatarInstalled(
  models: readonly AvatarModelRow[] | null | undefined,
): boolean {
  if (!Array.isArray(models)) return false;
  const row = models.find((entry) => entry?.id === OFFICIAL_AVATAR_MODEL_ID);
  if (!row || row.installed !== true) return false;
  if (row.source !== "registry") return false;
  if (!Object.prototype.hasOwnProperty.call(row, "repo")) return true;
  return (
    typeof row.repo === "string" &&
    row.repo.startsWith(`${OFFICIAL_AVATAR_ORG}/`)
  );
}

/**
 * Install sentence when the host can run avatar, the weights are not offered,
 * and the composer has an audio attachment. Null when hardware is false, the
 * offer is true, or there is no audio.
 */
export function avatarInstallRefusal(input: {
  readonly tierId: DiffusionTierId;
  readonly vramGB: number;
  readonly installed: boolean;
  readonly hasAudio: boolean;
}): string | null {
  if (!avatarAvailable(input.tierId, input.vramGB)) return null;
  if (avatarOffered(input.tierId, input.vramGB, input.installed)) return null;
  if (!input.hasAudio) return null;
  return AVATAR_INSTALL_SENTENCE;
}
