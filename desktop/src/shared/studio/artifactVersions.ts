/** Per-artifact version list. Indexed by stable id, never by array position. */

export const MAX_ARTIFACT_VERSIONS = 20;

export interface ArtifactVersion {
  readonly id: string;
  readonly payload: string;
  readonly sequence: number;
}

export interface PruneResult {
  readonly versions: readonly ArtifactVersion[];
  readonly pruned: boolean;
}

export function pruneArtifactVersions(
  versions: readonly ArtifactVersion[],
  viewingId: string,
): PruneResult {
  if (versions.length <= MAX_ARTIFACT_VERSIONS) {
    return { versions, pruned: false };
  }
  const ordered = [...versions].sort((a, b) => a.sequence - b.sequence);
  const kept: ArtifactVersion[] = [];
  const overflow = ordered.length - MAX_ARTIFACT_VERSIONS;
  let dropped = 0;
  for (const version of ordered) {
    const mustKeep = version.id === viewingId;
    if (!mustKeep && dropped < overflow) {
      dropped += 1;
      continue;
    }
    kept.push(version);
  }
  return { versions: kept, pruned: dropped > 0 };
}

export function versionById(
  versions: readonly ArtifactVersion[],
  id: string,
): ArtifactVersion | undefined {
  return versions.find((version) => version.id === id);
}
